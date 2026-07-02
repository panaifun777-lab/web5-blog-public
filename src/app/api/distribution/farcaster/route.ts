// ════════════════════════════════════════════════════════════════
// src/app/api/distribution/farcaster/route.ts
// Farcaster 分发 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { distributeToFarcaster, getDistributionStats } from '@/lib/web5/distribution/farcaster';

export async function POST(req: NextRequest) {
  try {
    const { vesselId, contentArweaveHash } = await req.json();
    if (!vesselId || !contentArweaveHash) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const result = await distributeToFarcaster(vesselId, contentArweaveHash);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const did = req.nextUrl.searchParams.get('did');
    if (!did) return NextResponse.json({ error: 'Missing did' }, { status: 400 });
    const stats = await getDistributionStats(did);
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
