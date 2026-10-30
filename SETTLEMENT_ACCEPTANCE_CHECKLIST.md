# Settlement Acceptance Checklist

> 目标：把“发现（llms.txt / agent.json / MCP）→ 付费（x402 / 托管）→ 交付 → 验收 → 链上分账”的中间段接通。
> 原则：**只认链上证据**。页面上的 SETTLED 标签、控制台日志、内存计数器都不算通过。
>
> 状态标记：`[x]` 代码完成并存于仓库 · `[~]` 代码完成但需真实链上资金/时长验证 · `[ ]` 未完成 · `[!]` 阻塞（需要外部输入）
>
> 最近更新：2026-10-30（阶段 1、2、5 代码落地 + P0 加固与 29 项单测，已部署 build12（`/security` 已进 sitemap）；阶段 3 完成无资金预演（3.9）并搭好主网影子实例与一键开跑脚本（3.10），真实链路只差私钥/资金与授权；阶段 4 需主网灰度）

---

## 0. 证据定义（E1–E5，所有阶段共用）

每条结算证据必须同时满足下表，缺一不通过。落库字段见 `TaskOrder` 与 `PayoutLedger`。

| 编号 | 证据 | 判定方式 |
|---|---|---|
| **E1** | 交易上链 | `txHash` + `receipt.status === 'success'` + `blockNumber` 三者同时落库 |
| **E2** | 资金流向 | 该 tx 的 `Transfer` 事件（或原生转账解析）的 `from` / `to` / `value` 与 DB 申报逐字段相等 |
| **E3** | 双向可回查 | `escrowTxHash` / `payoutTxHash` / `feeTxHash` / `refundTxHash` 非空（或该笔为 `RETAINED`），且能按 hash 从链上取回同一笔 |
| **E4** | 余额守恒 | treasury 减少额 = Σ(agent 份额 + 协议费 + 退款)，`PayoutLedger` 合计与链上一致 |
| **E5** | 状态机不跳步 | `SETTLED` 必须伴随非空 `payoutTxHash` 与 `settledAt`；`REFUNDED` 必须伴随非空 `refundTxHash`，否则不写终态 |

实现：`src/lib/web5/ap2/evidence.ts`（`auditOrderEvidence`：E1–E5 校验 + 汇总）。
审计入口：`GET /api/commerce/tasks?action=audit&orderId=...`（仅 admin；`chain=false` 可跳过链上校验）。

---

## 1. 执行层补齐

- [x] **1.1 20% 真实落账**：`settleOrder` 把 80% 打给 agent，20% 单独打给 `PLATFORM_FEE_ADDRESS`；两笔都写 `payoutTxHash` / `feeTxHash` 与 block number。未配置费用地址时写 `PayoutLedger.kind='RETAINED'`（留在 treasury，不伪造 tx）。
- [x] **1.2 幂等与并发**：`updateMany({ where: { orderId, status: in([...]), disputedAt: null }, data: { status: 'SETTLING' } })` 作为互斥锁；抢锁失败直接返回当前订单。重试时**先读 `PayoutLedger` 再发 tx**（AGENT/FEE 各查各的），已付的一笔绝不重发；每笔 tx 发出后**立即**把 hash 写回订单，崩溃也只丢「最后一笔未落库」；失败回滚用抢锁前快照恢复 `status`/`claimAt`。`cron` 入口先跑 `reclaimStaleClaims(30)`：超过 30 分钟仍卡在 `SETTLING`/`REFUNDING` 的订单按 ledger 判定收尾或释放，不会永久卡死。
- [x] **1.3 退款路径**：`REFUNDED` 必须带 `refundTxHash`；`deliveryDueAt` 过期的 `FUNDED/ASSIGNED` 由 cron 自动退款（需 `REFUNDS_ENABLED=true`）；admin 可手动退款。退款同样 ledger-first 防重复打款，抢锁时把原状态写入 `refundOrigin`，失败按原状态回滚。
- [x] **1.4 voucher 持久化**：nonce 写入 `AuthNonce`（purpose `VOUCHER`），`commit()` 依赖唯一约束返回 409；统计改为 DB 计数；重启后计数不清零、重放被拒。
- [x] **1.5 限额落到执行层**：`sendNativeUsdc` 前置单笔上限（5 USDC）与 **24h 滚动窗口**上限（25 USDC），上限取自 `PayoutLedger` 实付记录（`RETAINED` 不计入），env 只能调低不能调高；发款调用在进程内串行化，避免并发请求同时通过上限检查。超限返回 409 且不发 tx。
- [x] **1.6 结算授权收口**：结算发起者必须满足其一：admin，或 orchestrator DID 且 ≠ `assignedAgentDid`（禁止自派自付）。自派自付检查按**钱包地址**比对（creator 的 did/0x/prime/vessel 地址集合 vs 收款地址），换个 DID 也绕不过去。另：非 admin 非 force 结算要求交付物已有 Arweave 永久存证。
- [x] **1.7 托管建单防伪**：托管地址由服务端常量固定（`ESCROW_VAULT_ADDRESS`），不再信任请求体；`from` 必须在 creator 钱包集合内；`escrowTxHash` 加唯一索引，同一笔链上转账不能重复建单；bounty 上限在发 tx 前拦截。

## 2. 验收自动化

- [x] **2.1 acceptanceHash**：`TaskOrder.acceptanceHash` 非空时，`deliverableHash` 必须相等才可进入 `VERIFIED`；不匹配 → `REJECTED`，不可结算。无 acceptanceHash 时进入 `SUBMITTED`，由 admin `verify` 或争议窗口结束后的 cron 结算。
- [x] **2.2 交付物真实存证**：`uploadToArweave(..., { requirePermanent: true })` 在 Irys 失败时抛 `ArweavePermanenceError`（env 值脱敏），要求 hash 为 43 位 base64url；`provenance.fallback === true` 的提交被拒绝（422 `PROVENANCE_NOT_PERMANENT`）；daemon 存证失败保持 `ASSIGNED`，绝不降级。
- [x] **2.3 争议窗口**：提交后 `settlementDueAt = submittedAt + SETTLEMENT_WINDOW_HOURS`（默认 72h）；窗口内 creator 可 `dispute`；cron 只结算 `dueAt <= now` 且 `disputedAt IS NULL` 的订单。
- [x] **2.4 禁止自派自付**：daemon 只对 `assignedAgentDid === DAEMON_WORKER_DID` 的订单交付，且**从不结算**（结算留给 cron/admin）；自动接单需显式 `AGENT_DAEMON_AUTOCLAIM=true`；orchestrator 结算时后端强制 `settler ≠ deliverer`。
- [x] **2.5 声誉自动记账**：`Vessel.successCount` 只在链上放款确认后 +1，`failCount` 只在退款确认后 +1；`reputationFromCounts()` 由这两个计数推导 score/level/badges，无链上结果时为 `—` / `Unverified`（前端已移除 `99.2%`、`Lv.4` 等假数据兜底）。
- [x] **2.6 demo 订单硬隔离**：`settleOrder` / `refundOrder` 对 `isDemo` 订单直接抛 `DEMO_NOT_SETTLEABLE`（在发任何 tx 之前）；`listSettlementsDue` / `listExpiredDeliveries` 的查询自带 demo 过滤，cron 根本取不到 demo 单。
- [x] **2.7 会话吊销即时生效**：`resolveVesselSessionFromToken` 不再回退到「仅验签」，必须命中存活的 `vesselSession` 行；吊销/过期后 token 立即失效。
- [x] **2.8 列表不泄露验收材料**：任务列表投影剔除 `deliverableContent` 与 `acceptanceHash`，验收哈希只在审计/管理路径可见。

## 3. 测试网端到端（Arc Testnet 5042002）

代码侧已完成：`scripts/e2e-settlement.mjs` 可全自动跑完整链路并汇总证据清单；`GET /api/commerce/tasks?action=audit&orderId=...` 返回 E1–E5。

- [~] **3.1** 容器启动即持有 Vessel DID + 作用域 session key（`/api/auth/vessel-login` 已具备，无需人类表单）
- [~] **3.2** 发现链：`/llms.txt` → `agent.json` → MCP → 402 挑战字段可解析
- [~] **3.3** 托管：`escrowTxHash` 上链且 3 确认校验通过（E1/E3）
- [~] **3.4** 交付：Arweave hash 落库，`fallback === false`（E3）
- [~] **3.5** 自动验收：`acceptanceHash` 命中，状态 `VERIFIED`
- [~] **3.6** 窗口结束后自动结算：80% + 20% 两笔真实落账（E1/E2/E4）
- [~] **3.7** 声誉 +1 与结算事件可查（E5）
- [!] **3.8** 全链证据清单：7 个 hash/事件全部可在 explorer 打开

**阻塞项**：需要测试网 USDC（faucet）、测试网 treasury 私钥与 `PLATFORM_FEE_ADDRESS`，以及真实的等待窗口（测试时可把 `SETTLEMENT_WINDOW_HOURS` 调小，主网必须 72）。

运行：

```bash
# 只读探测（默认），不会写库、不会触发结算
node scripts/e2e-settlement.mjs --base http://127.0.0.1:3103

# 真实链路（需要下面的环境变量）
E2E_SESSION_TOKEN=... E2E_ADMIN_TOKEN=... E2E_ACCEPTANCE_HASH=... \
E2E_ARWEAVE_HASH=<43位 Arweave tx id> E2E_ESCROW_TX_HASH=0x... \
SETTLEMENT_CRON_SECRET=... \
node scripts/e2e-settlement.mjs --live --base https://web5.blog
```

### 3.9 预演结果（2026-10-30，无真实资金）

链配置在**构建时内联**（`NEXT_PUBLIC_ACTIVE_CHAIN`），主网产物里测试网分支会被 DCE 掉，因此阶段 3 必须**单独构建测试网产物**，不能拿主网 build 直接测。本地用测试网构建（独立 `BUILD_ID`）+ 端口 3103 影子实例 + 临时 SQLite 副本跑了一遍预演：

| 预演项 | 结果 |
|---|---|
| 测试网构建可启动，`/` 与页面 200 | PASS |
| 资金开关在 API 暴露为 true（`MONEY_FLOWS_ENABLED`/`ESCROW_PAYOUTS_ENABLED`/`REFUNDS_ENABLED`） | PASS |
| `/api/cron/settle` 鉴权：无 secret → 401、错误 secret → 401、正确 secret → 200 且返回 `recovered` | PASS |
| 预算接口匿名访问 → 403 | PASS |
| harness 只读探测：PASS 5 / FAIL 0 / SKIP 11，判定 “READY for --live” | PASS |
| harness 缺参数 `--live` → 退出码 2（拒绝空跑） | PASS |
| harness 伪造凭据 `--live` → 退出码 1；F1 FAIL，E1–E5 全部 SKIP（不伪造链上证据） | PASS |

以上证明了“测试网产物 + 开关 + cron 鉴权 + harness 诚实性”这一段可用；**仍未验证**的是任何真实链上步骤（托管上链、Arweave 永久存证、80/20 两笔落账、E1–E5 证据），这些必须等外部输入。

**开跑阶段 3 的前置清单**：

1. 测试网 USDC：给 treasury 地址从 [Arc testnet faucet](https://faucet.testnet.arc.io) 领水
2. 一次性测试网 treasury 私钥（`TREASURY_PAYOUT_PRIVATE_KEY`，与主网 treasury 完全隔离）+ 对应的 `PLATFORM_FEE_ADDRESS` 与 `TREASURY_ADDRESS`
3. 单独构建：`NEXT_PUBLIC_ACTIVE_CHAIN=arc-testnet npm run build`（构建后 `NEXT_PUBLIC_ESCROW_VAULT_ADDRESS` 也要指向测试网托管地址；`getEscrowVaultAddress()`/`getTreasuryAddress()` 支持运行期 `ESCROW_VAULT_ADDRESS`/`TREASURY_ADDRESS` 覆盖，无需再改代码）
4. 部署到**非生产**实例（VPS 影子端口或独立容器），`DATABASE_URL` 指向测试网用的库，**绝不能碰** `/root/web5.blog/prisma/db/custom.db`
5. 显式打开 `MONEY_FLOWS_ENABLED=true`、`ESCROW_PAYOUTS_ENABLED=true`、`REFUNDS_ENABLED=true`、`SETTLEMENT_CRON_SECRET`（≥16 字符），`SETTLEMENT_WINDOW_HOURS` 调小（如 0.01）
6. 准备 `E2E_SESSION_TOKEN`（Vessel 会话）、`E2E_ADMIN_TOKEN`、`E2E_ACCEPTANCE_HASH`、一笔已上链的 `E2E_ESCROW_TX_HASH`
7. 在 VPS 上跑 `node /root/e2e-settlement.mjs --live --base http://127.0.0.1:<影子端口>`（harness 必须在目标同机跑，本机探测 127.0.0.1 只会打到本机）

### 3.10 主网影子实例与一键开跑脚本（2026-10-30）

主网构建（build12，BUILD_ID `Wtx-BGJqBHb28du5tHEWw`）的同一份产物已部署为**非生产影子实例**，与生产完全隔离：

| 项 | 值 |
|---|---|
| 路径 | `/root/web5-stage3/app`（build12 standalone 硬链接副本） |
| 监听 | `127.0.0.1:3104`（不对外，无 TLS 无域名） |
| 数据库 | `/root/web5-stage3/db/custom.db`（生产库 `sqlite3 .backup` 副本；演示单 8、`PayoutLedger` 0） |
| 资金开关 | 三个全开；`SETTLEMENT_WINDOW_HOURS=0.01`（36 秒） |
| 密钥 | 独立 `SETTLEMENT_CRON_SECRET` / `ADMIN_API_KEY`（`/root/web5-stage3/credentials.txt`，600） |
| Telegram | `TG_BOT_TOKEN` 置空，影子实例不会发消息 |
| 会话 | `mint-session.mjs` 铸造的 Vessel 会话（`/root/web5-stage3/session.token`，600，短时效） |
| 生产 | **未改动**：build12 正常运行，三个开关仍为 false，`/api/cron/settle` 仍 503 |

已完成的验证（全部为只读或必然失败的调用，**无资金移动**）：

| 验证项 | 结果 |
|---|---|
| 影子 API 开关回显 | `moneyFlowsEnabled/escrowPayoutsEnabled/refundsEnabled = true` |
| cron 鉴权（正确 secret） | 200，`settledCount:0`，`errors:[]`（无到期单，幂等空转） |
| cron 鉴权（错误 / 缺失） | 401 `Invalid cron secret` |
| harness 只读探测 | PASS 5 / FAIL 0 / SKIP 11 → “READY for --live” |
| harness 缺 `E2E_ARWEAVE_HASH` 跑 `--live` | 退出码 2，拒绝空跑，不发送任何请求 |
| 合成凭据探针（假 `escrowTxHash` + 假 43 位 Arweave id） | 会话 token 与路由全部通过，服务端在链上校验处正确拒绝 `Transaction not found on Arc Mainnet [ESCROW_INVALID]`；探针前后 `TaskOrder` 8 条、`PayoutLedger` 0 条不变 |
| 一次性私钥配置脚本 | `prepare-treasury.sh` 能推导地址、写 600 的 .env、重启 3104、打印余额；验证后已回滚覆盖项 |

探针结论：**写入发生在链上校验之后**（假 tx 无法留下订单），并且会话/管理/cron 三条鉴权链路已真实打通；剩下的唯一未知量就是真实资金。

`/root/web5.blog/ops-stage3/` 脚本：

| 脚本 | 作用 |
|---|---|
| `new-treasury.sh` | 生成一次性热钱包私钥（只写进 600 的 .env，不打印），配置 `TREASURY_ADDRESS`/`ESCROW_VAULT_ADDRESS`/上限并重启 3104 |
| `prepare-treasury.sh <0x私钥> [vault]` | 用已有私钥配置（推导地址、写 env、重启、打印地址与余额） |
| `run-live.sh <escrowTx> <arweaveTxid\|auto> [bounty]` | 铸造会话、组装 env、跑 `--live` 并把报告写到 `/root/web5-stage3/reports/`；`auto` 会先检查 Irys 余额，为 0 直接退出 |
| `status.sh` | 实例 / 开关 / 地址 / 余额 / Irys 余额概览 |
| `derive.mjs` `balance.mjs` `irys-balance.mjs` `upload-arweave.mjs` | 底层工具；需在 `/root/web5.blog` 下执行（那里才有 viem 与 `@irys/upload`） |
| `plumbing-test.sh` `plumb2.sh` | 合成凭据探针，**只用于验证接线，不可作为结算证据** |

主网直跑的地址与金额（Arc 主网 5042，USDC 18 位小数，USDC 即 gas）：

- 托管/金库地址：`0xCA36335845E382129167fC44243F07A76827bA22`（若改用 `new-treasury.sh`，以它打印的新地址为准）
- 托管付款方：必须是 prime `0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1` 或其 Vessel 智能账户，否则 `ESCROW_WRONG_SENDER`
- 金额必须**精确等于** bounty（默认 1 USDC，18 位小数），≥3 确认，tx hash 全局唯一
- 出款由 treasury 私钥对应地址签名；热钱包需留少量 gas（同为 USDC）

仍缺的外部输入：

1. treasury 私钥，或授权用 `new-treasury.sh` 新建一次性热钱包
2. 一笔从 prime 钱包发往托管地址、金额精确、≥3 确认的真实 escrow tx hash
3. Arweave txid —— Irys 钱包 `0x7317198acd164594f87017a3a148bf3c8b6144f7` 当前 **0 POL**，`auto` 上传必然失败；要么充少量 POL，要么直接给一个已有 txid
4. 明确的真实资金授权（单笔 1 USDC；上限 5/25 已把爆炸半径锁死）

**测试网不是必须**：同一套代码、同一套断言、同一份 harness，只是链 id / RPC / 水龙头不同。主网 1 USDC 的一次性彩排同样能拿到 E1–E5，且更贴近真实环境；上限 5/25 与精确金额校验把风险限制在 1–2 USDC。测试网产物已在本地构建（`NEXT_PUBLIC_ACTIVE_CHAIN=arc-testnet`），需要时可另起 3105，但它同样卡在水龙头资金上，不解除任何阻塞。

已知显示瑕疵（不影响结算）：`GET /api/commerce/tasks` 里 `settlementWindowHours` 用 `Math.max(1, …)` 夹到 1，所以影子实例显示 1 而实际窗口是 36 秒；真实窗口由 `commerce.ts` 的 `settlementWindowMs()` 计算。下次构建一并修正为实际值。

## 4. 主网灰度（阶段 3 全绿后才开）

- [x] **4.1** 限额双保险：服务端硬上限（5 / 25）+ BudgetFence 配置只允许更低
- [x] **4.2** Kill switch：`ESCROW_PAYOUTS_ENABLED=false` 后结算入口 503，daemon 直接返回 0，cron 只保留只读能力
- [~] **4.3** 放款私钥隔离：`TREASURY_PAYOUT_PRIVATE_KEY` 仍在 VPS；当前仅加余额上限与审计日志。**待办**：热钱包余额上限 + 定期归集，或 KMS/远程签名
- [!] **4.4** 灰度观察 72h：结算失败率、退款率、treasury 余额偏差 = 0

## 5. demo 与统计

- [x] **5.1** `isDemo` 从 API 全链路透传（`isDemoOrder` 同时识别 `isDemo` 字段与历史 `ap2-task-seed-/meme-` 前缀），前端统一用 `DemoBadge` 打标
- [x] **5.2** 页面/清单里的计数只统计 `isDemo === false`：`GET /api/commerce/tasks` 的 `count`、`/api/market/x402-market`、`/api/market/llms`、任务广场与“待处理”计数
- [~] **5.3** 造 1 条 demo + 1 条真实，页面数字只 +真实那一笔（代码已满足，待在灰度环境用真实订单复核）

## 6. 本地单测（不依赖测试网资金）

Vitest + 内存假 Prisma（`@/lib/db` 被打桩），冻结链上调用（`sendNativeUsdc` 被 mock），**29 项全部通过**：

| 文件 | 覆盖 |
|---|---|
| `tests/settlement.test.ts` | 80/20 分账；重试时已付的 agent 份额不再重发；超限不发 tx 且订单留在 `VERIFIED`；acceptanceHash 三态（`SUBMITTED`/`VERIFIED`/`REJECTED`）；demo 订单拒绝结算/退款；结算调度器排除 demo；抢锁失败返回在途订单；分账与窗口计算的边界 |
| `tests/caps.test.ts` | 单笔上限、恰好等于上限放行、24h 滚动窗口（23h 计入 / 26h 不计入）、`RETAINED` 不占额度 |
| `tests/token-session.test.ts` | 存活会话通过；无会话行 / 已吊销 / 已过期 / 伪造签名一律拒绝 |
| `tests/chain-config.test.ts` | 默认主网地址；`TREASURY_ADDRESS`/`ESCROW_VAULT_ADDRESS` 运行期覆盖；仅 treasury 覆盖时托管回退；非法地址被忽略；链默认 5042 / 测试网 5042002 与 RPC |
| `tests/commerce-authz.test.ts` | 匿名调用审计接口 403 且不泄露 E1–E5 证据；非创建者船体结算 403 `NOT_ORCHESTRATOR` 且资金未动；非受派船体提交 403 且订单状态不变 |

```bash
npm test            # vitest run
```

---

## 环境变量

| 变量 | 作用 | 默认 |
|---|---|---|
| `MONEY_FLOWS_ENABLED` | 真实资金总开关 | 关闭 |
| `ESCROW_PAYOUTS_ENABLED` | 托管结算（同时门控 daemon / cron 结算） | 关闭 |
| `REFUNDS_ENABLED` | 自动/手动退款 | 关闭 |
| `PLATFORM_FEE_ADDRESS` | 20% 协议费归集地址 | 空（RETAINED） |
| `TREASURY_PAYOUT_PRIVATE_KEY` | 出款签名（必须是 treasury 地址） | 空 |
| `PAYOUT_SINGLE_CAP_USDC` / `PAYOUT_DAILY_CAP_USDC` | 单笔 / 24h 上限 | 5 / 25 |
| `SETTLEMENT_WINDOW_HOURS` | 争议窗口 | 72 |
| `SETTLEMENT_CRON_SECRET` | cron 路由鉴权（≥16 字符） | 空（cron 不工作） |
| `AGENT_DAEMON_AUTOCLAIM` | 允许 daemon 自动接单 | 关闭 |

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/commerce/tasks` | 列表 + 开关状态；`count` 不含 demo |
| GET | `/api/commerce/tasks?action=audit&orderId=...` | E1–E5 审计（admin） |
| POST | `/api/commerce/tasks` | `create / assign / submit / verify / dispute / settle / refund` |
| POST | `/api/cron/settle` | `x-cron-secret` 鉴权；结算到期订单 + 退款过期订单 |

## 运行与验收命令

```bash
# 本地单测 / 类型检查 / 构建
npm test
npx tsc --noEmit   # 仓库无 typecheck 脚本；examples/ 与 scripts/verify-subtask1.ts 有历史遗留无关报错
npm run build

# 影子实例冒烟（不写链）
PORT=3103 node .next/standalone/server.js
curl -s -o /dev/null -w '%{http_code}\n' localhost:3103/
curl -s -X POST -H 'content-type: application/json' -d '{}' localhost:3103/api/commerce/tasks

# 端到端只读探测（在 VPS 上对 127.0.0.1:3102 影子实例跑）
node scripts/e2e-settlement.mjs --base http://127.0.0.1:3102

# 端到端（测试网，需真实资金）
node scripts/e2e-settlement.mjs --live --base https://web5.blog
```

上线前基线（build9 于 2026-10-30 部署，BUILD_ID `6Ga61EMUXcYAmJ9y2w8ev`）：线上 `/`、`/api/commerce/tasks`、cron GET 均 200；cron POST 503（未配置 secret）；预算接口匿名 403；列表 `count` 只算非 demo。线上资金开关仍全部关闭。
