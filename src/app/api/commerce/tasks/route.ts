// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/tasks/route.ts
// AP2 任务悬赏与众包订单 API (Prisma db.taskOrder 持久化)
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  listActiveCommerceOrders,
  createCommerceOrder,
  assignAgentToOrder,
  submitAndSettleOrder,
} from '@/lib/web5/ap2/commerce';

export async function GET() {
  try {
    const orders = await listActiveCommerceOrders();
    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const order = await createCommerceOrder({
        creatorDid: body.creatorDid || 'did:plvtvs:guest',
        title: body.title,
        description: body.description,
        bountyUsdc: body.bountyUsdc || '10.0',
        escrowContract: body.escrowContract || '0xCA36335845E382129167fC44243F07A76827bA22',
        escrowTxHash: body.escrowTxHash || body.txHash || null,
        orderId: body.orderId,
      });
      return NextResponse.json({ success: true, order });
    }

    if (action === 'assign') {
      const order = await assignAgentToOrder(body.orderId, body.agentDid || 'did:eidolon:worker');
      return NextResponse.json({ success: true, order });
    }

    if (action === 'settle') {
      const order = await submitAndSettleOrder(
        body.orderId,
        body.deliverableHash || `0x${Date.now()}`,
        body.deliverableContent
      );
      return NextResponse.json({ success: true, order });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
