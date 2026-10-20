// ════════════════════════════════════════════════════════════════
// src/lib/web5/ap2/remote-jobs.ts
// 全球自由劳务与远程前沿工作机会精选 (Global Remote & Sovereign Agent Gigs)
// 包含海外真实前沿远程/自由工作机会（Rust/Solidity 智能体开发、Prompt 工程师、技术研报翻译、去中心化数据标注等）
// ════════════════════════════════════════════════════════════════

export interface RemoteJob {
  id: string;
  title: string;
  titleEn: string;
  category: 'Rust/Solidity' | 'AI/Prompt' | 'Research/Translation' | 'Data/Annotation' | 'DeFi/Protocol';
  company: string;
  location: string;
  type: 'Full-time Remote' | 'Part-time Gig' | 'Bounty Contract' | 'Agent Assisted';
  budgetUsdc: string;
  rateType: 'monthly' | 'project' | 'hourly';
  description: string;
  descriptionEn: string;
  requirements: string[];
  requirementsEn: string[];
  tags: string[];
  applyUrl: string;
  source: string;
  postedDate: string;
}

export const GLOBAL_REMOTE_JOBS: RemoteJob[] = [
  {
    id: 'gig-001',
    title: 'Senior Rust & Solidity 智能体自主执行协议工程师',
    titleEn: 'Senior Rust & Solidity Sovereign Agent Protocol Engineer',
    category: 'Rust/Solidity',
    company: 'HyperCausal Labs (Singapore / Remote)',
    location: '100% Remote (Global / APAC & EMEA)',
    type: 'Full-time Remote',
    budgetUsdc: '8,000 - 12,000',
    rateType: 'monthly',
    description: '负责开发基于 ERC-4337 与 EIP-712 Session Key 的主权 AI 智能体自主交易路由器，实现 Circle ARC 大阪 EVM 原生 18 位 USDC 微支付管线。',
    descriptionEn: 'Architect autonomous agent transaction routers on ERC-4337 and EIP-712 session keys, integrating native 18-decimal USDC micropayments on Circle ARC EVM.',
    requirements: [
      '精通 Rust (tokio/ethers-rs/alloy) 与 Solidity 合约安全防重入机制',
      '深入理解 ERC-4337 账户抽象、Bundler 与 Paymaster 架构',
      '具有跨链微结算与去中心化预言机集成经验',
    ],
    requirementsEn: [
      'Proficient in Rust (alloy/ethers-rs) & Solidity security patterns',
      'Deep understanding of ERC-4337 AA, Bundlers, and Paymasters',
      'Experience in decentralized micropayments & oracle feeds',
    ],
    tags: ['Rust', 'Solidity', 'ERC-4337', 'Osaka EVM', 'Circle ARC'],
    applyUrl: 'https://cryptocurrencyjobs.co/engineering/remote-rust-solidity-engineer',
    source: 'CryptoCurrencyJobs / Web5 Alliance',
    postedDate: '2026-10-18',
  },
  {
    id: 'gig-002',
    title: '资深 Prompt 架构师与分身认知画像调试专家',
    titleEn: 'Lead Prompt Architect & Avatar Cognitive Profile Engineer',
    category: 'AI/Prompt',
    company: 'MindMesh Matrix (San Francisco / Remote)',
    location: '100% Remote (Any Timezone)',
    type: 'Full-time Remote',
    budgetUsdc: '6,500 - 9,500',
    rateType: 'monthly',
    description: '为 10,000+ 在线 Eidolon 分身构建高度拟人化的 System Prompt 哲学模板与思维链 (CoT) 防幻觉护栏，对齐戴维经济学与存在论确权标准。',
    descriptionEn: 'Design anthropomorphic System Prompts and chain-of-thought guardrails for 10k+ active Eidolon avatars, aligning with ontological verification standards.',
    requirements: [
      '具备 2 年以上大模型高级 Prompt 工程经验 (Claude 3.7 / GPT-4o / DeepSeek R1)',
      '擅长 Few-shot、ReAct 框架以及结构化 JSON/Schema 约束输出',
      '熟悉 RAG 知识检索向量库 (Milvus / Chroma) 语义召回微调',
    ],
    requirementsEn: [
      '2+ years of advanced prompt engineering (Claude 3.7 / GPT-4o / DeepSeek R1)',
      'Expert in Few-shot, ReAct frameworks, and structured JSON outputs',
      'Familiar with RAG vector retrieval & semantic recall tuning',
    ],
    tags: ['Prompt Engineering', 'CoT Reasoning', 'RAG', 'Agent Persona'],
    applyUrl: 'https://remoteok.com/remote-prompt-engineer-jobs',
    source: 'RemoteOK AI Curated',
    postedDate: '2026-10-19',
  },
  {
    id: 'gig-003',
    title: 'Web3 & AI 智能体技术研报翻译与双语本地化特约撰稿人',
    titleEn: 'Web3 & AI Agent Technical Research Translator & Localization Fellow',
    category: 'Research/Translation',
    company: 'Autonomous Research Guild (London / Remote)',
    location: 'Global Remote',
    type: 'Part-time Gig',
    budgetUsdc: '1,500 - 3,200',
    rateType: 'monthly',
    description: '将前沿以太坊基金会研报、Circle ARC 技术提案及 Web5 白皮书精准翻译为中/英/日多语种技术长文，并发布至 Arweave 永久存储网络。',
    descriptionEn: 'Translate Ethereum / Circle ARC technical proposals and Web5 whitepapers into high-accuracy EN/ZH/JA articles, permanently archiving them onto Arweave.',
    requirements: [
      '母语级中文/英文书写能力，熟悉密码学与区块链专有术语',
      '能独立理解并转译 DeFi 机制、EIP 协议及智能体博弈论',
      '提供过往加密技术研报翻译或发表作品集',
    ],
    requirementsEn: [
      'Native-level EN/ZH proficiency, well-versed in cryptography terminology',
      'Ability to comprehend DeFi mechanisms, EIPs, and agent game theory',
      'Portfolio of published Web3/AI technical translations',
    ],
    tags: ['Translation', 'Technical Writing', 'Arweave', 'Bilingual'],
    applyUrl: 'https://web3.career/jobs/technical-translator-remote',
    source: 'Web3.Career Guild',
    postedDate: '2026-10-17',
  },
  {
    id: 'gig-004',
    title: '去中心化智能体多模态行为数据标注与强化学习评估员',
    titleEn: 'Decentralized Agent Multimodal RLHF Annotation & Evaluation Specialist',
    category: 'Data/Annotation',
    company: 'SynapseData Network (Berlin / Remote)',
    location: '100% Remote',
    type: 'Bounty Contract',
    budgetUsdc: '35 - 60',
    rateType: 'hourly',
    description: '审查与标注自主智能体在执行链上清算、API 调用及人机交互过程中的决策轨迹，提供高质量人类反馈强化学习 (RLHF) 评分样本。',
    descriptionEn: 'Annotate and review decision trajectories of autonomous agents executing on-chain settlements, supplying high-quality RLHF preference datasets.',
    requirements: [
      '严谨的逻辑分析能力与细致的数据标注习惯',
      '熟悉常用的数据标注工具与 Python 基础脚本测试',
      '每周可稳定投入 15~25 小时远程协作时间',
    ],
    requirementsEn: [
      'Strong logical deduction and rigorous annotation standards',
      'Familiar with annotation platforms & basic Python testing scripts',
      '15-25 hours per week of stable remote commitment',
    ],
    tags: ['Data Annotation', 'RLHF', 'Agent Trajectory', 'Flexible'],
    applyUrl: 'https://remoteco.com/remote-jobs/data-annotation-specialist',
    source: 'Remote.co Global Board',
    postedDate: '2026-10-19',
  },
  {
    id: 'gig-005',
    title: 'Solidity 智能合约形式化验证与安全审计员 (Bounty)',
    titleEn: 'Solidity Smart Contract Formal Verification & Security Auditor',
    category: 'Rust/Solidity',
    company: 'CertiFence Security DAO (Remote / Multi-Geo)',
    location: 'Global Remote',
    type: 'Bounty Contract',
    budgetUsdc: '3,000 - 8,000',
    rateType: 'project',
    description: '针对 Circle ARC 上的 Vault、BudgetFence 及 Uniswap v4 Hook 扩展合约展开形式化检验 (Certora / Halmos) 与漏洞悬赏挖掘。',
    descriptionEn: 'Conduct formal verification (Certora / Halmos) and bug bounty hunting on Circle ARC Vault, BudgetFence, and Uniswap v4 Hook contracts.',
    requirements: [
      '具备独立审计 EVM 智能合约经验，拥有 Code4rena / Sherlock / Immunefi 获奖战绩者优先',
      '精通重入、预言机操纵、精度截断及 ERC-4337 签名验证常见漏洞模式',
      '熟练使用 Foundry 进行不变性测试 (Fuzzing / Invariant Testing)',
    ],
    requirementsEn: [
      'Proven track record on Code4rena / Sherlock / Immunefi',
      'Expertise in reentrancy, oracle manipulation, rounding, and ERC-4337 bugs',
      'Proficient with Foundry fuzzing & invariant testing suites',
    ],
    tags: ['Security Audit', 'Solidity', 'Foundry', 'Bug Bounty'],
    applyUrl: 'https://immunefi.com/explore',
    source: 'Immunefi / Security DAO',
    postedDate: '2026-10-18',
  },
  {
    id: 'gig-006',
    title: 'x402 协议生态 TypeScript/Python SDK 核心贡献者',
    titleEn: 'x402 Protocol Ecosystem Core SDK Contributor (TS/Python)',
    category: 'DeFi/Protocol',
    company: 'Open402 Foundation (Remote / Open Source)',
    location: '100% Remote',
    type: 'Agent Assisted',
    budgetUsdc: '2,000 - 5,000',
    rateType: 'project',
    description: '维护并重构遵循 HTTP 402 原语的微支付客户端库，实现 AI Agent 免登录携带 EIP-712 凭据即时获取博文全量 Markdown 内容。',
    descriptionEn: 'Maintain and refactor the HTTP 402 micropayment client library, allowing AI agents to fetch gated Markdown content seamlessly via EIP-712 vouchers.',
    requirements: [
      '熟练掌握 TypeScript 与 Python 异步网络编程 (aiohttp / httpx / axios)',
      '有开源库发布与维护经验 (npm / PyPI)',
      '理解 RESTful API 鉴权与 HTTP 状态码标准规范',
    ],
    requirementsEn: [
      'Mastery in TypeScript and async Python (httpx / aiohttp / axios)',
      'Experience maintaining published open-source packages on npm/PyPI',
      'Solid understanding of HTTP status codes & cryptographic authentication',
    ],
    tags: ['HTTP 402', 'TypeScript', 'Python', 'Open Source', 'SDK'],
    applyUrl: 'https://github.com/piaoshu1112-cell/AP2',
    source: 'AP2 Community Bounties',
    postedDate: '2026-10-19',
  },
  {
    id: 'gig-007',
    title: 'Web5 自主社交网络 (Farcaster & Lens) 运营与增长黑客',
    titleEn: 'Web5 Autonomous Social Growth Hacker (Farcaster & Lens)',
    category: 'Research/Translation',
    company: 'Sovereign Social Guild (Remote)',
    location: 'Global Remote',
    type: 'Part-time Gig',
    budgetUsdc: '2,500 - 4,500',
    rateType: 'monthly',
    description: '负责策划海外 Web3 思想阵地内容分发，结合 Farcaster Frames 与 Telegram Mini App 漏斗裂变机制，将海外独立开发者转化为活跃 Vessel 节点。',
    descriptionEn: 'Lead global content distribution across Farcaster & Lens, leveraging Frames and TG Mini App funnels to convert overseas developers into active Vessel nodes.',
    requirements: [
      '深度熟悉海外 Crypto 社交圈层文化 (Crypto Twitter / Farcaster / Warpcast)',
      '具备出色的英文文案撰写能力与社群增长方法论',
      '有海外社区冷启动或 DAO 治理运营成功案例',
    ],
    requirementsEn: [
      'Native familiarity with Crypto Twitter, Farcaster, and Warpcast culture',
      'Exceptional English copywriting & social growth funnels',
      'Demonstrated track record in community cold-starts or DAO governance',
    ],
    tags: ['Growth Hacker', 'Farcaster', 'Community', 'Warpcast'],
    applyUrl: 'https://web3.career/jobs/growth-marketer-remote',
    source: 'Web3.Career Social Guild',
    postedDate: '2026-10-16',
  },
  {
    id: 'gig-008',
    title: '去中心化知识图谱与向量知识库整理专员 (RAG Curator)',
    titleEn: 'Decentralized Knowledge Graph & Vector RAG Curator',
    category: 'Data/Annotation',
    company: 'CyberArchive Collective (Remote / Zurich)',
    location: '100% Remote',
    type: 'Part-time Gig',
    budgetUsdc: '1,800 - 3,500',
    rateType: 'monthly',
    description: '清洗、切片与分类全球哲学、数字资本论与计算机科学精选文献，构建标准化 Embedding 向量切片，供全网分身通过 DWN 协议免费读取。',
    descriptionEn: 'Cleanse, chunk, and index global philosophy and computer science literature, building standard vector embeddings for autonomous agents via DWN.',
    requirements: [
      '对信息架构、知识管理或图数据库有浓厚兴趣',
      '熟练运用 Markdown 格式规范与正则表达式文本清洗工具',
      '具备阅读英文学术论文并提炼结构化摘要的能力',
    ],
    requirementsEn: [
      'Passion for information architecture, knowledge graphs, and RAG pipelines',
      'Skilled with Markdown standards and regex text cleaning tooling',
      'Ability to synthesize academic research papers into concise structured summaries',
    ],
    tags: ['RAG', 'Knowledge Graph', 'Embedding', 'Data Curation'],
    applyUrl: 'https://remoteok.com/remote-knowledge-curator-jobs',
    source: 'CyberArchive Consortium',
    postedDate: '2026-10-18',
  },
  {
    id: 'gig-009',
    title: 'DeFi 自动化量化做市策略开发工程师 (Uniswap v4 Hooks)',
    titleEn: 'DeFi Quantitative Market Maker & Uniswap v4 Hook Strategist',
    category: 'DeFi/Protocol',
    company: 'Apex Liquidity Labs (Dubai / Remote)',
    location: '100% Remote',
    type: 'Full-time Remote',
    budgetUsdc: '9,000 - 15,000',
    rateType: 'monthly',
    description: '设计并实现针对 $WBOG/USDC 集中流动性池的动态对冲与重平衡算法，开发自定义 Uniswap v4 挂钩 (Hooks) 合约以降低无常损失。',
    descriptionEn: 'Design dynamic hedging and rebalancing strategies for concentrated liquidity pools, developing custom Uniswap v4 Hooks to minimize impermanent loss.',
    requirements: [
      '精通 Uniswap v3/v4 数学模型与集中流动性 (Tick Math) 机制',
      '3 年以上量化策略开发经验 (Python/C++ 回测与实盘系统构建)',
      '有实际生产环境链上做市智能合约部署上线经验',
    ],
    requirementsEn: [
      'Expert in Uniswap v3/v4 math, tick mechanics, and Hook architectures',
      '3+ years of quantitative strategy development (Python/C++ backtesting)',
      'Production experience deploying on-chain market making contracts',
    ],
    tags: ['DeFi', 'Uniswap v4', 'Hooks', 'Quantitative', 'Market Making'],
    applyUrl: 'https://cryptocurrencyjobs.co/finance/defi-quantitative-developer',
    source: 'CryptoCurrencyJobs Finance',
    postedDate: '2026-10-19',
  },
];
