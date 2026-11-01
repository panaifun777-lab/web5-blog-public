// ════════════════════════════════════════════════════════════════
// src/app/api/eidolon/deploy/route.ts
// 部署新 Eidolon（分身）API — 需要已认证的 Vessel 会话
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`eidolon-deploy:${clientIp(req)}`, 5, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);
    if (!session || session.accessMode !== 'vessel') {
      return apiError('VESSEL_SESSION_REQUIRED', { request: req });
    }

    const { name } = await req.json() as { name?: string };
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      return apiError('MISSING_NAME', { request: req });
    }
    if (trimmed.length > 60) {
      return apiError('NAME_TOO_LONG', { request: req, params: { max: 60 } });
    }

    // 只允许在当前会话所属 Prime 下创建
    const prime = await db.prime.findUnique({ where: { did: session.primeDid } });
    if (!prime) {
      return apiError('PRIME_NOT_FOUND', { request: req });
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
    console.error('[eidolon/deploy] Error:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
