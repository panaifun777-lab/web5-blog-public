# Web5.bog / Web5.blog 链上合约与代币部署档案 (官方公证书)

> 部署时间：2026-10-15  
> 部署钱包 / 超级管理员：`0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1`  
> 官方域名：web5.bog / web5.blog

---

## 💎 一、官方原生代币 ($WBOG) 生成报告

**结论：代币已于 Circle ARC 主网（Chain ID: 5042）成功生成发行！**

| 参数项 | 链上真实数据 | 说明 |
|--------|--------------|------|
| **代币名称 (Name)** | **Web5 Bog Token** | 品牌与生态原生代币 |
| **代币代码 (Symbol)** | **WBOG** | 全大写标准 ASCII 编码，防混淆 |
| **代币精度 (Decimals)** | **18** | 与 Arc 公链原生精度对齐 |
| **发行总量 (Total Supply)** | **1,000,000,000 WBOG (10 亿枚)** | 链上代码固定上限，不可增发 |
| **初始持仓归属** | **0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1** | **持有 10 亿枚 (100% 归属创世钱包)** |
| **主网合约地址** | `0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f` | Arc Mainnet 真实链上合约 |
| **销毁机制 (Burnable)** | ✅ 已启用 | 协议网关手续费的 50% 可直接调用销毁 |
| **所有权控制 (Ownership)** | `Ownable2Step` | 支持移交多签或 `renounceOwnership` 锁权 |
| **区块浏览器查验** | [explorer.arc.io/token/0x5be2d3f16d...](https://explorer.arc.io/token/0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f) | 实时公开验证 |

### 🎨 代币图标说明
- **矢量图标路径**：`public/tokens/wbog.svg`
- **本地访问地址**：`http://localhost:3000/tokens/wbog.svg`
- **线上访问地址**：`https://web5.blog/tokens/wbog.svg`（或 `https://web5.bog/tokens/wbog.svg`）
- **TokenList 标准库**：已托管于 `public/tokenlist.json`，已关联该图标 URI，可直接提交至 DEX 聚合器与轻钱包。

---

## 📜 二、Circle ARC 主网（Arc Mainnet, Chain ID: 5042）全部合约地址

| 合约名称 | 链上真实合约地址 | 部署交易哈希 (Tx Hash) | 核心功能 |
|----------|------------------|------------------------|----------|
| **WBOGToken** | `0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f` | `0x2f9d5ce768019072a2ca7b8a8f1b6547ac0f3dacf4b08c8361c27cbd7106af1a` | 平台生态与治理代币 |
| **ContentNFT** | `0x8537fe7268296f37c2f85f9aad992f11659d1c8a` | `0x0ef3551b3e373d56b639f412d892c94a96c20a809855aab8e9b4c04d6e16b838` | 博客文章确权 NFT (ERC-721 + ERC-2981) |
| **BudgetFence** | `0xe0d246c09d7a3097bab3148f89201157dd531eea` | `0xa095ff384f8ef1aeb2c6200e1bc6bc74ebf6bd709e50b6b34972513449b406c0` | AP2 微支付三道闸预算控制 |
| **VesselAuth** | `0x2d4aebbd5d3e318c0deb91f927019835ecd9a120` | `0x6fb871e556ff27f92d929d1cc2e33c2bf146e42e9927e48dbaae9512f0662685` | 容器授权、四步握手与 Session Key 校验 |

---

## 🧪 三、Circle ARC 测试网（Arc Testnet, Chain ID: 5042002）演练合约地址

| 合约名称 | 测试网合约地址 | 作用 |
|----------|----------------|------|
| **WBOGToken** | `0xb3f174ae34b4273ae6dfd4488327c1d1784d35eb` | 测试网演练代币 |
| **ContentNFT** | `0x7c3b4a0b96231569948580fee9cacf249eef9b06` | 测试网文章铸造确权 |
| **BudgetFence** | `0x6d2b033bec90760773d15faaab3ab02a7230d020` | 测试网微支付预算模拟 |
| **VesselAuth** | `0xb0375be87f3a8ebb7006ec2be8aac789d71bdc26` | 测试网容器握手 |

---

## 💰 四、Gas 手续费消耗审计

- **部署前钱包 Gas 余额**：`3.0410 USDC`
- **部署后钱包 Gas 余额**：`2.8823 USDC`
- **总部署成本**：仅消耗 **0.1587 USDC**，资金利用效率极高，完全在 3U 预算内平稳落地！
