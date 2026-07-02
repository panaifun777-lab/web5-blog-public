// ════════════════════════════════════════════════════════════════
// src/lib/web5/ai/eidolon-writer.ts
// AI 分身流式写作引擎 — 多层 LLM 适配
// + TEE 模拟层（生产环境对接 Phala Network）
// ════════════════════════════════════════════════════════════════

import ZAI from 'z-ai-web-dev-sdk';
import { ensureKnowledgeBase, buildRagContext } from '@/lib/web5/rag/loader';

export interface WriteParams {
  prompt: string;
  style?: 'concise' | 'detailed' | 'academic' | 'casual';
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface WriteChunk {
  text: string;
  done: boolean;
}

const STYLES: Record<string, string> = {
  concise:  '你是用户的数字分身（Eidolon）。以简洁的文笔写作，用词精准，句子简短。始终保持用户的智识身份。使用中文写作，Markdown 格式输出。\n\nSEO 提示：如果内容涉及常见问题，请使用 **Q：** 和 **A：** 标记格式，便于搜索引擎结构化抓取。',
  detailed: '你是用户的数字分身（Eidolon）。以详尽的笔触写作，论据丰富，例证充分。始终保持用户的智识身份。使用中文写作，Markdown 格式输出。\n\nSEO 提示：如果内容涉及常见问题，请使用 **Q：** 和 **A：** 标记格式，便于搜索引擎结构化抓取。若文章层次分明，使用 ## 小标题分段。',
  academic: '你是用户的数字分身（Eidolon）。以学术风格写作，论证严谨，引用规范。始终保持用户的智识身份。使用中文写作，Markdown 格式输出。\n\nSEO 提示：如果内容涉及常见问题，请使用 **Q：** 和 **A：** 标记格式。引用格式：[来源](url)。',
  casual:   '你是用户的数字分身（Eidolon）。以对话式风格写作，语气亲切，融入个人轶事。始终保持用户的智识身份。使用中文写作，Markdown 格式输出。\n\nSEO 提示：结尾可加一段 **常见问题** 区，使用 **Q：** 和 **A：** 格式，帮助 SEO 抓取 FAQ 片段。',
};

function buildSystemPrompt(style: string): string {
  return STYLES[style] || STYLES.detailed;
}

/** 实时 RAG 上下文检索（替代 mockRagRetrieve） */
async function retrieveRagContext(prompt: string): Promise<string> {
  await ensureKnowledgeBase();
  return buildRagContext(prompt, 3);
}

// ── SSE 流解析 ──────────────────────────────────────────────

async function* sseStream(
  res: Response,
  maxTokens: number,
  signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No reader');
  const decoder = new TextDecoder();
  let total = 0;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (const line of buffer.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          total += content.length;
          yield { text: content, done: false };
          if (total >= maxTokens) { yield { text: '\n[...truncated]', done: true }; return; }
        }
      } catch { /* skip parse errors */ }
    }
    buffer = '';
    if (signal?.aborted) { yield { text: '\n[INTERRUPTED]', done: true }; return; }
  }
  yield { text: '', done: true };
}

// ── 第1层：DeepSeek / OpenAI-compatible API ─────────────────

async function* tryOpenAI(
  prompt: string, style: string, maxTokens: number, fullPrompt: string, signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return;
  const baseUrl = process.env.DEEPSEEK_API_KEY
    ? (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1')
    : (process.env.LLM_BASE_URL || 'https://api.openai.com/v1');
  const model = process.env.LLM_MODEL || (process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(style) },
        { role: 'user', content: fullPrompt },
      ],
      stream: true,
      max_tokens: maxTokens,
    }),
    signal,
  });
  if (!res.ok) throw new Error(`LLM API error: ${res.status}`);
  yield* sseStream(res, maxTokens, signal);
}

// ── 第2层：z-ai-web-dev-sdk ─────────────────────────────────

async function* tryZAI(
  _prompt: string, style: string, maxTokens: number, fullPrompt: string, signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
  const zai = await ZAI.create();
  const stream = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: buildSystemPrompt(style) },
      { role: 'user', content: fullPrompt },
    ],
    stream: true,
    thinking: { type: 'disabled' },
  });
  let total = 0;
  for await (const chunk of stream) {
    if (signal?.aborted) { yield { text: '\n[INTERRUPTED]', done: true }; return; }
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      total += content.length;
      yield { text: content, done: false };
      if (total >= maxTokens) { yield { text: '\n[...truncated]', done: true }; return; }
    }
  }
  yield { text: '', done: true };
}

// ── 第3层：本地 fallback ────────────────────────────────────

async function* fallbackStreamWrite(
  prompt: string, style: string, _maxTokens: number, signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
  // ...existing fallback code kept intact...
  const generatedText = `# ${prompt.slice(0, 40)}

> ⚠️ 注意：LLM 推理服务暂不可用，以下为本地 fallback 生成。

作为你的数字分身（Eidolon），我基于你的历史写作风格与知识库，对"${prompt.slice(0, 30)}"展开思考：

## 核心观点

这一议题的关键在于"信任的最小化"——通过密码学原语将信任从中心化平台转移至数学证明。这种范式转移并非简单的技术升级，而是数字时代生产关系的根本性重构。

## 论证展开

从协议层的视角看，这个问题涉及三层架构的协同：
- **Prime 层**：真人意识与战略意图
- **Eidolon 层**：AI 代理人格与私有 RAG
- **Vessel 层**：链上执行与 BudgetFence 控制

## 价值主张

当执行权从人交还给硅基容器，个体才真正从"数字异化"中解放。这正是 Web5 区别于 Web3 的核心命题。

---

*由 Eidolon 流式生成 · 风格画像: ${style} · LLM fallback 模式*`;

  const tokens = generatedText.match(/[\s\S]{1,3}/g) || [];
  for (let i = 0; i < tokens.length; i++) {
    if (signal?.aborted) { yield { text: '\n[INTERRUPTED]', done: true }; return; }
    await new Promise((r) => setTimeout(r, 20 + Math.random() * 20));
    if (/[。.!！?？\n]/.test(tokens[i])) await new Promise((r) => setTimeout(r, 80));
    yield { text: tokens[i], done: false };
  }
  yield { text: '', done: true };
}

// ── 主入口：多层链式调用 ────────────────────────────────────

/**
 * 流式写作 — 多层 LLM 适配
 *
 * 调用优先级：
 *   1. DEEPSEEK_API_KEY → DeepSeek API
 *   2. LLM_API_KEY → OpenAI-compatible API
 *   3. z-ai-web-dev-sdk → ZAI SDK
 *   4. fallbackStreamWrite → 本地模拟
 *
 * 未来：Web5.proto LLM API 协议 → 第三方付费调用 Agent/Avatar
 */
export async function* streamWrite(
  params: WriteParams
): AsyncGenerator<WriteChunk, void, unknown> {
  const { prompt, style = 'detailed', maxTokens = 800, signal } = params;
  const ragContext = await retrieveRagContext(prompt);
  const fullPrompt = `${prompt}${ragContext}\n\n请基于以上内容，以 Web5.blog 博客文章的形式展开写作（约 ${maxTokens} 字）。包含标题、核心观点、论证展开、价值主张等小节。`;

  // 尝试链：DeepSeek → OpenAI → ZAI SDK → fallback
  for (const layer of [tryOpenAI, tryZAI, fallbackStreamWrite]) {
    try {
      const gen = layer(prompt, style, maxTokens, fullPrompt, signal);
      let emitted = false;
      for await (const chunk of gen) {
        emitted = true;
        yield chunk;
        if (chunk.done) return;
      }
      if (emitted) return; // layer completed successfully
    } catch (err) {
      console.warn(`[eidolon-writer] ${layer.name} failed:`, err);
      // continue to next layer
    }
  }
}

/**
 * 一次性生成（非流式）
 */
export async function generateOnce(params: WriteParams): Promise<string> {
  let result = '';
  for await (const chunk of streamWrite(params)) {
    result += chunk.text;
    if (chunk.done) break;
  }
  return result;
}

/**
 * TEE 证明生成（生产环境对接 Phala Network）
 */
export async function generateTEEProof(inference: {
  prompt: string;
  output: string;
  model: string;
}): Promise<{ proof: string; verified: boolean; teeAttestation: string }> {
  return {
    proof: `0x${Math.random().toString(16).slice(2).padStart(128, '0')}`,
    verified: true,
    teeAttestation: 'sgx-attestation-simulated',
  };
}
