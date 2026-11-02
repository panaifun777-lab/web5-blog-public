// The commerce hook: creating a bounty order must never depend on the
// Telegram broadcast queue, and the queue must see exactly one enqueue per
// created order.
//
// `src/lib/web5/ap2/commerce.ts` calls enqueueTaskBroadcast() fire-and-forget
// right after db.taskOrder.create() and before `return mapPrismaOrder(record)`.
// These tests prove the properties that matter for money safety:
//   - a rejected enqueue cannot fail or corrupt an order whose escrow deposit
//     is already verified on chain;
//   - a pending (never-settling) enqueue cannot stall order creation;
//   - with TG_BROADCAST_SECRET unset (production today) nothing is written to
//     SystemConfig at all, and with it set the order lands as PENDING.
//
// No network, no RPC, no Prisma: verifyNativeTransfer and SystemConfig are faked.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BROADCAST_TEST_SECRET, broadcastDb } from './helpers/broadcast-db';

// Hoisted holder so the vi.mock factory (which is moved above the imports)
// can hand the real implementation back to the tests without a TDZ hit.
const holder = vi.hoisted(() => ({
  realEnqueue: null as null | ((order: any, options?: any) => Promise<any>),
}));

vi.mock('@/lib/db', async () => {
  const { broadcastDb: db } = await import('./helpers/broadcast-db');
  return { db: db.db };
});

// The real verifyNativeTransfer would hit an RPC endpoint; the create path only
// needs it to confirm a transfer that came from the creator wallet.
const CREATOR_ADDRESS = '0x1111111111111111111111111111111111111111';

vi.mock('@/lib/web5/payments/arc', async () => {
  const { getEscrowVaultAddress } = await import('@/lib/web5/contracts/addresses');
  return {
    PAYOUT_SINGLE_CAP_USDC: 5,
    sendNativeUsdc: vi.fn(async () => ({ ok: true, txHash: `0x${'a'.repeat(64)}` })),
    verifyNativeTransfer: vi.fn(async (params: any) => ({
      ok: true,
      transfer: {
        from: CREATOR_ADDRESS.toLowerCase(),
        to: getEscrowVaultAddress(),
        valueWei: 1_500_000_000_000_000_000n,
        txHash: params.txHash,
        blockNumber: 1234567n,
      },
    })),
  };
});

// Wrap rather than replace: the default implementation is the real queue, so
// the disabled-by-default path and the armed path are both exercised end to end,
// while single tests inject a rejection or a hang.
vi.mock('@/lib/web5/broadcast/task-queue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/web5/broadcast/task-queue')>();
  holder.realEnqueue = actual.enqueueTaskBroadcast;
  return { ...actual, enqueueTaskBroadcast: vi.fn(async () => ({ action: 'skipped-disabled', record: null })) };
});

import { createCommerceOrder } from '@/lib/web5/ap2/commerce';
import { enqueueTaskBroadcast } from '@/lib/web5/broadcast/task-queue';

const enqueueMock = vi.mocked(enqueueTaskBroadcast);

// Each order needs its own escrow tx: the fake db enforces the unique
// constraint the real TaskOrder.escrowTxHash carries.
let txSeq = 0;
function paramsFor(orderId: string, extra: Record<string, unknown> = {}) {
  txSeq += 1;
  return {
    creatorDid: CREATOR_ADDRESS,
    title: 'Review the draft spec',
    description: 'Needs care & attention.',
    bountyUsdc: '1.5',
    escrowTxHash: `0x${txSeq.toString(16).padStart(2, '0')}${'c'.repeat(62)}`,
    orderId,
    ...extra,
  };
}

beforeEach(() => {
  broadcastDb.reset();
  txSeq = 0;
  delete process.env.TG_BROADCAST_SECRET;
  delete process.env.BROADCAST_QUEUE_MAX_RECORDS;
  // Do not depend on mockRestore() semantics: pin the real queue back in.
  enqueueMock.mockClear();
  enqueueMock.mockImplementation((order: any, options?: any) => holder.realEnqueue!(order, options));
});

afterEach(() => {
  delete process.env.TG_BROADCAST_SECRET;
});

describe('the broadcast hook cannot break order creation', () => {
  it('enqueues exactly once, with the persisted orderId and isDemo flag', async () => {
    const order = await createCommerceOrder(paramsFor('ap2-task-hook-1'));

    expect(order.status).toBe('FUNDED');
    expect(order.orderId).toBe('ap2-task-hook-1');
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledWith({ orderId: 'ap2-task-hook-1', isDemo: false });

    // No TG_BROADCAST_SECRET => the real queue is inert: zero SystemConfig writes.
    expect(broadcastDb.config).toHaveLength(0);
    expect(broadcastDb.writeLog).toHaveLength(0);
  });

  it('still returns a FUNDED order when the enqueue rejects, and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enqueueMock.mockRejectedValueOnce(new Error('SQLITE_BUSY: database is locked'));

    const order = await createCommerceOrder(paramsFor('ap2-task-hook-2'));

    // Fire-and-forget: the rejection surfaces later as a warning, never as a
    // throw out of createCommerceOrder.
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toMatchObject({ orderId: 'ap2-task-hook-2', status: 'FUNDED', isDemo: false });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[broadcast] enqueue failed for ap2-task-hook-2'),
      'SQLITE_BUSY: database is locked'
    );
    warn.mockRestore();
  });

  it('does not await the queue: a never-settling enqueue cannot stall creation', async () => {
    enqueueMock.mockImplementationOnce(() => new Promise<never>(() => {}));

    // If the hook awaited the queue, this test would time out instead.
    await expect(createCommerceOrder(paramsFor('ap2-task-hook-3'))).resolves.toMatchObject({
      status: 'FUNDED',
    });
  });

  it('a rejected enqueue leaves the order row written and the queue untouched', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enqueueMock.mockRejectedValue(new Error('queue unavailable'));

    await expect(createCommerceOrder(paramsFor('ap2-task-hook-4'))).resolves.toMatchObject({
      status: 'FUNDED',
    });
    await Promise.resolve();

    const stored = await broadcastDb.db.taskOrder.findUnique({ where: { orderId: 'ap2-task-hook-4' } });
    expect(stored).toMatchObject({ orderId: 'ap2-task-hook-4', status: 'FUNDED' });
    expect(broadcastDb.parsedQueue().records).toHaveLength(0);
    warn.mockRestore();
  });

  it('never enqueues when creation fails before the order row exists', async () => {
    await expect(
      createCommerceOrder(paramsFor('ap2-task-hook-5', { bountyUsdc: '100' }))
    ).rejects.toThrow(/per-payout cap/i);

    expect(enqueueMock).not.toHaveBeenCalled();
    expect(broadcastDb.parsedQueue().records).toHaveLength(0);
  });
});

describe('the hook feeds the real queue once the feature is armed', () => {
  beforeEach(() => {
    process.env.TG_BROADCAST_SECRET = BROADCAST_TEST_SECRET;
  });

  it('a funded order becomes exactly one PENDING broadcast record', async () => {
    const order = await createCommerceOrder(paramsFor('ap2-task-hook-6'));

    expect(order.status).toBe('FUNDED');
    // The hook is fire-and-forget, so drain its microtask chain before reading
    // the queue; setTimeout(0) runs only after every pending promise resolves.
    await new Promise((r) => setTimeout(r, 0));
    const records = broadcastDb.parsedQueue().records;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ orderId: 'ap2-task-hook-6', status: 'PENDING', attempts: 0 });
    // Bookkeeping only: the caller-supplied title/description are never stored
    // in SystemConfig, so a leaked queue document cannot expose user text.
    expect(JSON.stringify(records[0])).not.toContain('Needs care');
    expect(JSON.stringify(records[0])).not.toContain(BROADCAST_TEST_SECRET);
  });

  it('a second enqueue for the same order stays idempotent', async () => {
    await createCommerceOrder(paramsFor('ap2-task-hook-7'));
    await enqueueTaskBroadcast({ orderId: 'ap2-task-hook-7', isDemo: false });

    expect(broadcastDb.parsedQueue().records).toHaveLength(1);
  });

  it('a demo order is never queued for the public channel', async () => {
    await createCommerceOrder(paramsFor('ap2-task-hook-8'));
    await enqueueTaskBroadcast({ orderId: 'ap2-task-seed-demo', isDemo: true });

    const records = broadcastDb.parsedQueue().records;
    expect(records.map((row) => row.orderId)).toEqual(['ap2-task-hook-8']);
  });
});
