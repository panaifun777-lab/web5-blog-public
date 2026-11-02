# KMS 运维手册（热钱包隔离的「变量到底放在哪」层）

> 适用范围：给**运维**看的落地手册——签名 sidecar 装在哪、每个变量填在哪个文件、怎么配对、怎么验证、怎么回滚。
> **设计/契约的权威来源是 `docs/HOT_WALLET.md`**：变量语义见其 §4，线上契约见其 §5，迁移五步见其 §6。
> 本文**不重述**那些内容，只做交叉引用；两文若有出入，以 `docs/HOT_WALLET.md` 为准。

相关文件（均为仓库内已存在代码）：

| 文件 | 本手册关心它的什么 |
|---|---|
| `src/lib/web5/payments/signer.ts` | `SIGNER_ENV` 常量、`describeSigner()`、`KMS_REQUEST_TIMEOUT_MS`（30s，非 env） |
| `src/lib/web5/payments/hot-wallet.ts` | `HOT_WALLET_MAX_USDC`（只能调低）、`HOT_WALLET_SWEEP_RESERVE_USDC` |
| `src/lib/web5/payments/arc.ts` | `PAYOUT_SINGLE_CAP_USDC`/`PAYOUT_DAILY_CAP_USDC` 与 24h 滚动上限（读 `PayoutLedger`） |
| `src/lib/web5/contracts/addresses.ts` | `TREASURY_ADDRESS`/`ESCROW_VAULT_ADDRESS` 运行时覆盖、Arc 链 RPC env |
| `src/app/api/daemon/health/route.ts` | 只读上报 `payoutSigner: describeSigner()` |

---

## 1. 两层签名链路

```
  ┌────────────────────────┐   env: KMS_SIGNER_URL/TOKEN/ADDRESS   ┌───────────────────────────┐   sidecar env: KMS_BACKEND / VAULT_* / KMS_TOKEN …
  │  Next 应用进程          │ ──── POST /sign (Bearer) ────────────► │  签名 sidecar              │ ───── 私有协议 ─────► 外部 KMS / HSM
  │  (LocalKey/RemoteKms)   │        http://127.0.0.1:8443 (loopback)│  kms-vault-signer.mjs     │                       (secp256k1 私钥永不落地)
  │  读的是「应用 env」      │  ◄──── { txHash } ──────────────────── │  读的是「sidecar env」     │
  └────────────────────────┘                                        └───────────────────────────┘
       不持有任何密钥材料；只发意图。                                     只在 127.0.0.1 监听；不对外发布端口。
```

- **应用侧**只看到 loopback URL + 一个 Bearer token；它读不到、也不需要 KMS 账号凭据。
- **sidecar 侧**才持有 `KMS_BACKEND`、Vault/AWS 凭据等；它把 §5 契约翻译成对 KMS 的调用并**自己完成广播**（见 HOT_WALLET §5）。
- 未设置任何 `KMS_*` 时应用走 `LocalKeySigner`（今天的生产路径，逐字节不变）；**半配置视为「意图远程」并 fail closed，绝不回退本地私钥**（判定表在 HOT_WALLET §4）。

---

## 2. KMS 后端选型（诚实版）

**关键坑**：社区版 / OSS HashiCorp Vault 的 Transit 引擎**不支持 secp256k1**（只有 `ecdsa-p256`/`ecdsa-p384`）。而 Ethereum/Arc 地址要求 secp256k1（`keccak(pubkey)[12:]`，见 HOT_WALLET §6 第 1 步）。**所以社区版 Vault 无法给本 sidecar 做后端**——选它会在校验密钥类型时直接失败。

| 方案 | secp256k1？ | sidecar 后端 | 应用侧改动 | 备注 |
|---|---|---|---|---|
| **AWS KMS**（`ECC_SECG_P256K1`） | ✅ 支持 | **待新增**（替换 `activeBackend`） | **无**（只改 sidecar） | 推荐：只签名、密钥不可导出、便宜、CloudTrail 全程审计 |
| **Vault Enterprise Transit** | ✅（企业版才支持 secp256k1） | 现有 `vault-transit` 后端 | 无 | 需企业授权；社区版不适用 |
| **本地 HSM**（如 YubiHSM2） | ✅ | 待新增专用后端 | 无 | 物理隔离、密钥不可导出；单点硬件风险见 HOT_WALLET §2 方案 B |

sidecar 里唯一可替换的部分是 `activeBackend.signPrehash(digestHex) -> {r,s}`（`kms-vault-signer.mjs` 第 60–64 行的注释即为此预留）；
**`KMS_BACKEND` 开关目前尚未实现**，默认后端就是 Vault Transit。选 AWS 时我会新增该开关与对应后端，
应用侧的三个变量（`KMS_SIGNER_URL`/`KMS_SIGNER_TOKEN`/`KMS_SIGNER_ADDRESS`）与 §5 契约都不变——AWS 后端只是 sidecar 里的「一小段新增」，不是应用改动。sidecar 端点、端口、TLS 由运维决定（HOT_WALLET §7 第 2 条列为外部输入）。

---

## 3. 变量在哪里设置：两个文件、两组变量

原则：**除仓库中性的环境变量名外，任何地方都不写生产密钥值**。两组变量落在两个不同的 600 权限文件里，互不越界。

### 3.1 应用运行时 env（Next standalone `.env`，权限 600，运行时读取）

应用进程**运行时**读取（不是构建时），因此改完只需**重启应用进程**，无需重新构建。

| 变量 | 由谁读（源码） | 说明（细节见 HOT_WALLET §4，勿在此重复取值规则） |
|---|---|---|
| `KMS_SIGNER_URL` | `RemoteKmsSigner`（signer.ts） | 必须等于 sidecar 的 `http://<bind>:<port>`；非 loopback 必须 `https` |
| `KMS_SIGNER_TOKEN` | `RemoteKmsSigner`（signer.ts） | Bearer token，等于 sidecar 的 `KMS_TOKEN` |
| `KMS_SIGNER_ADDRESS` | `RemoteKmsSigner`（signer.ts） | 等于金库地址，且等于 KMS 密钥派生地址（见 §3.3 不变式） |
| `TREASURY_PAYOUT_PRIVATE_KEY` | `LocalKeySigner`（signer.ts） | **切远程后必须从服务器删除**（§5 末步）；远程就绪时它被忽略 |

> `HOT_WALLET_MAX_USDC` / `HOT_WALLET_SWEEP_RESERVE_USDC` / `PAYOUT_SINGLE_CAP_USDC` / `PAYOUT_DAILY_CAP_USDC` / `TREASURY_ADDRESS` / `ESCROW_VAULT_ADDRESS` 也属这一组，取值语义以 HOT_WALLET §4 与源码为准，本文不重述。

### 3.2 sidecar env（`kms-signer.env`，紧邻 sidecar，权限 600，启动时 source）

这一组是 **sidecar 私有变量**，由仓库外的 `kms-vault-signer.mjs` 读取——**本仓库源码里没有定义它们**，名称以运维脚本为准，请勿把它们写进应用 env。

| 变量（sidecar 侧） | 默认 | 作用 |
|---|---|---|
| `VAULT_ADDR` | `http://127.0.0.1:8200` | Vault 服务地址 |
| `VAULT_TOKEN` | 空（**必填**） | 只允许 `transit/sign` 的 Vault token |
| `VAULT_TRANSIT_KEY` | `arc-treasury` | Vault 里的密钥名（必须是 secp256k1 类型） |
| `SIGNATURE_ALGORITHM` | `ecdsa-secp256k1` | 请求 Vault 时声明的签名算法 |
| `KMS_TOKEN` | 空（**必填**） | 与 `KMS_SIGNER_TOKEN` 必须相等的 Bearer 值；为空时 sidecar 直接 503 fail closed |
| `KMS_SIGNER_ADDRESS` | 空（**必填**） | KMS 公钥对应的 0x 地址；用于校验签名恢复出的 yParity 命中金库座位 |
| `KMS_BIND` / `KMS_PORT` | `127.0.0.1` / `8443` | 监听地址/端口；**只绑 loopback** |
| `KMS_MAX_PAYOUT_USDC` | `24.99` | sidecar 侧独立限额（HOT_WALLET §5 建议 ≤ 24.99） |
| `KMS_ALLOWED_TO` | 空=不限 | 逗号分隔的收款地址白名单（小写匹配） |
| `KMS_SIGNER_TIMEOUT_MS` | `30000` | sidecar 自身请求超时 |
| `KMS_BACKEND` | **尚未实现** | 计划中的 `vault` \| `aws` 开关；当前只有 Vault Transit 后端 |

（以上名称与默认值取自 `ops/money/kms-vault-signer.mjs` 的 `CONFIG` 块；sidecar 另有只读 `GET /healthz`，不含任何凭据。）
Arc RPC 由 `getActiveChain()` 读取（应用侧 `ARC_MAINNET_RPC`/`ARC_TESTNET_RPC`，见 addresses.ts），sidecar 复用同一份 `ops-common.mjs` 逻辑。

生成配对 token（应用 `KMS_SIGNER_TOKEN` 与 sidecar `KMS_TOKEN` 用同一个值；**不要把输出贴进 git/文档/聊天**）：

```bash
head -c 32 /dev/urandom | base64 | tr -d '\n='
```

### 3.3 三条配对不变式（不满足即 fail closed）

1. **URL 一致**：应用 `KMS_SIGNER_URL` == `http://` + sidecar `KMS_BIND` + `:` + `KMS_PORT`（loopback 允许 http；跨机必须 https）。
2. **Token 一致**：应用 `KMS_SIGNER_TOKEN` == sidecar `KMS_TOKEN`（不等则 sidecar 返 401，应用抛 `KMS_REQUEST_FAILED`）。
3. **地址双等**：应用 `KMS_SIGNER_ADDRESS` **既等于金库地址**（`getTreasuryAddress()`，默认 `0xCA36335845E382129167fC44243F07A76827bA22`，运行时可被 `TREASURY_ADDRESS` 覆盖）**又等于 KMS 密钥派生的地址**；不符则 `sendNativeUsdc()` 抛 `KMS_ADDRESS_MISMATCH`（signer.ts）。

### 3.4 硬链接坑（构建共享 inode）

若 env 文件是**硬链接**（`cp -al` 复制出的多个 build 共享同一 inode），**就地编辑会静默改掉另一个 build 的文件**。改前先断链，改后核对：

```bash
stat -c '%n links=%h' /path/to/.env /path/to/kms-signer.env   # links>1 即仍在共享
cp -p .env .env.bak && rm .env && $EDITOR .env.bak && mv .env.bak .env  # 断链：拷出→删原→改副本→放回
```

---

## 4. 上线前验证（顺序不可颠倒）

1. **只读快照**：`describeSigner()`（或 `GET /api/daemon/health` 的 `payoutSigner` 字段）必须报告
   `active: 'remote-kms'` 且 `ready: true`，`remote.missingEnv` 为空数组。
   该上报**不含私钥、token、URL**（signer.ts 注释与 HOT_WALLET §3 保证）；若它出现疑似密钥字段，停手排查。
2. **非生产最小金额**：在**非生产实例**（`NEXT_PUBLIC_ACTIVE_CHAIN=arc-testnet` + 一次性 `TREASURY_ADDRESS`/`ESCROW_VAULT_ADDRESS`，见 addresses.ts 注释）用极小金额跑一笔真实出款，核对返回的 `txHash`、区块、账本行。
3. **切生产**：生产实例设同样三个 `KMS_*` → 重启 → `describeSigner().ready === true`。此时 `TREASURY_PAYOUT_PRIVATE_KEY` 已被忽略，**但还留在进程环境里**。
4. **闭环 4.3 的最后一步**：从服务器 `.env` / pm2 / 备份 / 部署脚本**删除 `TREASURY_PAYOUT_PRIVATE_KEY`** → 重启 → 确认 `describeSigner().local.keyConfigured === false`。
   **只有这一步做完，安全清单 4.3 才算真正闭环**（HOT_WALLET §6 第 5 步的落地动作）。

---

## 5. 运维脚本快查（三个仓库外脚本，默认一律 dry-run）

均位于 `web5-ops/`（本地）与 `/root/ops/`（VPS），**默认 DRY-RUN，仅 `--authorize` 才动钱或动网络**。

```bash
# 契约自检：完全离线，比对 §5 请求/响应形态与签名，不联网、不动钱
node kms-vault-signer.mjs --contract-check

# 归集：默认只「规划」，用与 planSweep 相同的数学；--authorize 才发送
node sweep-cold-wallet.mjs --to <coldAddress> [--reserve <usdc>]                      # 读链上余额，只打印计划
node sweep-cold-wallet.mjs --to <coldAddress> --balance <usdc>                        # 离线预演数学，不联网
node sweep-cold-wallet.mjs --to <coldAddress> --reserve <usdc> --signer kms --authorize   # 真正归集

# 出款：escrow / arweave 两个子命令，均先 dry-run；--signer 选签名来源（local|kms）
node web5-payout.mjs escrow  --to <addr> --amount <usdc> [--balance <usdc>]           # 打印意图 + 热钱包上限检查
node web5-payout.mjs escrow  --to <addr> --amount <usdc> --signer kms --authorize     # 显式授权才发送
node web5-payout.mjs arweave --file <path> | --text "..." [--authorize]               # 授权才上链，成功打印 43 位 arweaveHash
```

- **离线数学预演**：`--balance <usdc>` 让脚本不联网也能复算归集额/上限判定，等价于 `planSweep()` 与 `checkHotWalletCeiling()`。
- ⚠️ **CLI 不写 `PayoutLedger`**：因此它**不执行 24h 滚动上限**（`PAYOUT_DAILY_CAP_USDC` 只在应用 `checkPayoutCaps()` 里生效，见 arc.ts）。这三个脚本**只用于「人工授权」的手动出款/归集**；**日常结算必须走应用**，否则失去滚动上限保护。
- `--signer kms` 走 §5 契约（需 sidecar 在跑）；`--signer local` 需本地私钥，仅用于回滚演练，**不应用于生产**。

---

## 6. 回滚与安全红线

**回滚**（回到本地私钥路径，代价是重新引入 P0，仅在 sidecar 故障时短暂使用并记事件，见 HOT_WALLET §6 第 7 步）：
把 `KMS_SIGNER_URL` 与 `KMS_SIGNER_TOKEN` **一起清空**。
**只清一个 = 半配置 = 出款严格失败（fail closed），这是设计不是 bug**——切勿只删其一「试试能不能跑」。

安全红线（不可协商）：

- 密钥值**绝不**出现在代码 / git / 文档 / 日志 / 聊天里；文档与提交只写变量名，不写取值。本文亦不含任何真实密钥、私钥或占位式的「看似凭据」串。
- sidecar **只绑 loopback**（`KMS_BIND=127.0.0.1`），**防火墙/安全组不得把该端口对外发布**；跨机访问须走 mTLS/内网而非公网暴露。
- **token 轮换只换 token（`KMS_SIGNER_TOKEN`+`KMS_TOKEN` 同步换），不换密钥**；换密钥是 HOT_WALLET §6 的迁移动作，另走审批。
- 资金开关 `MONEY_FLOWS_ENABLED` / `ESCROW_PAYOUTS_ENABLED` / `REFUNDS_ENABLED` 与 `SETTLEMENT_CRON_SECRET` **在主获授权前保持未设置**（flags.ts、`src/app/api/cron/settle/route.ts`；HOT_WALLET §3 明确不引入任何自动出款/归集）。

---

## 7. 仍阻塞在外部输入（4.3 暂不能打勾的原因）

- **KMS 账号 + 建密钥**：AWS KMS（或 Vault Enterprise / HSM）开通、计费、`ECC_SECG_P256K1` 可用性确认、只 sign 禁 export 的策略（HOT_WALLET §7 第 1 条）。
- **冷钱包地址 + 保管人**：`--to <coldAddress>` 的冷地址目前只能人工提供；多签/硬件钱包与签字流程待定。
- **金库密钥/托管去留**：现有 EOA 私钥导入 KMS，还是生成新地址并迁移 `TREASURY_ADDRESS`/`ESCROW_VAULT_ADDRESS` 及发现文件。
- **一笔真实 escrow 交易**、**一个真实 Arweave txid**：端到端证据链尚未跑通。
- **72h 灰度**：`SETTLEMENT_WINDOW_HOURS=72` 的灰度授权与人工批准。
- **供应商确认源 IP 永久**：若走 IP 白名单（HOT_WALLET §5 建议），需确认出口 IP 长期不变。

上述任一项缺失时，本文所有步骤都停在「只读验证 / dry-run」，不得 `--authorize`。
