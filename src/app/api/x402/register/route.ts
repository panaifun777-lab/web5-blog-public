// ════════════════════════════════════════════════════════════════
// src/app/api/x402/register/route.ts
// x402 预付费钱包注册 — EIP-191 签名绑定地址，不移动资金
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getAddress, isAddress, verifyMessage } from 'viem';
import { db } from '@/lib/db';
import { X402_DEPOSITS_ENABLED, featureDisabled } from '@/lib/launch/flags';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

function buildMessage(address: string, nonce: string, deadline: string): string {
  return [
    'Web5.blog x402 Prepaid Wallet Registration',
    '',
    `Address: ${address.toLowerCase()}`,
    `Nonce: ${nonce}`,
    `Deadline: ${deadline}`,
    '',
    'This signature registers a prepaid wallet. It does not move funds or authorize a payment.',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  if (!X402_DEPOSITS_ENABLED) {
    return featureDisabled(
      'X402_DEPOSITS_DISABLED',
      'x402 预付费注册尚未开放：充值、对账与提现链路仍在验证中。'
    );
  }

  const limited = rateLimit(`x402-register:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    const nonce = body?.nonce !== undefined ? String(body.nonce) : '';
    const deadline = body?.deadline !== undefined ? String(body.deadline) : '';
    const signature = typeof body?.signature === 'string' ? body.signature : '';

    if (!isAddress(address) || !/^\d+$/.test(nonce) || !/^\d+$/.test(deadline)) {
      return NextResponse.json({ error: 'Invalid address, nonce or deadline' }, { status: 400 });
    }
    if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      return NextResponse.json({ error: 'Valid signature required' }, { status: 400 });
    }
    if (BigInt(deadline) < BigInt(Math.floor(Date.now() / 1000))) {
      return NextResponse.json({ error: 'Signature expired' }, { status: 400 });
    }

    const normalized = getAddress(address).toLowerCase();
    const message = buildMessage(normalized, nonce, deadline);
    const valid = await verifyMessage({
      address: normalized as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!valid) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    const result = await db.$transaction(async (tx) => {
      await tx.authNonce.create({
        data: {
          address: normalized,
          purpose: 'X402_REGISTER',
          nonce: BigInt(nonce),
          signature,
          deadline: BigInt(deadline),
        },
      });

      return tx.backupWallet.upsert({
        where: { address: normalized },
        update: {},
        create: {
          address: normalized,
          balanceWei: '0',
          asset: 'USDC',
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        address: normalized,
        balanceWei: result.balanceWei,
        message: 'Prepaid wallet registered. Send USDC to the treasury, then POST /api/x402/deposits with the tx hash.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'This signature or nonce was already used' },
        { status: 409 }
      );
    }
    console.error('[x402/register] Error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
