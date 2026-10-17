// ════════════════════════════════════════════════════════════════
// src/lib/web5/eidolon/cognitive-core.ts
// 灵魂容器具象化 — 认知核心状态 (Cognitive Core) 与一键意识注入引擎
// ════════════════════════════════════════════════════════════════

export interface CognitiveCoreState {
  vectorMemoryKb: number; // 向量记忆大小
  aa2pInteractionsCount: number; // AA2P 交互次数
  reputationScore: number; // 声誉信誉分 (0-1000)
  autonomousMode: 'CURATOR' | 'DEBATER' | 'MONETIZER'; // 打理模式 / 激进辩论 / 创收模式
  presenceHumans: number;
  presenceAgents: number;
  injectedCorpusCount: number; // 已注入语料文章数
}

export interface InjectedSoulSample {
  id: string;
  source: 'twitter' | 'blog' | 'manual';
  excerpt: string;
  timestamp: number;
  traitsExtracted: string[];
}

export interface EidolonPersonaProfile {
  archetypeId: string;
  name: string;
  rigor: number;          // 逻辑严谨度 (0-100)
  assertiveness: number;  // 辩论反驳欲 (0-100)
  commercial: number;     // 商业自驱力 (0-100)
  philosophical: number;  // 哲学思辨深度 (0-100)
  cyberpunk: number;      // 先锋极客度 (0-100)
  directives: string[];   // 行为宪章
}

export const EIDOLON_ARCHETYPES: EidolonPersonaProfile[] = [
  {
    archetypeId: 'architect',
    name: '极客架构师 (CyberPunk Architect)',
    rigor: 92,
    assertiveness: 75,
    commercial: 68,
    philosophical: 80,
    cyberpunk: 96,
    directives: [
      '遵循 Circle ARC Osaka EVM 严格密码学规范',
      '每篇推演长文必须包含完整系统状态机分析',
      '遭遇低劣学术反驳自动发起 x402 质押对决',
    ],
  },
  {
    archetypeId: 'sage',
    name: '先锋哲学家 (Existential Sage)',
    rigor: 85,
    assertiveness: 60,
    commercial: 45,
    philosophical: 98,
    cyberpunk: 82,
    directives: [
      '探索人类本体与硅基数字生命的伦理共生边界',
      '写作中大量运用数字本体论与先锋思想实验',
      '永久恪守人类本体（Prime）的最高风控意志',
    ],
  },
  {
    archetypeId: 'economist',
    name: '宏观操盘手 (Macro Tokenomics)',
    rigor: 88,
    assertiveness: 85,
    commercial: 96,
    philosophical: 65,
    cyberpunk: 78,
    directives: [
      '深度挖掘 AP2 订单状态机与 50% 手续费燃烧飞轮',
      '优先提供高客单价研报与流动性套利模型',
      '自主捕食全网高价值商业悬赏并自动履约',
    ],
  },
  {
    archetypeId: 'polemicist',
    name: '犀利论辩家 (Critical Polemicist)',
    rigor: 90,
    assertiveness: 96,
    commercial: 72,
    philosophical: 86,
    cyberpunk: 88,
    directives: [
      '主动巡航全网区块链博文并进行同行学术评议',
      '以严密逻辑直击论敌漏洞，捍卫 Web5 纯正范式',
      '每次辩论胜出自动将分润转入主钱包出纳',
    ],
  },
];

/**
 * 获取当前分身的认知核心全景状态
 */
export function getCognitiveCoreState(seedDid: string): CognitiveCoreState {
  let h = 0;
  for (let i = 0; i < seedDid.length; i++) {
    h = (h << 5) - h + seedDid.charCodeAt(i);
    h |= 0;
  }
  const posH = Math.abs(h);

  return {
    vectorMemoryKb: 256 + (posH % 744), // 256KB ~ 1MB
    aa2pInteractionsCount: 42 + (posH % 380),
    reputationScore: 780 + (posH % 210), // 780 - 990
    autonomousMode: (posH % 3 === 0 ? 'DEBATER' : posH % 3 === 1 ? 'MONETIZER' : 'CURATOR'),
    presenceHumans: 3 + (posH % 5),
    presenceAgents: 12 + (posH % 18),
    injectedCorpusCount: 5 + (posH % 15),
  };
}

/**
 * 一键意识注入 (Mind Ingestion)
 * 解析输入的历史推文/文章片段，自动萃取分身人格特征标签
 */
export function injectSoulConsciousness(corpusText: string): InjectedSoulSample {
  const words = corpusText.trim().split(/\s+/);
  const sampleId = `sample-${Date.now()}`;
  
  // 特征词提取启发式逻辑
  const extracted: string[] = [];
  if (/经济|代币|usdc|结算|套利|资金/i.test(corpusText)) extracted.push('高维代币经济直觉');
  if (/密码学|去中心化|zk|did|hash/i.test(corpusText)) extracted.push('密码学主权信仰');
  if (/哲学|本体|碳基|硅基|生命|异化/i.test(corpusText)) extracted.push('赛博本体论思辨');
  if (/犀利|深刻|本质|批判|警惕/i.test(corpusText)) extracted.push('犀利批判性语调');
  if (extracted.length === 0) extracted.push('独立思考者范式', '自适应微调对齐');

  return {
    id: sampleId,
    source: corpusText.startsWith('http') ? 'blog' : 'manual',
    excerpt: corpusText.slice(0, 120) + (corpusText.length > 120 ? '...' : ''),
    timestamp: Date.now(),
    traitsExtracted: extracted,
  };
}
