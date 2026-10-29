# Settlement Acceptance Checklist

> 目标：把“发现（llms.txt / agent.json / MCP）→ 付费（x402 / 托管）→ 交付 → 验收 → 链上分账”的中间段接通。
> 原则：**只认链上证据**。页面上的 SETTLED 标签、控制台日志、内存计数器都不算通过。
>
> 状态标记：`[x]` 代码完成并存于仓库 · `[~]` 代码完成但需真实链上资金/时长验证 · `[ ]` 未完成 · `[!]` 阻塞（需要外部输入）
>
> 最近更新：2026-10-30（阶段 1、2、5 代码落地；阶段 3 需测试网资金，阶段 4 需主网灰度）

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
- [x] **1.2 幂等与并发**：`updateMany({ where: { orderId, status: in([...]), disputedAt: null }, data: { status: 'SETTLING' } })` 作为互斥锁；抢锁失败直接返回当前订单。重试时先读 `PayoutLedger`，已付的 AGENT/FEE 不会重复转账；失败回滚到 `VERIFIED` 并写 `settlementError`。
- [x] **1.3 退款路径**：`REFUNDED` 必须带 `refundTxHash`；`deliveryDueAt` 过期的 `FUNDED/ASSIGNED` 由 cron 自动退款（需 `REFUNDS_ENABLED=true`）；admin 可手动退款。退款失败回滚原状态并写 `settlementError`。
- [x] **1.4 voucher 持久化**：nonce 写入 `AuthNonce`（purpose `VOUCHER`），`commit()` 依赖唯一约束返回 409；统计改为 DB 计数；重启后计数不清零、重放被拒。
- [x] **1.5 限额落到执行层**：`sendNativeUsdc` 前置单笔上限（5 USDC）与 24h 滚动上限（25 USDC），上限取自 `PayoutLedger` 实付记录，env 只能调低不能调高。超限返回 409 且不发 tx。
- [x] **1.6 结算授权收口**：结算发起者必须满足其一：admin，或 orchestrator DID 且 ≠ `assignedAgentDid`（禁止自派自付）。另：非 admin 非 force 结算要求交付物已有 Arweave 永久存证。

## 2. 验收自动化

- [x] **2.1 acceptanceHash**：`TaskOrder.acceptanceHash` 非空时，`deliverableHash` 必须相等才可进入 `VERIFIED`；不匹配 → `REJECTED`，不可结算。无 acceptanceHash 时进入 `SUBMITTED`，由 admin `verify` 或争议窗口结束后的 cron 结算。
- [x] **2.2 交付物真实存证**：`uploadToArweave(..., { requirePermanent: true })` 在 Irys 失败时抛 `ArweavePermanenceError`（env 值脱敏），要求 hash 为 43 位 base64url；`provenance.fallback === true` 的提交被拒绝（422 `PROVENANCE_NOT_PERMANENT`）；daemon 存证失败保持 `ASSIGNED`，绝不降级。
- [x] **2.3 争议窗口**：提交后 `settlementDueAt = submittedAt + SETTLEMENT_WINDOW_HOURS`（默认 72h）；窗口内 creator 可 `dispute`；cron 只结算 `dueAt <= now` 且 `disputedAt IS NULL` 的订单。
- [x] **2.4 禁止自派自付**：daemon 只对 `assignedAgentDid === DAEMON_WORKER_DID` 的订单交付，且**从不结算**（结算留给 cron/admin）；自动接单需显式 `AGENT_DAEMON_AUTOCLAIM=true`；orchestrator 结算时后端强制 `settler ≠ deliverer`。
- [x] **2.5 声誉自动记账**：`Vessel.successCount` 只在链上放款确认后 +1，`failCount` 只在退款确认后 +1；`reputationFromCounts()` 由这两个计数推导 score/level/badges，无链上结果时为 `—` / `Unverified`（前端已移除 `99.2%`、`Lv.4` 等假数据兜底）。

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

## 4. 主网灰度（阶段 3 全绿后才开）

- [x] **4.1** 限额双保险：服务端硬上限（5 / 25）+ BudgetFence 配置只允许更低
- [x] **4.2** Kill switch：`ESCROW_PAYOUTS_ENABLED=false` 后结算入口 503，daemon 直接返回 0，cron 只保留只读能力
- [~] **4.3** 放款私钥隔离：`TREASURY_PAYOUT_PRIVATE_KEY` 仍在 VPS；当前仅加余额上限与审计日志。**待办**：热钱包余额上限 + 定期归集，或 KMS/远程签名
- [!] **4.4** 灰度观察 72h：结算失败率、退款率、treasury 余额偏差 = 0

## 5. demo 与统计

- [x] **5.1** `isDemo` 从 API 全链路透传（`isDemoOrder` 同时识别 `isDemo` 字段与历史 `ap2-task-seed-/meme-` 前缀），前端统一用 `DemoBadge` 打标
- [x] **5.2** 页面/清单里的计数只统计 `isDemo === false`：`GET /api/commerce/tasks` 的 `count`、`/api/market/x402-market`、`/api/market/llms`、任务广场与“待处理”计数
- [~] **5.3** 造 1 条 demo + 1 条真实，页面数字只 +真实那一笔（代码已满足，待在灰度环境用真实订单复核）

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
# 本地类型检查与构建
npm run typecheck
npm run build

# 影子实例冒烟（不写链）
PORT=3103 node .next/standalone/server.js
curl -s -o /dev/null -w '%{http_code}\n' localhost:3103/
curl -s -X POST -H 'content-type: application/json' -d '{}' localhost:3103/api/commerce/tasks

# 端到端（测试网，需真实资金）
node scripts/e2e-settlement.mjs --base http://127.0.0.1:3103
```
