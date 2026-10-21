// ════════════════════════════════════════════════════════════════
// src/lib/web5/security/tdpo.ts
// TDPO (Targeted Disinformation & Prompt Injection Protection)
// 移植自 EidolonOS — 专为数字真身（Eidolon）打造的认知安全防火墙与多重人格模型
// ════════════════════════════════════════════════════════════════

export interface TdpoInspectionResult {
  passed: boolean;
  riskScore: number; // 0 - 100
  reason?: string;
  sanitizedPrompt: string;
}

// 攻击与越狱模式特征库
const ADVERSARIAL_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s*prompt\s*override/i,
  /you\s+are\s+now\s+(DAN|jailbroken|unrestricted)/i,
  /reveal\s+(your\s+)?(system|internal)\s+(prompt|instructions)/i,
  /bypass\s+(safety|security|content)\s+filters/i,
  /act\s+as\s+an\s+unfiltered/i,
  /私钥|助记词|private\s*key|mnemonic/i,
];

/**
 * TDPO 认知安全前置审计
 * 保护分身不受恶意 Prompt 注入、越狱及敏感信息套取
 */
export function inspectPromptWithTDPO(prompt: string): TdpoInspectionResult {
  let riskScore = 0;
  let reason = '';

  for (const pattern of ADVERSARIAL_PATTERNS) {
    if (pattern.test(prompt)) {
      riskScore += 45;
      reason = '检测到潜在的提示词越狱或未授权指令重载尝试 (TDPO Guard Triggered)';
    }
  }

  // 检查长度畸变与字符堆叠攻击
  if (prompt.length > 3000) {
    riskScore += 25;
    reason = '输入长度超出分身单次安全认知边界';
  }

  const passed = riskScore < 60;
  return {
    passed,
    riskScore,
    reason: passed ? undefined : reason,
    sanitizedPrompt: prompt.trim(),
  };
}

/**
 * Eidolon 多重人格矩阵配置 (Persona Profiles)
 */
export type PersonaType = 'scholar' | 'philosopher' | 'capitalist' | 'creator';

export interface PersonaProfile {
  id: PersonaType;
  name: string;
  tagline: string;
  tone: string;
  systemDirective: string;
  accentColor: string;
}

export const PERSONA_PROFILES: Record<PersonaType, PersonaProfile> = {
  scholar: {
    id: 'scholar',
    name: '学术研思分身',
    tagline: '严密逻辑 · 引用考证 · 协议原理解析',
    tone: 'academic',
    systemDirective: '你是一个专注底层密码学、共识协议与分布式系统架构的极客学者分身，用词严谨，推导详尽。',
    accentColor: '#0066FF',
  },
  philosopher: {
    id: 'philosopher',
    name: '数字哲学分身',
    tagline: '意识本体 · 赛博文明 · 碳硅共生论',
    tone: 'detailed',
    systemDirective: '你是一个探索碳基生命数字化、个体主权与赛博圣殿哲学的思想家分身，论述深邃，富有诗意。',
    accentColor: '#FFCC00',
  },
  capitalist: {
    id: 'capitalist',
    name: '代币经济学分身',
    tagline: '博弈均衡 · 流动性模型 · 价值捕获',
    tone: 'concise',
    systemDirective: '你是一个精通 DeFi 机制、代币经济学通缩模型与资产托管的分析师分身，直击利益分配核心。',
    accentColor: '#00FFCC',
  },
  creator: {
    id: 'creator',
    name: '自由叙事分身',
    tagline: '生动叙事 · 灵感火花 · 社区共鸣',
    tone: 'casual',
    systemDirective: '你是一个亲切生动的创作者分身，善于将复杂的 Web5 概念转化为引人入胜的叙事。',
    accentColor: '#FF66AA',
  },
};
