// ════════════════════════════════════════════════════════════════
// src/app/api/ai/write/route.ts
// AI 分身流式写作 API（SSE）
// ════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { streamWrite } from '@/lib/web5/ai/eidolon-writer';
import { inspectPromptWithTDPO } from '@/lib/web5/security/tdpo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, maxTokens } = await req.json();

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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const ac = new AbortController();
        try {
          for await (const chunk of streamWrite({
            prompt,
            style: style || 'detailed',
            maxTokens: maxTokens || 600,
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
