// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/tasks/route.ts
// AP2 bounty orders. Every write action is authenticated and gated.
// Settlement/refund are the only endpoints that can move money.
// ════════════════════════════════════════════════════════════════

import { randomUUID } from 'crypto';
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
  type CommerceTaskOrder,
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

function toFailure(err: any, requestId: string) {
  if (err instanceof CommerceError) {
    if (err.status >= 500) console.error('[commerce/tasks] Error:', err.message);
    return fail(err.message, err.status, err.code);
  }
  console.error(`[commerce/tasks] Unhandled error (requestId=${requestId}):`, err);
  return NextResponse.json(
    { success: false, error: 'Internal error', requestId },
    { status: 500, headers: NO_STORE }
  );
}

const ORDER_ID_RE = /^[A-Za-z0-9._:-]{1,100}$/;

function isOrderId(value: unknown): value is string {
  return typeof value === 'string' && ORDER_ID_RE.test(value);
}

/** Public listing projection: never expose private deliverable bodies or acceptance hashes. */
function publicOrder(order: CommerceTaskOrder): CommerceTaskOrder {
  const copy: CommerceTaskOrder = { ...order };
  delete copy.deliverableContent;
  delete copy.acceptanceHash;
  return copy;
}

export async function GET(req: NextRequest) {
  const requestId = randomUUID();
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'audit') {
      const admin = authorizeAdmin(req);
      if (!admin.ok) return fail('Admin authorization required for audits', 403);

      const orderId = url.searchParams.get('orderId');
      if (!orderId) return fail('orderId is required', 400);
      if (!isOrderId(orderId)) return fail('Invalid orderId', 400, 'INVALID_ORDER_ID');

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
        orders: orders.map(publicOrder),
      },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    return toFailure(err, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
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

    // Every action below identifies an existing order by orderId.
    const needsOrderId =
      action === 'assign' ||
      action === 'submit' ||
      action === 'verify' ||
      action === 'dispute' ||
      action === 'settle' ||
      action === 'refund';
    if (needsOrderId && !isOrderId(body.orderId)) {
      return fail('Invalid orderId', 400, 'INVALID_ORDER_ID');
    }

    // Optional on create; validate only when supplied.
    if (action === 'create' && body.orderId !== undefined && !isOrderId(body.orderId)) {
      return fail('Invalid orderId', 400, 'INVALID_ORDER_ID');
    }

    const reason =
      typeof body.reason === 'string' ? body.reason.slice(0, 500) : '';

    if (action === 'create') {
      if (!session || session.accessMode !== 'vessel' || !session.primeDid) {
        return fail('Connect a Vessel session to publish a bounty', 401);
      }

      const rawDeliveryHours = Number(body.deliveryHours);
      const deliveryHours =
        Number.isInteger(rawDeliveryHours) &&
        rawDeliveryHours >= 1 &&
        rawDeliveryHours <= 720
          ? rawDeliveryHours
          : undefined;

      const order = await createCommerceOrder({
        creatorDid: session.primeDid,
        title: body.title,
        description: body.description,
        bountyUsdc: body.bountyUsdc,
        escrowContract: body.escrowContract,
        escrowTxHash: body.escrowTxHash || body.txHash,
        orderId: typeof body.orderId === 'string' ? body.orderId : undefined,
        acceptanceHash: typeof body.acceptanceHash === 'string' ? body.acceptanceHash : undefined,
        deliveryHours,
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
      const order = await disputeOrder(body.orderId, session.primeDid, reason);
      return NextResponse.json({ success: true, order });
    }

    if (action === 'settle') {
      const existing = await db.taskOrder.findUnique({
        where: { orderId: body.orderId },
      });
      if (!existing) return fail('Task order not found', 404);

      let actor: SettlementActor;
      if (admin.ok) {
        actor = { kind: 'admin' };
      } else if (
        session?.accessMode === 'vessel' &&
        session.vesselDid &&
        (session.primeDid === existing.creatorDid || session.vesselDid === existing.creatorDid)
      ) {
        // Only a session linked to the order creator may settle as orchestrator.
        actor = { kind: 'orchestrator', did: session.vesselDid };
      } else {
        return fail(
          'Admin or orchestrator authorization required for settlement',
          403,
          'NOT_ORCHESTRATOR'
        );
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
      const order = await refundOrder(body.orderId, { kind: 'admin' }, reason);
      return NextResponse.json({
        success: true,
        order,
        refundExecuted: Boolean(order.refundTxHash),
        refundTxHash: order.refundTxHash,
      });
    }

    return fail('Invalid action', 400);
  } catch (err: any) {
    return toFailure(err, requestId);
  }
}
