import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TREASURY,
  getActiveChain,
  getEscrowVaultAddress,
  getTreasuryAddress,
} from '@/lib/web5/contracts/addresses';

const OTHER = '0x1111111111111111111111111111111111111111';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('treasury and escrow resolution', () => {
  it('defaults both to the built-in treasury', () => {
    expect(getTreasuryAddress()).toBe(TREASURY);
    expect(getEscrowVaultAddress()).toBe(TREASURY);
  });

  it('lets a rehearsal point escrow and treasury at throwaway addresses', () => {
    vi.stubEnv('TREASURY_ADDRESS', OTHER);
    vi.stubEnv('ESCROW_VAULT_ADDRESS', '0x2222222222222222222222222222222222222222');
    expect(getTreasuryAddress()).toBe(OTHER);
    expect(getEscrowVaultAddress()).toBe('0x2222222222222222222222222222222222222222');
  });

  it('falls back to the treasury when only the treasury is overridden', () => {
    vi.stubEnv('TREASURY_ADDRESS', OTHER);
    expect(getEscrowVaultAddress()).toBe(OTHER);
  });

  it('ignores malformed overrides instead of sending funds nowhere', () => {
    vi.stubEnv('TREASURY_ADDRESS', 'not-an-address');
    vi.stubEnv('ESCROW_VAULT_ADDRESS', '0x1234');
    expect(getTreasuryAddress()).toBe(TREASURY);
    expect(getEscrowVaultAddress()).toBe(TREASURY);
  });
});

describe('active chain selection', () => {
  it('defaults to Arc mainnet', () => {
    expect(getActiveChain().id).toBe(5042);
  });

  it('selects Arc testnet when asked', () => {
    vi.stubEnv('NEXT_PUBLIC_ACTIVE_CHAIN', 'arc-testnet');
    const chain = getActiveChain();
    expect(chain.id).toBe(5042002);
    expect(chain.rpcUrl).toBe('https://rpc.testnet.arc.io');
  });
});
