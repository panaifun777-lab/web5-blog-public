// ════════════════════════════════════════════════════════════════
// src/app/api/arp/referral/route.ts
// 推荐分润 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { recordReferral, getReferralEarnings } from '@/lib/web5/arp/referral';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);
    if (!session || session.accessMode !== 'vessel') {
      return NextResponse.json({ error: 'Vessel session required' }, { status: 401 });
    }

    const { referrerDid, referredDid, contentArweaveHash } = await req.json();
    if (!referrerDid || !referredDid || !contentArweaveHash) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (referredDid !== session.vesselDid) {
      return NextResponse.json({ error: 'referredDid must match the session vessel' }, { status: 403 });
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
