// Integration-style unit test for publishContent's Prime.upsert.
//
// Goal: prove that publishContent writes Prime.walletAddress through the shared
// normalizePrimeWalletAddress helper, so it can never drift back to the old
// hardcoded constant / split-data behavior. The db, the Arweave uploader, and
// the vessel session getter are all mocked (no network, no real chain), mirroring
// the mock style used in tests/tg-broadcast.test.ts / settlement.test.ts.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Captured writes so we can assert what publishContent persisted.
const primeUpserts: Array<Record<string, any>> = [];
const contentCreates: Array<Record<string, any>> = [];

vi.mock('@/lib/db', () => ({
  db: {
    prime: {
      findUnique: vi.fn(async () => null), // force the upsert (create) branch
      upsert: vi.fn(async ({ create }: { create: Record<string, any> }) => {
        primeUpserts.push(create);
        return { id: 'prime-1', ...create };
      }),
    },
    content: {
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        contentCreates.push(data);
        return { id: 'content-1', ...data };
      }),
    },
  },
}));

// Avoid any real Irys / Arweave network calls during publish.
vi.mock('@/lib/web5/content/arweave-uploader', () => ({
  uploadToArweave: vi.fn(async () => ({ arweaveHash: 'A'.repeat(43), fallback: false, size: 123 })),
  estimateUploadCost: vi.fn(async () => 0n),
  ArweavePermanenceError: class ArweavePermanenceError extends Error {},
}));

// Keep the import graph light; we always pass a sessionOverride so the real
// session getter is never invoked.
vi.mock('@/lib/web5/vessel-auth', () => ({
  getCurrentVesselSession: vi.fn(() => null),
}));

import { publishContent } from '@/lib/web5/content/publisher';
import { normalizePrimeWalletAddress } from '@/lib/web5/prime';

const REAL_ADDRESS = '0x10687368ef1be3f178de0fccf5edff49e1c258b1';

function makeSession(primeDid: string): any {
  return {
    vesselDid: 'did:vessel:test',
    eidolonDid: 'did:eidolon:test',
    primeDid,
    sessionToken: 'tok',
    expiresAt: Date.now() + 100_000,
    ap2Budget: { dailyLimit: 0n, perTxLimit: 0n, rateLimitPerMin: 0, whitelist: [] },
    permissions: ['publish'],
    accessMode: 'vessel',
  };
}

const baseParams = {
  title: 'Hello Web5',
  bodyMd: 'This is the body of the article.',
};

beforeEach(() => {
  primeUpserts.length = 0;
  contentCreates.length = 0;
});

describe('publishContent → Prime.walletAddress normalization', () => {
  it('uses the shared helper for a simulated (non-0x) DID, matching vessel-login', async () => {
    const primeDid = 'did:web5:sim:abc';
    const session = makeSession(primeDid);

    await publishContent(baseParams, session);

    expect(primeUpserts).toHaveLength(1);
    const rawWallet = primeDid.replace('did:plvtvs:', '').toLowerCase();
    const expected = normalizePrimeWalletAddress(rawWallet, primeDid);

    expect(primeUpserts[0].walletAddress).toBe(expected);
    // Explicit value, identical to what vessel-login now writes for the same DID.
    expect(primeUpserts[0].walletAddress).toBe('sim:abc');
    // And the content row points at the same prime.
    expect(contentCreates[0].primeId).toBe('prime-1');
  });

  it('uses the shared helper for a real 0x wallet and keeps it unchanged', async () => {
    const primeDid = `did:plvtvs:${REAL_ADDRESS}`;
    const session = makeSession(primeDid);

    await publishContent(baseParams, session);

    expect(primeUpserts).toHaveLength(1);
    const rawWallet = primeDid.replace('did:plvtvs:', '').toLowerCase();
    const expected = normalizePrimeWalletAddress(rawWallet, primeDid);

    expect(primeUpserts[0].walletAddress).toBe(expected);
    expect(primeUpserts[0].walletAddress).toBe(REAL_ADDRESS);
  });
});
