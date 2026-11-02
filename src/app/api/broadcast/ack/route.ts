// ════════════════════════════════════════════════════════════════
// src/app/api/broadcast/ack/route.ts
// 广播发送结果回执：SENT（带 tgMessageId）/ FAILED / SKIPPED。
//
// Same gate as /api/broadcast/claim: TG_BROADCAST_SECRET unset => 503, so this
// endpoint is inert in production exactly like the settlement cron. Ack is
// idempotent — a repeated SENT ack is a no-op, which is what makes the bot's
// "never post the same order twice" dedup hold across restarts.
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  BROADCAST_SECRET_HEADER,
  ackBroadcast,
  verifyBroadcastSecret,
} from '@/lib/web5/broadcast/task-queue';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };
const ORDER_ID_RE = /^[A-Za-z0-9._:-]{1,100}$/;

export async function POST(req: NextRequest) {
  const auth = verifyBroadcastSecret(req.headers.get(BROADCAST_SECRET_HEADER));
  if (!auth.ok) {
    return apiError(auth.code, { request: req, headers: NO_STORE });
  }

  const body = await req.json().catch(() => ({} as any));
  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) {
    return apiError('ORDER_ID_REQUIRED', { request: req, headers: NO_STORE });
  }
  if (!ORDER_ID_RE.test(orderId)) {
    return apiError('INVALID_ORDER_ID', { request: req, headers: NO_STORE });
  }

  const ok = body?.ok === true || body?.ok === false ? Boolean(body.ok) : null;
  if (ok === null) {
    return apiError('BROADCAST_RESULT_INVALID', { request: req, headers: NO_STORE });
  }

  const requestedStatus = body?.status === 'SKIPPED' ? 'SKIPPED' : undefined;
  const tgMessageId =
    typeof body?.tgMessageId === 'number' || typeof body?.tgMessageId === 'string'
      ? body.tgMessageId
      : null;

  // A record may only become SENT with the message id that proves delivery;
  // otherwise a lost ack would silently mark an order as announced.
  const messageIdProves =
    (typeof body?.tgMessageId === 'number' && Number.isFinite(body.tgMessageId) && body.tgMessageId > 0) ||
    (typeof body?.tgMessageId === 'string' &&
      /^\d{1,15}$/.test(body.tgMessageId.trim()) &&
      Number(body.tgMessageId.trim()) > 0);
  if (ok && !messageIdProves) {
    return apiError('BROADCAST_RESULT_INVALID', { request: req, headers: NO_STORE });
  }

  try {
    const result = await ackBroadcast({
      orderId,
      ok,
      tgMessageId,
      error: typeof body?.error === 'string' ? body.error : null,
      errorKind: typeof body?.errorKind === 'string' ? body.errorKind : null,
      status: requestedStatus,
      nowMs: Date.now(),
    });

    if (result.action === 'not-found') {
      return apiError('BROADCAST_RECORD_NOT_FOUND', { request: req, headers: NO_STORE });
    }

    return NextResponse.json(
      {
        success: true,
        action: result.action,
        record: result.record
          ? {
              orderId: result.record.orderId,
              status: result.record.status,
              tgMessageId: result.record.tgMessageId ?? null,
              attempts: result.record.attempts,
              sentAt: result.record.sentAt ?? null,
            }
          : null,
      },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    console.error('[broadcast/ack] ack failed:', err?.message || err);
    return apiError('INTERNAL_ERROR', { request: req, headers: NO_STORE });
  }
}
