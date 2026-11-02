// HTTP surface tests for the broadcast claim/ack endpoints and the secret-free
// status block on /api/daemon/health.
//
// Guards the fail-closed contract copied from /api/cron/settle: with
// TG_BROADCAST_SECRET unset (production today) every endpoint answers 503 and
// nothing is claimed. No network, no Telegram, no Prisma.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { BROADCAST_TEST_SECRET, broadcastDb } from './helpers/broadcast-db';

vi.mock('@/lib/db', async () => {
  const { broadcastDb: db } = await import('./helpers/broadcast-db');
  return { db: db.db };
});

// The health route aggregates other subsystems; keep this test about broadcast.
vi.mock('@/lib/web5/x402/voucher-engine', () => ({
  voucherGateway: { getChannelStats: async () => null },
}));
vi.mock('@/lib/web5/payments/signer', () => ({
  describeSigner: () => ({ active: 'local-key', source: 'none', ready: false, chainId: 5042 }),
}));

import { GET as claimMeta, POST as claimPost } from '@/app/api/broadcast/claim/route';
import { POST as ackPost } from '@/app/api/broadcast/ack/route';
import { GET as healthGet } from '@/app/api/daemon/health/route';
import { enqueueTaskBroadcast } from '@/lib/web5/broadcast/task-queue';

const CLAIM_URL = 'http://localhost/api/broadcast/claim';
const ACK_URL = 'http://localhost/api/broadcast/ack';
const TX = `0x${'e'.repeat(64)}`;

function post(url: string, body: unknown, secret?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret !== undefined) headers['x-broadcast-secret'] = secret;
  return new NextRequest(url, { method: 'POST', headers, body: JSON.stringify(body) });
}

function get(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

async function seedQueuedOrder(orderId = 'ap2-task-1') {
  broadcastDb.seedOrder({
    orderId,
    creatorDid: 'did:prime:creator',
    title: 'Review <b>the</b> draft',
    description: 'Needs care & attention.',
    bountyUsdc: '1.5',
    status: 'FUNDED',
    escrowTxHash: TX,
  });
  await enqueueTaskBroadcast({ orderId }, { env: { TG_BROADCAST_SECRET: BROADCAST_TEST_SECRET } });
}

beforeEach(() => {
  broadcastDb.reset();
  delete process.env.TG_BROADCAST_SECRET;
  delete process.env.BROADCAST_QUEUE_MAX_RECORDS;
  delete process.env.BROADCAST_MAX_ATTEMPTS;
  delete process.env.BROADCAST_CLAIM_TTL_MS;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_ACTIVE_CHAIN;
});

afterEach(() => {
  delete process.env.TG_BROADCAST_SECRET;
});

describe('inert when TG_BROADCAST_SECRET is unset', () => {
  it('POST /api/broadcast/claim answers 503 and claims nothing', async () => {
    await seedQueuedOrder();
    const res = await claimPost(post(CLAIM_URL, {}, BROADCAST_TEST_SECRET));

    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('no-store');
    await expect(res.json()).resolves.toEqual({
      error: 'Telegram broadcast is not configured on this server.',
      code: 'BROADCAST_NOT_CONFIGURED',
    });
    // Nothing was handed out, and the record is untouched.
    expect(broadcastDb.parsedQueue().records[0]).toMatchObject({ status: 'PENDING', attempts: 0 });
  });

  it('POST /api/broadcast/ack answers 503 and records nothing', async () => {
    await seedQueuedOrder();
    const res = await ackPost(post(ACK_URL, { orderId: 'ap2-task-1', ok: true, tgMessageId: 9 }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('BROADCAST_NOT_CONFIGURED');
    expect(broadcastDb.parsedQueue().records[0].status).toBe('PENDING');
  });

  it('answers 503 the same way for a too-short configured secret', async () => {
    process.env.TG_BROADCAST_SECRET = 'short';
    const res = await claimPost(post(CLAIM_URL, {}, 'short'));
    expect(res.status).toBe(503);
  });

  it('the readiness GET reports booleans only', async () => {
    const res = await claimMeta(get(CLAIM_URL));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      endpoint: 'POST /api/broadcast/claim',
      ackEndpoint: 'POST /api/broadcast/ack',
      enabled: false,
      secretConfigured: false,
      channelConfigured: false,
    });
    expect(JSON.stringify(body)).not.toContain(BROADCAST_TEST_SECRET);
  });
});

describe('authorized callers', () => {
  beforeEach(() => {
    process.env.TG_BROADCAST_SECRET = BROADCAST_TEST_SECRET;
  });

  it('rejects a missing or wrong secret with 401 and a localized code', async () => {
    const missing = await claimPost(post(CLAIM_URL, {}));
    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toMatchObject({ code: 'BROADCAST_UNAUTHORIZED' });

    const wrong = await claimPost(post(CLAIM_URL, {}, 'some-other-secret-000000'));
    expect(wrong.status).toBe(401);

    const zh = await claimPost(
      new NextRequest(CLAIM_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-broadcast-secret': 'nope', 'accept-language': 'zh-CN' },
        body: '{}',
      })
    );
    expect(zh.status).toBe(401);
    await expect(zh.json()).resolves.toMatchObject({ code: 'BROADCAST_UNAUTHORIZED' });
  });

  it('claims a rendered, escaped payload for the bot', async () => {
    await seedQueuedOrder();
    const res = await claimPost(post(CLAIM_URL, { limit: 5 }, BROADCAST_TEST_SECRET));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ success: true, claimed: 1, pending: 1 });
    expect(body.items[0]).toMatchObject({ orderId: 'ap2-task-1', parseMode: 'HTML' });
    expect(body.items[0].text).toContain('&lt;b&gt;the&lt;/b&gt;');
    expect(body.items[0].text).toContain('1.5 USDC');
    expect(body.items[0].text).toContain(`href="https://explorer.arc.io/tx/${TX}"`);
    expect(body.items[0].text).toContain('https://web5.blog/task/ap2-task-1');
    expect(JSON.stringify(body)).not.toContain(BROADCAST_TEST_SECRET);
    expect(body.items[0].text.length).toBeLessThanOrEqual(4096);

    // A second claim inside the TTL must not double-post.
    const again = await claimPost(post(CLAIM_URL, { limit: 5 }, BROADCAST_TEST_SECRET));
    const second = await again.json();
    expect(second.claimed).toBe(0);
    expect(second.items).toHaveLength(0);
  });

  it('ignores a non-numeric limit instead of claiming unbounded', async () => {
    await seedQueuedOrder();
    const res = await claimPost(post(CLAIM_URL, { limit: 'huge' }, BROADCAST_TEST_SECRET));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true, claimed: 1 });
  });

  it('acks a delivered post and stores the tgMessageId', async () => {
    await seedQueuedOrder();
    await claimPost(post(CLAIM_URL, {}, BROADCAST_TEST_SECRET));

    const res = await ackPost(
      post(ACK_URL, { orderId: 'ap2-task-1', ok: true, tgMessageId: 1234 }, BROADCAST_TEST_SECRET)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, action: 'sent' });
    expect(body.record).toMatchObject({ orderId: 'ap2-task-1', status: 'SENT', tgMessageId: 1234 });
    expect(body.record).not.toHaveProperty('lastError');

    // Re-acking the delivered post is a no-op, not an error.
    const repeat = await ackPost(
      post(ACK_URL, { orderId: 'ap2-task-1', ok: true, tgMessageId: 999 }, BROADCAST_TEST_SECRET)
    );
    await expect(repeat.json()).resolves.toMatchObject({ action: 'already-sent' });
  });

  it('records a send failure with its error kind', async () => {
    await seedQueuedOrder();
    await claimPost(post(CLAIM_URL, {}, BROADCAST_TEST_SECRET));

    const res = await ackPost(
      post(
        ACK_URL,
        { orderId: 'ap2-task-1', ok: false, error: 'Too Many Requests: FLOOD_WAIT_30', errorKind: 'FLOOD_WAIT' },
        BROADCAST_TEST_SECRET
      )
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ action: 'failed' });
    expect(broadcastDb.parsedQueue().records[0]).toMatchObject({
      status: 'FAILED',
      lastErrorKind: 'FLOOD_WAIT',
    });
  });

  it('validates the ack body', async () => {
    await seedQueuedOrder();

    const missingId = await ackPost(post(ACK_URL, { ok: true }, BROADCAST_TEST_SECRET));
    expect(missingId.status).toBe(400);
    await expect(missingId.json()).resolves.toMatchObject({ code: 'ORDER_ID_REQUIRED' });

    const badId = await ackPost(post(ACK_URL, { orderId: 'has spaces!', ok: true }, BROADCAST_TEST_SECRET));
    expect(badId.status).toBe(400);
    await expect(badId.json()).resolves.toMatchObject({ code: 'INVALID_ORDER_ID' });

    const noOk = await ackPost(post(ACK_URL, { orderId: 'ap2-task-1' }, BROADCAST_TEST_SECRET));
    expect(noOk.status).toBe(400);
    await expect(noOk.json()).resolves.toMatchObject({ code: 'BROADCAST_RESULT_INVALID' });

    // SENT requires proof of delivery: no tgMessageId, no SENT record.
    const noMessageId = await ackPost(post(ACK_URL, { orderId: 'ap2-task-1', ok: true }, BROADCAST_TEST_SECRET));
    expect(noMessageId.status).toBe(400);
    await expect(noMessageId.json()).resolves.toMatchObject({ code: 'BROADCAST_RESULT_INVALID' });
    expect(broadcastDb.parsedQueue().records[0].status).toBe('PENDING');

    const badMessageId = await ackPost(
      post(ACK_URL, { orderId: 'ap2-task-1', ok: true, tgMessageId: 'not-a-number' }, BROADCAST_TEST_SECRET)
    );
    expect(badMessageId.status).toBe(400);
    expect(broadcastDb.parsedQueue().records[0].status).toBe('PENDING');

    const unknown = await ackPost(
      post(ACK_URL, { orderId: 'ap2-task-never-queued', ok: true, tgMessageId: 1 }, BROADCAST_TEST_SECRET)
    );
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toMatchObject({ code: 'BROADCAST_RECORD_NOT_FOUND' });
  });
});

describe('/api/daemon/health broadcast block', () => {
  it('reports only enabled/pending/sent/lastErrorKind, and reports disabled with no env', async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.broadcast).toEqual({ enabled: false, pending: 0, sent: 0, lastErrorKind: null });
    expect(Object.keys(body.broadcast).sort()).toEqual(['enabled', 'lastErrorKind', 'pending', 'sent']);
    expect(JSON.stringify(body)).not.toContain(BROADCAST_TEST_SECRET);
  });

  it('counts the queue once the feature is armed', async () => {
    process.env.TG_BROADCAST_SECRET = BROADCAST_TEST_SECRET;
    await seedQueuedOrder('ap2-task-1');
    await seedQueuedOrder('ap2-task-2');

    const res = await healthGet();
    const body = await res.json();
    expect(body.broadcast).toMatchObject({ enabled: true, pending: 2, sent: 0 });

    const claim = await claimPost(post(CLAIM_URL, { limit: 1 }, BROADCAST_TEST_SECRET));
    const claimed = await claim.json();
    await ackPost(
      post(ACK_URL, { orderId: claimed.items[0].orderId, ok: true, tgMessageId: 7 }, BROADCAST_TEST_SECRET)
    );

    const after = await (await healthGet()).json();
    expect(after.broadcast).toMatchObject({ enabled: true, pending: 1, sent: 1 });
    expect(JSON.stringify(after)).not.toContain(BROADCAST_TEST_SECRET);
  });

  it('stays healthy even if the queue cannot be read', async () => {
    process.env.TG_BROADCAST_SECRET = BROADCAST_TEST_SECRET;
    const spy = vi
      .spyOn(broadcastDb.db.systemConfig, 'findUnique')
      .mockRejectedValue(new Error('SQLITE_BUSY'));

    const res = await healthGet();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: 'HEALTHY',
      broadcast: { enabled: false, pending: 0, sent: 0, lastErrorKind: null },
    });
    spy.mockRestore();
  });
});
