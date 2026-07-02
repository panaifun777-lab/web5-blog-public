// ════════════════════════════════════════════════════════════════
// src/app/api/defi/harvest/route.ts
// DeFi 收益 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { simulateHarvest, getTotalHarvest } from '@/lib/web5/defi/harvester';

export async function POST(req: NextRequest) {
  try {
    const { vesselId } = await req.json();
    if (!vesselId) return NextResponse.json({ error: 'Missing vesselId' }, { status: 400 });
    const result = await simulateHarvest(vesselId);
    return NextResponse.json({
      success: true,
      yieldAmount: result.yieldAmount.toString(),
      pool: result.pool,
      apy: result.apy.toFixed(2) + '%',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const did = req.nextUrl.searchParams.get('did');
    if (!did) return NextResponse.json({ error: 'Missing did' }, { status: 400 });
    const stats = await getTotalHarvest(did);
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
