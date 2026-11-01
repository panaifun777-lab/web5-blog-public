// ════════════════════════════════════════════════════════════════
// src/app/api/auth/bind-wallet/route.ts
// 绑定主钱包 — 必须提供 EIP-712 签名，禁止无签名绑定
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  processBindMasterWallet,
  type BindMasterWalletMessage,
} from '@/lib/web5/auth/eip712-types';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`bind-wallet:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

  try {
    const body = await req.json();
    const message = body?.message as BindMasterWalletMessage | undefined;
    const signature = typeof body?.signature === 'string' ? body.signature : '';

    if (!message || !signature || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      return apiError('SIGNATURE_REQUIRED', { request: req, status: 400 });
    }

    const result = await processBindMasterWallet({
      message,
      signature: signature as `0x${string}`,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[bind-wallet] Error:', err);
    return apiError('BIND_WALLET_FAILED', {
      request: req,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
