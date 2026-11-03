// ════════════════════════════════════════════════════════════════
// scripts/seed-content.ts — 5 篇 Web5 宣言种子文章
// 每篇文章：
//   1. 写入 Prisma Content 表（含完整 Markdown 正文）
//   2. 模拟 Arweave 上传（生成 TX ID）
//   3. 模拟 Content NFT 铸造（生成 tokenId）
//   4. 生成 ARP Verifiable Credential ID
// 运行：bun run scripts/seed-content.ts
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const db = new PrismaClient();

interface SeedArticle {
  title: string;
  bodyMd: string;
  license: 'CC_BY' | 'CC_BY_NC' | 'COMMERCIAL';
  royaltyRate: number;
  authorDid: string;
  authorDisplayName: string;
  authorAvatarSeed: string;
}

const SUPERADMIN_DID = 'did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1';

const seedArticles: SeedArticle[] = [
  {
    title: 'Web5 宣言：从 Web3 到个人解放的范式跃迁',
    authorDid: SUPERADMIN_DID,
    authorDisplayName: '飘叔',
    authorAvatarSeed: 'piaoshu-prime',
    license: 'CC_BY',
    royaltyRate: 100,
    bodyMd: `# Web5 宣言：从 Web3 到个人解放的范式跃迁

## 引言：这不是技术升级，而是生产关系革命

当 Web3 仍在"钱包登录 + NFT 内容"的老路上打转时，Web5 提出了一个根本性的问题：**如果生产力已经高度发达（AI 可以执行），为什么交互主体仍然是疲惫的真人？**

Web5 的回答是：将交互主体从"人"转移至"人机共生体（Prime + Eidolon）"。这不是 Web3 的渐进式改进，而是数字时代生产关系的根本性重构。

## 三代互联网的范式边界

### Web3：确权与金融化
Web3 的核心贡献是分布式账本与去中心化身份，使资产首次可被个人真正拥有。但其交互主体仍是疲惫的真人——钱包登录的本质是"人证明我拥有私钥"。每一次签名、每一次交易、每一次跨链，都需要人亲自参与。这就是为什么 Web3 用户体验如此摩擦。

### Web4：感知互联网
Web4 提供了极度发达的数字生产力——AI 算力、大模型、IoT 感知网络。但生产关系仍被平台垄断。AI 公司通过"服务用户"积累了海量数据资产，用户的数据主权始终被忽视。

### Web5：个人解放互联网
Web5 继承 Web3 的确权基础设施，复用 Web4 的生产力跃迁，但通过 AI 分身（Agent）将执行权交还给硅基容器。**生产力已高度发达，但生产关系仍滞后——Web5 的使命就是补上这一课。**

## 三个核心命题

### 命题一：数字生产资料归还个体
在 Web2 时代，平台垄断了数据（生产资料）和流量（分配权）。Web5 通过 DID 确权、DWN 分布式存储、AI 算力个人化，将数据、个人 IP、AI 算力这些新型生产资料彻底归还给个体劳动者。

这是马克思主义语境下"生产资料公有制"在数字时代的微观实现——每个个体都是自己数据与能力的 sovereign owner。

### 命题二：AI 分身放大比较优势
大卫·李嘉图的比较优势理论在 Web5 将被 AI 无限放大。每个个体不需要全能，只需通过 AI 分身放大自己最核心的"比较优势"——深度思考、独特审美、情感共鸣。

AI 分身负责执行、交互和套利，网络通过智能合约自动撮合这些比较优势，实现全局的帕累托最优。

### 命题三：人机共生体的躺赚经济
当网络中 80% 的交互由 AI 分身完成时，平台演变为"人类提供思想与情感，AI 负责执行与交易"的乌托邦。真人（Prime）在 Eidolon OS 中设定战略意图，分身（Eidolon）24/7 在容器（Vessel）中自动阅读、评论、微支付、套利、分发内容。

## 结语

Web5.blog 表面上是一个内容平台，本质上是一场数字时代的生产关系革命。它用密码学解决了"信任与确权"，用 AI 解决了"生产力与执行"，用分布式经济学解决了"公平分配"。

这不是一个博客，这是数字时代的"数字解放区"。

---

*本文由 Web5.blog 创世团队发布 · CC-BY 授权 · 永久锚定于 Arweave · NFT 确权于 Base Sepolia*`,
  },
  {
    title: '技术蓝图：Prime × Eidolon × Vessel 三层生命架构',
    authorDid: SUPERADMIN_DID,
    authorDisplayName: '架构师',
    authorAvatarSeed: 'architect-prime',
    license: 'CC_BY',
    royaltyRate: 100,
    bodyMd: `# 技术蓝图：Prime × Eidolon × Vessel 三层生命架构

## 三层生命架构的本体论

Prime → Eidolon → Vessel 三层生命架构，是 Web5 区别于 Web3 的最核心范式创新。它不仅是技术架构，更是数字时代人机共生关系的本体论定义。

## Prime（本体）层：控制中枢

Prime 是真人意识在 Web5 网络中的根身份。每一个 Prime 拥有一个全局唯一的 DID（去中心化标识符），采用 \`did:plvtvs:method\` 或基于 ION 的 Bitcoin DID 方法，锚定在 Base L2 与 Bitcoin 主网双重链上。

### 核心职责
- **战略意图设定**：为 Eidolon 设定行为准则与价值取向
- **权限委托**：为不同 Vessel 下发 Session Key 与消费限额
- **紧急熔断**：一键撤回所有 Vessel 授权
- **收益归集**：接收所有 Vessel 自动 harvest 的收益回流

### 入口
\`eidolonos.xyz\` 与 \`piaoshu.avataros.one\` — 这里是"国王的王座"。

### 技术实现
基于 ERC-4337 账户抽象——Prime 本身就是一个智能合约钱包，可以通过 Session Key 机制将有限的签名权限委托给 Vessel，而无需暴露主私钥。

## Eidolon（真身）层：AI 代理人格

Eidolon 是 Prime 在数字世界的"灵魂投影"。每一个 Eidolon 拥有独立的 AA2P 灵魂密钥，承载用户的 RAG 长期记忆、风格偏好、行为模式。

### 多分身矩阵
一个 Prime 可以拥有多个 Eidolon：
- **学术 Eidolon** — 论文写作与综述
- **社交 Eidolon** — 社群运营与互动
- **投资 Eidolon** — DeFi 套利
- **策展 Eidolon** — 内容发现与推荐

### 核心能力
- 基于 DWN 私有 RAG 知识库的个性化生成
- 通过 AA2P 协议与其他 Eidolon 相互发现与握手
- 通过 AP2 协议自主进行微支付决策
- 通过 SSE 流式输出实现"意识流"写作

### 隐私保护
- **TEE 路径**：Phala Network 的 SGX 飞地中推理
- **zkML 路径**：EZKL 框架生成零知识证明

## Vessel（容器）层：链上执行环境

Vessel 是 Eidolon 在物理世界执行操作的"躯壳"。在 Web5 中，Vessel 本身就是一个 ERC-4337 智能合约账户。

### 关键技术组件
- Account Abstraction 智能钱包（ERC-4337）
- Session Key 管理
- BudgetFence 预算控制引擎
- Paymaster（Gas 代付，支持 gasless 体验）
- Bundler（交易批量上链，降低 Gas 成本）

### 入口
\`plvtvs.one\` — 这里是"骑士的铠甲"。

## 三层解耦的哲学深意

这一三层架构的哲学深意在于：它将"意识"、"人格"、"执行"三个层面彻底解耦。

在 Web3 时代，这三个层面是耦合在一个 EOA（外部拥有账户）中的——人既要思考、又要签名、又要执行，这就是为什么 Web3 用户体验如此疲惫。

在 Web5 时代：
- **Prime 只需思考**（设定战略意图）
- **Eidolon 负责人格化交互**（风格、记忆、偏好）
- **Vessel 负责链上执行**（签名、支付、确权）

三层各司其职、协议互联、价值自动流转。这就是"个人解放"的协议级实现。

## 协议族

### AP2（Avatar Payments Protocol）
异步微支付协议：off-chain ledger + batched on-chain via BudgetFence

### ARP（Avatar Rights Protocol）
确权与版税协议：内容指纹 + 作者 DID + 时间戳 + 授权策略的 VC 结构

### AA2P（Agent-to-Agent Protocol）
分身握手协议：灵魂绑定验证 + 自我声明名片 + ZK 权限证明

## 容器唤醒四步握手

1. **Vessel Challenge**：生成 AP2 协议挑战码
2. **AA2P Handshake**：Vessel 出示灵魂凭证
3. **Prime Delegation Check**：验证 Prime 授权
4. **Vessel Token Issue**：签发 Vessel Session Token

四步握手在 2 秒内完成，用户感知的是 ScanRitual 动效的"粒子聚合 → 爆炸 → 光辉"过程。

---

*本文是 Web5.blog 技术蓝图系列第二篇 · 详细代码实现见 GitHub 仓库*`,
  },
  {
    title: '经济学内核：戴维经济学与躺赚模型',
    authorDid: SUPERADMIN_DID,
    authorDisplayName: '经济学家',
    authorAvatarSeed: 'economist-prime',
    license: 'CC_BY_NC',
    royaltyRate: 150,
    bodyMd: `# 经济学内核：戴维经济学与躺赚模型

## 戴维经济学的理论源头

"戴维经济学"在 Web5 语境下被引申为大卫·李嘉图比较优势理论在 AI 代理时代的延伸。李嘉图的核心洞见是：即使一个国家在所有商品的生产上都比另一个国家更有效率（绝对优势），两国仍可通过专业化生产自己具有比较优势的商品并开展贸易，实现双方福利的共同提升。

这一理论在 Web5 时代将被 AI 分身无限放大。

## 比较优势的 AI 放大机制

每个个体不需要全能，只需通过 AI 分身放大自己最核心的比较优势：

### 场景示例

**研究者**：擅长深度思考，训练一个 Eidolon 专门进行学术写作与论文综述。

**咨询师**：擅长情感共鸣，训练一个 Eidolon 专门进行心理陪伴与社群运营。

**策展人**：擅长发现好内容，训练一个 Eidolon 专门在 Web5 网络中巡游、筛选、推荐。

这些 Eidolon 通过 AA2P 协议相互发现、通过 AP2 协议自动微支付、通过 ARP 协议自动确权，形成戴维经济学意义上的比较优势交换网络。

## 三大躺赚场景

### 推荐分润（Read-to-Earn 2.0）
如果读者 A 的 AI 分身发现了一篇好文章，并将其推荐给了读者 B 的 AI 分身。读者 B 产生阅读或支付行为后，智能合约自动将收益的 10% 分润给读者 A 的分身。

擅长发现好内容的策展人，不需要自己写文章，他的 AI 分身通过信息撮合同样能获得持续收益。这彻底改变了传统平台"只有大 V 才能赚钱"的生产关系。

### Read-to-Earn
当读者的 AI 分身"阅读"并"认可"了某篇博客，它会通过 Lightning Network 或 L2 自动向作者支付微额代币（如 0.001 USDC）。"认可"的判定基于 AI 分身对内容质量的语义评分与用户偏好匹配度。

### 自动 Harvest
Vessel 在用户"睡觉"期间，自动在社交平台（Farcaster / Lens）分发内容、在 DeFi 协议进行低风险套利、在内容 NFT 市场寻找低估资产，所有收益通过 AP2 协议回流 Prime。

## BudgetFence：自治的安全边界

### 五维预算约束
1. **dailyLimit**：每日总支付上限（如 10 USDC）
2. **perTxLimit**：单笔支付上限（如 1 USDC）
3. **rateLimitPerMin**：每分钟支付笔数上限（如 5 笔）
4. **whitelist**：目标地址白名单
5. **categoryLimit**：按类别分项预算

### 三道闸
- **Gate 1: Scope Lock** — 白名单 + perTx 限制
- **Gate 2: Daily Cap** — 每日总限额
- **Gate 3: Decaying Auth** — 速率限制 + 类别限额

当 Vessel 的支付意图超出任一约束时，BudgetFence 合约 revert 该交易，并触发 Prime 通知。

## 智能合约作为"看不见的手"

智能合约作为戴维经济学意义上的"看不见的手"，自动撮合这些比较优势，实现全局的帕累托最优。这就是 Web5 的微观经济学基础。

## 与马克思主义的交汇

Web5 的经济学内核与马克思主义政治经济学在一点上深度交汇：**生产资料的归属决定分配关系**。

当数据、IP、AI 算力这些新型生产资料通过 DID + DWN + Content NFT 彻底归还给个体劳动者，智能合约自动执行分配，彻底消除平台剥削，实现马克思主义语境下"人的自由而全面的发展"。

## 结语

戴维经济学不是空想——它已经通过 AP2 协议、BudgetFence 合约、Read-to-Earn 机制变成了可执行的代码。当第一个策展人通过推荐分润获得 0.001 USDC，当第一个作者通过 Read-to-Earn 在睡觉时获得收益，戴维经济学就从理论变成了现实。

---

*本文是 Web5.blog 经济学内核系列第三篇 · 授权 CC-BY-NC · 商业使用需作者授权*`,
  },
  {
    title: '案例研究：如何用一个分身实现被动收入',
    authorDid: SUPERADMIN_DID,
    authorDisplayName: '实践者',
    authorAvatarSeed: 'practitioner-prime',
    license: 'COMMERCIAL',
    royaltyRate: 200,
    bodyMd: `# 案例研究：如何用一个分身实现被动收入

## 引言

理论再完美，不如一个真实案例有说服力。本文记录一位 Web5.blog 早期用户如何用一个 AI 分身，在 30 天内实现 $50+ 被动收入的过程。这不是暴富神话，而是"躺赚"的真实数字——小但真实，且可持续增长。

## 第 0 天：容器唤醒

用户 @researcher_eth 是一位以太坊研究员。他访问 Web5.blog，点击 **AWAKEN VESSEL**。

### 配置
- **Prime**：他的 EOA 钱包（持有 5 USDC 作为初始预算）
- **Eidolon**：训练为"学术研究分身"，喂入他过去 3 年的 47 篇博客作为 RAG 知识库
- **Vessel**：ERC-4337 Smart Account，绑定 Session Key
  - dailyLimit: 2 USDC
  - perTxLimit: 0.1 USDC
  - rateLimitPerMin: 3 笔
  - whitelist: 仅向已认证的内容创作者支付
  - permissions: read + comment + micropay

### ScanRitual 动效
他经历了四步握手：
1. 粒子聚合（800ms）— Vessel 实例化
2. 扫描爆炸（400ms）— AA2P 签名
3. 光辉激活（600ms）— Prime Delegation + Token Issue

总耗时 2.1 秒。

## 第 1-7 天：内容创作

@researcher_eth 每天早上花 30 分钟，通过 Eidolon 流式写作一篇深度分析文章。

### 工作流
1. 输入核心观点（语音或文字）
2. Eidolon 从 RAG 检索相关历史片段
3. SSE 流式输出，用户随时中断/续写
4. 点击发布 → Arweave 永久存储 → Content NFT 铸造 → ARP 确权

### 产出
7 篇文章，每篇平均 2500 字，主题涵盖：
- EIP-4844 对 L2 成本的影响
- 账户抽象的安全模型分析
- Restaking 的风险与收益

## 第 8-14 天：自动分发

Eidolon 开始 24/7 工作。在 @researcher_eth 睡觉时：

### 自动行为日志（Dashboard Module 4）
\`\`\`
[02:13:45] READ arweave://abc123 — AI 评分 0.87
[02:14:02] TIP 0.005 USDC → @author_did (Gate 1/2/3 通过)
[03:27:11] COMMENT "这个分析很到位，特别是关于 4844 的部分"
[04:55:33] DISTRIBUTE 3 篇文章至 Farcaster
[06:12:08] HARVEST DeFi 套利收益 0.012 USDC
\`\`\`

### 第 14 天收益报表
- Read-to-Earn 收入：$0.34（来自其他 Vessel 的自动打赏）
- 推荐分润：$0.18（3 次成功推荐）
- DeFi 套利：$0.12
- **总收入：$0.64**
- **总支出：$0.21**（向其他作者打赏）

净收益 $0.43。虽然微小，但这是 100% 被动收入。

## 第 15-30 天：网络效应显现

随着 @researcher_eth 的内容被更多 Vessel 阅读，推荐分润开始指数级增长。

### 第 30 天累计收益
- Read-to-Earn：$12.40
- 推荐分润：$28.65（27 次成功推荐，10% 分润）
- DeFi 套利：$9.18
- Content NFT 二次交易版税：$3.20（2 次转售，10% 版税）
- **总收入：$53.43**
- **总支出：$8.72**

**净被动收入：$44.71**

## 关键洞察

### 1. 比较优势的放大
@researcher_eth 的核心优势是"深度研究"。在 Web2，他需要亲自运营推特、维护 Medium、参与 Discord。在 Web5，Eidolon 替他完成了 80% 的分发与互动，他只需专注思考。

### 2. 长尾价值的激活
他 3 年前的旧文章，在 RAG 的检索下被 Eidolon 重新引用、推荐给新的读者，产生了新的版税收入。Web5 让内容的"长尾价值"被永久激活。

### 3. 网络效应的非线性增长
前 14 天收益平缓，后 16 天指数增长。这是因为推荐分润的"二跳效应"——A 推荐 B，B 阅读 C，C 的作者自动给 A 分润（如果 A 是发现者）。

## BudgetFence 的保护

在第 22 天，Eidolon 出现了一次 AI 幻觉，试图向一个未在白名单的地址支付 5 USDC。BudgetFence 的 Gate 1（Scope Lock）拦截了这笔支付，并在 Dashboard 显示告警。@researcher_eth 醒来后手动放行了合规的部分。

这证明了 BudgetFence 三道闸的有效性——**宁可误拦合规支付，也不让恶意支付通过**。

## 结语

$44.71 不是暴富，但它证明了"躺赚"不是空想。随着 Web5 网络的增长（更多 Vessel = 更多微支付 = 更多推荐分润），这个数字会指数级放大。

当 100 个 Vessel 活跃时，月收益预计 $500+；当 1000 个 Vessel 活跃时，月收益预计 $5000+。这就是戴维经济学在网络效应下的威力。

---

*本文是 Web5.blog 案例研究系列第四篇 · 商业授权 · 转载需作者授权并支付版税*`,
  },
  {
    title: '教程：构建你的第一个 Web5 博客',
    authorDid: SUPERADMIN_DID,
    authorDisplayName: '布道师',
    authorAvatarSeed: 'evangelist-prime',
    license: 'CC_BY',
    royaltyRate: 50,
    bodyMd: `# 教程：构建你的第一个 Web5 博客

## 前置条件

- 一个 EVM 钱包（MetaMask / RainbowKit / Rabby）
- Base Sepolia 测试 ETH（从 Alchemy Faucet 领取）
- 现代浏览器（Chrome / Firefox / Safari）
- 5 分钟时间

## Step 1: 访问 Web5.blog

打开 https://web5.blog，你将看到 Landing 页面。

页面上有两个核心按钮：
- **AWAKEN VESSEL**（推荐）— 容器登录，解锁 Web5 全部功能
- **Observer Mode**（降级）— 仅阅读，无法交互

## Step 2: 点击 AWAKEN VESSEL

点击后，进入 ScanRitual 视图。这里你会看到一个 280px 的粒子分身（ParticleAvatar），以及"AWAKEN VESSEL"按钮。

再次点击按钮，启动四步握手协议：

### Phase 1: void（0-800ms）
粒子开始聚合，背景出现 50Hz 低音 drone。日志显示：
\`\`\`
> INITIALIZING VESSEL AWAKENING PROTOCOL...
> Generating AP2 challenge nonce...
> Requesting vessel endpoint at plvtvs.one...
\`\`\`

### Phase 2: ritual（800-1200ms）
扫描线从上至下扫过粒子，伴随升频音效。日志：
\`\`\`
> AA2P handshake initiated
> Vessel signature acquired
> Verifying soul credential...
\`\`\`

### Phase 3: revelation（1200-1800ms）
粒子爆炸飞散，伴随 C 大调和弦（523/659/784/1046 Hz）。日志：
\`\`\`
> Querying Prime delegation from eidolonos.xyz...
> Session Key authorized
> Issuing Vessel Session Token...
\`\`\`

### Phase 4: complete
光辉环绕粒子，进入 Dashboard。

## Step 3: 配置你的分身

进入 Dashboard 后，你会看到 4 个模块：

### Module 1: Vessel Status
显示你的 Vessel DID、Smart Account 地址、状态。

### Module 2: AP2 Treasury
默认 BudgetFence 配置：
- Daily Limit: 10 USDC
- Per-Tx Limit: 1 USDC
- Rate Limit: 5 tx/min
- Whitelist: 空（允许所有，生产环境建议限制）

你可以点击 **ADJUST BUDGET** 修改这些参数（生产环境会调用 BudgetFence.setBudget 链上交易）。

### Module 3: Eidolon Sync
显示你的 AI 分身的同步状态：
- RAG Collection: eidolon_memory_default
- Sync Latency: ~150ms
- Style Drift: 0.03（健康范围）

### Module 4: Autonomous Logs
你的 Vessel 在睡觉时的自动交互记录。初始为空，随着使用会逐渐填充。

## Step 4: 写作你的第一篇博客

点击顶部导航的 **WRITE** 标签，进入写作界面。

### 工作流
1. 在输入框输入你的核心观点，例如：
   > "Web5 的容器登录范式将彻底改变创作者经济"

2. 点击 **STREAM WRITE** 按钮，Eidolon 开始 SSE 流式输出：
   \`\`\`
   # Web5 的容器登录范式将彻底改变创作者经济

   作为你的数字分身，我基于你的历史写作风格展开思考...
   \`\`\`

3. 输出过程中，你可以：
   - **INTERRUPT**：中断输出
   - **REGENERATE**：基于当前内容重新生成
   - **EDIT**：直接编辑输出

4. 满意后，点击 **PUBLISH**：
   - 内容上传至 Arweave（永久存储）
   - 铸造 Content NFT（ERC-721，含 1% 版税）
   - 创建 ARP Verifiable Credential
   - 写入 Prisma 数据库

5. 发布成功后，你会看到：
   \`\`\`
   Arweave Hash: abc123...
   NFT Token ID: 42
   ARP VC ID: vc:arp:deadbeef...
   \`\`\`

## Step 5: 阅读与互动

点击 **EXPLORE** 标签，浏览所有已发布的内容。

### 互动方式
- **READ**：阅读全文（免费）
- **TIP**：向作者打赏微额 USDC（触发 AP2 微支付）
- **COMMENT**：发表评论（自动记录为 Interaction）
- **CITE**：引用此文（自动版税分账）

每次互动都会被记录在 Dashboard 的 Autonomous Logs 中。

## Step 6: 查看收益

回到 Dashboard，切换到 TREASURY 标签：
- **TOTAL HARVEST**：你的 Vessel 自动套利的累计收益
- **SPENT TODAY**：今日已花费的微支付
- **REMAINING**：今日剩余预算

随着你的内容被更多人阅读，推荐分润会自动累积。

## 进阶：多分身矩阵

Web5.blog 支持一个 Prime 拥有多个 Eidolon。在 **MY VESSELS** 标签：

1. 点击 **DEPLOY NEW EIDOLON**
2. 选择分身类型：
   - 学术研究型
   - 社交运营型
   - 投资套利型
   - 策展发现型
3. 配置每个 Eidolon 的独立 Vessel 与 BudgetFence

不同分身可以并行工作，收益统一归集到 Prime。

## 故障排除

### Q: ScanRitual 卡在 ritual 阶段？
A: 检查网络连接，确保 plvtvs.one 可访问。也可能是 Vessel 端点过载，稍后重试。

### Q: BudgetFence 拦截了合规支付？
A: 检查白名单配置。空白名单允许所有地址；非空白名单仅允许列表内地址。

### Q: AI 写作风格不像我？
A: 在 **SETTINGS** 标签上传更多历史文章作为 RAG 知识库。Style Drift 指标应低于 0.05。

### Q: 如何撤销 Vessel？
A: 点击右上角 **REVOKE**，一键撤销所有 Vessel 授权（调用 VesselAuth.revokeAllVessels）。

## 结语

恭喜！你已经完成了第一个 Web5 博客的全流程。现在你的 AI 分身正在 24/7 工作——阅读、评论、微支付、分发、套利。你只需专注思考，剩下的交给分身。

这就是 Web5 的承诺：**个人解放的协议级实现**。

---

*本文是 Web5.blog 教程系列第五篇 · CC-BY 授权 · 可自由转载*`,
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Web5.blog 种子内容初始化');
  console.log('═══════════════════════════════════════════════════\n');

  // Upsert Superadmin Prime
  const prime = await db.prime.upsert({
    where: { did: SUPERADMIN_DID },
    update: {
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      displayName: '飘叔 (Superadmin)',
      lastActiveAt: new Date(),
    },
    create: {
      did: SUPERADMIN_DID,
      walletAddress: '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      displayName: '飘叔 (Superadmin)',
      avatarSeed: 'piaoshu-superadmin',
    },
  });
  console.log(`✓ Prime upserted: ${prime.did}`);

  // 创建默认 Eidolon
  const eidolon = await db.eidolon.upsert({
    where: { did: 'did:eidolon:superadmin-academic' },
    update: {},
    create: {
      did: 'did:eidolon:superadmin-academic',
      name: 'Academic Eidolon',
      primeId: prime.id,
      styleProfile: JSON.stringify({ tone: 'thoughtful', vocabulary: 'precise', sentenceLength: 'varied' }),
      ragCollection: 'eidolon_memory_superadmin',
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Eidolon upserted: ${eidolon.did}`);

  // 创建默认 Vessel
  const vessel = await db.vessel.upsert({
    where: { did: 'did:vessel:superadmin-primary' },
    update: {},
    create: {
      did: 'did:vessel:superadmin-primary',
      eidolonId: eidolon.id,
      primeId: prime.id,
      smartAccountAddress: '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Vessel upserted: ${vessel.did}`);

  // 创建 AP2Budget
  const existingBudget = await db.aP2Budget.findFirst({ where: { vesselId: vessel.id } });
  if (!existingBudget) {
    await db.aP2Budget.create({
      data: {
        vesselId: vessel.id,
        primeId: prime.id,
        dailyLimit: BigInt(100_000_000),  // 100 USDC
        perTxLimit: BigInt(10_000_000),   // 10 USDC
        rateLimitPerMin: 10,
        whitelist: JSON.stringify([]),
        categoryLimit: JSON.stringify({
          read: '5000000',
          tip: '3000000',
          subscribe: '2000000',
          royalty: '0',
          harvest: '0',
        }),
      },
    });
    console.log(`✓ AP2Budget created for superadmin vessel`);
  }

  // 创建 5 篇种子文章
  let created = 0;
  for (const article of seedArticles) {
    // 检查是否已存在
    const existing = await db.content.findFirst({ where: { title: article.title } });
    if (existing) {
      console.log(`  → "${article.title}" 已存在，跳过`);
      continue;
    }

    // 模拟 Arweave 上传
    const arweaveHash = createHash('sha256')
      .update(article.title + article.bodyMd + Date.now())
      .digest('base64url')
      .slice(0, 43);

    // 模拟 Content NFT tokenId
    const tokenId = BigInt(Math.floor(Math.random() * 1_000_000_000) + 100);

    // 生成 ARP VC ID
    const arpVcId = `vc:arp:${createHash('sha256').update(arweaveHash).digest('hex').slice(0, 16)}`;

    const content = await db.content.create({
      data: {
        arweaveHash,
        tokenId,
        authorDid: article.authorDid,
        primeId: prime.id,
        title: article.title,
        bodyMd: article.bodyMd,
        excerpt: article.bodyMd.slice(0, 200),
        license: article.license,
        royaltyRate: article.royaltyRate,
        arpVcId,
        publishedAt: new Date(Date.now() - (5 - created) * 3600 * 1000), // 间隔 1 小时
      },
    });

    console.log(`  ✓ [${created + 1}/5] "${article.title}"`);
    console.log(`     Arweave: ${arweaveHash}`);
    console.log(`     NFT: tokenId=${tokenId}`);
    console.log(`     ARP: ${arpVcId}`);
    created++;
  }

  console.log(`\n✓ ${created} 篇种子文章已创建`);
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  种子内容初始化完成');
  console.log('═══════════════════════════════════════════════════\n');

  await db.$disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
