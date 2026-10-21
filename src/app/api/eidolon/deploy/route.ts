// ════════════════════════════════════════════════════════════════
// src/app/api/eidolon/deploy/route.ts
// 部署新 Eidolon（分身）API — 需要已认证的 Vessel 会话
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`eidolon-deploy:${clientIp(req)}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);
    if (!session || session.accessMode !== 'vessel') {
      return NextResponse.json({ error: 'Vessel session required' }, { status: 401 });
    }

    const { name } = await req.json() as { name?: string };
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    if (trimmed.length > 60) {
      return NextResponse.json({ error: 'Name too long (max 60)' }, { status: 400 });
    }

    // 只允许在当前会话所属 Prime 下创建
    const prime = await db.prime.findUnique({ where: { did: session.primeDid } });
    if (!prime) {
      return NextResponse.json({ error: 'Prime not found for session' }, { status: 403 });
    }

    const did = `did:eidolon:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const eidolon = await db.eidolon.create({
      data: {
        did,
        name: trimmed,
        primeId: prime.id,
        status: 'ACTIVE',
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      did,
      name: eidolon.name,
      vesselProvisioned: false,
      message: 'Eidolon 已创建。Vessel 需要真实 ERC-4337 智能账户与链上部署，当前不会生成占位地址。',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
