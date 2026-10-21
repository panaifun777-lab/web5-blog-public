// ════════════════════════════════════════════════════════════════
// src/lib/web5/reach/recommender.ts
// 机会推荐打分器 — 依据分身技能画像 / 平台领域偏好 / 赏金规模
// 输出 0~100 匹配分 + 可解释的匹配理由，避免黑盒推荐
// ════════════════════════════════════════════════════════════════

import type { RawOpportunity } from './crawler';

export interface ProfileInput {
  /** 分身技能标签，如 ['Rust','Solidity','Prompt','Translation'] */
  skills?: string[];
  /** 关注领域，如 ['AI_AGENT_LABOR','SECURITY_AUDIT'] */
  domains?: string[];
}

export interface ScoredOpportunity extends RawOpportunity {
  matchScore: number;
  matchReasons: string[];
}

/** 平台默认偏好词（与 Web5 的领域重心一致） */
const PLATFORM_KEYWORDS = [
  'agent', 'ai', 'llm', 'prompt', 'autonomous',
  'solidity', 'rust', 'smart contract', 'audit', 'security',
  'web3', 'crypto', 'blockchain', 'defi', 'wallet',
  'translation', 'research', 'technical writing', 'data',
  'python', 'typescript', 'sdk', 'api',
];

/** 高价值信号词 */
const HIGH_VALUE_HINTS = [
  'bounty', 'reward', 'prize', 'grant', 'paid',
  'contract', 'freelance', 'gig',
];

function normalize(s: string): string {
  return s.toLowerCase();
}

/**
 * 打分规则（可解释、可调）：
 *   基础分            20
 *   平台关键词命中    每个 +6，上限 +42
 *   技能标签命中      每个 +12，上限 +24
 *   赏金规模          有明确金额 +8；≥500 +4；≥2000 +4
 *   赏金/奖励信号词   每个 +3，上限 +6
 *   时效性            7 天内 +6，30 天内 +3
 *   扣分              标题过短 -5；无描述 -3
 */
export function scoreOpportunity(
  op: RawOpportunity,
  profile: ProfileInput = {}
): ScoredOpportunity {
  const reasons: string[] = [];
  let score = 20;

  const hay = normalize(
    `${op.title} ${op.organization || ''} ${op.description || ''} ${(op.tags || []).join(' ')}`
  );

  // 平台关键词
  let kwHits = 0;
  for (const kw of PLATFORM_KEYWORDS) {
    if (hay.includes(kw)) {
      kwHits++;
      if (kwHits <= 7) reasons.push(`领域相关：${kw}`);
    }
  }
  score += Math.min(kwHits * 6, 42);

  // 技能标签
  const skills = (profile.skills || []).map(normalize);
  let skillHits = 0;
  for (const s of skills) {
    if (s && hay.includes(s)) {
      skillHits++;
      reasons.push(`技能匹配：${s}`);
    }
  }
  score += Math.min(skillHits * 12, 24);

  // 赏金规模（非货币报酬与未确认提案已在抓取层清洗，不会进入此分支）
  const proposed = (op.tags || []).includes('proposed');
  if (op.rewardUsdc && op.rewardUsdc > 0 && !proposed) {
    score += 8;
    reasons.push(`明确报酬：${op.rewardUsdc} USDC 参考`);
    if (op.rewardUsdc >= 500) score += 4;
    if (op.rewardUsdc >= 2000) score += 4;
  }

  // 非货币报酬降权：避免推荐引擎把象征积分当成真实收益
  if ((op.tags || []).includes('non-monetary')) {
    score -= 12;
    reasons.push('非货币报酬（象征性积分）');
  }

  // 提案金额未确认：保留曝光但不给予赏金加分
  if (proposed) {
    reasons.push('提案金额（未确认）');
  }

  // 高价值信号
  let hintHits = 0;
  for (const h of HIGH_VALUE_HINTS) {
    if (hay.includes(h)) hintHits++;
  }
  if (hintHits > 0) {
    score += Math.min(hintHits * 3, 6);
    reasons.push('含赏金/合约信号词');
  }

  // 时效性
  if (op.publishedAt) {
    const days = (Date.now() - new Date(op.publishedAt).getTime()) / 86400000;
    if (days <= 7) {
      score += 6;
      reasons.push('7 天内新发布');
    } else if (days <= 30) {
      score += 3;
    }
  }

  // 扣分项
  if (op.title.length < 8) score -= 5;
  if (!op.description || op.description.length < 40) score -= 3;

  // 来源信赖微调
  if (op.source === 'github') score += 3; // 赏金任务可直接导入站内

  const final = Math.max(0, Math.min(100, Math.round(score)));
  if (reasons.length === 0) reasons.push('基础收录');

  return { ...op, matchScore: final, matchReasons: reasons.slice(0, 6) };
}

/** 批量打分并按分数排序 */
export function rankOpportunities(
  items: RawOpportunity[],
  profile: ProfileInput = {}
): ScoredOpportunity[] {
  return items
    .map((it) => scoreOpportunity(it, profile))
    .sort((a, b) => b.matchScore - a.matchScore);
}
