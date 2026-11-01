# 热钱包隔离（P0 · 验收清单 4.3「放款私钥隔离」）

> 状态：**代码可做的部分已完成**（签名器抽象 + 余额上限 + 归集计划器 + 测试）。
> 真正的隔离**尚未生效**：`TREASURY_PAYOUT_PRIVATE_KEY` 仍然在 VPS 上，
> KMS / HSM / 冷钱包都还没有采购与部署。见第 7 节「仍然阻塞的外部输入」。

相关文件：

| 文件 | 作用 |
|---|---|
| `src/lib/web5/payments/signer.ts` | `PayoutSigner` 抽象、`LocalKeySigner`、`RemoteKmsSigner`、`resolveSigner()`、`describeSigner()` |
| `src/lib/web5/payments/hot-wallet.ts` | `checkHotWalletCeiling()`（发款前拒绝）、`planSweep()`（只算不签） |
| `src/lib/web5/payments/arc-chain.ts` | viem 链对象与只读 client（从 `arc.ts` 抽出，供 signer 复用，避免循环依赖） |
| `src/lib/web5/payments/arc.ts` | 出款入口：5/25 上限 → 签名器就绪 → 热钱包上限 → 签名广播 |
| `tests/hot-wallet.test.ts` | 31 个用例：上限边界、签名器选择、KMS 契约、归集数学 |

---

## 1. 威胁模型

**现状**：签名私钥是 VPS 上的一个环境变量（`TREASURY_PAYOUT_PRIVATE_KEY`），
签名进程与 Web 进程在同一个容器里，同一个 shell 用户可读。

**一旦 VPS 被拿下，等于整个 treasury 被拿下。** 攻击者不需要经过本应用：

1. `cat .env` / `pm2 env` / `/proc/<pid>/environ` / 备份 / 镜像层 / CI 日志，任一渠道拿到私钥；
2. 在自己的节点或公共 RPC 上构造一笔 `to = 攻击者地址, value = 全部余额` 的原生 USDC 转账；
3. 5/25 上限、`PayoutLedger` 幂等、进程内串行化**全部无效**——它们只约束「本应用的出款路径」，
   而攻击者根本不经过本应用。

**单次损失上限 = 当时 treasury 余额。** 因此在本轮隔离落地前，唯一可用的缓解是压低余额，
这正是本代码新增的两道闸：

- `HOT_WALLET_MAX_USDC`（默认 **20**）：余额超过上限时，应用**拒绝任何出款**（先归集再说）；
- `planSweep()`：算出「超过 reserve 的部分」应归集到冷地址多少，包括给 gas 留头寸——但**只算不签**。

**这不等于「已隔离」，只是把爆炸半径从「全部余额」压到「≤ 20 USDC」。**
清单 4.3 在 KMS/远程签名真正上线、VPS 上的私钥被删除之前**不能打勾**。

非目标：本模块不改变托管（escrow）收款地址、不改变 80/20 分账、不引入任何自动出款或自动归集。

---

## 2. 三个可选方案

| 方案 | 隔离级别 | 运维成本 | 对本仓库的改动 | 主要失败模式 |
|---|---|---|---|---|
| **A. KMS / 远程签名服务**（AWS KMS `ECC_SECG_P256K1`、GCP KMS、自建 HSM 后端 + signer sidecar） | 私钥**永不离开** KMS/HSM，VPS 只持有一个受策略约束的调用凭据 | 中：一个 sidecar + IAM 策略 + 凭据轮换 | **本次已实现的正是这一半**：`RemoteKmsSigner`（HTTP，无密钥、无密码学） | sidecar 被打穿 ⇒ 仍可签名（但受 KMS 策略、限额与白名单约束）；凭据泄露同理 |
| **B. 专用 HSM**（CloudHSM / YubiHSM / 离线签名机） | 最高：物理隔离，密钥不可导出 | 高：硬件采购、机房/托管、固件与备份 | 只需一个 `RemoteKmsSigner` 兼容的本地 sidecar；无新代码 | 单点硬件故障、备份丢失、操作复杂带来的人为错误 |
| **C. 多签 / 账户抽象**（Safe 2-of-3、ERC-4337、Circle Modular Wallets） | 高：单把钥匙不足以动钱，且可加日限额模块 | 中高：链上部署、签名人协调、恢复流程 | 需要改出款路径（Safe 交易而非 EOA 转账）+ 托管合约的 `from` 语义 + E1–E5 证据口径 | 签名人同时失联/被攻破；模块升级权被夺；改动面大，需重新验证整条结算链路 |

选择顺序建议：**A 先落地（今天就能接）→ 视余额规模再评估 C**。B 只在有合规硬要求时上。

---

## 3. 本代码启用了什么

**已启用（只新增，不改默认行为）**

1. `PayoutSigner` 抽象：
   ```ts
   interface PayoutSigner {
     kind: 'local-key' | 'remote-kms';
     address(): Promise<Address>;
     sendNativeUsdc(to: Address, amount: bigint): Promise<TxHash>;
   }
   ```
   - `LocalKeySigner`：**与今天逐字节等价**——同一个 `TREASURY_PAYOUT_PRIVATE_KEY` 派生的 viem 账户、
     同样的 `maxFeePerGas 25 gwei / maxPriorityFeePerGas 2 gwei`、同样校验「私钥地址 == treasury 地址」。
   - `RemoteKmsSigner`：只发 HTTP，不持有密钥、不自造密码学。任一必需变量缺失或 URL 非法时抛出
     带 `code` 的 `PayoutSignerError`，**绝不回退到本地私钥**。
2. `resolveSigner()` / `assertPayoutSignerReady()`：KMS 变量存在即走远程（半配置也算「意图远程」，
   宁可 fail closed 也不静默用 VPS 私钥）；否则走本地。
3. `describeSigner()`：给 `/api/daemon/health` 之类的只读上报用，返回
   `{ active, source, ready, remote: {requested, urlConfigured, tokenConfigured, addressConfigured, missingEnv}, local: {...}, chainId, treasuryAddress }`。
   **不返回私钥、token、URL**。
4. 出款前的热钱包余额闸：`sendNativeUsdc()` 在签名之前读 treasury 原生 USDC 余额并调用
   `checkHotWalletCeiling()`，拒绝时返回 `code: 'CAP_HOT_WALLET'`（HTTP 409）；余额读不到则
   `code: 'BALANCE_UNAVAILABLE'`（503，fail closed）。
5. `planSweep({ balance, reserve, coldAddress })`：纯函数，返回归集金额与保留金额，**不签名、不广播**。

**明确没做（也刻意不做）**

- 没有任何 cron / 定时任务 / 自动归集 / 自动出款；三个资金开关与 `SETTLEMENT_CRON_SECRET` 保持未设置。
- 没有实现签名服务本身（sidecar 在仓库外），没有任何 AWS/GCP SDK 依赖。
- 没有多签/AA 改造。
- 余额闸是「**持有上限**」：余额超限时连合法出款也会被拒，直到归集完成——这是有意的
  「先降暴露面，再出款」策略。

---

## 4. 环境变量（精确）

| 变量 | 默认 | 由谁读 | 说明 |
|---|---|---|---|
| `TREASURY_PAYOUT_PRIVATE_KEY` | 空 | `LocalKeySigner` | 今天的路径。**KMS 上线后必须从 VPS 删除**。 |
| `KMS_SIGNER_URL` | 空 | `RemoteKmsSigner` | 远程签名端点（完整 URL）。必须 `https://`；仅 loopback sidecar 允许 `http://127.0.0.1`。 |
| `KMS_SIGNER_TOKEN` | 空 | `RemoteKmsSigner` | `Authorization: Bearer <token>`。轮换时只换它。 |
| `KMS_SIGNER_ADDRESS` | 空 | `RemoteKmsSigner` | 可选。设置后 `address()` 可用，并在发款前校验它等于 treasury 地址（不匹配 → `KMS_ADDRESS_MISMATCH`）。 |
| `HOT_WALLET_MAX_USDC` | `20` | `checkHotWalletCeiling` | 热钱包持有上限。**只能调低**（> 20 被夹到 20）；非法值回落 20。 |
| `HOT_WALLET_SWEEP_RESERVE_USDC` | `5` | `planSweep` | 归集时保留的运营头寸（含 gas）。低于 0.1 USDC 的 reserve 会被 `planSweep` 拒绝（`RESERVE_BELOW_GAS_HEADROOM`）。 |

**默认行为不变**：不设置任何 `KMS_*` 时 `resolveSigner()` 返回 `LocalKeySigner`，
生产出款路径、错误文案、gas 参数与今天完全一致（`TREASURY_PAYOUT_PRIVATE_KEY` 缺失/不匹配时的
拒绝理由也保持一致）。

判定规则（`remoteSignerRequested()`）：

| `KMS_SIGNER_URL` | `KMS_SIGNER_TOKEN` | 生效签名器 |
|---|---|---|
| 空 | 空 | `local-key`（今天的路径） |
| 有 | 有 | `remote-kms` |
| 有 | 空 | `remote-kms` → 抛 `KMS_NOT_CONFIGURED`（**不回退**） |
| 空 | 有 | `remote-kms` → 抛 `KMS_NOT_CONFIGURED`（**不回退**） |

---

## 5. KMS 服务端契约（v1）

`RemoteKmsSigner` 只发一个请求：

```http
POST {KMS_SIGNER_URL}
Authorization: Bearer {KMS_SIGNER_TOKEN}
Content-Type: application/json

{
  "to": "0x1111111111111111111111111111111111111111",
  "amount": "2500000000000000000",
  "chainId": 5042
}
```

```json
200 { "txHash": "0x…64 hex…" }
```

语义：

- `to`：已做校验和地址化的 20 字节地址；`amount`：原生 USDC 的 **wei 十进制字符串**
  （Arc 上 USDC 为 18 位小数，用字符串避免 JSON 浮点误差）；`chainId`：`5042`（主网）。
- 服务端必须**自己完成广播**并只在这笔交易被接受后返回 `txHash`；本进程随后自行
  `waitForTransactionReceipt`（1 确认，120s）并核对状态。
- 30s 超时（`KMS_REQUEST_TIMEOUT_MS`）。非 2xx、超时、非 JSON、`txHash` 不合法 → 一律
  抛 `PayoutSignerError`（`KMS_REQUEST_FAILED` / `KMS_BAD_RESPONSE`），**拒绝出款，绝不本地补签**。
- 建议 sidecar 侧独立再校验一遍：`chainId == 5042`、`amount ≤ 24.99 USDC`、`to` 白名单/黑名单、
  调用方来源 IP、token 轮换；并**自己**记录每笔请求（本应用只记 `PayoutLedger`）。
- **幂等性缺口（已知）**：请求体没有 idempotency key。一次超时后的重试可能造成服务端
  重复签名，所以 sidecar 应把短时间内 `(to, amount)` 相同的请求视为同一意图并要求人工确认，
  或直接实现请求去重。这一项属于外部 sidecar 的责任，列入第 7 节。

---

## 6. 迁移 runbook（KMS)

> 全程三个资金开关保持关闭；每一步都可以停下来回滚。

0. **先降暴露面**：用 `planSweep()` 求出归集金额（例如余额 30 USDC、reserve 5 → 归集 25），
   由人（冷钱包/多签/离线签名机）手动执行，确认 treasury 余额 ≤ `HOT_WALLET_MAX_USDC`。
   本仓库**没有**归集执行器，这是刻意的。
1. **建密钥**：在 KMS/HSM 中创建 secp256k1（`ECC_SECG_P256K1`）不可导出私钥；记录其
   Ethereum 地址（`keccak(pubkey)[12:]`），确认它等于 `getTreasuryAddress()`。
   如果要换新 treasury 地址，先改 `TREASURY_ADDRESS` / `ESCROW_VAULT_ADDRESS` 并同步
   `public/.well-known/agent.json`、`/api/market/*` 等发现文件（它们有逐条比对测试）。
2. **部署 sidecar**（仓库外）：实现第 5 节契约，只允许 VPS egress 访问，强制 HTTPS/token，
   打开自己的限额与白名单，写结构化审计日志。
3. **影子验证**：设置 `KMS_SIGNER_URL` / `KMS_SIGNER_TOKEN` / `KMS_SIGNER_ADDRESS` 到**非生产**
   实例，`describeSigner()` 应返回 `{ active: 'remote-kms', ready: true }`；用最小金额
   （如 0.01 USDC）跑一笔真实出款，核对 `txHash`、`blockNumber`、`PayoutLedger` 行。
4. **切生产**：生产实例设置同样三个变量 → 重启 → `describeSigner().ready === true`。
   此时 `TREASURY_PAYOUT_PRIVATE_KEY` 已被完全忽略，但**还在进程环境里**。
5. **删私钥**：从 VPS 的 `.env` / pm2 / 备份 / 部署脚本中删除 `TREASURY_PAYOUT_PRIVATE_KEY`，
   重启，确认 `describeSigner().local.keyConfigured === false`。**这一步做完，4.3 才算代码侧闭环。**
6. **观察**：`NO_SIGNER` / `KMS_REQUEST_FAILED` / `CAP_HOT_WALLET` 计数、出款失败率、
   treasury 余额与 `PayoutLedger` 累计是否一致（偏差必须为 0）。
7. **回滚**：清空 `KMS_SIGNER_URL` / `KMS_SIGNER_TOKEN` 即可回到本地私钥路径——
   代价是重新引入 P0，只应在 sidecar 故障时短暂使用，并立即记录事件。
   注意**不要只删其中一个**：半配置会让出款严格失败（fail closed），这是设计而非 bug。

---

## 7. 仍然阻塞在外部输入（4.3 不能打勾的原因）

1. **KMS/HSM 账号与密钥**：AWS KMS（或 GCP KMS / CloudHSM / YubiHSM）的账号、计费、
   `ECC_SECG_P256K1` 可用性确认；密钥创建与 IAM 策略（只允许 sign，禁止 export）。
2. **签名 sidecar**：实现、部署主机、网络策略（仅 VPS 可访问）、TLS 证书/内网地址、
   `KMS_SIGNER_TOKEN` 的生成与轮换周期、sidecar 侧的限额与去重实现。
3. **冷钱包地址与保管人**：多签/硬件钱包地址、签字人数与流程；`planSweep` 的 `coldAddress`
   目前只能由人工传入。
4. **归集执行者**：谁来批准并执行归集（人肉多签 / 离线签名），以及归集频率与阈值
   （`HOT_WALLET_SWEEP_RESERVE_USDC` 的最终取值）。
5. **私钥与 treasury 地址的去留**：是继续用现有 EOA 私钥导入 KMS，还是生成新地址并迁移
   （涉及 `TREASURY_ADDRESS`、`ESCROW_VAULT_ADDRESS`、发现文件与文档的同步）。
6. **是否走多签/AA**：影响托管合约的 `from` 校验、E1–E5 证据口径和整条结算链路的重新验证，
   需要产品/合规决策，本轮未做。
7. **灰度授权**：真实出款（哪怕 0.01 USDC）需要主网资金与人工批准；三个资金开关与
   `SETTLEMENT_CRON_SECRET` 仍然按计划保持未设置。
8. **第三方复核**：`signer.ts` / `arc.ts` 出款路径的安全复核（尤其是 KMS 凭据泄露后的
   损失上限是否仍被 KMS 侧限额兜住）。

---

## 8. 测试

`tests/hot-wallet.test.ts`（31 个用例，冻结环境：无网络、无真实签名）：

- 余额上限：恰好等于 20 USDC 放行；**超过 1 wei 拒绝**（`HOT_WALLET_CEILING_EXCEEDED`）；
  余额不足 1 wei 拒绝；金额 ≤ 0 拒绝；env 只能调低、不能抬到 20 以上；十进制解析/格式化无浮点。
- 签名器选择：无 KMS 变量 → `local-key`；URL+token → `remote-kms`；**只有 URL 或只有 token
  时严格失败、不回退**（且不发任何 fetch）；远程失败不回退本地；`txHash` 非法/非 2xx 拒绝；
  明文 http（非 loopback）拒绝；`describeSigner()` 不泄露 token/URL。
- 本地签名器：测试私钥派生出 treasury 地址；缺失/不匹配/非法参数分别抛
  `LOCAL_KEY_MISSING` / `LOCAL_KEY_TREASURY_MISMATCH` / `INVALID_RECIPIENT` / `INVALID_AMOUNT`。
- 归集数学：超 reserve 部分全归集；18 位小数逐 wei 精确（`amount + remaining == balance`）；
  恰好在 reserve 与低于 reserve 都是 no-op；1 wei 差额走 `BELOW_MIN_SWEEP`（不发尘埃交易）；
  reserve 低于 gas 头寸拒绝；`HOT_WALLET_SWEEP_RESERVE_USDC` 生效；冷地址非法拒绝。
