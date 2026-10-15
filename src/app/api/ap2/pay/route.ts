// ════════════════════════════════════════════════════════════════
// src/app/api/ap2/pay/route.ts
// AP2 微支付 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { ap2Pay } from '@/lib/web5/ap2/engine';
import { toTokenUnits, serializeForJson, type AP2Category } from '@/lib/web5/types';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);

    const { to, amount, category, ref } = await req.json() as {
      to: string;
      amount: string | number;
      category: AP2Category;
      ref?: string;
    };

    if (!to || !amount || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
