// Bot-side channel sender (scripts/tg-broadcast.mjs).
//
// Everything here is driven by an injected fake fetch: no network, no real bot
// token, no timers. The point of these tests is the four safety properties the
// sender has to have before it may post into a public channel:
//   - disabled by default (no env => not one request, and tg-bot.mjs --selftest
//     keeps its existing behaviour);
//   - exactly-once per order, so a request that timed out is never re-posted;
//   - flood-aware backoff that honours Telegram's retry_after / FLOOD_WAIT_<n>;
//   - a hard per-run cap on sends, and no throw into the polling loop.
//
// The module is loaded through a variable specifier so this test file keeps
// `any` typing for it (scripts/*.mjs is JS, not part of the tsconfig include).

import { beforeEach, describe, expect, it, vi } from 'vitest';

const moduleUrl = new URL('../scripts/tg-broadcast.mjs', import.meta.url).href;
const tg: any = await import(moduleUrl);

const { broadcastConfig, createBroadcaster, parseRetryAfterSeconds, nextBackoffMs, classifySendFailure } = tg;

const SECRET = 'broadcast-secret-for-tests-0123';
const CHANNEL = '@web5_bounties_test';
const BOT_TOKEN = '123456:TESTTOKEN-not-real-abcdef';
const SITE = 'https://web5.test';

type QueuedResponse = { status?: number; body?: unknown } | Error;

interface Harness {
  calls: Array<{ kind: string; url: string; method: string; body: any; headers: Record<string, string> }>;
  sleepCalls: number[];
  fetchImpl: (url: string, init: any) => Promise<any>;
  of: (kind: string) => Array<{ kind: string; url: string; method: string; body: any; headers: Record<string, string> }>;
  push: (kind: 'claim' | 'telegram' | 'ack', ...responses: QueuedResponse[]) => void;
}

function createHarness(initial: Partial<Record<'claim' | 'telegram' | 'ack', QueuedResponse[]>> = {}): Harness {
  const queue = {
    claim: [...(initial.claim ?? [])],
    telegram: [...(initial.telegram ?? [])],
    ack: [...(initial.ack ?? [])],
  };
  const defaults: Record<string, { status: number; body: unknown }> = {
    claim: { status: 200, body: { success: true, claimed: 0, pending: 0, items: [] } },
    telegram: { status: 200, body: { ok: true, result: { message_id: 4200 } } },
    ack: { status: 200, body: { success: true, action: 'sent' } },
  };
  const calls: Harness['calls'] = [];
  const sleepCalls: number[] = [];

  const fetchImpl = async (url: string, init: any) => {
    const kind = String(url).includes('/api/broadcast/claim')
      ? 'claim'
      : String(url).includes('/api/broadcast/ack')
        ? 'ack'
        : String(url).includes('api.telegram.org')
          ? 'telegram'
          : 'other';
    const body = JSON.parse(init.body);
    calls.push({ kind, url, method: String(init.method || 'GET'), body, headers: init.headers });
    if (kind === 'other') throw new Error(`unexpected request target: ${url}`);

    const next = queue[kind as keyof typeof queue].shift() ?? defaults[kind];
    if (next instanceof Error) throw next;
    const status = next.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(next.body),
    };
  };

  return {
    calls,
    sleepCalls,
    fetchImpl,
    of: (kind: string) => calls.filter((call) => call.kind === kind),
    push: (kind, ...responses) => {
      queue[kind].push(...responses);
    },
  };
}

function armedEnv(extra: Record<string, string> = {}) {
  return {
    TG_BROADCAST_SECRET: SECRET,
    TG_CHANNEL_ID: CHANNEL,
    TG_BOT_TOKEN: BOT_TOKEN,
    TG_BROADCAST_SITE_URL: SITE,
    ...extra,
  } as Record<string, string | undefined>;
}

function claimItem(orderId = 'ap2-task-1', text = '<b>New bounty</b> &amp; more') {
  return {
    status: 200,
    body: {
      success: true,
      claimed: 1,
      pending: 1,
      items: [{ orderId, text, parseMode: 'HTML' }],
    },
  };
}

function broadcasterOf(env: Record<string, string | undefined>, harness: Harness) {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const broadcaster = createBroadcaster({
    env,
    fetchImpl: harness.fetchImpl,
    log,
    sleep: async (ms: number) => {
      harness.sleepCalls.push(ms);
    },
  });
  return { broadcaster, log };
}

beforeEach(() => {
  // The sender must never fall back to the real process environment: every
  // test above passes an explicit env object.
  delete process.env.TG_BROADCAST_SECRET;
  delete process.env.TG_CHANNEL_ID;
  delete process.env.TG_BROADCAST_CHANNEL;
});

describe('disabled by default', () => {
  it('broadcastConfig is off with an empty env and says why', () => {
    const config = broadcastConfig({});
    expect(config.enabled).toBe(false);
    expect(config.reason).toMatch(/TG_BROADCAST_SECRET unset/i);
  });

  it('needs the secret, a channel, and a bot token; a short secret is not enough', () => {
    expect(broadcastConfig({ TG_BROADCAST_SECRET: SECRET }).reason).toMatch(/TG_CHANNEL_ID/i);
    expect(
      broadcastConfig({ TG_BROADCAST_SECRET: SECRET, TG_CHANNEL_ID: CHANNEL }).reason
    ).toMatch(/TG_BOT_TOKEN unset/i);
    expect(broadcastConfig({ TG_BROADCAST_SECRET: 'short' }).reason).toMatch(/shorter than 16/i);
    expect(broadcastConfig({ TG_BROADCAST_SECRET: SECRET, TG_BROADCAST_CHANNEL: CHANNEL, TG_BOT_TOKEN: BOT_TOKEN }).enabled).toBe(
      true
    );
    expect(
      broadcastConfig({ TG_BROADCAST_SECRET: SECRET, TG_BROADCAST_CHANNEL: CHANNEL, TG_BOT_TOKEN: BOT_TOKEN }).channelId
    ).toBe(CHANNEL);
  });

  it('runOnce makes not a single request while disabled', async () => {
    const harness = createHarness();
    const { broadcaster } = broadcasterOf({} as Record<string, string | undefined>, harness);

    const result = await broadcaster.runOnce();

    expect(result).toMatchObject({ enabled: false, claimed: 0, sent: 0, failed: 0 });
    expect(result.reason).toMatch(/TG_BROADCAST_SECRET unset/i);
    expect(harness.calls).toHaveLength(0);
  });

  it('start() logs the reason and returns a no-op disposer without scheduling', async () => {
    const harness = createHarness();
    const infoSpy = vi.fn();

    const env: Record<string, string | undefined> = { TG_BROADCAST_SITE_URL: SITE };
    const broadcaster = createBroadcaster({
      env,
      fetchImpl: harness.fetchImpl,
      log: { info: infoSpy, warn: vi.fn(), error: vi.fn() },
      sleep: async () => {},
    });
    const stop = broadcaster.start();
    expect(typeof stop).toBe('function');
    stop();

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('disabled:'));
    expect(infoSpy.mock.calls[0][0]).toContain('TG_BROADCAST_SECRET unset');
    // Not one request, and nothing credential-shaped in the log line.
    expect(harness.calls).toHaveLength(0);
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(SECRET);
  });

  it('clamps operator knobs instead of trusting them', () => {
    const config = broadcastConfig(
      armedEnv({
        TG_BROADCAST_MAX_SENDS_PER_RUN: '9999',
        TG_BROADCAST_MAX_RETRIES: '0',
        TG_BROADCAST_POLL_MS: '1',
        TG_BROADCAST_MAX_BACKOFF_MS: '-5',
      })
    );
    expect(config.maxSendsPerRun).toBe(20);
    expect(config.maxRetries).toBe(3);
    expect(config.pollIntervalMs).toBe(5000);
    expect(config.maxBackoffMs).toBe(120000);
    expect(broadcastConfig(armedEnv({ TG_BROADCAST_MAX_SENDS_PER_RUN: '2' })).maxSendsPerRun).toBe(2);
    expect(broadcastConfig(armedEnv()).claimUrl).toBe(`${SITE}/api/broadcast/claim`);
    expect(broadcastConfig(armedEnv()).site).toBe(SITE);
    // Trailing slashes in the site URL must not produce a double slash.
    expect(broadcastConfig(armedEnv({ TG_BROADCAST_SITE_URL: `${SITE}/` })).claimUrl).toBe(
      `${SITE}/api/broadcast/claim`
    );
    expect(broadcastConfig({ TG_BROADCAST_SECRET: SECRET }).site).toBe('https://web5.blog');
  });
});

describe('exactly-once per order', () => {
  it('never re-posts an order already attempted in this process', async () => {
    const harness = createHarness({ claim: [claimItem('ap2-task-dup'), claimItem('ap2-task-dup')] });
    const { broadcaster } = broadcasterOf(armedEnv(), harness);

    const first = await broadcaster.runOnce();
    const second = await broadcaster.runOnce();

    expect(first).toMatchObject({ sent: 1, failed: 0, skipped: 0 });
    expect(second).toMatchObject({ claimed: 1, sent: 0, skipped: 1 });
    expect(harness.of('telegram')).toHaveLength(1);
    // ...and it is not acked twice either.
    expect(harness.of('ack')).toHaveLength(1);
  });

  it('skips an item that already failed ambiguously rather than risking a double post', async () => {
    const harness = createHarness({
      claim: [claimItem('ap2-task-ambig'), claimItem('ap2-task-ambig')],
      telegram: [new Error('fetch failed: connection reset')],
    });
    const { broadcaster } = broadcasterOf(armedEnv({ TG_BROADCAST_MAX_RETRIES: '1' }), harness);

    const first = await broadcaster.runOnce();
    const second = await broadcaster.runOnce();

    expect(first.failed).toBe(1);
    expect(second).toMatchObject({ sent: 0, failed: 0, skipped: 1 });
    expect(harness.of('telegram')).toHaveLength(1);
    // The ambiguous failure is acked once; the deduped re-claim is not acked at
    // all, so the server record stays FAILED and can be retried by a later run
    // only after the claim TTL expires.
    expect(harness.of('ack')).toHaveLength(1);
    expect(harness.of('ack')[0].body).toMatchObject({ ok: false, errorKind: 'NETWORK' });
  });

  it('ignores malformed items instead of posting undefined', async () => {
    const harness = createHarness({
      claim: [
        {
          status: 200,
          body: {
            success: true,
            items: [{ orderId: '', text: 'no id' }, { orderId: 'ap2-task-x', text: '' }, { orderId: 'ap2-task-ok', text: 'hi' }],
          },
        },
      ],
    });
    const { broadcaster } = broadcasterOf(armedEnv(), harness);

    const result = await broadcaster.runOnce();

    expect(result).toMatchObject({ claimed: 3, sent: 1, skipped: 2 });
    expect(harness.of('telegram')[0].body.text).toBe('hi');
  });
});

describe('flood-aware backoff', () => {
  it('honours Telegram retry_after before retrying, then acks the delivered post', async () => {
    const harness = createHarness({
      claim: [claimItem('ap2-task-flood')],
      telegram: [
        {
          status: 429,
          body: {
            ok: false,
            description: 'Too Many Requests: retry after 7',
            parameters: { retry_after: 7 },
          },
        },
      ],
    });
    const { broadcaster } = broadcasterOf(armedEnv(), harness);

    const result = await broadcaster.runOnce();

    expect(harness.sleepCalls).toEqual([7000]);
    expect(result).toMatchObject({ sent: 1, failed: 0 });
    expect(harness.of('telegram')).toHaveLength(2);
    expect(harness.of('ack')[0].body).toMatchObject({ orderId: 'ap2-task-flood', ok: true, tgMessageId: 4200 });
  });

  it('reads FLOOD_WAIT_<n> out of the description when no parameters are given', async () => {
    const harness = createHarness({
      claim: [claimItem('ap2-task-flood2')],
      telegram: [{ status: 429, body: { ok: false, description: 'Too Many Requests: FLOOD_WAIT_3' } }],
    });
    const { broadcaster } = broadcasterOf(armedEnv(), harness);

    await broadcaster.runOnce();

    expect(harness.sleepCalls).toEqual([3000]);
  });

  it('never waits longer than the configured ceiling', async () => {
    const harness = createHarness({
      claim: [claimItem('ap2-task-flood3')],
      telegram: [
        { status: 429, body: { ok: false, description: 'FLOOD_WAIT_600', parameters: { retry_after: 600 } } },
      ],
    });
    const { broadcaster } = broadcasterOf(armedEnv({ TG_BROADCAST_MAX_BACKOFF_MS: '2000' }), harness);

    await broadcaster.runOnce();

    expect(harness.sleepCalls).toEqual([2000]);
  });

  it('backs off exponentially on 5xx and gives up at the retry budget', async () => {
    const gateway = { status: 502, body: { ok: false, description: 'Bad Gateway' } };
    const harness = createHarness({
      claim: [claimItem('ap2-task-5xx')],
      telegram: [gateway, gateway, gateway],
    });
    const { broadcaster } = broadcasterOf(armedEnv({ TG_BROADCAST_BASE_BACKOFF_MS: '1000' }), harness);

    const result = await broadcaster.runOnce();

    // maxRetries defaults to 3: attempt 1, wait 1000, attempt 2, wait 2000, attempt 3, stop.
    expect(harness.sleepCalls).toEqual([1000, 2000]);
    expect(harness.of('telegram')).toHaveLength(3);
    expect(result).toMatchObject({ sent: 0, failed: 1 });
    expect(harness.of('ack')[0].body).toMatchObject({ ok: false, errorKind: 'HTTP_ERROR' });
  });

  it('treats a permanent 4xx as final: no retry, one ack', async () => {
    const harness = createHarness({
      claim: [claimItem('ap2-task-400')],
      telegram: [{ status: 400, body: { ok: false, description: "Bad Request: can't parse entities" } }],
    });
    const { broadcaster } = broadcasterOf(armedEnv(), harness);

    const result = await broadcaster.runOnce();

    expect(harness.sleepCalls).toEqual([]);
    expect(harness.of('telegram')).toHaveLength(1);
    expect(result.failed).toBe(1);
    expect(harness.of('ack')[0].body).toMatchObject({ ok: false, errorKind: 'HTTP_ERROR' });
  });

  it('survives a transport failure without throwing into the poll loop', async () => {
    const harness = createHarness({
      claim: [claimItem('ap2-task-net')],
      telegram: [new Error('socket hang up')],
    });
    const { broadcaster } = broadcasterOf(armedEnv({ TG_BROADCAST_MAX_RETRIES: '1' }), harness);

    const result = await broadcaster.runOnce();

    expect(result).toMatchObject({ sent: 0, failed: 1 });
    expect(harness.of('ack')[0].body).toMatchObject({ ok: false, errorKind: 'NETWORK', orderId: 'ap2-task-net' });
  });

  it('a failed claim request is reported, not thrown', async () => {
    const harness = createHarness({ claim: [new Error('ECONNREFUSED')] });
    const { broadcaster, log } = broadcasterOf(armedEnv(), harness);

    const result = await broadcaster.runOnce();

    expect(result).toMatchObject({ enabled: true, errorKind: 'NETWORK' });
    expect(harness.of('telegram')).toHaveLength(0);
    expect(log.warn).toHaveBeenCalledWith('[tg-broadcast] claim request failed:', expect.anything());
  });

  it('pure backoff helpers decide, so the sender stays auditable', () => {
    expect(parseRetryAfterSeconds({ status: 429, json: { parameters: { retry_after: 5 } } })).toBe(5);
    expect(parseRetryAfterSeconds({ status: 429, json: { description: 'FLOOD_WAIT_42' } })).toBe(42);
    expect(parseRetryAfterSeconds({ status: 500, json: { description: 'Internal Server Error' } })).toBeNull();
    expect(parseRetryAfterSeconds(null)).toBeNull();

    const config = { baseBackoffMs: 1000, maxBackoffMs: 30000 };
    expect(nextBackoffMs({ status: 0, json: null }, 1, config)).toBe(1000);
    expect(nextBackoffMs({ status: 503, json: null }, 3, config)).toBe(4000);
    expect(nextBackoffMs({ status: 429, json: { parameters: { retry_after: 9 } } }, 1, config)).toBe(9000);
    expect(nextBackoffMs({ status: 400, json: null }, 1, config)).toBeNull();
    expect(nextBackoffMs({ status: 401, json: null }, 2, config)).toBeNull();

    expect(classifySendFailure({ status: 429, json: { parameters: { retry_after: 1 } } })).toBe('FLOOD_WAIT');
    expect(classifySendFailure({ status: 0, json: null })).toBe('NETWORK');
    expect(classifySendFailure({ status: 502, json: null })).toBe('HTTP_ERROR');
    expect(classifySendFailure({ ok: true, status: 200, json: { ok: false, description: 'no message_id' } })).toBe(
      'BAD_RESPONSE'
    );
  });
});

describe('hard per-run cap and request hygiene', () => {
  it('never posts more than maxSendsPerRun messages per cycle', async () => {
    const many = {
      status: 200,
      body: {
        success: true,
        items: ['a', 'b', 'c', 'd', 'e'].map((id) => ({
          orderId: `ap2-task-cap-${id}`,
          text: `bounty ${id}`,
          parseMode: 'HTML',
        })),
      },
    };
    const harness = createHarness({ claim: [many] });
    const { broadcaster } = broadcasterOf(armedEnv({ TG_BROADCAST_MAX_SENDS_PER_RUN: '2' }), harness);

    const result = await broadcaster.runOnce();

    expect(result.cap).toBe(2);
    expect(harness.of('telegram')).toHaveLength(2);
    expect(harness.of('ack')).toHaveLength(2);
    expect(result).toMatchObject({ claimed: 5, sent: 2, skipped: 3 });
  });

  it('asks the server for at most the cap it will honour', async () => {
    const harness = createHarness({ claim: [claimItem('ap2-task-limit')] });
    const { broadcaster } = broadcasterOf(armedEnv({ TG_BROADCAST_MAX_SENDS_PER_RUN: '7' }), harness);

    await broadcaster.runOnce();

    expect(harness.of('claim')[0].body).toEqual({ limit: 7 });

    // An explicit smaller limit is respected too (never larger than the cap).
    const harness2 = createHarness({ claim: [claimItem('ap2-task-limit2')] });
    const { broadcaster: b2 } = broadcasterOf(armedEnv({ TG_BROADCAST_MAX_SENDS_PER_RUN: '7' }), harness2);
    await b2.runOnce({ limit: 1 });
    expect(harness2.of('claim')[0].body).toEqual({ limit: 1 });
  });

  it('stays quiet when the server says the feature is unconfigured', async () => {
    const harness = createHarness({
      claim: [{ status: 503, body: { error: 'Telegram broadcast is not configured on this server.', code: 'BROADCAST_NOT_CONFIGURED' } }],
    });
    const { broadcaster } = broadcasterOf(armedEnv(), harness);

    const result = await broadcaster.runOnce();

    expect(result).toMatchObject({ enabled: true, disabled: true, status: 503, sent: 0, failed: 0 });
    expect(harness.of('telegram')).toHaveLength(0);
    expect(harness.of('ack')).toHaveLength(0);
  });

  it('posts HTML as rendered by the server, to the configured channel only', async () => {
    const text = '🎯 <b>新悬赏 · New bounty</b> · <a href="https://web5.blog/task/ap2-task-1">link</a>';
    const harness = createHarness({ claim: [claimItem('ap2-task-html', text)] });
    const { broadcaster } = broadcasterOf(armedEnv(), harness);

    await broadcaster.runOnce();

    const send = harness.of('telegram')[0];
    expect(send.body).toEqual({
      chat_id: CHANNEL,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      disable_notification: false,
    });
    // The bot holds no copy logic: the server-rendered text is posted verbatim.
    expect(send.body.text).toBe(text);
    expect(send.url).toBe(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`);
    expect(send.method).toBe('POST');
  });

  it('sends the secret only to our own API, never to Telegram, and never in a log', async () => {
    const harness = createHarness({
      claim: [claimItem('ap2-task-secret')],
      telegram: [new Error('request failed: authorization=Bearer-abc123&token=xyz789')],
    });
    const { broadcaster, log } = broadcasterOf(armedEnv({ TG_BROADCAST_MAX_RETRIES: '1' }), harness);

    await broadcaster.runOnce();

    expect(harness.of('claim')[0].headers['x-broadcast-secret']).toBe(SECRET);
    expect(harness.of('ack')[0].headers['x-broadcast-secret']).toBe(SECRET);
    // api.telegram.org is authenticated by the bot token in its URL; the server
    // secret must never be handed to a third-party host.
    expect(harness.of('telegram')[0].headers).not.toHaveProperty('x-broadcast-secret');

    // Nothing credential-shaped reaches stdout/stderr, not even via the
    // failure string we ack back to the server.
    const logged = JSON.stringify(log.info.mock.calls) + JSON.stringify(log.warn.mock.calls);
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain(BOT_TOKEN);
    const ackBody = JSON.stringify(harness.of('ack')[0].body);
    expect(ackBody).not.toContain('Bearer-abc123');
    expect(ackBody).not.toContain('xyz789');
    expect(ackBody).toContain('[redacted]');
  });

  it('an ack that fails to reach the server is logged, not thrown', async () => {
    const harness = createHarness({ claim: [claimItem('ap2-task-ackfail')], ack: [new Error('ack unreachable')] });
    const { broadcaster, log } = broadcasterOf(armedEnv(), harness);

    const result = await broadcaster.runOnce();

    expect(result.sent).toBe(1);
    expect(log.warn).toHaveBeenCalledWith('[tg-broadcast] ack failed:', expect.anything());
  });
});
