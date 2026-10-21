import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'web5_admin_session';
export const ADMIN_CHALLENGE_COOKIE = 'web5_admin_challenge';
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const ADMIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== 'production') return 'dev-admin-session-secret-not-for-production';
  throw new Error('ADMIN_SESSION_SECRET is not configured (min 32 chars)');
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function pack(payload: Record<string, string | number>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function unpack<T extends Record<string, unknown>>(token: string): T | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  if (!safeEqual(signature, sign(body))) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function buildAdminChallengeMessage(
  address: string,
  nonce: string,
  expiresAt: number
): string {
  return [
    'Web5.blog Admin Login',
    '',
    `Address: ${address.toLowerCase()}`,
    `Nonce: ${nonce}`,
    `Expires At: ${new Date(expiresAt).toISOString()}`,
    '',
    'This signature only authorizes an admin dashboard session. It does not move funds.',
  ].join('\n');
}

export function createAdminChallenge(address: string): {
  token: string;
  message: string;
  expiresAt: number;
} {
  const normalized = address.toLowerCase();
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + ADMIN_CHALLENGE_TTL_MS;
  const token = pack({ kind: 'challenge', address: normalized, nonce, expiresAt });
  const message = buildAdminChallengeMessage(normalized, nonce, expiresAt);
  return { token, message, expiresAt };
}

export function readAdminChallenge(token: string): {
  address: string;
  nonce: string;
  expiresAt: number;
} | null {
  const payload = unpack<{
    kind?: string;
    address?: string;
    nonce?: string;
    expiresAt?: number;
  }>(token);
  if (
    !payload ||
    payload.kind !== 'challenge' ||
    typeof payload.address !== 'string' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.expiresAt !== 'number' ||
    payload.expiresAt < Date.now()
  ) {
    return null;
  }
  return { address: payload.address, nonce: payload.nonce, expiresAt: payload.expiresAt };
}

export function issueAdminSession(address: string): string {
  return pack({
    kind: 'session',
    address: address.toLowerCase(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
  });
}

export function readAdminSession(token: string): { address: string; expiresAt: number } | null {
  const payload = unpack<{
    kind?: string;
    address?: string;
    expiresAt?: number;
  }>(token);
  if (
    !payload ||
    payload.kind !== 'session' ||
    typeof payload.address !== 'string' ||
    typeof payload.expiresAt !== 'number' ||
    payload.expiresAt < Date.now()
  ) {
    return null;
  }
  return { address: payload.address, expiresAt: payload.expiresAt };
}

export function getAdminSessionFromRequest(req: NextRequest): {
  address: string;
  expiresAt: number;
} | null {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return readAdminSession(token);
}

export function adminCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
