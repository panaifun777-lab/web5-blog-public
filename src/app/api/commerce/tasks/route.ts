// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/tasks/route.ts
// AP2 bounty orders. All write actions are authenticated and gated.
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  listActiveCommerceOrders,
  createCommerceOrder,
  assignAgentToOrder,
  submitOrder,
  settleOrder,
} from '@/lib/web5/ap2/commerce';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { authorizeAdmin } from '@/lib/admin/guard';
import {
  ESCROW_PAYOUTS_ENABLED,
  MONEY_FLOWS_ENABLED,
  featureDisabled,
  moneyFlowBlocked,
} from '@/lib/launch/flags';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest): string {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

function fail(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET() {
  try {
    const orders = await listActiveCommerceOrders();
    return NextResponse.json(
      {
        success: true,
        count: orders.length,
        moneyFlowsEnabled: MONEY_FLOWS_ENABLED,
        escrowPayoutsEnabled: ESCROW_PAYOUTS_ENABLED,
        orders,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    return fail(err.message || 'Failed to load orders', 500);
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(`commerce-tasks:${clientIp(req)}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (!MONEY_FLOWS_ENABLED) return moneyFlowBlocked();

    const session = await resolveVesselSessionFromToken(bearer(req));
    const admin = authorizeAdmin(req);

    if (action === 'create') {
      if (!session || session.accessMode !== 'vessel' || !session.primeDid) {
        return fail('Connect a Vessel session to publish a bounty', 401);
      }

      const order = await createCommerceOrder({
        creatorDid: session.primeDid,
        title: body.title,
        description: body.description,
        bountyUsdc: body.bountyUsdc,
        escrowContract: body.escrowContract,
        escrowTxHash: body.escrowTxHash || body.txHash,
        orderId: typeof body.orderId === 'string' ? body.orderId : undefined,
      });
      return NextResponse.json({ success: true, order });
    }

    if (action === 'assign') {
      const existing = await db.taskOrder.findUnique({
        where: { orderId: body.orderId },
      });
      if (!existing) return fail('Task order not found', 404);

      const isCreator = session?.primeDid === existing.creatorDid;
      if (!admin.ok && !isCreator) {
        return fail('Only the task creator or an admin can assign this task', 403);
      }

      const agentDid =
        typeof body.agentDid === 'string' && body.agentDid.trim()
          ? body.agentDid.trim()
          : session?.vesselDid;
      if (!agentDid) return fail('agentDid is required', 400);

      const order = await assignAgentToOrder(body.orderId, agentDid);
      return NextResponse.json({ success: true, order });
    }

    if (action === 'submit') {
      const existing = await db.taskOrder.findUnique({
        where: { orderId: body.orderId },
      });
      if (!existing) return fail('Task order not found', 404);

      const isAssignee =
        session?.vesselDid && session.vesselDid === existing.assignedAgentDid;
      if (!admin.ok && !isAssignee) {
        return fail('Only the assigned vessel or an admin can submit this task', 403);
      }

      const order = await submitOrder(
        body.orderId,
        body.deliverableHash,
        body.deliverableContent
      );
      return NextResponse.json({ success: true, order, payoutExecuted: false });
    }

    if (action === 'settle') {
      if (!admin.ok) return fail('Admin authorization required for settlement', 403);
      if (!ESCROW_PAYOUTS_ENABLED) {
        return featureDisabled(
          'ESCROW_PAYOUTS_DISABLED',
          'Settlement payouts are disabled. Submit the deliverable and wait for payout configuration.'
        );
      }
      const order = await settleOrder(body.orderId);
      return NextResponse.json({
        success: true,
        order,
        payoutExecuted: true,
        payoutTxHash: order.payoutTxHash,
      });
    }

    return fail('Invalid action', 400);
  } catch (err: any) {
    const message = err?.message || 'Request failed';
    const status = /not found/i.test(message)
      ? 404
      : /required|invalid|verification failed|must be/i.test(message)
        ? 400
        : 500;
    if (status === 500) console.error('[commerce/tasks] Error:', err);
    return fail(message, status);
  }
}
