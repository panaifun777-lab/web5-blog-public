// ════════════════════════════════════════════════════════════════
// src/lib/web5/ai/free-pool.ts
// 全球高可用免费大模型聚合轮询池 (Free AI Model Pool & Failover)
// 聚合 OpenRouter Free、Groq、GLM-4-Flash、SiliconFlow 等零成本高质量算力
// 自动应对 429 限频、网络超时与故障转移 (Failover)
// ════════════════════════════════════════════════════════════════

export interface FreeEndpointConfig {
  provider: string;
  model: string;
  baseURL: string;
  apiKeyEnv: string;
  defaultKey?: string;
  speedTier: 'TURBO' | 'STANDARD';
  contextLimitTokens: number;
}

// 免费与开源模型轮询集群
export const FREE_MODEL_POOL: FreeEndpointConfig[] = [
  // 1. OpenRouter Free 模型集群 (首选，免翻/聚合，70B+ 参数极强逻辑)
  {
    provider: 'OpenRouter-Free-Qwen',
    model: 'qwen/qwen-2.5-72b-instruct:free',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultKey: 'sk-or-v1-anonymous-free-key',
    speedTier: 'TURBO',
    contextLimitTokens: 32768,
  },
  {
    provider: 'OpenRouter-Free-Llama',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultKey: 'sk-or-v1-anonymous-free-key',
    speedTier: 'TURBO',
    contextLimitTokens: 16384,
  },
  // 2. Groq 免费超高速 LPU 开发者端点 (适合毫秒级生成大纲)
  {
    provider: 'Groq-LPU-Fast',
    model: 'llama-3.3-70b-versatile',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    speedTier: 'TURBO',
    contextLimitTokens: 8192,
  },
  // 3. 智谱 GLM-4-Flash 免费高并发中文大模型
  {
    provider: 'Zhipu-GLM-Flash',
    model: 'glm-4-flash',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyEnv: 'ZHIPU_API_KEY',
    speedTier: 'STANDARD',
    contextLimitTokens: 16384,
  },
  // 4. 硅基流动 SiliconFlow 免费开源端点
  {
    provider: 'SiliconFlow-Qwen',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    baseURL: 'https://api.siliconflow.cn/v1',
    apiKeyEnv: 'SILICONFLOW_API_KEY',
    speedTier: 'STANDARD',
    contextLimitTokens: 8192,
  },
];

/**
 * 结构化“意识种子”扩写参数
 */
export interface SeedToArticleParams {
  title: string;
  seedThesis: string; // 用户的核心观点/暴论 (哪怕只有 50 字)
  wordTarget: 500 | 1000;
  style: string;
  dwnMemoryShards?: string; // 来自分身 DWN 记忆切片
  signal?: AbortSignal;
}

/**
 * 构建大纲罗列专用的提示词 (Step 1)
 */
export function buildOutlinePrompt(title: string, thesis: string, dwnContext: string): string {
  return `你是一个深刻敏锐的 Web5 数字分身（Eidolon）。
请围绕以下【文章标题】与创作者本体提供的【核心观点种子】，并结合分身已有的【私域向量记忆切片】，在 150 字以内罗列出清晰、颠覆且富有逻辑层次的 3~4 个核心子章节结构与论证要点：

【文章标题】：${title}
【核心观点种子】：${thesis}
${dwnContext ? `【分身私有 DWN 记忆切片】：\n${dwnContext}\n` : ''}

要求：直接输出 Markdown 章节大纲（## 子标题），附带 1 句核心论据剖析，无需任何开场白或客套话。`;
}

/**
 * 构建分段深度扩写专用的提示词 (Step 2)
 */
export function buildArticleExpansionPrompt(params: SeedToArticleParams, outline: string): string {
  const { title, seedThesis, wordTarget, style, dwnMemoryShards } = params;
  return `你是用户的专属数字分身（Eidolon）。请严格根据以下大纲与意识种子，扩写为一篇完整的长篇博客文章。
目标字数控制在约 ${wordTarget} 字，采用 Markdown 格式输出。

【标题】：# ${title}
【创作者意识种子】：${seedThesis}
【拟定章节结构】：
${outline}

${dwnMemoryShards ? `【已绑定的分身 DWN 主权记忆】：\n${dwnMemoryShards}\n` : ''}

核心写作规范：
1. 严禁生成毫无营养的套话水文！必须贯穿批判性思维、密码学主权或机制博弈深度。
2. 论述展开需结合 Web5 三层生命架构 (Prime × Eidolon × Vessel) 与 Circle ARC 链上自治结算范式。
3. 文风画像：${style}。在文章最具含金量或争议性的关键推论处，必须用清晰的小标题或代码块呈现。`;
}
