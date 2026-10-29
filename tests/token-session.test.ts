import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from './helpers/fake-db';

vi.mock('@/lib/db', async () => {
  const { fakeDb: db } = await import('./helpers/fake-db');
  return { db: db.db };
});

import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';

const SECRET = 'test-secret-for-session-revocation';
const VESSEL = 'did:plvtvs:0x1111111111111111111111111111111111111111';
const PRIME = 'did:prime:0x2222222222222222222222222222222222222222';

function makeToken(): string {
  const payload = `${VESSEL}:${PRIME}:${Date.now() + 3600_000}:nonce123`;
  const signature = createHash('sha256').update(payload + SECRET).digest('hex');
  return `${payload}.${signature}`;
}

function sessionRow(overrides: Record<string, any> = {}) {
  return {
    tokenHash: createHash('sha256').update(makeToken()).digest('hex'),
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3600_000),
    permissions: JSON.stringify(['read', 'publish']),
    ap2Budget: null,
    vessel: { did: VESSEL, eidolon: { did: 'did:eidolon:1' } },
    prime: { did: PRIME },
    ...overrides,
  };
}

beforeEach(() => {
  process.env.VESSEL_TOKEN_SECRET = SECRET;
  fakeDb.reset();
});

describe('resolveVesselSessionFromToken', () => {
  it('accepts a signed token that has a live session row', async () => {
    const token = makeToken();
    fakeDb.sessions.push(
      sessionRow({ tokenHash: createHash('sha256').update(token).digest('hex') })
    );

    const session = await resolveVesselSessionFromToken(token);
    expect(session).toMatchObject({ accessMode: 'vessel', vesselDid: VESSEL, primeDid: PRIME });
  });

  it('rejects a validly signed token with no session row (revocation must stick)', async () => {
    const session = await resolveVesselSessionFromToken(makeToken());
    expect(session).toBeNull();
  });

  it('rejects a revoked session', async () => {
    const token = makeToken();
    fakeDb.sessions.push(
      sessionRow({
        tokenHash: createHash('sha256').update(token).digest('hex'),
        revokedAt: new Date(),
      })
    );
    expect(await resolveVesselSessionFromToken(token)).toBeNull();
  });

  it('rejects an expired session row and a forged signature', async () => {
    const token = makeToken();
    fakeDb.sessions.push(
      sessionRow({
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() - 1000),
      })
    );
    expect(await resolveVesselSessionFromToken(token)).toBeNull();
    expect(await resolveVesselSessionFromToken(`${token.slice(0, -8)}deadbeef`)).toBeNull();
  });
});
