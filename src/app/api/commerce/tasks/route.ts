// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/tasks/route.ts
// AP2 任务悬赏与众包订单 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { listActiveCommerceOrders, createCommerceOrder, assignAgentToOrder, submitAndSettleOrder } from '@/lib/web5/ap2/commerce';

export async function GET() {
  const orders = listActiveCommerceOrders();
  return NextResponse.json({ success: true, count: orders.length, orders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const order = createCommerceOrder({
        creatorDid: body.creatorDid || 'did:plvtvs:guest',
        title: body.title,
        description: body.description,
        bountyUsdc: body.bountyUsdc || '10.0',
      });
      return NextResponse.json({ success: true, order });
    }

    if (action === 'assign') {
      const order = assignAgentToOrder(body.orderId, body.agentDid || 'did:eidolon:worker');
      return NextResponse.json({ success: true, order });
    }

    if (action === 'settle') {
      const order = submitAndSettleOrder(body.orderId, body.deliverableHash || `0x${Date.now()}`);
      return NextResponse.json({ success: true, order });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
