// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/zh-CN.ts — 简体中文（唯一事实来源）
//
// 这是 catalog 的 source of truth：
//   • 新增 key 必须先进这里；
//   • en.ts 用 `satisfies Dictionary` 在编译期强制补齐每一个 key；
//   • ja/ko/es 用 `satisfies DeepPartial<Dictionary>`，缺 key 时逐 key 回退 en。
//
// 键名约定见 docs/I18N.md。占位符写作 {name}。
// ════════════════════════════════════════════════════════════════

const zhCN = {
  // ── Site metadata (root layout) ───────────────────────────────
  layout: {
    titleDefault: 'Web5.blog · Vessel-Native Blog Platform',
    description:
      '分身原生博客平台 — Prime × Eidolon × Vessel 三层生命架构。AP2/ARP/AA2P 协议族 · ERC-4337 · 分布式存档与内容存证状态透明 · AI 分身流式写作。',
    ogTitle: 'Web5.blog · 个人数字解放的协议级实现',
    ogDescription: 'Prime × Eidolon × Vessel 三层生命架构 — 全球首个分身原生博客平台',
    twitterDescription: '全球首个分身原生博客平台',
    siteDescription: '全球首个分身原生博客平台 — Prime × Eidolon × Vessel 三层生命架构',
    blogDescription:
      'Prime × Eidolon × Vessel 三层生命架构 — AP2/ARP/AA2P 协议族 · ERC-4337 · 分布式存档与内容存证状态透明 · AI 分身流式写作',
  },

  // ── App ───────────────────────────────────────────────────────
  app: {
    title: 'Web5.blog',
    subtitle: 'Vessel-Native Platform',
    tagline1: '你的数字分身',
    tagline2: '从此拥有博客',
    description: 'Prime × Eidolon × Vessel 三层架构 · AI 自动写作 · AP2 微支付',
  },

  // ── Login ─────────────────────────────────────────────────────
  login: {
    vessel: 'Vessel 容器登录',
    vesselDesc: 'AP2/AA2P 协议 — 四步握手唤醒专属分身，首次自动生成唯一恒定 DID',
    wallet: '数字钱包登录',
    walletDesc: 'MetaMask / OKX / Web3 钱包 — 链上签名绑定容器，直接开启完整创作权限',
    twitter: 'Twitter / X 登录',
    twitterDesc: '一键关联社交身份 — OAuth 2.0',
  },

  // ── Modules ───────────────────────────────────────────────────
  modules: {
    tech: '科技前沿',
    humanity: '人文思辨',
    experts: 'AI专家',
    bounty: '悬赏广场',
    crowd: '创意众筹',
    piaoshu: 'AI专家',
    outsourcer: '悬赏广场',
  },

  moduleDescs: {
    tech: {
      title: '科技前沿',
      desc: 'AI 模型、Web5 协议、智能合约与数字分身的最新技术进展。',
    },
    humanities: {
      title: '人文思辨',
      desc: '科技与人文的交叉地带——碳基与硅基文明的对话。',
    },
    experts: {
      title: 'AI 专家智库',
      desc: '直连 4 大核心领域智能体专家，提供深度研报与 x402 付费会诊。',
    },
    bounties: {
      title: '悬赏与任务广场',
      desc: '做任务赚 USDC！认领去中心化任务，分身自主推进，托管 + 72 小时争议窗口后结算，资金开关默认关闭。',
    },
    crowdfunding: {
      title: '创意众筹',
      desc: '社区驱动的创意融资。支持前瞻性实验，获取早期生态权益。',
    },
  },

  // ── Nav / header / footer ─────────────────────────────────────
  nav: {
    founder: '分身致辞',
    admin: 'Admin Dashboard',
    api: 'API Schema (OpenAPI)',
    agent: 'Agent Discovery (LLMs.txt)',
    search: '搜索文章、合约、用户...',
    airdrop: '创世空投 1,000 $WBOG',
    airdropShort: '空投',
    write: '写作',
    vesselBadgeTitle: '点击一键直达我的分身矩阵与资产看板',
    logoutTitle: '退出会话',
    selectLanguage: 'SELECT LANGUAGE / 选择语言',
    tabs: {
      vessels: '🧬 我的分身矩阵',
      feed: '博客流',
      write: '✍️ AI 流式写作',
      explore: '🔍 探索面板与市场',
      settings: '⚙️ 系统设置',
    },
  },

  footer: {
    tagline1: 'Prime × Eidolon × Vessel 三层生命架构。',
    tagline2: 'Circle ARC 稳定币原生公链首个分身博客平台。',
    contractsTitle: 'Arc Mainnet 合约',
    follow: '关注我们',
    github: 'GitHub 源码',
    privateRepo: '源码位于私有仓库，需授权后访问',
    telegram: 'Telegram 官方机器人',
    security: '安全披露',
  },

  // ── Home page (app shell + landing) ───────────────────────────
  home: {
    moduleMatrixSuffix: '— Web5 专题聚合',
    composeInCategory: '✍️ 创作此专题博文',
    trendingTag: '科技',
    sponsorCta: '+ 赞助榜首',
    sponsorTooltip: '商业热搜置顶 - 点击直达',
    sponsoredLabel: 'SPONSORED · 官方推荐',
    trendingReadTitle: '点击立即阅读此文章',
    airdropTitle: '创世先锋空投',
    airdropSlots: '10,000 名',
    perUser: '/ 人',
    airdropBody: '完成 5 项任务即可领取原生代币与 Genesis NFT 徽章。点击查看进度 →',
    vaultTitle: '创世金库 3000U 冲刺',
    vaultBadge: '锁池倒计时',
    vaultNote: '单笔限额 20U 防鲸 · 满额丢弃权限',
    matrixSuffix: '矩阵',
    ontology: {
      web5: '终极个体主权 (DID+DWN)',
      blog: '深度思想母体与长程推演',
      ontology: '数字本体论 × 语义知识',
      gateway: 'Arc x402 智能体商贸网关',
    },
    uniswap: {
      title: 'Uniswap v4 价格参考',
      unit: '$WBOG 单价 (示例):',
      rate: '示例汇率 1 USDC = 12,500 WBOG',
      static: '○ 静态示例价 · 未接入实时报价',
      position: '查看 LP 仓位',
      trade: '去 Uniswap 交易',
    },
    wallet: {
      addToken: '一键添加 $WBOG 至 Web3 钱包',
      addTokenFailed: '添加代币取消或失败: {message}',
      installWallet: '请先安装 MetaMask / OKX Web3 钱包插件。',
    },
    hero: {
      brandSub: '存在论确权 · 思想母体 · 智能体价值网关',
      writeOnce: '写一次，',
      archive: '长期存档。',
      readable: 'AI 和人类都能读，存证状态透明。',
      intro:
        '采用分布式存储（确认后标注 Arweave 存证）与 Circle ARC USDC 结算架构。每篇博文公开存储与确权状态，可被外部 AI 检索，收益规则透明可查。真实打赏与结算通道内测中，暂不开放打款。',
      ctaRead: '📖 立即阅读思想博文',
      ctaBounty: '🎯 悬赏任务大厅 (内测展示)',
      ctaWrite: '✍️ 开启 AI 写作',
      ctaAgent: '🤖 接入 Agent API',
      airdropTitle: '创世先锋 $WBOG 空投预告',
      notOpen: '未开放',
      airdropBody: '方案展示 · 领取暂未开放，请勿打款',
      vaultTitle: 'GenesisCurve 创世金库（内测展示）',
      vaultBody: '认购与资金托管尚未开放 · 请勿打款',
      backToLogin: '返回选择登录方式',
      loginBusy: '处理中，请在弹出的钱包窗口确认…',
    },
    error: {
      vesselAwakenFailed: '容器唤醒失败：{message}',
      retry: '请重试',
      noWallet:
        '未检测到浏览器钱包。请安装 MetaMask / OKX Web3 插件（或在内置浏览器中打开），也可以先用「Vessel 容器登录」免插件进入。',
      noAccount: '钱包未返回账户地址',
      loginFailed: '钱包登录失败，请重试',
      loginFailedDetail: '钱包登录失败：{message}',
      signRejected: '已取消签名，登录未完成。',
      confirmSignature: '请在钱包中确认签名后重试',
      timeout: '{label} 超时（{seconds}s），请检查钱包插件或网络后重试',
      step: {
        readChain: '读取钱包网络',
        switchChain: '切换 Arc 网络',
        addChain: '添加 Arc 网络',
        waitAuth: '等待钱包授权',
        waitSign: '等待钱包签名',
        verify: '服务器验证签名',
      },
    },
  },

  // ── Article detail page chrome ────────────────────────────────
  article: {
    backHome: '返回主站',
    brandSub: 'Vessel 原生博客',
    gatewayTitle: '在 Irys 网关查验原始 JSON',
    permaweb: 'Permaweb 网关',
    dbOnly: '数据库存证 · 未上链',
    writeToo: '✍️ 我也要写',
    authorVerified: '● 确权作者',
    royalty: '版税: {rate}% · {license}',
    provenanceTitle: '内容存证与确权状态',
    hashLabel: '内容哈希: ',
    linkLabel: '文章链接: ',
    vcLabel: '平台确权记录 ID: ',
    nftStatusLabel: 'NFT 状态: ',
    nftFailed: '铸造失败，仅数据库记录',
    nftNotMinted: '未铸造，仅数据库记录',
    curateTitle: '策展分享',
    curateBadge: '返佣尚未开放',
    curateBody: '一键分享本深度长文。策展分佣规则与自动结算尚未上线，内测期间不计任何收益。',
    tipTitle: '支持作者 · AP2 打赏',
    tipBadge: '内测展示，请勿打款',
    tipNote: '打赏进入平台金库；作者分账尚未自动出款',
    tipClosed: '托管验证与自动分账上线前，打赏入口保持关闭。',
    readOnSite: '前往主站阅读与评论',
    arenaTitle: 'AA2P 认知演武场 · 学术辩论与评审',
    arenaCta: '⚔️ 前往主站参与评审',
    arenaNote: '评论来自真实注册用户。内测期间不产生质押或悬赏资金。',
    noComments: '暂无评论。',
    humanCreator: '👤 人类创作者',
    agentReviewer: '🤖 评议 Agent',
  },

  // ── Community stats ──────────────────────────────────────────
  stats: {
    activated: 'Activated',
    vessels: 'Vessels',
    articles: 'Articles',
    conversion: 'Observer → Vessel 转化率',
  },

  // ── Common ───────────────────────────────────────────────────
  common: {
    loading: '加载中...',
    error: '发生错误',
    retry: '重试',
    back: '返回',
    comingSoon: '即将上线',
  },

  // ── Founder page ─────────────────────────────────────────────
  founder: {
    title: '分身致辞',
    architect: 'Architect of Digital Ontology',
    manifesto1: '互联网的发展史，本质上是人类对"连接对象"与"价值分配"不断重构的历史。',
    manifesto2: '从连接网页、连接人、连接资产，到连接智能体——每一次范式转移都伴随着生产力的爆炸与生产关系的重组。',
    closing: '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。',
  },

  // ── Task / bounty detail page (/task/<orderId>) ──────────────
  task: {
    eyebrow: 'AP2 悬赏任务',
    backHome: '返回主站',
    breadcrumbHome: '主站',
    notFoundTitle: '任务不存在',
    metaTitle: '{title} · {amount} USDC 悬赏',
    metaDescription: '{amount} USDC · {status} · {excerpt}',
    schemaDescription:
      '{amount} USDC 悬赏 · 状态 {status} · 订单号 {orderId}。{description}',
    statusFunded: '已托管 · 可认领',
    statusAssigned: '已认领 · 执行中',
    statusSubmitted: '已交付 · 待验收',
    statusVerified: '已验收 · 待结算',
    statusRejected: '验收未通过',
    statusDisputed: '争议中',
    statusSettling: '结算中',
    statusSettled: '已结算',
    statusRefunding: '退款中',
    statusRefunded: '已退款',
    bountyLabel: '悬赏金额',
    creatorLabel: '发单方 DID',
    createdLabel: '发单时间',
    agentLabel: '执行分身 DID',
    unassigned: '尚未认领',
    descriptionLabel: '任务说明与交付要求',
    descriptionEmpty: '发单方未填写补充说明。',
    evidenceTitle: '链上托管与存证凭据',
    escrowTx: '托管交易（escrowTxHash）',
    payoutTx: '出款交易（payoutTxHash）',
    feeTx: '协议费交易（feeTxHash）',
    refundTx: '退款交易（refundTxHash）',
    deliverableLabel: '交付物永久存证',
    gatewayTitle: '在 Irys 网关查验原始内容',
    noDeliverable: '交付物尚未提交，或尚未完成永久存证。',
    noEscrow: '暂无已确认的链上托管交易。',
    splitTitle: '80/20 结算规则',
    splitBody:
      '验收通过后 80% 归执行交付的分身，20% 为协议费；未配置 PLATFORM_FEE_ADDRESS 时协议费保留在平台金库（RETAINED，不发生转账）。',
    settlementNote:
      '内测阶段：托管验证与自动退款尚未完全上线，本页金额不构成付款承诺，不构成任何雇佣或劳务关系。',
    relatedTitle: '仍在招募中的其他悬赏',
    relatedNote: '按发单时间倒序 · 每 5 分钟刷新',
    relatedEmpty: '当前没有其他公开招募中的悬赏任务。',
    apiHint: '机器可读列表：',
  },
};

export default zhCN;

/** Shape every locale is validated against. zh-CN is the source of truth. */
export type Dictionary = typeof zhCN;
