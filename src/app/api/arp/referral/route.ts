// ════════════════════════════════════════════════════════════════
// src/app/api/arp/referral/route.ts
// 推荐分润 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { recordReferral, getReferralEarnings } from '@/lib/web5/arp/referral';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { apiError } from '@/lib/web5/api/errors';

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);
    if (!session || session.accessMode !== 'vessel') {
      return apiError('VESSEL_SESSION_REQUIRED', { request: req });
    }

    const { referrerDid, referredDid, contentArweaveHash } = await req.json();
    if (!referrerDid || !referredDid || !contentArweaveHash) {
      return apiError('MISSING_FIELDS', { request: req });
    }
    if (referredDid !== session.vesselDid) {
      return apiError('REFERRAL_TARGET_MISMATCH', { request: req });
    }
    await recordReferral(referrerDid, referredDid, contentArweaveHash);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[arp/referral] record failed:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}

export async function GET(req: NextRequest) {
  try {
    const did = req.nextUrl.searchParams.get('did');
    if (!did) return apiError('MISSING_DID', { request: req });
    const earnings = await getReferralEarnings(did);
    return NextResponse.json(earnings);
  } catch (err) {
    console.error('[arp/referral] read failed:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
