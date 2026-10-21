// ════════════════════════════════════════════════════════════════
// src/app/api/x402/balance/route.ts
// 查询站内预付费余额（x402 凭单结算资金来源）
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { db } from '@/lib/db';
import { formatArcUsdc } from '@/lib/web5/auth/eip712-types';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limited = rateLimit(`x402-balance:${clientIp(req)}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const address = (req.nextUrl.searchParams.get('address') || '').trim();
  if (!isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  const wallet = await db.backupWallet.findUnique({
    where: { address: address.toLowerCase() },
    select: { address: true, balanceWei: true, asset: true, updatedAt: true },
  });

  if (!wallet) {
    return NextResponse.json({
      success: true,
      registered: false,
      address: address.toLowerCase(),
      balanceWei: '0',
      balanceUsdc: '0.0',
      asset: 'USDC',
    });
  }

  return NextResponse.json(
    {
      success: true,
      registered: true,
      address: wallet.address,
      balanceWei: wallet.balanceWei,
      balanceUsdc: formatArcUsdc(wallet.balanceWei),
      asset: wallet.asset,
      updatedAt: wallet.updatedAt,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
