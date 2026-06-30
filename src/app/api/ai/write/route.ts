// ════════════════════════════════════════════════════════════════
// src/app/api/ai/write/route.ts
// AI 分身流式写作 API（SSE）
// ════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { streamWrite } from '@/lib/web5/ai/eidolon-writer';

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
