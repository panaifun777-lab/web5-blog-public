// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/tasks/route.ts
// AP2 bounty orders. Every write action is authenticated and gated.
// Settlement/refund are the only endpoints that can move money.
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  listActiveCommerceOrders,
  createCommerceOrder,
  assignAgentToOrder,
  submitOrder,
  verifyOrder,
  disputeOrder,
  settleOrder,
  refundOrder,
  auditOrder,
  CommerceError,
  type SettlementActor,
} from '@/lib/web5/ap2/commerce';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { authorizeAdmin } from '@/lib/admin/guard';
import {
  ESCROW_PAYOUTS_ENABLED,
  MONEY_FLOWS_ENABLED,
  REFUNDS_ENABLED,
  moneyFlowBlocked,
} from '@/lib/launch/flags';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function bearer(req: NextRequest): string {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    code ? { error: message, code } : { error: message },
    { status, headers: NO_STORE }
  );
}

function toFailure(err: any) {
  if (err instanceof CommerceError) {
    if (err.status >= 500) console.error('[commerce/tasks] Error:', err.message);
    return fail(err.message, err.status, err.code);
  }
  const message = err?.message || 'Request failed';
  const status = /not found/i.test(message)
    ? 404
    : /required|invalid|verification failed|must be|mismatch/i.test(message)
      ? 400
      : 500;
  if (status === 500) console.error('[commerce/tasks] Error:', err);
  return fail(message, status);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'audit') {
      const admin = authorizeAdmin(req);
      if (!admin.ok) return fail('Admin authorization required for audits', 403);

      const orderId = url.searchParams.get('orderId');
      if (!orderId) return fail('orderId is required', 400);

      const result = await auditOrder(orderId, {
        chain: url.searchParams.get('chain') !== 'false',
      });
      return NextResponse.json(
        { success: true, ...result, allPassed: result.checks.every((c) => c.pass) },
        { headers: NO_STORE }
      );
    }

    const orders = await listActiveCommerceOrders();
    return NextResponse.json(
      {
        success: true,
        count: orders.filter((order) => !order.isDemo).length,
        demoCount: orders.filter((order) => order.isDemo).length,
        moneyFlowsEnabled: MONEY_FLOWS_ENABLED,
        escrowPayoutsEnabled: ESCROW_PAYOUTS_ENABLED,
        refundsEnabled: REFUNDS_ENABLED,
        settlementWindowHours: Math.max(1, Number(process.env.SETTLEMENT_WINDOW_HOURS || 72)),
        orders,
      },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    return toFailure(err);
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
    const action = body.action;

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
        acceptanceHash: typeof body.acceptanceHash === 'string' ? body.acceptanceHash : undefined,
        deliveryHours: Number(body.deliveryHours) || undefined,
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
        body.deliverableContent,
        body.provenance
          ? {
              provider: body.provenance.provider === 'arweave' ? 'arweave' : 'local',
              hash: String(body.provenance.hash || ''),
              fallback: Boolean(body.provenance.fallback),
            }
          : undefined
      );
      return NextResponse.json({ success: true, order, payoutExecuted: false });
    }

    if (action === 'verify') {
      if (!admin.ok) return fail('Admin authorization required for verification', 403);
      const order = await verifyOrder(body.orderId);
      return NextResponse.json({ success: true, order });
    }

    if (action === 'dispute') {
      if (!session?.primeDid) return fail('Connect a Vessel session to dispute', 401);
      const order = await disputeOrder(body.orderId, session.primeDid, body.reason);
      return NextResponse.json({ success: true, order });
    }

    if (action === 'settle') {
      let actor: SettlementActor;
      if (admin.ok) {
        actor = { kind: 'admin' };
      } else if (session?.accessMode === 'vessel' && session.vesselDid) {
        actor = { kind: 'orchestrator', did: session.vesselDid };
      } else {
        return fail('Admin or orchestrator authorization required for settlement', 403);
      }

      const order = await settleOrder(body.orderId, actor, {
        force: actor.kind === 'admin' && body.force === true,
      });
      return NextResponse.json({
        success: true,
        order,
        payoutExecuted: Boolean(order.payoutTxHash),
        payoutTxHash: order.payoutTxHash,
        feeTxHash: order.feeTxHash,
      });
    }

    if (action === 'refund') {
      if (!admin.ok) return fail('Admin authorization required for refunds', 403);
      const order = await refundOrder(body.orderId, { kind: 'admin' }, body.reason);
      return NextResponse.json({
        success: true,
        order,
        refundExecuted: Boolean(order.refundTxHash),
        refundTxHash: order.refundTxHash,
      });
    }

    return fail('Invalid action', 400);
  } catch (err: any) {
    return toFailure(err);
  }
}
