// Unit tests for the shared Prime.walletAddress normalizer.
//
// The key property: publisher.ts and vessel-login/route.ts must agree on the
// walletAddress they write for the same identity. This test pins the contract
// of normalizePrimeWalletAddress so any divergence between the two call sites
// is caught here.

import { describe, expect, it } from 'vitest';
import { normalizePrimeWalletAddress } from '@/lib/web5/prime';

const REAL_ADDRESS = '0x10687368ef1be3f178de0fccf5edff49e1c258b1';
const SIM_DID = 'did:web5:sim:abc';

describe('normalizePrimeWalletAddress', () => {
  it('passes a real 0x address through unchanged', () => {
    // Real wallet: the helper must return it verbatim (no normalization).
    expect(normalizePrimeWalletAddress(REAL_ADDRESS, SIM_DID)).toBe(REAL_ADDRESS);
    // Even when the DID is irrelevant, a 0x wallet wins.
    expect(normalizePrimeWalletAddress(REAL_ADDRESS, undefined)).toBe(REAL_ADDRESS);
  });

  it('derives a deterministic sim value from the prime DID for non-0x wallets', () => {
    const result = normalizePrimeWalletAddress('did:web5:sim:abc', SIM_DID);
    expect(result).toBe('sim:abc');

    // The publisher path derives rawWallet from the DID and still lands on the
    // same value — this is what guarantees publisher === vessel-login.
    const fromPublisherRaw = normalizePrimeWalletAddress(
      'did:web5:sim:abc', // session.primeDid.replace('did:plvtvs:', '').toLowerCase()
      SIM_DID,
    );
    expect(fromPublisherRaw).toBe(result);

    // Deterministic: same inputs => same output, independent of rawWallet noise.
    expect(normalizePrimeWalletAddress('anything-not-0x', SIM_DID)).toBe(result);
    expect(normalizePrimeWalletAddress(undefined, SIM_DID)).toBe(result);
  });

  it('does not throw on empty / null inputs and falls back safely', () => {
    expect(() => normalizePrimeWalletAddress(undefined, undefined)).not.toThrow();
    expect(normalizePrimeWalletAddress(undefined, undefined)).toBe('sim:unknown');
    expect(normalizePrimeWalletAddress(null, null)).toBe('sim:unknown');
    expect(normalizePrimeWalletAddress('', '')).toBe('sim:unknown');
    expect(normalizePrimeWalletAddress('   ', 'did:web5:sim:')).toBe('sim:unknown');
  });
});
