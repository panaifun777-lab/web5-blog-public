import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from './helpers/fake-db';

vi.mock('@/lib/db', async () => {
  const { fakeDb: db } = await import('./helpers/fake-db');
  return { db: db.db };
});

import { checkPayoutCaps } from '@/lib/web5/payments/arc';

const USDC = 10n ** 18n;

beforeEach(() => {
  fakeDb.reset();
});

describe('checkPayoutCaps', () => {
  it('rejects a single transfer above 5 USDC', async () => {
    const result = await checkPayoutCaps(6n * USDC);
    expect(result).toMatchObject({ ok: false, code: 'CAP_SINGLE', status: 409 });
  });

  it('allows a transfer exactly at the single cap', async () => {
    await expect(checkPayoutCaps(5n * USDC)).resolves.toEqual({ ok: true });
  });

  it('counts only the rolling last 24h and blocks when the total would exceed 25 USDC', async () => {
    fakeDb.seedLedger({ orderId: 'a', kind: 'AGENT', amountWei: (20n * USDC).toString(), txHash: '0x1', createdAt: new Date(Date.now() - 23 * 3600 * 1000) });
    fakeDb.seedLedger({ orderId: 'b', kind: 'FEE', amountWei: (4n * USDC).toString(), txHash: '0x2', createdAt: new Date(Date.now() - 60_000) });
    // 26h old: outside the window and must not count.
    fakeDb.seedLedger({ orderId: 'c', kind: 'AGENT', amountWei: (25n * USDC).toString(), txHash: '0x3', createdAt: new Date(Date.now() - 26 * 3600 * 1000) });

    const result = await checkPayoutCaps(2n * USDC);
    expect(result).toMatchObject({ ok: false, code: 'CAP_DAILY', status: 409 });

    await expect(checkPayoutCaps(1n * USDC)).resolves.toEqual({ ok: true });
  });

  it('ignores RETAINED rows because no funds left the treasury', async () => {
    fakeDb.seedLedger({ orderId: 'a', kind: 'RETAINED', amountWei: (25n * USDC).toString(), txHash: null });
    await expect(checkPayoutCaps(1n * USDC)).resolves.toEqual({ ok: true });
  });
});
