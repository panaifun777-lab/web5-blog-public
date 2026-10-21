# Web5.blog 智能合约

全球首个分身原生博客平台的核心合约，部署到 **Base Sepolia** 测试网。

## 合约清单

| 合约 | 文件 | 职责 |
|------|------|------|
| `VesselAuth` | `contracts/VesselAuth.sol` | 容器登录授权（四步握手 Step 3/4） |
| `BudgetFence` | `contracts/BudgetFence.sol` | AP2 微支付预算控制（三道闸） |
| `ContentNFT` | `contracts/ContentNFT.sol` | 内容确权 NFT（ERC-721 + ERC-2981） |

## 超级管理员

```
0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
```

拥有 `DEFAULT_ADMIN_ROLE`，可：
- 授权/撤销 MINTER_ROLE（ContentNFT）
- 授权/撤销 BLOG_NODE_ROLE（VesselAuth）
- 紧急冻结 Vessel（BudgetFence）
- 授权/撤销博客节点

## 部署步骤

### 1. 安装 Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. 安装依赖

```bash
cd /home/z/my-project/contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 DEPLOYER_PRIVATE_KEY
# 从 https://www.alchemy.com/faucets/base-sepolia 领取测试 ETH
```

### 4. 编译合约

```bash
forge build
```

### 5. 部署

```bash
bun add viem dotenv
bun run scripts/deploy.ts
```

### 6. 验证合约（可选）

```bash
forge verify-contract <CONTRACT_ADDRESS> src/VesselAuth.sol:VesselAuth \
  --chain base-sepolia \
  --api-key <BASCSCAN_API_KEY>
```

## 合约架构

```
┌─────────────────────────────────────────────────────┐
│                    Superadmin                       │
│         0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1  │
└────────┬────────────────┬────────────────┬─────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│   VesselAuth    │ │ BudgetFence  │ │ ContentNFT   │
├─────────────────┤ ├──────────────┤ ├──────────────┤
│ Session Key     │ │ Gate 1: Lock │ │ mint()       │
│ grant/revoke    │ │ Gate 2: Cap  │ │ batchMint()  │
│ verify          │ │ Gate 3: Rate │ │ getContent() │
│ activate        │ │ batchSettle  │ │ tokenURI()   │
│ freeze          │ │ freeze       │ │              │
└─────────────────┘ └──────────────┘ └──────────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────────────────────────────────────────┐
│           Base Sepolia (Chain ID: 84532)            │
└─────────────────────────────────────────────────────┘
```

## 权限模型

### VesselAuth
- `DEFAULT_ADMIN_ROLE`: superadmin — 授权/撤销 blog nodes
- `EIDOLON_OS_ROLE`: eidolonos.xyz 预言机 — grant/revoke Session Keys
- `BLOG_NODE_ROLE`: Web5.blog 节点 — 记录 Vessel 唤醒

### BudgetFence
- `DEFAULT_ADMIN_ROLE`: superadmin — 紧急冻结/解冻 Vessel
- `VESSEL_AUTH_ROLE`: VesselAuth 合约 — 设置 Budget
- `SETTLER_ROLE`: AP2 结算器 — 单笔/批量结算

### ContentNFT
- `DEFAULT_ADMIN_ROLE`: superadmin — 授权/撤销 MINTER
- `MINTER_ROLE`: Web5.blog 后端 — 铸造内容 NFT

## 安全特性

1. **ReentrancyGuard** — 所有涉及转账的函数防重入
2. **AccessControl** — RBAC 细粒度权限
3. **三道闸** — Scope Lock / Daily Cap / Decaying Auth
4. **紧急冻结** — superadmin 一键冻结恶意 Vessel
5. **批量操作** — batchMint / batchSettle 节省 Gas
6. **ERC-2981 版税** — 二次交易自动分账

## Basescan 验证

部署后访问：
- https://sepolia.basescan.org/address/<VESSEL_AUTH_ADDRESS>
- https://sepolia.basescan.org/address/<BUDGET_FENCE_ADDRESS>
- https://sepolia.basescan.org/address/<CONTENT_NFT_ADDRESS>
