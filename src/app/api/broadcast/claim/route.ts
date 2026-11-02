// ════════════════════════════════════════════════════════════════
// src/app/api/broadcast/claim/route.ts
// Telegram 广播队列领取端点（只供 PM2 的 bot 进程调用）。
//
// Fail-closed like /api/cron/settle: TG_BROADCAST_SECRET unset (production
// today) => 503 and the whole surface is inert. The secret travels in
// `x-broadcast-secret`, never in a URL, and is never echoed back.
//
// The response carries server-rendered Telegram HTML (see telegram-message.ts)
// so the bot holds no copy logic and no user text is ever concatenated into a
// static asset. Claiming stamps `claimedAt` + attempts, so a second claim
// inside BROADCAST_CLAIM_TTL_MS cannot hand out the same order twice.
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  BROADCAST_SECRET_HEADER,
  claimPendingBroadcasts,
  describeBroadcastConfig,
  verifyBroadcastSecret,
} from '@/lib/web5/broadcast/task-queue';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };
const ORDER_ID_RE = /^[A-Za-z0-9._:-]{1,100}$/;

/** Config-only readiness probe. Booleans and caps only — never a secret. */
export async function GET(req: NextRequest) {
  void req;
  return NextResponse.json(
    {
      ok: true,
      endpoint: 'POST /api/broadcast/claim',
      ackEndpoint: 'POST /api/broadcast/ack',
      ...describeBroadcastConfig(),
    },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  const auth = verifyBroadcastSecret(req.headers.get(BROADCAST_SECRET_HEADER));
  if (!auth.ok) {
    return apiError(auth.code, { request: req, headers: NO_STORE });
  }

  const body = await req.json().catch(() => ({} as any));
  const rawLimit = Number(body?.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 20) : 5;

  try {
    const { items, pending, skipped } = await claimPendingBroadcasts({ limit });
    const claimable = items.filter((item) => ORDER_ID_RE.test(item.orderId));

    return NextResponse.json(
      {
        success: true,
        claimed: claimable.length,
        pending,
        skipped,
        // The bot posts `text` verbatim with `parseMode`; it must not rebuild copy.
        items: claimable,
      },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    console.error('[broadcast/claim] claim failed:', err?.message || err);
    return apiError('INTERNAL_ERROR', { request: req, headers: NO_STORE });
  }
}
