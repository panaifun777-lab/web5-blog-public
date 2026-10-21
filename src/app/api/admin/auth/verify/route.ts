import { NextRequest, NextResponse } from 'next/server';
import { isAddress, verifyMessage } from 'viem';
import { db } from '@/lib/db';
import { isSuperadmin } from '@/lib/admin/auth';
import {
  ADMIN_CHALLENGE_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  adminCookieOptions,
  buildAdminChallengeMessage,
  issueAdminSession,
  readAdminChallenge,
} from '@/lib/admin/session';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`admin-verify:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
  const challengeToken =
    typeof body.challengeToken === 'string' ? body.challengeToken : '';

  if (!isAddress(address) || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    return NextResponse.json({ error: 'Invalid address or signature' }, { status: 400 });
  }
  if (!isSuperadmin(address)) {
    return NextResponse.json({ error: 'Wallet is not authorized' }, { status: 403 });
  }

  const challenge = readAdminChallenge(challengeToken);
  if (!challenge) {
    return NextResponse.json(
      { error: 'Challenge expired or invalid. Please retry.' },
      { status: 401 }
    );
  }
  if (challenge.address !== address.toLowerCase()) {
    return NextResponse.json({ error: 'Challenge address mismatch' }, { status: 401 });
  }

  const message = buildAdminChallengeMessage(
    challenge.address,
    challenge.nonce,
    challenge.expiresAt
  );

  let valid = false;
  try {
    valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }
  if (!valid) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
  }

  try {
    await db.authNonce.create({
      data: {
        address: address.toLowerCase(),
        purpose: 'ADMIN_LOGIN',
        nonce: BigInt(`0x${challenge.nonce.slice(0, 16)}`),
        signature,
        deadline: BigInt(Math.floor(challenge.expiresAt / 1000)),
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'This signature has already been used. Please retry.' },
        { status: 409 }
      );
    }
    console.error('[admin/verify] Nonce persistence failed:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }

  const sessionToken = issueAdminSession(address);
  const response = NextResponse.json(
    {
      success: true,
      address: address.toLowerCase(),
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    sessionToken,
    adminCookieOptions(ADMIN_SESSION_TTL_MS / 1000)
  );
  response.cookies.set(ADMIN_CHALLENGE_COOKIE, '', adminCookieOptions(0));
  return response;
}
