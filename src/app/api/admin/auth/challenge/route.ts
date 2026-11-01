import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { isSuperadmin } from '@/lib/admin/auth';
import { createAdminChallenge } from '@/lib/admin/session';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/web5/api/errors';

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`admin-challenge:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

  const body = await req.json().catch(() => ({}));
  const address = typeof body.address === 'string' ? body.address.trim() : '';

  if (!isAddress(address)) {
    return apiError('INVALID_WALLET_ADDRESS', { request: req });
  }
  if (!isSuperadmin(address)) {
    return apiError('WALLET_NOT_AUTHORIZED', { request: req });
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
