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

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`bind-wallet:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const message = body?.message as BindMasterWalletMessage | undefined;
    const signature = typeof body?.signature === 'string' ? body.signature : '';

    if (!message || !signature || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      return NextResponse.json(
        { error: 'EIP-712 message and valid signature are required' },
        { status: 400 }
      );
    }

    const result = await processBindMasterWallet({
      message,
      signature: signature as `0x${string}`,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[bind-wallet] Error:', err);
    return NextResponse.json(
      { error: err.message || '绑定失败' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
