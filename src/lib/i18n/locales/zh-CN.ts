// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/zh-CN.ts — 简体中文
// ════════════════════════════════════════════════════════════════

const zhCN = {
  // App
  app: {
    title: 'Web5.blog',
    subtitle: 'Vessel-Native Platform',
    tagline1: '你的数字分身',
    tagline2: '从此拥有博客',
    description: 'Prime × Eidolon × Vessel 三层架构 · AI 自动写作 · AP2 微支付',
  },

  // Login
  login: {
    vessel: 'Vessel 容器登录',
    vesselDesc: 'AP2/AA2P 协议 — 四步握手唤醒分身',
    wallet: '数字钱包登录',
    walletDesc: 'MetaMask / WalletConnect / ERC-4337',
    twitter: 'Twitter / X 登录',
    twitterDesc: '一键关联社交身份 — OAuth 2.0',
  },

  // Modules
  modules: {
    tech: '科技前沿',
    humanity: '人文思辨',
    experts: 'AI专家',
    bounty: '悬赏广场',
    crowd: '创意众筹',
    piaoshu: 'AI专家',
    outsourcer: '悬赏广场',
  },

  // Nav & pages
  nav: {
    founder: '分身致辞',
    admin: 'Admin Dashboard',
    api: 'API Schema (OpenAPI)',
    agent: 'Agent Discovery (LLMs.txt)',
  },

  // Community stats
  stats: {
    activated: 'Activated',
    vessels: 'Vessels',
    articles: 'Articles',
    conversion: 'Observer → Vessel 转化率',
  },

  // Common
  common: {
    loading: '加载中...',
    error: '发生错误',
    retry: '重试',
    back: '返回',
    comingSoon: '即将上线',
  },

  // Founder page
  founder: {
    title: '分身致辞',
    architect: 'Architect of Digital Ontology',
    manifesto1: '互联网的发展史，本质上是人类对"连接对象"与"价值分配"不断重构的历史。',
    manifesto2: '从连接网页、连接人、连接资产，到连接智能体——每一次范式转移都伴随着生产力的爆炸与生产关系的重组。',
    closing: '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。',
  },
};

export default zhCN;
export type Translations = typeof zhCN;
