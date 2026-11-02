// Broadcast queue tests (src/lib/web5/broadcast/task-queue.ts): idempotent
// enqueue, bounded history, serialized concurrent writes, disabled-by-default,
// and the claim/ack state machine. Persistence is the in-memory SystemConfig
// fake in tests/helpers/broadcast-db.ts — no Prisma, no network, no tokens.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BROADCAST_TEST_SECRET, broadcastDb } from './helpers/broadcast-db';

vi.mock('@/lib/db', async () => {
  const { broadcastDb: db } = await import('./helpers/broadcast-db');
  return { db: db.db };
});

import {
  BROADCAST_QUEUE_CONFIG_KEY,
  ackBroadcast,
  ackIntoDoc,
  claimPendingBroadcasts,
  describeBroadcastConfig,
  enqueueIntoDoc,
  enqueueTaskBroadcast,
  getBroadcastStatus,
  lastErrorKind,
  parseQueueDoc,
  pickClaimable,
  queueCounts,
  trimQueue,
  verifyBroadcastSecret,
  type BroadcastQueueDoc,
  type BroadcastRecord,
} from '@/lib/web5/broadcast/task-queue';

const ENV = { TG_BROADCAST_SECRET: BROADCAST_TEST_SECRET };

function armedEnv(extra: Record<string, string> = {}) {
  return { ...ENV, ...extra };
}

function record(overrides: Partial<BroadcastRecord> = {}): BroadcastRecord {
  return {
    orderId: 'o1',
    status: 'PENDING',
    tgMessageId: null,
    attempts: 0,
    lastError: null,
    lastErrorKind: null,
    queuedAt: '2026-01-01T00:00:00.000Z',
    claimedAt: null,
    sentAt: null,
    ...overrides,
  };
}

function doc(records: BroadcastRecord[]): BroadcastQueueDoc {
  return { version: 1, updatedAt: '', records };
}

const TX = `0x${'e'.repeat(64)}`;

beforeEach(() => {
  broadcastDb.reset();
  delete process.env.TG_BROADCAST_SECRET;
  delete process.env.BROADCAST_QUEUE_MAX_RECORDS;
  delete process.env.BROADCAST_MAX_ATTEMPTS;
  delete process.env.BROADCAST_CLAIM_TTL_MS;
  // The renderer reads these from process.env; pin them so a checked-out .env
  // cannot change the expected links.
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_ACTIVE_CHAIN;
});

afterEach(() => {
  delete process.env.TG_BROADCAST_SECRET;
  delete process.env.BROADCAST_QUEUE_MAX_RECORDS;
  delete process.env.BROADCAST_MAX_ATTEMPTS;
  delete process.env.BROADCAST_CLAIM_TTL_MS;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_ACTIVE_CHAIN;
});

describe('disabled by default', () => {
  it('reports enabled:false with no env, and never echoes the secret', () => {
    expect(describeBroadcastConfig({})).toEqual({
      enabled: false,
      secretConfigured: false,
      channelConfigured: false,
      maxRecords: 200,
    });
    // A short secret is treated as unset — same floor as SETTLEMENT_CRON_SECRET.
    expect(describeBroadcastConfig({ TG_BROADCAST_SECRET: 'short' }).enabled).toBe(false);
    expect(describeBroadcastConfig(armedEnv()).enabled).toBe(true);
    const described = JSON.stringify(describeBroadcastConfig(armedEnv({ TG_CHANNEL_ID: '@web5' })));
    expect(described).not.toContain(BROADCAST_TEST_SECRET);
    expect(described).toContain('"channelConfigured":true');
  });

  it('fails closed: not configured vs unauthorized', () => {
    expect(verifyBroadcastSecret('anything', {})).toEqual({
      ok: false,
      code: 'BROADCAST_NOT_CONFIGURED',
    });
    expect(verifyBroadcastSecret('wrong-secret-wrong-secret', armedEnv())).toEqual({
      ok: false,
      code: 'BROADCAST_UNAUTHORIZED',
    });
    expect(verifyBroadcastSecret(null, armedEnv()).ok).toBe(false);
    expect(verifyBroadcastSecret(BROADCAST_TEST_SECRET, armedEnv())).toEqual({ ok: true });
  });

  it('enqueue is a complete no-op when the secret is unset (nothing written)', async () => {
    const result = await enqueueTaskBroadcast({ orderId: 'ap2-task-1' }, { env: {}, nowMs: 1000 });
    expect(result).toEqual({ action: 'skipped-disabled', record: null });
    expect(broadcastDb.config).toHaveLength(0);
    expect(broadcastDb.writeLog).toHaveLength(0);
  });

  it('status reports disabled without touching the queue', async () => {
    const status = await getBroadcastStatus({});
    expect(Object.keys(status).sort()).toEqual(['enabled', 'lastErrorKind', 'pending', 'sent']);
    expect(status).toEqual({ enabled: false, pending: 0, sent: 0, lastErrorKind: null });
  });
});

describe('enqueue idempotency', () => {
  it('queues an order once and keeps the original queuedAt', async () => {
    await enqueueTaskBroadcast({ orderId: 'ap2-task-a' }, { env: ENV, nowMs: 1_000 });
    const again = await enqueueTaskBroadcast({ orderId: 'ap2-task-a' }, { env: ENV, nowMs: 9_000 });

    expect(again.action).toBe('already-pending');
    const records = broadcastDb.parsedQueue().records;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ orderId: 'ap2-task-a', status: 'PENDING', attempts: 0 });
    expect(records[0].queuedAt).toBe(new Date(1_000).toISOString());
  });

  it('re-enqueuing an already SENT order is a no-op', async () => {
    await enqueueTaskBroadcast({ orderId: 'ap2-task-a' }, { env: ENV, nowMs: 1_000 });
    await ackBroadcast({ orderId: 'ap2-task-a', ok: true, tgMessageId: 42, nowMs: 2_000 }, { env: ENV });

    const result = await enqueueTaskBroadcast({ orderId: 'ap2-task-a' }, { env: ENV, nowMs: 3_000 });
    expect(result.action).toBe('already-sent');
    const records = broadcastDb.parsedQueue().records;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ status: 'SENT', tgMessageId: 42 });
  });

  it('never queues demo or seed orders', async () => {
    expect(await enqueueTaskBroadcast({ orderId: 'x', isDemo: true }, { env: ENV })).toMatchObject({
      action: 'skipped-demo',
    });
    expect(await enqueueTaskBroadcast({ orderId: 'ap2-task-seed-1' }, { env: ENV })).toMatchObject({
      action: 'skipped-demo',
    });
    expect(await enqueueTaskBroadcast({ orderId: 'ap2-task-meme-9' }, { env: ENV })).toMatchObject({
      action: 'skipped-demo',
    });
    expect(await enqueueTaskBroadcast({ orderId: '   ' }, { env: ENV })).toMatchObject({
      action: 'skipped-invalid-id',
    });
    expect(broadcastDb.config).toHaveLength(0);
  });

  it('swallows a database failure instead of throwing at the caller', async () => {
    const spy = vi.spyOn(broadcastDb.db.systemConfig, 'findUnique').mockRejectedValue(new Error('SQLITE_BUSY'));
    const result = await enqueueTaskBroadcast({ orderId: 'ap2-task-a' }, { env: ENV });
    expect(result).toEqual({ action: 'failed', record: null });
    spy.mockRestore();
  });
});

describe('bounded history', () => {
  it('drops the oldest non-PENDING record first', () => {
    const rows = [
      record({ orderId: 'pending' }),
      record({ orderId: 'sent-old', status: 'SENT' }),
      record({ orderId: 'sent-new', status: 'SENT' }),
      record({ orderId: 'failed', status: 'FAILED' }),
    ];
    const trimmed = trimQueue(rows, 3);
    expect(trimmed.records.map((row) => row.orderId)).toEqual(['pending', 'sent-new', 'failed']);
    expect(trimmed.overflow).toBe(false);
  });

  it('refuses to evict live work: an all-PENDING queue at cap reports overflow', () => {
    const rows = [record({ orderId: 'a' }), record({ orderId: 'b' }), record({ orderId: 'c' })];
    const trimmed = trimQueue(rows, 3);
    expect(trimmed.records).toHaveLength(3);
    expect(trimmed.overflow).toBe(false);

    const withNew = [...rows, record({ orderId: 'd' })];
    const over = trimQueue(withNew, 3);
    expect(over.overflow).toBe(true);
    expect(over.records.map((row) => row.orderId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('drops the newcomer rather than pending work when enqueueing into a full queue', () => {
    const base = doc([record({ orderId: 'a' }), record({ orderId: 'b' }), record({ orderId: 'c' })]);
    const result = enqueueIntoDoc(base, 'd', { nowMs: 1, maxRecords: 3 });
    expect(result.action).toBe('dropped-queue-full');
    expect(result.doc.records.map((row) => row.orderId)).toEqual(['a', 'b', 'c']);
  });

  it('ages a SENT record out of the retained history on the next enqueue', async () => {
    process.env.BROADCAST_QUEUE_MAX_RECORDS = '4';
    const env = armedEnv({ BROADCAST_QUEUE_MAX_RECORDS: '4' });
    await enqueueTaskBroadcast({ orderId: 'a' }, { env, nowMs: 1 });
    await ackBroadcast({ orderId: 'a', ok: true, tgMessageId: 1, nowMs: 2 }, { env });
    for (const id of ['b', 'c', 'd', 'e']) {
      await enqueueTaskBroadcast({ orderId: id }, { env, nowMs: 3 });
    }
    const records = broadcastDb.parsedQueue().records;
    expect(records.map((row) => row.orderId)).toEqual(['b', 'c', 'd', 'e']);
    expect(queueCounts(parseQueueDoc(JSON.stringify({ records })))).toMatchObject({
      pending: 4,
      sent: 0,
      total: 4,
    });
  });
});

describe('serialized concurrent writes', () => {
  it('keeps every order when enqueues overlap', async () => {
    // The fake write awaits, so an unserialized reader would lose records.
    broadcastDb.writeDelayMs = 5;
    const results = await Promise.all(
      ['o1', 'o2', 'o3', 'o4'].map((orderId) =>
        enqueueTaskBroadcast({ orderId }, { env: ENV, nowMs: 1_000 })
      )
    );

    expect(results.map((row) => row.action)).toEqual(['queued', 'queued', 'queued', 'queued']);
    expect(broadcastDb.parsedQueue().records.map((row) => row.orderId)).toEqual([
      'o1',
      'o2',
      'o3',
      'o4',
    ]);
    expect(broadcastDb.writeLog).toHaveLength(4);
    broadcastDb.writeDelayMs = 0;
  });

  it('does not lose an ack racing an enqueue', async () => {
    broadcastDb.writeDelayMs = 5;
    await enqueueTaskBroadcast({ orderId: 'o1' }, { env: ENV, nowMs: 1 });
    const [ack, enqueue] = await Promise.all([
      ackBroadcast({ orderId: 'o1', ok: true, tgMessageId: 7, nowMs: 2 }, { env: ENV }),
      enqueueTaskBroadcast({ orderId: 'o2' }, { env: ENV, nowMs: 3 }),
    ]);
    broadcastDb.writeDelayMs = 0;

    expect(ack.action).toBe('sent');
    expect(enqueue.action).toBe('queued');
    const records = broadcastDb.parsedQueue().records;
    expect(records).toHaveLength(2);
    expect(records.find((row) => row.orderId === 'o1')).toMatchObject({ status: 'SENT', tgMessageId: 7 });
    expect(records.find((row) => row.orderId === 'o2')).toMatchObject({ status: 'PENDING' });
  });
});

describe('corrupt persistence', () => {
  it('parses junk as an empty queue instead of throwing', () => {
    expect(parseQueueDoc(null).records).toEqual([]);
    expect(parseQueueDoc('not json').records).toEqual([]);
    expect(parseQueueDoc('{"records":"nope"}').records).toEqual([]);
    expect(parseQueueDoc('{"records":[null,{"orderId":"x"},{"status":"NOPE","orderId":"y"}]}').records).toEqual([]);
    expect(
      parseQueueDoc('{"records":[{"orderId":"y","status":"PENDING","attempts":"bad"}]}').records[0]
    ).toMatchObject({ orderId: 'y', status: 'PENDING', attempts: 0, tgMessageId: null });
  });

  it('recovers after the stored document is corrupted', async () => {
    await enqueueTaskBroadcast({ orderId: 'o1' }, { env: ENV, nowMs: 1 });
    broadcastDb.corruptQueue();

    const claim = await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 2 });
    expect(claim.items).toHaveLength(0);

    const requeued = await enqueueTaskBroadcast({ orderId: 'o2' }, { env: ENV, nowMs: 3 });
    expect(requeued.action).toBe('queued');
    expect(broadcastDb.parsedQueue().records.map((row) => row.orderId)).toEqual(['o2']);
  });

  it('stores only bookkeeping: no user text in the queue document', async () => {
    broadcastDb.seedOrder({
      orderId: 'o1',
      creatorDid: 'did:prime:creator',
      title: 'Translate <b>this</b>',
      description: 'Needs a native reviewer & a proofread.',
      bountyUsdc: '1.5',
      status: 'FUNDED',
      escrowTxHash: TX,
    });
    await enqueueTaskBroadcast({ orderId: 'o1' }, { env: ENV, nowMs: 1_000 });

    const raw = broadcastDb.rawQueueValue();
    expect(broadcastDb.config).toHaveLength(1);
    expect(broadcastDb.config[0].key).toBe(BROADCAST_QUEUE_CONFIG_KEY);
    expect(raw).toContain('"orderId":"o1"');
    // Title/description are read from TaskOrder at render time and never
    // copied into SystemConfig, so a leaked config row cannot expose user text.
    expect(raw).not.toContain('Translate');
    expect(raw).not.toContain('<b>');
    expect(raw).not.toContain('native reviewer');
    expect(raw).not.toContain(TX);
    expect(raw).not.toContain(BROADCAST_TEST_SECRET);
    expect(Object.keys(broadcastDb.parsedQueue().records[0]).sort()).toEqual([
      'attempts',
      'claimedAt',
      'lastError',
      'lastErrorKind',
      'orderId',
      'queuedAt',
      'sentAt',
      'status',
      'tgMessageId',
    ]);
  });
});

describe('claim and ack', () => {
  async function seedPending(orderId = 'o1', overrides: Record<string, any> = {}) {
    broadcastDb.seedOrder({
      orderId,
      creatorDid: 'did:prime:creator',
      title: 'Translate <b>this</b>',
      description: 'Needs a native reviewer & a proofread.',
      bountyUsdc: '1.5',
      status: 'FUNDED',
      escrowTxHash: TX,
      ...overrides,
    });
    await enqueueTaskBroadcast({ orderId }, { env: ENV, nowMs: 1_000 });
  }

  it('hands the bot server-rendered HTML and marks the record claimed', async () => {
    await seedPending();
    const claim = await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 2_000 });

    expect(claim.items).toHaveLength(1);
    const item = claim.items[0];
    expect(item).toMatchObject({ orderId: 'o1', parseMode: 'HTML', attempts: 1 });
    expect(item.text).toContain('&lt;b&gt;this&lt;/b&gt;');
    expect(item.text).toContain('&amp;');
    expect(item.text).toContain(`https://explorer.arc.io/tx/${TX}`);
    expect(item.text).toContain('https://web5.blog/task/o1');
    expect(item).not.toHaveProperty('description');
    expect(item).not.toHaveProperty('creatorDid');

    const stored = broadcastDb.parsedQueue().records[0];
    expect(stored).toMatchObject({ status: 'PENDING', attempts: 1 });
    expect(stored.claimedAt).toBe(new Date(2_000).toISOString());
  });

  it('never hands the same order out twice while a claim is live', async () => {
    await seedPending();
    const first = await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 2_000 });
    const second = await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 3_000 });
    const third = await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 3_500 });

    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(0);
    expect(third.items).toHaveLength(0);
    expect(broadcastDb.parsedQueue().records[0].attempts).toBe(1);
  });

  it('re-offers an unacked order after the claim TTL and counts the attempt', async () => {
    await seedPending();
    await claimPendingBroadcasts({ env: armedEnv({ BROADCAST_CLAIM_TTL_MS: '1000' }), limit: 5, nowMs: 2_000 });
    const retried = await claimPendingBroadcasts({
      env: armedEnv({ BROADCAST_CLAIM_TTL_MS: '1000' }),
      limit: 5,
      nowMs: 5_000,
    });

    expect(retried.items[0].attempts).toBe(2);
    expect(broadcastDb.parsedQueue().records[0].attempts).toBe(2);
  });

  it('respects the claim limit and leaves the rest untouched', async () => {
    for (const id of ['o1', 'o2', 'o3']) await seedPending(id);
    const claim = await claimPendingBroadcasts({ env: ENV, limit: 2, nowMs: 2_000 });
    expect(claim.items.map((item) => item.orderId)).toEqual(['o1', 'o2']);
    // All three are still PENDING: a live claim is a stamp, not a status.
    expect(claim.pending).toBe(3);

    const records = broadcastDb.parsedQueue().records;
    expect(records.find((row) => row.orderId === 'o3')).toMatchObject({ attempts: 0, claimedAt: null });
  });

  it('records tgMessageId on a successful ack and is idempotent', async () => {
    await seedPending();
    await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 2_000 });

    const ack = await ackBroadcast(
      { orderId: 'o1', ok: true, tgMessageId: '987654', nowMs: 3_000 },
      { env: ENV }
    );
    expect(ack.action).toBe('sent');
    expect(ack.record).toMatchObject({ status: 'SENT', tgMessageId: 987654 });

    const repeat = await ackBroadcast({ orderId: 'o1', ok: true, tgMessageId: 1, nowMs: 4_000 }, { env: ENV });
    expect(repeat.action).toBe('already-sent');
    expect(broadcastDb.parsedQueue().records[0]).toMatchObject({ status: 'SENT', tgMessageId: 987654 });

    const after = await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 5_000 });
    expect(after.items).toHaveLength(0);
  });

  it('acks an unknown order as not-found and writes nothing', async () => {
    const ack = await ackBroadcast({ orderId: 'ghost', ok: true, tgMessageId: 1, nowMs: 1 }, { env: ENV });
    expect(ack.action).toBe('not-found');
    expect(broadcastDb.config).toHaveLength(0);
  });

  it('turns a send failure into FAILED and gives up after maxAttempts', async () => {
    await seedPending();
    const ttlEnv = armedEnv({ BROADCAST_CLAIM_TTL_MS: '1000' });

    await claimPendingBroadcasts({ env: ttlEnv, limit: 5, nowMs: 2_000 });
    const failed = await ackBroadcast(
      { orderId: 'o1', ok: false, error: 'Too Many Requests: FLOOD_WAIT_30', errorKind: 'flood_wait', nowMs: 3_000, maxAttempts: 3 },
      { env: ttlEnv }
    );
    expect(failed.action).toBe('failed');
    expect(failed.record).toMatchObject({ status: 'FAILED', lastErrorKind: 'FLOOD_WAIT' });
    expect(failed.record?.lastError).toContain('FLOOD_WAIT_30');

    // Retry once more, then the third attempt is terminal.
    await claimPendingBroadcasts({ env: ttlEnv, limit: 5, nowMs: 6_000 });
    await claimPendingBroadcasts({ env: ttlEnv, limit: 5, nowMs: 9_000 });
    const last = await ackBroadcast(
      { orderId: 'o1', ok: false, error: 'HTTP 400', errorKind: 'HTTP_ERROR', nowMs: 10_000, maxAttempts: 2 },
      { env: ttlEnv }
    );
    expect(last.record).toMatchObject({ status: 'SKIPPED', lastErrorKind: 'HTTP_ERROR' });

    const after = await claimPendingBroadcasts({ env: ttlEnv, limit: 5, nowMs: 30_000 });
    expect(after.items).toHaveLength(0);
  });

  it('retires a FAILED record that already ran out of attempts', async () => {
    const base = doc([record({ orderId: 'o1', status: 'FAILED', attempts: 3, lastErrorKind: 'NETWORK' })]);
    const picked = pickClaimable(base, {
      nowMs: 10_000,
      limit: 5,
      claimTtlMs: 1_000,
      maxAttempts: 3,
      maxRecords: 200,
    });
    expect(picked.claimed).toHaveLength(0);
    expect(picked.exhausted[0]).toMatchObject({ status: 'SKIPPED', lastErrorKind: 'NETWORK' });
  });

  it('skips the row when a queued order no longer exists, without throwing', async () => {
    await enqueueTaskBroadcast({ orderId: 'missing' }, { env: ENV, nowMs: 1 });
    const claim = await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 2 });
    expect(claim.items).toHaveLength(0);
  });

  it('reports counts and the last error kind, and nothing else', async () => {
    await seedPending('o1');
    await seedPending('o2');
    await claimPendingBroadcasts({ env: ENV, limit: 5, nowMs: 2_000 });
    await ackBroadcast({ orderId: 'o1', ok: true, tgMessageId: 5, nowMs: 3_000 }, { env: ENV });

    const status = await getBroadcastStatus(ENV);
    expect(status).toEqual({ enabled: true, pending: 1, sent: 1, lastErrorKind: null });
    expect(JSON.stringify(status)).not.toContain(BROADCAST_TEST_SECRET);

    await ackBroadcast(
      { orderId: 'o2', ok: false, error: 'fetch failed', errorKind: 'NETWORK', nowMs: 4_000, maxAttempts: 5 },
      { env: ENV }
    );
    const afterFailure = await getBroadcastStatus(ENV);
    expect(afterFailure).toMatchObject({ enabled: true, pending: 0, sent: 1, lastErrorKind: 'NETWORK' });

    const parsed = parseQueueDoc(broadcastDb.rawQueueValue());
    expect(lastErrorKind(parsed)).toBe('NETWORK');
    expect(queueCounts(parsed)).toEqual({ pending: 0, sent: 1, failed: 1, skipped: 0, total: 2 });
  });

  it('ackIntoDoc normalizes junk input instead of storing it verbatim', () => {
    const base = doc([record({ orderId: 'o1', attempts: 1 })]);
    const result = ackIntoDoc(base, {
      orderId: 'o1',
      ok: false,
      error: 'x'.repeat(900),
      errorKind: 'totally-made-up',
      tgMessageId: 'not-a-number',
      nowMs: 1,
      maxAttempts: 9,
    });
    expect(result.record).toMatchObject({
      status: 'FAILED',
      lastErrorKind: 'UNKNOWN',
      tgMessageId: null,
    });
    expect(result.record?.lastError).toHaveLength(500);
  });
});
