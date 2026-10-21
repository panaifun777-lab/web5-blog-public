# 合约部署后续 FAQ — 使用与管理指南

> 生成日期：2026-07-02 15:04 | 网络：Base Sepolia (Chain ID: 84532)

---

## Q1：同步脚本被清理，对当前系统是否有影响？

**没有影响。** 原因如下：

1. **VPS 上的文件不受影响** — 被覆写/清理的 `gen-sync.mjs`、`sync-script.sh` 等文件仅在**本地电脑**上。VPS 上的项目文件/数据库/合约地址均已正确写入，且 `npm run dev` 正在运行。

2. **下次需要同步时**，只需要从本地重新生成同步脚本即可（因为本地源文件 `src/` 目录完好无损）。

4. **需要特别注意** — `.env` 文件也被清理了。本地 `.env` 文件现在内容为 `# Cleaned after deployment`。你需要从 Git 仓库或备份中恢复 `.env` 文件。

---

## Q2：合约地址已经生成，我该如何使用？

### 2.1 合约地址总览

| 合约 | 地址 | 用途 |
|------|------|------|
| **VesselAuth** | `0xf17161a988d0ab6c98befde028856de9438bc23d` | 容器登录授权、Session Key 管理 |
| **BudgetFence** | `0x73ea340172572276357d2d5746270ef0296b4552` | AP2 微支付预算控制（USDC 三闸） |
| **ContentNFT** | `0x91e1d74af5bf714988b4eb9afd51e8354dec0879` | 内容确权 NFT 铸造 |

### 2.2 前端引用

合约地址已被写入：
```
src/lib/web5/contracts/addresses.ts
```

前端通过 `import { ADDRESSES } from '@/lib/web5/contracts/addresses'` 读取这些地址。

### 2.3 手动使用（Basescan 验证 / 合约交互）

登录 [Base Sepolia Basescan](https://sepolia.basescan.org/)，搜索合约地址，即可：
- 读取合约状态（调用 `view` / `read` 函数）
- 执行写操作（`write` 函数需要连接钱包）
- 查看交易历史 / 事件日志

**VesselAuth 关键操作**（可通过 Basescan Write Contract 执行）：
- `authorizeBlogNode(address)` — 授权博客节点
- `grantRole(role, account)` — 授予管理员角色

**BudgetFence 关键操作**：
- `setDailyLimit(vessel, amount)` — 设置每日上限
- `pause() / unpause()` — 紧急暂停

### 2.4 关于 USDC 地址问题

你问的 `0x036cbd53842c5426634e7929541ec2318f3dcf7e` 是 Base Sepolia 网络上的 **USDC 代币合约地址**，不是你部署的合约。

```
USDC address: 0x036cbd53842c5426634e7929541ec2318f3dcf7e
```

这个地址的**私钥不需要你管理** — 它是 Circle 公司部署的官方 USDC 合约，你的 BudgetFence 合约只是**引用**这个地址来做转账操作。

**BudgetFence 的工作原理：**
```
用户 → BudgetFence 合约 → USDC 合约 → 收款方
```
BudgetFence 持有 USDC 授权后，调用 USDC 合约的 `transferFrom` 完成支付。你对 USDC 合约本身不需要私钥。

**你真正需要管理的是：**
| 需要管理 | 说明 |
|----------|------|
| **超级管理员地址私钥** | `0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1` — 你的管理钱包，可以调用 BudgetFence 的设置函数 |
| **部署者私钥** | ⚠️ 已在本地清理痕迹。建议安全保存（密码管理器 / 硬件钱包）。此钱包持有超管角色 |
| **IRYS_PRIVATE_KEY** | Arweave 上传私钥（尚未配置） |

### 2.5 日后管理建议

| 场景 | 操作 | 工具 |
|------|------|------|
| 设置每日预算上限 | `BudgetFence.setDailyLimit()` | Basescan Write / ethers.js |
| 暂停微支付 | `BudgetFence.pause()` | Basescan Write |
| 添加/移除管理员 | `VesselAuth.grantRole()` | Basescan Write |
| 查看 Vessel 统计 | `VesselAuth.getStats()` | Basescan Read |
| 铸造 ContentNFT | 通过前端 Write 页面 | Web5.blog 写作界面 |

> ⚠️ **安全建议**：部署者私钥（`9608d47a...`）当前拥有超级管理员权限。建议：
> 1. 用部署者钱包调用 `grantRole()` 将管理员角色授予一个**多签钱包**（如 Gnosis Safe）
> 2. 部署者私钥离线冷存储，日常操作使用多签钱包

---

## Q3：从 Base Sepolia 测试网迁移到 Base 主网的准备工作

### 3.1 迁移清单

| 序号 | 任务 | 状态 | 重要性 |
|------|------|------|--------|
| 1 | **准备主网部署者钱包**（有 ETH 主网 Gas） | ❌ 未开始 | 🔴 必须 |
| 2 | **获取主网 USDC 地址**（Base 主网 vs Base Sepolia 不同） | ❌ 未准备 | 🔴 必须 |
| 3 | **重新部署所有合约**到 Base 主网 | ❌ 未部署 | 🔴 必须 |
| 4 | **在 Basescan 验证合约源码** | ❌ 未验证 | 🟡 推荐 |
| 5 | **配置主网 RPC**（推荐 Alchemy / QuickNode） | ❌ 未配置 | 🟡 推荐 |
| 6 | **更新 .env 到主网配置** | ❌ 未更新 | 🔴 必须 |
| 7 | **恢复本地 .env 文件**（从备份） | ❌ 已清理 | 🔴 必须 |
| 8 | **安全加固**（多签管理员 / 时间锁） | ❌ 未开始 | 🟢 可选 |

### 3.2 详细步骤

#### Step 1：恢复本地 .env

本地 `.env` 文件已被清理。你需要从以下任一来源恢复：
- Git 历史（如果之前提交过）
- 你的密码管理器
- 手动重新创建

所需的环境变量（参考 `gen-sync.mjs` 中的内容）：

```bash
# 数据库
DATABASE_URL=file:./db/prod.db

# Vessel Token 签名密钥
VESSEL_TOKEN_SECRET=<一个足够长的随机字符串>

# Mock 模式（主网时设为 false）
NEXT_PUBLIC_MOCK_VESSEL=true

# 邀请码
INVITE_CODE=WEB5-ALPHA-001
NEXT_PUBLIC_INVITE_CODE=WEB5-ALPHA-001

# Twitter OAuth（留空使用模拟模式）
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# 主网迁移后添加：
# BASE_MAINNET_RPC=https://base.llamarpc.com
```

#### Step 2：准备主网部署钱包

```bash
# 需要准备：
# 1. 一个新的钱包私钥（或复用现有，推荐用硬件钱包）
# 2. 该钱包持有至少 0.1 ETH 在 Base 主网用于 Gas
# 3. 建议金额：0.5-1 ETH（3 个合约部署费约 0.02-0.05 ETH）
```

#### Step 3：获取主网 USDC 地址

| 网络 | USDC 地址 | 备注 |
|------|-----------|------|
| Base Sepolia | `0x036cbd53842c5426634e7929541ec2318f3dcf7e` | ✅ 已知 |
| **Base 主网** | **`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`** | **官方 USDC** |
| Base 主网（替代） | `0xd9aAEc86B65D86f6A7B5B1b0c42ffA531710b6CA` | USDbC（桥接版） |

你的 BudgetFence 合约使用 USDC 做微支付，主网部署时传入上述官方 USDC 地址。

#### Step 4：修改部署脚本

修改 `contracts/scripts/deploy.ts` 中的配置：

```typescript
// 从
const RPC_URL = 'https://sepolia.base.org';
const chain = baseSepolia;

// 改为
const RPC_URL = 'https://base.llamarpc.com';  // 或你的 Alchemy/QuickNode RPC
const chain = base;  // 从 'viem/chains' 导入
```

#### Step 5：重新部署

```bash
cd contracts
forge build                          # 重新编译
bun run scripts/deploy.ts             # 部署到 Base 主网
```

#### Step 6：在 Basescan 验证合约源码

```bash
# 方法一：使用 forge verify-contract
forge verify-contract \
  --chain-id 8453 \
  --verifier-url https://api.basescan.org/api \
  --api-key $BASESCAN_API_KEY \
  0x你的合约地址 \
  contracts/VesselAuth.sol

# 方法二：在 Basescan 网页手动验证
# https://basescan.org/verifyContract
```

#### Step 7：更新前端合约地址

部署完成后，将主网合约地址写入：
```typescript
src/lib/web5/contracts/addresses.ts

// 更新 CHAIN 配置：
export const CHAIN = {
  id: 8453,  // Base 主网 Chain ID
  name: 'Base Mainnet',
  rpcUrl: 'https://base.llamarpc.com',
  explorer: 'https://basescan.org',
} as const;
```

#### Step 8：设置 VPS 生产环境

```bash
# 1. 更新 .env
NEXT_PUBLIC_MOCK_VESSEL=false  # 关闭 Mock
TWITTER_CLIENT_ID=...          # 配置真正的 Twitter OAuth

# 2. 重新构建（本地构建后上传 .next 到 VPS）
npm run build                    # 在本地（8GB+ RAM）构建
# 然后将 .next/standalone 上传到 VPS

# 3. 使用 PM2 启动生产模式（替代 npm run dev）
pm2 delete web5-blog
PORT=3000 pm2 start .next/standalone/server.js --name web5-blog
pm2 save
```

### 3.3 主网部署成本估算

| 项目 | 成本 |
|------|------|
| 3 合约部署 Gas | ~0.02-0.05 ETH（约 $50-150） |
| Basescan 验证 | 免费 |
| VPS 月费 | ~$10-25/月 |
| Arweave 存储 | ~$5-25/月 |
| Twitter API | ~$100/月（Free tier 仅限 500 条/月） |

### 3.4 安全建议（主网前完成）

```
1. ✅ 部署者私钥离线冷存储
2. ✅ 管理员角色转移给多签钱包
3. ✅ BudgetFence 设置合理的每日限额
4. ✅ VesselAuth 授权可信的博客节点
5. ✅ 配置 UFW 防火墙 + Fail2ban（VPS）
6. ✅ SSH 切换为密钥登录
7. ⚠️ 建议添加 OpenZeppelin Defender 监控
```

---

*Generated by OpenClaw AI Agent | 2026-07-02*
