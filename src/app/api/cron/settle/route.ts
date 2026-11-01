// ════════════════════════════════════════════════════════════════
// src/app/api/cron/settle/route.ts
// 结算 / 退款定时任务。只接受带 x-cron-secret 的 POST。
// 结算窗口（默认 72h）未过或有争议的订单不会被结算。
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  listSettlementsDue,
  listExpiredDeliveries,
  reclaimStaleClaims,
  settleOrder,
  refundOrder,
} from '@/lib/web5/ap2/commerce';
import { ESCROW_PAYOUTS_ENABLED, REFUNDS_ENABLED } from '@/lib/launch/flags';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function authorized(
  req: NextRequest
): { ok: true } | { ok: false; code: 'CRON_NOT_CONFIGURED' | 'CRON_UNAUTHORIZED' } {
  const secret = process.env.SETTLEMENT_CRON_SECRET || '';
  if (secret.length < 16) {
    console.error('[cron/settle] SETTLEMENT_CRON_SECRET is missing or shorter than 16 chars');
    return { ok: false, code: 'CRON_NOT_CONFIGURED' };
  }
  const provided = req.headers.get('x-cron-secret') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: 'CRON_UNAUTHORIZED' };
  }
  return { ok: true };
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: 'POST /api/cron/settle',
      escrowPayoutsEnabled: ESCROW_PAYOUTS_ENABLED,
      refundsEnabled: REFUNDS_ENABLED,
    },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  const auth = authorized(req);
  if (!auth.ok) {
    return apiError(auth.code, { request: req, headers: NO_STORE });
  }

  const settled: Array<{ orderId: string; payoutTxHash?: string | null }> = [];
  const refunded: Array<{ orderId: string; refundTxHash?: string | null }> = [];
  const errors: Array<{ orderId: string; stage: 'settle' | 'refund'; error: string }> = [];

  // Recover claims stranded by a crash before scheduling new work.
  let recovered = { settled: 0, refunded: 0, released: 0 };
  try {
    recovered = await reclaimStaleClaims(30);
  } catch (err: any) {
    console.error('[cron/settle] stale claim recovery failed:', err?.message || err);
    errors.push({ orderId: '-', stage: 'settle', error: 'stale claim recovery failed' });
  }

  if (ESCROW_PAYOUTS_ENABLED) {
    const due = await listSettlementsDue(20);
    for (const order of due) {
      try {
        const result = await settleOrder(order.orderId, { kind: 'cron' });
        if (result.payoutTxHash) {
          settled.push({ orderId: order.orderId, payoutTxHash: result.payoutTxHash });
        }
      } catch (err: any) {
        console.error('[cron/settle] settle failed:', err?.message || err);
        errors.push({ orderId: order.orderId, stage: 'settle', error: 'settle failed' });
      }
    }
  }

  if (REFUNDS_ENABLED) {
    const expired = await listExpiredDeliveries(20);
    for (const order of expired) {
      try {
        const result = await refundOrder(order.orderId, { kind: 'cron' }, 'delivery deadline expired');
        if (result.refundTxHash) {
          refunded.push({ orderId: order.orderId, refundTxHash: result.refundTxHash });
        }
      } catch (err: any) {
        console.error('[cron/settle] refund failed:', err?.message || err);
        errors.push({ orderId: order.orderId, stage: 'refund', error: 'refund failed' });
      }
    }
  }

  return NextResponse.json(
    {
      success: errors.length === 0,
      escrowPayoutsEnabled: ESCROW_PAYOUTS_ENABLED,
      refundsEnabled: REFUNDS_ENABLED,
      settledCount: settled.length,
      refundedCount: refunded.length,
      settled,
      refunded,
      recovered,
      errors,
    },
    { headers: NO_STORE }
  );
}
