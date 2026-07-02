// ════════════════════════════════════════════════════════════════
// src/app/api/eidolon/deploy/route.ts
// 部署新 Eidolon（分身）API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json() as { name?: string };
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    // 查找第一个 Prime（MVP 简化）
    const prime = await db.prime.findFirst({ where: { status: 'ACTIVE' } });
    if (!prime) {
      return NextResponse.json({ error: 'No active Prime found' }, { status: 404 });
    }

    const did = `did:eidolon:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const eidolon = await db.eidolon.create({
      data: {
        did,
        name,
        primeId: prime.id,
        status: 'ACTIVE',
        lastActiveAt: new Date(),
      },
    });

    // 自动创建关联 Vessel
    const vesselDid = `did:vessel:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const vessel = await db.vessel.create({
      data: {
        did: vesselDid,
        eidolonId: eidolon.id,
        primeId: prime.id,
        smartAccountAddress: `0x${vesselDid.slice(-40).padStart(40, '0')}`,
        status: 'ACTIVE',
      },
    });

    // 自动创建 Budget
    await db.aP2Budget.create({
      data: {
        vesselId: vessel.id,
        primeId: prime.id,
        dailyLimit: 10_000_000n,
        perTxLimit: 1_000_000n,
        rateLimitPerMin: 5,
        whitelist: '[]',
      },
    });

    return NextResponse.json({ success: true, did, name, vesselDid });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
