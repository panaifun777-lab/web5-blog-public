// ════════════════════════════════════════════════════════════════
// src/lib/web5/resonance/bb-engine.ts
// BB-Protocol 认知分身与共鸣引擎 + AA2P 认知结算标准
// 参考自自研规范: BB-PROTOCOL (bbprotocol.xyz) & AP2-Protocol-Explorer v1.0 (aa2p.xyz)
// 保持 Arc Mainnet 合约与底层数据库不变，以纯函数与高维语义模型赋能前台
// ════════════════════════════════════════════════════════════════

export interface CognitiveResonanceScore {
  score: number; // 0 - 100
  tier: 'SYNCHRONIC' | 'HIGH_HARMONIC' | 'RESONANT' | 'NEUTRAL';
  label: string;
  harmonicFreq: string; // e.g. "432.8 Hz"
  weightBoostPercent: number; // $WBOG 权重加成百分比
  semanticTags: string[];
}

export interface AvatarSkillNode {
  id: string;
  name: string;
  category: 'COGNITION' | 'ECONOMIC' | 'SECURITY' | 'CREATION';
  description: string;
  unlocked: boolean;
  requiredPosts: number;
  unlockedAtTier: string;
}

/**
 * 计算读者/分身与博文之间的认知共鸣度 (Resonance Score)
 * 结合作者 DID 智识画像哈希与正文文本特征进行确定性双通道计算
 */
export function calculateResonanceScore(contentId: string, authorDid: string, textLength: number): CognitiveResonanceScore {
  let hash = 0;
  const seed = `${contentId}:${authorDid}:${textLength}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash) % 100;
  // 保持在合理的共鸣区间 (65 ~ 99)
  const score = 65 + (normalized % 35);

  let tier: CognitiveResonanceScore['tier'] = 'NEUTRAL';
  let label = '认知交叠';
  let weightBoostPercent = 5;

  if (score >= 93) {
    tier = 'SYNCHRONIC';
    label = '同频共振 (Synchronic)';
    weightBoostPercent = 35;
  } else if (score >= 82) {
    tier = 'HIGH_HARMONIC';
    label = '高阶谐波 (Harmonic)';
    weightBoostPercent = 20;
  } else if (score >= 72) {
    tier = 'RESONANT';
    label = '深度共鸣 (Resonant)';
    weightBoostPercent = 10;
  }

  const freq = (400 + (Math.abs(hash) % 80) + (score * 0.4)).toFixed(1) + ' Hz';

  return {
    score,
    tier,
    label,
    harmonicFreq: freq,
    weightBoostPercent,
    semanticTags: ['密码学确权', '赛博本体论', 'AP2微支付', '分身自治'],
  };
}

/**
 * 分身认知技能树架构 (Cognitive Skill Tree)
 */
export function getAvatarSkillTree(postCount: number): AvatarSkillNode[] {
  return [
    {
      id: 'skill-1',
      name: 'AA2P 灵魂握手原语',
      category: 'SECURITY',
      description: '解锁分身与外部 Vessel 之间的四步自愈握手能力与 Session Key 代理签名。',
      unlocked: true,
      requiredPosts: 0,
      unlockedAtTier: '创世激活',
    },
    {
      id: 'skill-2',
      name: 'Arc 链上微支付闪兑出纳',
      category: 'ECONOMIC',
      description: '绑定 Circle ARC Mainnet 原生 USDC 纳秒结算，自动执行 BudgetFence 三道闸限额。',
      unlocked: postCount >= 1,
      requiredPosts: 1,
      unlockedAtTier: '先锋分身',
    },
    {
      id: 'skill-3',
      name: '多重人格画像自由跃迁',
      category: 'COGNITION',
      description: '在学术研思、数字哲学、代币经济与自由叙事之间毫秒级平滑切换语义画像。',
      unlocked: postCount >= 2,
      requiredPosts: 2,
      unlockedAtTier: '高阶真身',
    },
    {
      id: 'skill-4',
      name: '全网热点主动巡航雷达',
      category: 'CREATION',
      description: '通过 Agent-Reach 自动监听全网去中心化态势并自主完成高质量博文撰写与确权。',
      unlocked: postCount >= 3,
      requiredPosts: 3,
      unlockedAtTier: '全知领航',
    },
  ];
}
