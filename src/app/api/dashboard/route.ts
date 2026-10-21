// ════════════════════════════════════════════════════════════════
// src/app/api/dashboard/route.ts
// Dashboard 数据 API — 4 模块数据聚合
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAp2Treasury } from '@/lib/web5/ap2/engine';
import { serializeForJson } from '@/lib/web5/types';

export async function GET(req: NextRequest) {
  try {
    const vesselDid = req.headers.get('x-vessel-did');
    if (!vesselDid) {
      return NextResponse.json(
        { error: 'Vessel DID required (x-vessel-did header)' },
        { status: 401 }
      );
    }

    // Module 1: Vessel Status
    const vessel = await db.vessel.findUnique({
      where: { did: vesselDid },
      include: { eidolon: true, prime: true },
    });
    if (!vessel) {
      return NextResponse.json({ error: 'Vessel not found' }, { status: 404 });
    }

    const vesselStatus = {
      id: vessel.id,
      did: vessel.did,
      status: vessel.status,
      smartAccountAddress: vessel.smartAccountAddress,
      eidolonName: vessel.eidolon.name,
      primeDid: vessel.prime.did,
      lastActiveAt: vessel.lastActiveAt,
    };

    // Module 2: AP2 Treasury
    const treasury = await getAp2Treasury(vesselDid);

    // Module 3: Eidolon Sync（模拟）
    const eidolonSync = {
      eidolonDid: vessel.eidolon.did,
      ragCollection: vessel.eidolon.ragCollection || 'eidolon_memory_default',
      lastSyncAt: vessel.eidolon.lastActiveAt,
      syncLatencyMs: Math.floor(Math.random() * 200) + 50,
      styleDriftScore: Math.random() * 0.1, // 0-0.1 = healthy
    };

    // Module 4: Autonomous Logs
    const logs = await db.autonomousLog.findMany({
      where: { vesselId: vessel.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const totalYield = await db.autonomousLog.aggregate({
      where: { vesselId: vessel.id, yieldAmount: { not: null } },
      _sum: { yieldAmount: true },
    });

    return NextResponse.json(serializeForJson({
      vesselStatus,
      treasury,
      eidolonSync,
      autonomousLogs: logs,
      totalYield: totalYield._sum.yieldAmount || 0n,
    }));
  } catch (err) {
    const e = err as Error;
    console.error('[dashboard] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
