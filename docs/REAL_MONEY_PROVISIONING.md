# 真实资金结算 · 供给清单（Go-Live Provisioning）

> 用途：从 beta 模拟身份 / 模拟资金，走向**真实资金结算**，需要由我（owner）逐项供给的外部依赖。
> 代码侧硬门槛已全部就位且默认 **fail-closed**（见 `src/lib/launch/flags.ts` 的 `realIdentityRequiredForMoney()`
> 与 `src/lib/web5/vessel-verifier.ts`）。在下面每一项填好之前，任何真实资金路径都不会打开。
>
> 使用方式：逐项勾选 ☐ → 填好对应值到 `.env`（VPS 在 `/root/web5.blog-buildNN/.env`，权限 600）→
> 重启 PM2 进程 → 用「验证」里的命令确认生效。

---

## 当前状态（2026-11-10，build27）

| 项 | 值 |
| --- | --- |
| `REAL_VESSEL_IDENTITY` | `false`（beta 模拟身份；`.env` 已补注释文档） |
| `MONEY_FLOWS_ENABLED` | `false` |
| `ESCROW_PAYOUTS_ENABLED` | `false` |
| `REFUNDS_ENABLED` | `false` |
| `SETTLEMENT_CRON_SECRET` | 未设置（→ `/api/cron/settle` 返回 503） |
| `EIDOLON_ORACLE_URL` / `EIDOLON_ORACLE_TOKEN` | 未设置（→ 新 Vessel 授权 fail-closed） |
| `KMS_SIGNER_URL` / `KMS_SIGNER_TOKEN` | 未设置（→ 本地无签名密钥，payoutSigner `ready:false`） |
| 国库私钥 / 真实 USDC | 无（VPS 上没有任何可动用资金的密钥） |

**结论**：默认零真实资金流动。下面的 5 项全部供给并验证后，才能灰度放行。

---

## 解锁顺序（依赖关系）

```
身份真源 (1 TEE + 2 预言机)  ──必须先行──▶  签名与资金 (3 KMS + 4 国库)
                                          │
                                          ▼
                              显式授权 (5 开关 + cron secret) ──最后打开──▶ 真实结算
```

- **阶段 A（身份）**：1 + 2 必须同时具备，否则 `REAL_VESSEL_IDENTITY=true` 会让真实签名/授权在缺配置时直接 fail-closed，反而登不上。
- **阶段 B（打款能力）**：3 + 4 必须同时具备，否则即便开关打开，`payoutSigner.ready=false` 或余额不足，每笔打款仍被拒绝。
- **阶段 C（授权）**：5 是总闸，建议先在测试网/小灰度（≤1 USDC，受 5/25 上限约束）验证后再全开。

---

## 1. plvtvs.one TEE —— 真实 AA2P 灵魂凭证签名密钥

- ☐ 提供 TEE 公钥（随 AA2P 凭证下发的 `aa2pPublicKey`，或单独的 `AA2P_PUBLIC_KEY`）。
- ☐ 在 `.env` 设置 `REAL_VESSEL_IDENTITY=true`。
- 涉及代码：`vessel-verifier.ts` 的 `verifyAA2PSignature()` —— 真实模式下用 viem `verifyMessage` 校验 `aa2pClaim.signature` 对规范化消息的签名；缺 TEE 公钥返回 `AA2P_KEY_UNCONFIGURED`，假签名返回 `SIGNATURE_INVALID`。
- **验证**：用真实 TEE 签发的 AA2P 凭证走 `POST /api/auth/vessel-login`，返回 session 中 `identityReal:true`；用伪造签名会得到 `AA2P_SIGNATURE_INVALID` / `SIGNATURE_INVALID`。

## 2. eidolonos.xyz 预言机 —— Prime 委托的链上真源

- ☐ 提供 `EIDOLON_ORACLE_URL=`（预言机 base URL）。
- ☐ 提供 `EIDOLON_ORACLE_TOKEN=`（Bearer token）。
- 涉及代码：`vessel-verifier.ts` 的 `queryPrimeDelegation()` —— 两者都设置才切换为真实预言机查询；任一缺失，新 Vessel 的 Prime 授权 fail-closed（`authorized:false, real:false`）。
- **验证**：新地址首次 `vessel-login` 时，`delegation.real=true` 且 `primeDid` 不再包含 `:sim-`；故意清空 token 时新 Vessel 授权被拒。

## 3. KMS / 热钱包隔离 —— 结算签名侧车

- ☐ 提供 `KMS_SIGNER_URL=` 与 `KMS_SIGNER_TOKEN=`（两者必须同设；半配置 fail-closed，绝不回退到本地私钥）。
- ☐（可选）`KMS_SIGNER_ADDRESS=` —— 开启国库地址匹配校验。
- 参考：`docs/KMS_OPS.md`、`docs/HOT_WALLET.md`（清单 4.3 热钱包隔离）。
- **验证**：`GET /api/daemon/health` 的 `payoutSigner` 变为 `source: remote, ready: true`；半配置（只给 url 或只给 token）仍为 `ready:false`。

## 4. 国库私钥 + 真实资金

- ☐ 提供 `TREASURY_PAYOUT_PRIVATE_KEY=`（本地签名密钥，**仅当未用 KMS 时**；上 KMS 后从 VPS 删除）**或** KMS 地址。
- ☐ 提供并充值真实 USDC 余额（Arc mainnet 5042，USDC 即 gas，热钱包需留少量浮点）。
- ☐ 确认 `TREASURY_ADDRESS=` / `ESCROW_VAULT_ADDRESS=` / `PLATFORM_FEE_ADDRESS=`（空 = 内置主网默认值）。
- ☐ 确认 `HOT_WALLET_MAX_USDC`（默认 20，env 只能调低）天花板内；`HOT_WALLET_SWEEP_RESERVE_USDC`（默认 5）留作 gas 浮点。
- ☐ 确认单笔/24h 上限：`PAYOUT_SINGLE_CAP_USDC=5`、`PAYOUT_DAILY_CAP_USDC=25`（超出被 clamp）。
- **验证**：`GET /api/daemon/health` 显示余额 > 0 且在天花板内；`PAYOUTLEDGER` 每笔落库、hash 即时持久化。

## 5. 显式授权 —— 三大资金开关 + 结算 cron

- ☐ `MONEY_FLOWS_ENABLED=true`（总闸；ap2/pay、ap2/settle 的总开关）。
- ☐ `ESCROW_PAYOUTS_ENABLED=true`（结算/打款放行；`settleOrder` 受此约束）。
- ☐ `REFUNDS_ENABLED=true`（退款放行；`refundOrder` 受此约束）。
- ☐ `SETTLEMENT_CRON_SECRET=`（设置后 `/api/cron/settle` 才接受调度，否则 503）。
- ☐（建议）先用 `SETTLEMENT_WINDOW_HOURS` 小值 + 测试网/≤1 USDC 灰度，再全开。
- **验证**：`GET /api/commerce/tasks` 三个 flag 变 `true`；带 secret 调 `POST /api/cron/settle` 返回 200；`POST /api/ap2/pay`（持真实 vessel 会话）不再被 `SIMULATED_IDENTITY_NO_MONEY` 拦截。

---

## 安全红线（开任何一项前自检）

- 所有密钥仅存在于 VPS `.env`（权限 600），**绝不**入库、不进聊天、不进公开快照。
- 真实签名密钥上 KMS 后，立即从 VPS 删除 `TREASURY_PAYOUT_PRIVATE_KEY`。
- 灰度首次真实打款前，跑 `scripts/e2e-settlement.mjs`（仅在 VPS 对本机回环端口、用临时 DB），确认 E1–E5 证据链与 5/25 上限。
- 每次开闸后回看 `docs/SETTLEMENT_ACCEPTANCE_CHECKLIST.md`，stage 3（测试网 E2E）与 stage 4（主网灰度）的阻断项是否全部解除。
