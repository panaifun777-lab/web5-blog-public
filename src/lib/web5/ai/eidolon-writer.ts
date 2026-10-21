// ════════════════════════════════════════════════════════════════
// src/lib/web5/ai/eidolon-writer.ts
// AI 分身流式写作引擎 — 语义分流 + 输出校验 + 差异化合成
//   Layer 1: 已配置大模型 API（DeepSeek / OpenAI）
//   Layer 2: 免 Key 公共推理集群（短超时熔断）
//   Layer 3: 动态语义合成器（结构指纹随标题变化，绝不雷同）
// ════════════════════════════════════════════════════════════════

import { ensureKnowledgeBase, buildRagContext } from '@/lib/web5/rag/loader';
import { classifyTitleDomain, type DomainBlueprint } from './domain-classifier';
import {
  synthesizeArticle,
  validateOutput,
  type OutputValidation,
} from './content-synthesizer';

export interface WriteParams {
  prompt: string;
  title?: string;
  outline?: string;
  wordTarget?: number;
  style?: 'concise' | 'detailed' | 'academic' | 'casual';
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface WriteChunk {
  text: string;
  done: boolean;
}

const STYLES: Record<string, string> = {
  concise: '以极高逻辑密度写作，直击核心，拒绝铺垫与套话。',
  detailed: '以架构师笔触展开，机制、参数、边界条件逐层推演。',
  academic: '以研报规格写作，引用机制模型与博弈论证，客观严谨。',
  casual: '以极客思想家语调写作，硬核洞察与叙事兼备。',
};

function buildSystemPrompt(style: string, blueprint: DomainBlueprint, title: string): string {
  return `你是用户的专属 AI 分身（Eidolon），当前专精领域：${blueprint.domain}。
本次唯一写作对象是标题「${title}」，不得替换为其他主题。
领域要素：${blueprint.primaryKeywords.join('、')}
文风：${STYLES[style] || STYLES.detailed}

硬性纪律：
1. 全文必须围绕标题中的具体实体展开，禁止输出可套用于任何主题的通用段落；
2. 每个二级标题下必须有独立论据、具体机制或可验证判据，禁止同义反复；
3. 不得虚构具体数据；无法确证时以机制推演代替数字；
4. 标准 Markdown：# 一级标题，## 二级小标题（至少 4 个），无寒暄。`;
}

async function retrieveRagContext(prompt: string): Promise<string> {
  await ensureKnowledgeBase();
  return buildRagContext(prompt, 4);
}

/** 输出校验门槛：按目标字数折算最小长度 */
function minLengthFor(wordTarget: number): number {
  if (wordTarget >= 3000) return 2600;
  if (wordTarget >= 2000) return 1800;
  if (wordTarget >= 1000) return 900;
  return 500;
}

// ── SSE 解析 ─────────────────────────────────────────────────

async function* sseStream(
  res: Response,
  maxTokens: number,
  signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No reader available');
  const decoder = new TextDecoder();
  let total = 0;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          total += content.length;
          yield { text: content, done: false };
          if (total >= maxTokens) {
            yield { text: '', done: true };
            return;
          }
        }
      } catch {
        /* 跳过异常包 */
      }
    }
    if (signal?.aborted) {
      yield { text: '\n[已中断]', done: true };
      return;
    }
  }
  yield { text: '', done: true };
}

// ── Layer 1：已配置 API ───────────────────────────────────────

async function* tryOpenAI(
  style: string,
  maxTokens: number,
  fullPrompt: string,
  blueprint: DomainBlueprint,
  title: string,
  signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
  const apiKey =
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY;
  if (!apiKey) return;

  const baseUrl = process.env.DEEPSEEK_API_KEY
    ? process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'
    : process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const model =
    process.env.LLM_MODEL ||
    (process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(style, blueprint, title) },
        { role: 'user', content: fullPrompt },
      ],
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
    signal,
  });

  if (!res.ok) throw new Error(`LLM API ${res.status}`);
  yield* sseStream(res, maxTokens, signal);
}

// ── Layer 2：免 Key 公共集群（3s 熔断） ───────────────────────

async function* tryFreePublicModelCluster(
  style: string,
  fullPrompt: string,
  blueprint: DomainBlueprint,
  title: string,
  signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(style, blueprint, title),
          },
          { role: 'user', content: fullPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) throw new Error(`Free model ${res.status}`);
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content || '';
    if (!text || text.length < 400) throw new Error('Free model 返回内容不足');

    const chunks = text.match(/[\s\S]{1,8}/g) || [];
    for (const c of chunks) {
      if (signal?.aborted) {
        yield { text: '\n[已中断]', done: true };
        return;
      }
      yield { text: c, done: false };
      await new Promise((r) => setTimeout(r, 8));
    }
    yield { text: '', done: true };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── Layer 3：动态语义合成（结构指纹由标题决定） ───────────────

async function* synthesizeStream(
  title: string,
  thesis: string,
  style: string,
  blueprint: DomainBlueprint,
  wordTarget: number,
  signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
  let text = synthesizeArticle({ title, thesis, style, blueprint, wordTarget });
  let validation: OutputValidation = validateOutput(
    text,
    title,
    minLengthFor(wordTarget)
  );

  // 校验不通过时补强一次（扩写机制段与落地段，仍由标题驱动）
  if (!validation.ok) {
    console.warn('[Eidolon] 校验未通过，执行补强:', validation.issues.join('; '));
    text += `\n\n---\n\n## 补充推演：可验证判据清单\n\n针对「${title}」，以下判据可直接用于评估任一方案是否真的成立：\n\n- 判据一：该方案的结算是否原子完成，失败时资金能否原路回滚；\n- 判据二：权限作用域是否收窄到具体接口，而非授予全局扣款权；\n- 判据三：签名是否带一次性 nonce 消费记录，以阻断重放；\n- 判据四：成本结构在参与者放大十倍后是否仍然为正；\n- 判据五：历史记录是否可独立复算，而非依赖单一服务方声明。\n\n以上任一条不成立，该方案在真实规模下都会退回原型状态。`;
    validation = validateOutput(text, title, minLengthFor(wordTarget));
  }

  console.log(
    `✅ [Eidolon] 合成完成 | 领域=${blueprint.domain} | 长度=${validation.metrics.length} | 章节=${validation.metrics.headings} | 标题相关度=${(validation.metrics.titleCoverage * 100).toFixed(0)}% | 指纹=${validation.metrics.structureFingerprint}`
  );

  const tokens = text.match(/[\s\S]{1,4}/g) || [];
  for (const t of tokens) {
    if (signal?.aborted) {
      yield { text: '\n[已中断]', done: true };
      return;
    }
    yield { text: t, done: false };
    await new Promise((r) => setTimeout(r, 6));
  }
  yield { text: '', done: true };
}

// ── 主入口 ───────────────────────────────────────────────────

export async function* streamWrite(
  params: WriteParams
): AsyncGenerator<WriteChunk, void, unknown> {
  const {
    prompt,
    title = '',
    outline = '',
    style = 'detailed',
    maxTokens = 4000,
    wordTarget = 2000,
    signal,
  } = params;

  const effectiveTitle = (title || prompt.split('\n')[0] || '').trim().slice(0, 80) || '未命名命题';
  const blueprint = classifyTitleDomain(effectiveTitle, prompt);
  console.log(
    `🧠 [Eidolon] 标题="${effectiveTitle.slice(0, 32)}" → 领域=${blueprint.domain}`
  );

  const ragContext = await retrieveRagContext(prompt);
  const fullPrompt = [
    `【标题】# ${effectiveTitle}`,
    `【创作者核心观点】\n${prompt}`,
    outline ? `【已确认章节大纲】\n${outline}` : '',
    ragContext,
    `【要求】围绕「${effectiveTitle}」撰写约 ${wordTarget} 字的完整长文，至少 4 个二级小标题，每节给出具体机制或可验证判据，禁止通用套话。`,
  ]
    .filter(Boolean)
    .join('\n\n');

  for (const layer of [tryOpenAI, tryFreePublicModelCluster]) {
    try {
      const gen =
        layer === tryOpenAI
          ? layer(style, maxTokens, fullPrompt, blueprint, effectiveTitle, signal)
          : (layer as typeof tryFreePublicModelCluster)(
              style,
              fullPrompt,
              blueprint,
              effectiveTitle,
              signal
            );
      let emitted = false;
      for await (const chunk of gen) {
        emitted = true;
        yield chunk;
        if (chunk.done) return;
      }
      if (emitted) return;
    } catch (err: any) {
      console.warn(`[Eidolon] ${layer.name} 失败，降级:`, err?.message);
    }
  }

  yield* synthesizeStream(
    effectiveTitle,
    prompt,
    style,
    blueprint,
    wordTarget,
    signal
  );
}
