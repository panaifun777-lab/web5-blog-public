// ════════════════════════════════════════════════════════════════
// src/app/api/distribution/farcaster/route.ts
// Farcaster API — @piaoshu 真实集成
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  distributeToFarcaster,
  getDistributionStats,
  lookupFarcasterProfile,
  getRecentCasts,
  PIAOSHU_FC,
} from '@/lib/web5/distribution/farcaster';
import { authorizeAdmin } from '@/lib/admin/guard';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const identity = authorizeAdmin(req);
  if (!identity.ok) {
    return NextResponse.json(
      { error: identity.error || 'Unauthorized' },
      { status: identity.status || 401 }
    );
  }

  const limited = rateLimit(`farcaster-distribute:${clientIp(req)}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  try {
    const { vesselId, contentArweaveHash } = await req.json();
    if (!vesselId || !contentArweaveHash) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const result = await distributeToFarcaster(vesselId, contentArweaveHash);
    return NextResponse.json({
      success: true,
      ...result,
      message: result.real
        ? '✓ 已发布至 Farcaster (真实)'
        : 'ℹ 已记录分发（仿真模式）',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const did = req.nextUrl.searchParams.get('did');
    const action = req.nextUrl.searchParams.get('action') || 'stats';

    if (action === 'profile') {
      // 返回 @piaoshu 的 Farcaster 真实档案
      const profile = await lookupFarcasterProfile();
      return NextResponse.json({
        profile,
        identity: {
          username: PIAOSHU_FC.username,
          displayName: PIAOSHU_FC.displayName,
          verifications: PIAOSHU_FC.verifications,
          neynarConfigured: !!(process.env.NEYNAR_API_KEY && process.env.NEYNAR_SIGNER_UUID),
        },
      });
    }

    if (action === 'casts') {
      // 返回 @piaoshu 的最近 Cast
      const casts = await getRecentCasts();
      return NextResponse.json({ total: casts.length, casts });
    }

    // 默认返回分发统计
    const stats = await getDistributionStats(did || undefined);
    const profile = await lookupFarcasterProfile();
    return NextResponse.json({
      ...stats,
      farcasterProfile: profile,
      piaoshu: {
        username: `@${PIAOSHU_FC.username}`,
        profileUrl: `https://warpcast.com/${PIAOSHU_FC.username}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
