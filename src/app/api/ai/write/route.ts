// ════════════════════════════════════════════════════════════════
// src/app/api/ai/write/route.ts
// AI 分身流式写作 API（SSE）
// ════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { streamWrite } from '@/lib/web5/ai/eidolon-writer';
import { inspectPromptWithTDPO } from '@/lib/web5/security/tdpo';
import { buildOutlinePrompt, buildArticleExpansionPrompt } from '@/lib/web5/ai/free-pool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      title,
      mode = 'article', // 'outline' | 'article'
      outline,
      wordTarget = 1000,
      style,
      maxTokens,
    } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── TDPO 认知安全前置审计 ──
    const tdpoCheck = inspectPromptWithTDPO(prompt);
    if (!tdpoCheck.passed) {
      return new Response(JSON.stringify({
        error: `[TDPO 认知防火墙拦截] ${tdpoCheck.reason || '提示词包含未授权越狱或风险模式'}`,
        riskScore: tdpoCheck.riskScore,
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── 两步式“意识种子”流水线构建 ──
    let dynamicPrompt = prompt;
    let targetTokens = maxTokens || (
      wordTarget === 3000 ? 4000 :
      wordTarget === 2000 ? 2800 :
      wordTarget === 500 ? 700 : 1500
    );

    if (mode === 'outline') {
      // Step 1: 毫秒级主题大纲与层次罗列
      dynamicPrompt = buildOutlinePrompt(title || prompt.slice(0, 30), prompt, '');
      targetTokens = 400;
    } else if (outline) {
      // Step 2: 结合大纲与 DWN 记忆切片进行结构化扩写
      dynamicPrompt = buildArticleExpansionPrompt({
        title: title || prompt.slice(0, 30),
        seedThesis: prompt,
        wordTarget: wordTarget || 1000,
        style: style || 'detailed',
      }, outline);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const ac = new AbortController();
        try {
          for await (const chunk of streamWrite({
            prompt: dynamicPrompt,
            style: style || 'detailed',
            maxTokens: targetTokens,
            signal: ac.signal,
          })) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
            if (chunk.done) break;
          }
        } catch (err) {
          const e = err as Error;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: e.message, done: true })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    const e = err as Error;
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
