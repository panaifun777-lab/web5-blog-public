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
  settleOrder,
  refundOrder,
} from '@/lib/web5/ap2/commerce';
import { ESCROW_PAYOUTS_ENABLED, REFUNDS_ENABLED } from '@/lib/launch/flags';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function authorized(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.SETTLEMENT_CRON_SECRET || '';
  if (secret.length < 16) {
    return {
      ok: false,
      status: 503,
      error: 'SETTLEMENT_CRON_SECRET is not configured (min 16 chars)',
    };
  }
  const provided = req.headers.get('x-cron-secret') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: 'Invalid cron secret' };
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
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });
  }

  const settled: Array<{ orderId: string; payoutTxHash?: string | null }> = [];
  const refunded: Array<{ orderId: string; refundTxHash?: string | null }> = [];
  const errors: Array<{ orderId: string; stage: 'settle' | 'refund'; error: string }> = [];

  if (ESCROW_PAYOUTS_ENABLED) {
    const due = await listSettlementsDue(20);
    for (const order of due) {
      try {
        const result = await settleOrder(order.orderId, { kind: 'cron' });
        if (result.payoutTxHash) {
          settled.push({ orderId: order.orderId, payoutTxHash: result.payoutTxHash });
        }
      } catch (err: any) {
        errors.push({ orderId: order.orderId, stage: 'settle', error: err?.message || 'settle failed' });
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
        errors.push({ orderId: order.orderId, stage: 'refund', error: err?.message || 'refund failed' });
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
      errors,
    },
    { headers: NO_STORE }
  );
}
