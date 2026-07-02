// ════════════════════════════════════════════════════════════════
// src/lib/web5/ai/eidolon-writer.ts
// AI 分身流式写作引擎
// + TEE 模拟层（生产环境对接 Phala Network）
// ════════════════════════════════════════════════════════════════

import ZAI from 'z-ai-web-dev-sdk';

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

/** 个性化 system prompt — 基于 Prime 风格画像 */
function buildSystemPrompt(style: string): string {
  const styles: Record<string, string> = {
    concise: '你是用户的数字分身（Eidolon）。以简洁的文笔写作，用词精准，句子简短。始终保持用户的智识身份。使用中文写作，Markdown 格式输出。',
    detailed: '你是用户的数字分身（Eidolon）。以详尽的笔触写作，论据丰富，例证充分。始终保持用户的智识身份。使用中文写作，Markdown 格式输出。',
    academic: '你是用户的数字分身（Eidolon）。以学术风格写作，论证严谨，引用规范。始终保持用户的智识身份。使用中文写作，Markdown 格式输出。',
    casual: '你是用户的数字分身（Eidolon）。以对话式风格写作，语气亲切，融入个人轶事。始终保持用户的智识身份。使用中文写作，Markdown 格式输出。',
  };
  return styles[style] || styles.detailed;
}

/** 模拟 RAG 上下文检索（生产环境对接 Qdrant/Pinecone） */
function mockRagRetrieve(prompt: string): string {
  return `\n\n[私有知识库上下文 - 由 DWN RAG 引擎检索]
用户曾表达过对"${prompt.slice(0, 20)}..."相关主题的关注。
用户偏好协议级实现与生产关系重构的论述视角。
用户常用术语：协议级、生产关系、个人解放、容器登录、分身矩阵。
[/私有知识库上下文]\n\n`;
}

/**
 * 流式写作 — 使用真实 LLM (z-ai-web-dev-sdk)
 *
 * 生产环境架构：
 *   prompt → RAG 检索 → TEE 飞地（Phala Network） → LLM 推理 → SSE 流式输出
 * MVP 架构：
 *   prompt → mock RAG → 直接调用 z-ai-web-dev-sdk → 流式 chunk
 */
export async function* streamWrite(
  params: WriteParams
): AsyncGenerator<WriteChunk, void, unknown> {
  const { prompt, style = 'detailed', maxTokens = 800, signal } = params;

  // Step 1: 模拟 RAG 上下文检索
  const ragContext = mockRagRetrieve(prompt);
  const fullPrompt = `${prompt}${ragContext}\n\n请基于以上内容，以 Web5.blog 博客文章的形式展开写作（约 ${maxTokens} 字）。包含标题、核心观点、论证展开、价值主张等小节。`;

  // Step 2: 调用 z-ai-web-dev-sdk（真实 LLM 推理）
  // 注：在生产环境中，此调用应在 Phala Network TEE 飞地中执行
  try {
    const zai = await ZAI.create();

    // 使用流式 API
    const stream = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: buildSystemPrompt(style) },
        { role: 'user', content: fullPrompt },
      ],
      stream: true,
      thinking: { type: 'disabled' },
    });

    let totalChars = 0;
    for await (const chunk of stream) {
      if (signal?.aborted) {
        yield { text: '\n[INTERRUPTED]', done: true };
        return;
      }

      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        totalChars += content.length;
        yield { text: content, done: false };

        // 超过 maxTokens 时截断
        if (totalChars >= maxTokens) {
          yield { text: '\n\n[... truncated by maxTokens]', done: true };
          return;
        }
      }
    }

    yield { text: '', done: true };
  } catch (err) {
    // LLM 调用失败，回退到模拟生成
    console.warn('[eidolon-writer] LLM call failed, using fallback:', err);
    yield* fallbackStreamWrite(prompt, style, maxTokens, signal);
  }
}

/**
 * Fallback 流式生成（LLM 不可用时使用）
 */
async function* fallbackStreamWrite(
  prompt: string,
  style: string,
  maxTokens: number,
  signal?: AbortSignal
): AsyncGenerator<WriteChunk, void, unknown> {
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
    if (signal?.aborted) {
      yield { text: '\n[INTERRUPTED]', done: true };
      return;
    }
    await new Promise((r) => setTimeout(r, 20 + Math.random() * 20));
    if (/[。.!！?？\n]/.test(tokens[i])) {
      await new Promise((r) => setTimeout(r, 80));
    }
    yield { text: tokens[i], done: false };
    if (i > maxTokens / 2) {
      yield { text: '\n[...] (truncated)', done: true };
      return;
    }
  }
  yield { text: '', done: true };
}

/**
 * 一次性生成（非流式）— 用于后台任务
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
 * MVP：返回模拟证明
 */
export async function generateTEEProof(inference: {
  prompt: string;
  output: string;
  model: string;
}): Promise<{
  proof: string;
  verified: boolean;
  teeAttestation: string;
}> {
  // 生产环境：调用 Phala Network 的 attestation API
  // MVP：返回模拟证明
  return {
    proof: `0x${Math.random().toString(16).slice(2).padStart(128, '0')}`,
    verified: true,
    teeAttestation: 'sgx-attestation-simulated',
  };
}
