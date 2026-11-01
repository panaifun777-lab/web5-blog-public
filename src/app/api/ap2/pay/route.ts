// ════════════════════════════════════════════════════════════════
// src/app/api/ap2/pay/route.ts
// AP2 微支付 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { ap2Pay } from '@/lib/web5/ap2/engine';
import { toTokenUnits, serializeForJson, type AP2Category } from '@/lib/web5/types';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { MONEY_FLOWS_ENABLED, moneyFlowBlocked } from '@/lib/launch/flags';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!MONEY_FLOWS_ENABLED) return moneyFlowBlocked();

  const limited = rateLimit(`ap2-pay:${clientIp(req)}`, 30, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);

    if (!session || session.accessMode !== 'vessel') {
      return apiError('VESSEL_SESSION_REQUIRED', { request: req });
    }

    const { to, amount, category, ref } = await req.json() as {
      to: string;
      amount: string | number;
      category: AP2Category;
      ref?: string;
    };

    if (!to || !amount || !category) {
      return apiError('MISSING_FIELDS', { request: req });
    }

    const result = await ap2Pay({
      from: '', // 由 ap2Pay 从 session 获取
      to,
      amount: toTokenUnits(amount),
      category,
      ref: ref || '',
      timestamp: Date.now(),
    }, session);

    return NextResponse.json(serializeForJson(result));
  } catch (err) {
    console.error('[ap2/pay] Error:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
