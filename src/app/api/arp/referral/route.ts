// ════════════════════════════════════════════════════════════════
// src/app/api/arp/referral/route.ts
// 推荐分润 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { recordReferral, getReferralEarnings } from '@/lib/web5/arp/referral';

export async function POST(req: NextRequest) {
  try {
    const { referrerDid, referredDid, contentArweaveHash } = await req.json();
    if (!referrerDid || !referredDid || !contentArweaveHash) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    await recordReferral(referrerDid, referredDid, contentArweaveHash);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const did = req.nextUrl.searchParams.get('did');
    if (!did) return NextResponse.json({ error: 'Missing did' }, { status: 400 });
    const earnings = await getReferralEarnings(did);
    return NextResponse.json(earnings);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
