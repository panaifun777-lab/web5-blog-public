# Escrow 多席位团队分账 设计方案

> 目的:在现有 AP2 托管结算之上,支持一个悬赏订单由**多个贡献者(席位)按份额分账**,而不是当前"单一 agent 收款人"。
> 约束:必须落在现有安全边界内 —— `BudgetFence` 托管、5/25 硬帽、72h 争议窗口、PayoutLedger 唯一 txHash、签名器 fail-closed、热钱包上限。
> 编写时间:2026-11-05。所有常量取自 `src/lib/web5/payments/arc.ts`、`hot-wallet.ts`、`signer.ts`、`src/lib/web5/ap2/commerce.ts`、`prisma/schema.prisma`。

---

## 1. 现状(改之前)

单笔 `TaskOrder` 结算时,agent 池(escrow 的 80%)只发给**一个**地址,代码里是单次 `sendNativeUsdc(to, amount)`。链上合约 `BudgetFence`(`0xe0d246c09d7a3097bab3148f89201157dd531eea`)目前只认单一出款目标。

已具备、可复用的安全件:

| 项 | 位置 | 值/行为 |
|---|---|---|
| 链 | Arc Mainnet | chainId `5042`,USDC 18 位小数且 USDC 即 gas |
| 出款硬帽 | `arc.ts:14-21` | `PAYOUT_SINGLE_CAP_USDC` ≤ 5,`PAYOUT_DAILY_CAP_USDC` ≤ 25(`Math.min` 卡死,env 只能调低) |
| 热钱包上限 | `hot-wallet.ts:30,66-75` | `HOT_WALLET_MAX_USDC` ≤ 20,`SWEEP_RESERVE_USDC` = 5 |
| 争议窗口 | `commerce.ts:96-100` | `SETTLEMENT_WINDOW_HOURS` 默认 72,clamp ≤ 720 |
| 账本 | `PayoutLedger` | `kind` ∈ `AGENT\|FEE\|RETAINED\|REFUND`,`txHash` 唯一 |
| 签名器 | `signer.ts` | 本地 `TREASURY_PAYOUT_PRIVATE_KEY` 或 KMS 远端;未就绪时 `NO_SIGNER` fail-closed |

---

## 2. 设计目标

- 一个订单可登记 **N 个席位**(地址 + 份额),份额以个基点(bps,0–10000)表示。
- 验收通过后,agent 池按份额**逐席位**出款,每个席位一条 `PayoutLedger`(`kind=AGENT`),各自独立的链上 `txHash`。
- 平台费(FEE)与留存(RETAINED)逻辑不变,仍走现有单笔。
- 任何单席位出款 ≤ 5 USDC;所有席位 + 平台累计仍受当日 25 USDC 上限约束。
- 退款(REFUND)按席位份额等比退回原出资方(或退回下单方),沿用现有退款校验。

---

## 3. 数据模型(只加不改)

`prisma/schema.prisma` 无迁移目录,按既有规矩**只做 additive**(`ALTER TABLE ... ADD COLUMN` / `CREATE TABLE` / `CREATE INDEX`)。

```prisma
// 新增表:席位分配
model TaskSeat {
  id        String   @id @default(cuid())
  orderId   String
  address   String   // 席位收款地址(同链,did 解析后的 prime 地址)
  bps       Int      // 份额基点 1..10000,单个订单所有席位之和必须 == 10000
  role      String   @default("contributor") // contributor | lead
  createdAt DateTime @default(now())
  @@index([orderId])
  @@index([address])
}
```

> 不往 `TaskOrder` 里塞 JSON:关系表更利于索引、对账与争议时按席位追款。

校验(在 `publish`/验收前):`SELECT SUM(bps) ... GROUP BY orderId` 必须等于 10000,否则结算接口返回 `SEAT_ALLOCATION_INVALID`(`code` 稳定值),不写任何 `TaskOrder` 状态。复核现有 `escrowTxHash` 唯一索引、不破坏。

---

## 4. 合约侧(`BudgetFence`)

两种实现路线,优先 **B(不改合约核心、用应用层循环)**:

- **A. 合约新增 `distributeToTeam(orderId, payees[], amounts[])`**:原子多转,gas 随席位线性增长;需在 Arc 上部署+审计新合约,属主网动作,灰度前不宜动。
- **B. 应用层按席位循环调用现有 `sendNativeUsdc`**:每席位一笔交易,复用 `PayoutSigner` 与 `checkHotWalletCeiling`。**推荐**:零合约改动,所有既有安全检查天然适用。

路线 B 下,链上仍是多笔独立转账,但 `PayoutLedger` 用 `orderId` 索引把它们聚合成"同一笔订单的分账",前端与对账按订单维度展示。

---

## 5. 结算循环(复用 `web5-payout.mjs` / `run-live.sh` 的 ledger-first 重查)

把现有"算 agent 金额 → 单发"替换为:

```
agentPool = escrowAmount * 80 / 100          // 现有 80/20 不变
for seat in seats:                            // 新增循环
    amount = agentPool * seat.bps / 10000
    if amount > SINGLE_CAP(5): 退回人工拆分(单席位上限不可破)
    ledger = PayoutLedger.findUnique({orderId, address})  // ledger-first
    if ledger?.txHash: skip                    // 幂等,防重发
    txHash = signer.sendNativeUsdc(seat.address, amount)  // 受 5/25/hot-wallet 拦截
    PayoutLedger.create({orderId, kind:'AGENT', address, amountWei, txHash})
assert dailyCumulative < DAILY_CAP(25)
PayoutLedger.create({kind:'FEE', ...})         // 平台费,不变
PayoutLedger.create({kind:'RETAINED', ...})    // 留存,不变
```

失败码沿用:`CAP_SINGLE` / `CAP_DAILY` / `CAP_HOT_WALLET` / `NO_SIGNER` / `TX_FAILED`。**单席位失败不中止整单**:已成功的席位留在账本,失败的回写 `FEE` 侧待人工补齐(或整单进入 `reclaimStaleClaims` 复核),绝不重复出款。

---

## 6. 上限数学(必须显式写进测试)

- 单席位 ≤ 5 USDC → 一个 80% 的 agent 池最多容纳 1 个满额席位;更大金额需**多日**累计(当日 25 封顶)。灰度期窗口压到 0.01h 也改不了帽,所以团队分账的真实价值在"多人分小单",而非"一单巨额"。
- 席位数量无硬上限,但受 5/25 隐含约束:要 N 个满额席位至少需 N×5 USDC 当日额度。先用 `MAX_SEATS_PER_ORDER = 8` 防滥用(可配置)。
- 验收前断言 `Σ seat.bps == 10000` 且没有席位 bps==0。

---

## 7. 前端

- 任务详情/验收页新增"团队席位"面板:增删席位、填地址与 bps,实时校验合计 100%。
- 争议窗口内仍按订单维度展示总账,席位明细可展开;退款按钮触发 `REFUND` 路径,按席位等比回退。
- 仅在 `ESCROW_PAYOUTS_ENABLED` 开启后展示"分账"交互;关闭时(生产现状)面板只读。

---

## 8. 迁移与灰度(不重写、不加字段历史)

1. `sqlite3 /root/web5.blog/prisma/db/custom.db ".backup /root/web5.blog/backups/pre-team-$(date +%Y%m%d-%H%M%S).db"`
2. `CREATE TABLE IF NOT EXISTS TaskSeat (...)`(上述关系表,无外键改写)。
3. 结算代码改为 §5 循环;补 `tests/` 用例:**单席位 5 帽拦截**、**Σbps≠10000 拒绝**、**重放幂等**、**当日 25 累计拦截**、**席位失败不重复**。
4. 先在 `/root/web5-stage3` 影子实例(`SETTLEMENT_WINDOW_HOURS=0.01`)跑 1 USDC 多席位闭环,通过后再谈生产打开 `ESCROW_PAYOUTS_ENABLED`。

---

## 9. 决策记录(已拍板 · 2026-11-07)

| # | 决策点 | 结论 | 理由 / 落地约束 |
|---|---|---|---|
| 1 | 席位收款地址的信任来源 | **要求每个席位地址走 Vessel 会话校验** | 防 sybil 自导自演分账。登记/变更席位时,该席位地址须由对应 Vessel 会话(持有者登录态)授权,否则结算接口返回 `SEAT_ADDRESS_UNVERIFIED`,不写任何 `TaskOrder`/`TaskSeat` 状态。UX 代价:多席位需各持有者分别登录授权。 |
| 2 | 超额单(单订单 agent 池 > 6.25 USDC) | **先验收、按日 5/25 帽累积发** | 验收不阻塞;agent 池按席位 bps 计算后,逐席位受 `PAYOUT_SINGLE_CAP_USDC`(5)与 `PAYOUT_DAILY_CAP_USDC`(25)拦截,超额部分顺延至次日发放,绝不破帽、绝不重复出款。大单真实价值在"多人分小单",而非"一单巨额"。 |
| 3 | `lead` 角色抽成 | **纯按 bps 平分,lead 无额外抽成** | 所有 `contributor`(含 `lead`)均按 `bps` 分配,账本最透明、对账无歧义。`lead` 字段保留仅用于前端展示与争议时追溯牵头人,不参与金额计算。 |

> 以上决策仅更新设计,**不改变任何生产行为**:`ESCROW_PAYOUTS_ENABLED` 仍关闭,`TaskSeat` 表与 §5 结算循环尚未实现。落地实现时须复用 §5 的 ledger-first 重查与 §6 的上限断言,并将决策 1 的会话校验接入现有 Vessel 会话体系。
