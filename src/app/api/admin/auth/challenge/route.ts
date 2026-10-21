import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { isSuperadmin } from '@/lib/admin/auth';
import { createAdminChallenge } from '@/lib/admin/session';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`admin-challenge:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const address = typeof body.address === 'string' ? body.address.trim() : '';

  if (!isAddress(address)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }
  if (!isSuperadmin(address)) {
    return NextResponse.json({ error: 'Wallet is not authorized' }, { status: 403 });
  }

  const challenge = createAdminChallenge(address);
  return NextResponse.json(
    {
      challengeToken: challenge.token,
      message: challenge.message,
      expiresAt: challenge.expiresAt,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
