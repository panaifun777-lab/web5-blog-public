// ════════════════════════════════════════════════════════════════
// src/app/api/ai/write/route.ts
// AI 分身流式写作 API（SSE）
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { streamWrite } from '@/lib/web5/ai/eidolon-writer';
import { inspectPromptWithTDPO } from '@/lib/web5/security/tdpo';
import { buildOutlinePrompt, buildArticleExpansionPrompt } from '@/lib/web5/ai/free-pool';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError, apiErrorMessage, requestLocale } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`ai-write:${clientIp(req)}`, 6, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

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
      return apiError('MISSING_PROMPT', { request: req });
    }

    // ── TDPO 认知安全前置审计 ──
    const tdpoCheck = inspectPromptWithTDPO(prompt);
    if (!tdpoCheck.passed) {
      return apiError('TDPO_BLOCKED', {
        request: req,
        extra: { reason: tdpoCheck.reason || undefined, riskScore: tdpoCheck.riskScore },
      });
    }

    // ── 两步式“意识种子”流水线构建 ──
    let dynamicPrompt = prompt;
    let targetTokens =
      maxTokens ||
      (wordTarget >= 3000
        ? 4500
        : wordTarget >= 2000
          ? 3000
          : wordTarget >= 1000
            ? 1800
            : 800);

    const effectiveTitle = (title || prompt.split('\n')[0] || '').slice(0, 80);

    if (mode === 'outline') {
      dynamicPrompt = buildOutlinePrompt(effectiveTitle, prompt, '');
      targetTokens = 450;
    } else if (outline) {
      dynamicPrompt = buildArticleExpansionPrompt(
        {
          title: effectiveTitle,
          seedThesis: prompt,
          wordTarget: wordTarget || 1000,
          style: style || 'detailed',
        },
        outline
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const ac = new AbortController();
        try {
          // 大纲模式走专用 prompt；正文模式传原始种子 + 大纲，由引擎自行组装
          const writePrompt = mode === 'outline' ? dynamicPrompt : prompt;
          for await (const chunk of streamWrite({
            prompt: writePrompt,
            title: effectiveTitle,
            outline: mode === 'outline' ? '' : outline || '',
            wordTarget: wordTarget || 2000,
            style: style || 'detailed',
            maxTokens: targetTokens,
            signal: ac.signal,
          })) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
            if (chunk.done) break;
          }
        } catch (err) {
          // 不向客户端暴露内部错误细节，只给稳定 code + 本地化文案
          console.error('[ai/write] stream failed:', err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: apiErrorMessage('INTERNAL_ERROR', requestLocale(req)),
                code: 'INTERNAL_ERROR',
                done: true,
              })}\n\n`
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
    console.error('[ai/write] Error:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
