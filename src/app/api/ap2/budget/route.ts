// ════════════════════════════════════════════════════════════════
// src/app/api/ap2/budget/route.ts
// AP2 预算调整 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { dailyLimit } = await req.json() as { dailyLimit?: number };
    if (!dailyLimit || dailyLimit <= 0) {
      return NextResponse.json({ error: 'Invalid daily limit' }, { status: 400 });
    }

    // 更新第一个 vessel 的预算（MVP 简化）
    const vessel = await db.vessel.findFirst({ where: { status: 'ACTIVE' } });
    if (!vessel) {
      return NextResponse.json({ error: 'No active vessel' }, { status: 404 });
    }

    const budget = await db.aP2Budget.findFirst({ where: { vesselId: vessel.id } });
    if (!budget) {
      return NextResponse.json({ error: 'No budget found' }, { status: 404 });
    }

    const updated = await db.aP2Budget.update({
      where: { id: budget.id },
      data: { dailyLimit: BigInt(dailyLimit * 1_000_000) },
    });

    return NextResponse.json({ success: true, dailyLimit: Number(updated.dailyLimit) / 1_000_000 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
