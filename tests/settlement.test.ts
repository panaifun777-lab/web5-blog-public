import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from './helpers/fake-db';

vi.mock('@/lib/db', async () => {
  const { fakeDb: db } = await import('./helpers/fake-db');
  return { db: db.db };
});

vi.mock('@/lib/launch/flags', () => ({
  MONEY_FLOWS_ENABLED: true,
  ESCROW_PAYOUTS_ENABLED: true,
  REFUNDS_ENABLED: true,
}));

vi.mock('@/lib/web5/payments/arc', () => ({
  PAYOUT_SINGLE_CAP_USDC: 5,
  sendNativeUsdc: vi.fn(),
  verifyNativeTransfer: vi.fn(),
}));

import { sendNativeUsdc } from '@/lib/web5/payments/arc';
import {
  acceptanceVerdict,
  listSettlementsDue,
  settleOrder,
  settlementWindowMs,
  splitBountyWei,
  submitOrder,
} from '@/lib/web5/ap2/commerce';

const AGENT = '0x1111111111111111111111111111111111111111';
const FEE = '0xffffffffffffffffffffffffffffffffffffffff';
const USDC = 10n ** 18n;

function txHash(seed: string): `0x${string}` {
  return `0x${seed.repeat(64).slice(0, 64)}` as `0x${string}`;
}

function baseOrder(overrides: Record<string, any> = {}) {
  return fakeDb.seedOrder({
    orderId: 'ap2-task-test-1',
    creatorDid: 'did:prime:creator',
    title: 'settlement test task',
    description: 'test',
    bountyUsdc: '10',
    status: 'VERIFIED',
    assignedAgentDid: 'did:agent:1',
    deliverableArweaveHash: 'A'.repeat(43),
    settlementDueAt: new Date(Date.now() - 60_000),
    ...overrides,
  });
}

const sendMock = vi.mocked(sendNativeUsdc);

beforeEach(() => {
  fakeDb.reset();
  fakeDb.vessels.push({
    did: 'did:agent:1',
    smartAccountAddress: AGENT,
    status: 'ACTIVE',
    successCount: 0,
    failCount: 0,
  });
  fakeDb.primes.push({ did: 'did:prime:creator', walletAddress: '0x2222222222222222222222222222222222222222' });
  process.env.PLATFORM_FEE_ADDRESS = FEE;
  sendMock.mockReset();
  let n = 0;
  sendMock.mockImplementation(async () => ({
    ok: true as const,
    txHash: txHash(String(++n)),
    blockNumber: String(n),
  }));
});

describe('settlement math', () => {
  it('splits 80/20 with the fee absorbing rounding', () => {
    expect(splitBountyWei(10_000_000_000_000_000_000n)).toEqual({
      agentWei: 8_000_000_000_000_000_000n,
      feeWei: 2_000_000_000_000_000_000n,
    });
    expect(splitBountyWei(7n)).toEqual({ agentWei: 5n, feeWei: 2n });
  });

  it('falls back to 72h on a non-numeric window and caps it at 30 days', () => {
    expect(settlementWindowMs('not-a-number')).toBe(72 * 3600 * 1000);
    expect(settlementWindowMs('1')).toBe(3600 * 1000);
    expect(settlementWindowMs('9999')).toBe(30 * 24 * 3600 * 1000);
  });

  it('maps acceptance hash to a verdict', () => {
    expect(acceptanceVerdict(null, 'x')).toBe('SUBMITTED');
    expect(acceptanceVerdict('x', 'x')).toBe('VERIFIED');
    expect(acceptanceVerdict('x', 'y')).toBe('REJECTED');
  });
});

describe('settleOrder', () => {
  it('pays the agent 80% and the fee 20%, once each', async () => {
    const order = baseOrder();
    const result = await settleOrder(order.orderId, { kind: 'admin' });

    expect(result.status).toBe('SETTLED');
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: AGENT, amountWei: 8n * USDC });
    expect(sendMock.mock.calls[1][0]).toMatchObject({ to: FEE, amountWei: 2n * USDC });
    expect(fakeDb.ledger.map((row) => row.kind).sort()).toEqual(['AGENT', 'FEE']);
    expect(fakeDb.vessels[0].successCount).toBe(1);
    expect(order.payoutTxHash).toBeTruthy();
    expect(order.feeTxHash).toBeTruthy();
  });

  it('never re-sends the agent payout when the fee transfer fails, then completes on retry', async () => {
    const order = baseOrder();
    sendMock.mockImplementation(async ({ to }) =>
      to === FEE
        ? { ok: false as const, reason: 'rpc timeout', code: 'TX_FAILED' as const, status: 502 }
        : { ok: true as const, txHash: txHash('a'), blockNumber: '1' }
    );

    await expect(settleOrder(order.orderId, { kind: 'admin' })).rejects.toMatchObject({ status: 502 });
    expect(order.status).toBe('VERIFIED');
    expect(order.payoutTxHash).toBe(txHash('a'));
    expect(fakeDb.ledger.filter((row) => row.kind === 'AGENT')).toHaveLength(1);

    sendMock.mockImplementation(async () => ({
      ok: true as const,
      txHash: txHash('b'),
      blockNumber: '2',
    }));
    const result = await settleOrder(order.orderId, { kind: 'admin' });

    expect(result.status).toBe('SETTLED');
    const agentSends = sendMock.mock.calls.filter(([args]) => args.to === AGENT);
    expect(agentSends).toHaveLength(1);
    expect(fakeDb.ledger.filter((row) => row.kind === 'AGENT')).toHaveLength(1);
    expect(fakeDb.ledger.filter((row) => row.kind === 'FEE')).toHaveLength(1);
  });

  it('refuses demo orders without touching the chain', async () => {
    const order = baseOrder({ orderId: 'ap2-task-seed-demo', isDemo: true });
    await expect(settleOrder(order.orderId, { kind: 'admin' })).rejects.toMatchObject({
      code: 'DEMO_NOT_SETTLEABLE',
    });
    expect(sendMock).not.toHaveBeenCalled();
    expect(order.status).toBe('VERIFIED');
  });

  it('keeps the order unsettled when the payout cap rejects the transfer', async () => {
    const order = baseOrder();
    sendMock.mockResolvedValue({
      ok: false,
      reason: '单笔出款超过上限 5 USDC',
      code: 'CAP_SINGLE',
      status: 409,
    });

    await expect(settleOrder(order.orderId, { kind: 'admin' })).rejects.toMatchObject({ status: 409 });
    expect(order.status).toBe('VERIFIED');
    expect(order.settlementError).toContain('上限');
    expect(fakeDb.ledger).toHaveLength(0);
  });

  it('returns the in-flight order when another caller already holds the claim', async () => {
    const order = baseOrder();
    vi.spyOn(fakeDb.db.taskOrder, 'updateMany').mockResolvedValueOnce({ count: 0 });

    const result = await settleOrder(order.orderId, { kind: 'admin' });
    expect(result.status).toBe('VERIFIED');
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('submitOrder acceptance gate', () => {
  function assigned(overrides: Record<string, any> = {}) {
    return baseOrder({ status: 'ASSIGNED', settlementDueAt: null, ...overrides });
  }

  it('rejects a deliverable whose hash does not match the acceptance hash', async () => {
    const order = assigned({ acceptanceHash: 'expected' });
    const result = await submitOrder(order.orderId, 'got-something-else');
    expect(result.status).toBe('REJECTED');
  });

  it('verifies an exact acceptance hash match', async () => {
    const order = assigned({ acceptanceHash: 'expected' });
    const result = await submitOrder(order.orderId, 'expected');
    expect(result.status).toBe('VERIFIED');
  });

  it('parks submissions without an acceptance hash in SUBMITTED', async () => {
    const order = assigned();
    const result = await submitOrder(order.orderId, 'anything');
    expect(result.status).toBe('SUBMITTED');
  });
});

describe('demo exclusion in schedulers', () => {
  it('never schedules demo or legacy seed orders for settlement or refund', async () => {
    baseOrder({ orderId: 'ap2-task-real', isDemo: false });
    baseOrder({ orderId: 'ap2-task-meme-legacy', isDemo: false });
    baseOrder({ orderId: 'ap2-task-flagged', isDemo: true });

    const due = await listSettlementsDue(20);
    expect(due.map((row) => row.orderId)).toEqual(['ap2-task-real']);
  });
});
