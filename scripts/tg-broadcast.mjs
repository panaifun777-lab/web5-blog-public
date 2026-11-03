// ════════════════════════════════════════════════════════════════
// scripts/tg-broadcast.mjs
// Opt-in Telegram CHANNEL broadcaster for the web app's broadcast queue.
//
// Disabled by default: with no TG_BROADCAST_SECRET (or no TG_CHANNEL_ID /
// TG_BROADCAST_CHANNEL, or no TG_BOT_TOKEN) this module does nothing at all --
// broadcastConfig().enabled is false, runOnce() returns immediately without a
// single request, and scripts/tg-bot.mjs keeps its existing 1:1 behaviour and
// its `--selftest` path untouched.
//
// Direction of trust: the Next server never talks to Telegram (it holds no bot
// token); this bot process never touches Prisma. It claims already-rendered
// Telegram HTML from /api/broadcast/claim, posts it to the channel, and acks
// /api/broadcast/ack. The copy is built by
// src/lib/web5/broadcast/telegram-message.ts, so escaping / escrow truth /
// the 4096-char cap are decided in one place, not here.
//
// Safety properties, all unit-tested in tests/tg-broadcast.test.ts:
//   - exactly-once per order inside this process (sticky dedup set), so a
//     request that timed out is never re-posted;
//   - exponential backoff that honours Telegram's retry_after / FLOOD_WAIT_<n>;
//   - hard per-run cap on sends;
//   - never throws into the bot's poll loop, never logs the secret or token.
// ════════════════════════════════════════════════════════════════

const DEFAULT_SITE = 'https://web5.blog';
const MIN_SECRET_LENGTH = 16;
const DEDUP_HISTORY = 500;

function clampInt(raw, fallback, min, max) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

/**
 * Pure env reader. `reason` says exactly which credential is missing so an
 * operator can enable the feature without guessing, and without ever printing
 * a value.
 */
export function broadcastConfig(env = process.env) {
  const botToken = (env.TG_BOT_TOKEN || '').trim();
  const channelId = (env.TG_CHANNEL_ID || env.TG_BROADCAST_CHANNEL || '').trim();
  const secret = (env.TG_BROADCAST_SECRET || '').trim();
  const site = (env.TG_BROADCAST_SITE_URL || DEFAULT_SITE).trim().replace(/\/+$/, '');

  let reason = 'ready';
  if (!secret) reason = 'TG_BROADCAST_SECRET unset (broadcast disabled)';
  else if (secret.length < MIN_SECRET_LENGTH) reason = 'TG_BROADCAST_SECRET shorter than 16 chars';
  else if (!channelId) reason = 'TG_CHANNEL_ID (or TG_BROADCAST_CHANNEL) unset';
  else if (!botToken) reason = 'TG_BOT_TOKEN unset';

  return {
    enabled: reason === 'ready',
    reason,
    secret,
    channelId,
    botToken,
    site,
    claimUrl: `${site}/api/broadcast/claim`,
    ackUrl: `${site}/api/broadcast/ack`,
    telegramUrl: `https://api.telegram.org/bot${botToken}`,
    maxSendsPerRun: clampInt(env.TG_BROADCAST_MAX_SENDS_PER_RUN, 5, 1, 20),
    maxRetries: clampInt(env.TG_BROADCAST_MAX_RETRIES, 3, 1, 8),
    baseBackoffMs: clampInt(env.TG_BROADCAST_BASE_BACKOFF_MS, 1000, 100, 60_000),
    maxBackoffMs: clampInt(env.TG_BROADCAST_MAX_BACKOFF_MS, 120_000, 1_000, 900_000),
    pollIntervalMs: clampInt(env.TG_BROADCAST_POLL_MS, 60_000, 5_000, 24 * 3600_000),
  };
}

/** Seconds Telegram asked us to wait (retry_after or FLOOD_WAIT_<n>), or null. */
export function parseRetryAfterSeconds(payload) {
  const json = payload && payload.json ? payload.json : null;
  const fromParams = Number(json?.parameters?.retry_after);
  if (Number.isFinite(fromParams) && fromParams > 0) return Math.floor(fromParams);
  const description = String(json?.description || '');
  const match = description.match(/FLOOD_WAIT_(\d{1,7})/);
  if (match) return Math.floor(Number(match[1]));
  return null;
}

/**
 * How long to wait before the next attempt, or null to give up.
 * 429 / FLOOD_WAIT always honours the server value; 5xx and transport errors
 * back off exponentially; other 4xx are permanent (a bad request must not be
 * retried forever).
 */
export function nextBackoffMs(payload, attempt, config) {
  const maxMs = config?.maxBackoffMs ?? 120_000;
  const baseMs = config?.baseBackoffMs ?? 1000;
  const flood = parseRetryAfterSeconds(payload);
  if (flood !== null) return Math.min(flood * 1000, maxMs);

  const status = Number(payload?.status ?? 0);
  if (status === 0 || status >= 500) {
    return Math.min(baseMs * 2 ** Math.max(0, attempt - 1), maxMs);
  }
  if (status === 429) return Math.min(baseMs * 2 ** Math.max(0, attempt - 1), maxMs);
  return null;
}

/** Coarse failure taxonomy stored as `lastErrorKind` (never the response body). */
export function classifySendFailure(payload) {
  const status = Number(payload?.status ?? 0);
  if (parseRetryAfterSeconds(payload) !== null || status === 429) return 'FLOOD_WAIT';
  if (status === 0) return 'NETWORK';
  if (payload?.ok && payload.json && payload.json.ok === false) return 'BAD_RESPONSE';
  if (status >= 400) return 'HTTP_ERROR';
  return 'UNKNOWN';
}

function safeMessage(text, limit = 300) {
  // Strip anything that looks like a credential before it reaches a log.
  return String(text || '')
    .replace(/(secret|token|authorization)=\S+/gi, '$1=[redacted]')
    .slice(0, limit);
}

/**
 * Broadcaster factory. Everything impure is injected, so the tests run the
 * whole state machine against a fake fetch with no timers and no network.
 */
export function createBroadcaster(options = {}) {
  const env = options.env || process.env;
  const config = broadcastConfig(env);
  const log = options.log || console;
  const fetchImpl = options.fetchImpl || ((url, init) => fetch(url, init));
  const sleep =
    options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms))));

  // Sticky per-process dedup: once an order has been attempted it is never
  // attempted again here, even if the attempt failed ambiguously (a request
  // that timed out may still have been delivered). The bounded window only
  // exists so a months-long PM2 process cannot grow a Set forever.
  const seen = new Set();
  const seenOrder = [];

  function markSeen(orderId) {
    if (!orderId || seen.has(orderId)) return false;
    seen.add(orderId);
    seenOrder.push(orderId);
    while (seenOrder.length > DEDUP_HISTORY) seen.delete(seenOrder.shift());
    return true;
  }

  async function postJson(url, payload, withSecret = false) {
    const headers = { 'Content-Type': 'application/json' };
    // The broadcast secret authenticates us to OUR OWN API only. It must never
    // ride along to a third-party host such as api.telegram.org, which is
    // authenticated solely by the bot token in its URL.
    if (withSecret) headers['x-broadcast-secret'] = config.secret;
    const init = {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    };
    const res = await fetchImpl(url, init);
    const text = typeof res?.text === 'function' ? await res.text() : String(res?.body ?? '');
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { ok: Boolean(res?.ok), status: Number(res?.status ?? 0), json };
  }

  /** Posts one already-rendered message, with flood-aware retries. */
  async function sendToChannel(item) {
    const maxRetries = Math.max(1, config.maxRetries);
    let last = { ok: false, status: 0, json: null };

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        last = await postJson(`${config.telegramUrl}/sendMessage`, {
          chat_id: config.channelId,
          text: item.text,
          // Server-rendered HTML only -- never Markdown, never the order text.
          parse_mode: item.parseMode || 'HTML',
          link_preview_options: { is_disabled: true },
          disable_notification: false,
        });
      } catch (err) {
        last = { ok: false, status: 0, json: null, error: safeMessage(err?.message || err) };
      }

      if (last.ok && last.json?.ok && last.json?.result?.message_id) {
        return { sent: true, messageId: last.json.result.message_id, attempts: attempt };
      }

      const wait = nextBackoffMs(last, attempt, config);
      if (wait === null || attempt >= maxRetries) break;
      await sleep(wait);
    }

    return {
      sent: false,
      attempts: Math.min(maxRetries, Math.max(1, last.status === 0 ? maxRetries : 1)),
      errorKind: classifySendFailure(last),
      error: safeMessage(last.json?.description || last.error || `HTTP ${last.status}`),
    };
  }

  async function ack(payload) {
    try {
      await postJson(config.ackUrl, payload, true);
    } catch (err) {
      log.warn?.('[tg-broadcast] ack failed:', safeMessage(err?.message || err));
    }
  }

  /** One poll cycle. Returns a counter object; never throws. */
  async function runOnce(extra = {}) {
    if (!config.enabled) {
      return { enabled: false, reason: config.reason, claimed: 0, sent: 0, failed: 0, skipped: 0 };
    }

    const cap = Math.max(1, Math.min(Number(extra.limit) || config.maxSendsPerRun, config.maxSendsPerRun));
    const totals = { enabled: true, claimed: 0, sent: 0, failed: 0, skipped: 0, cap };

    let claim;
    try {
      claim = await postJson(config.claimUrl, { limit: cap }, true);
    } catch (err) {
      log.warn?.('[tg-broadcast] claim request failed:', safeMessage(err?.message || err));
      return { ...totals, errorKind: 'NETWORK' };
    }

    // 503 => TG_BROADCAST_SECRET is unset server-side: stay quiet, do not retry.
    if (!claim.ok || claim.json?.code === 'BROADCAST_NOT_CONFIGURED') {
      return { ...totals, disabled: true, status: claim.status };
    }

    const items = Array.isArray(claim.json?.items) ? claim.json.items : [];
    totals.claimed = items.length;

    for (const item of items) {
      // Hard per-run cap: never post more than `cap` messages per cycle.
      if (totals.sent + totals.failed >= cap) {
        totals.skipped += 1;
        continue;
      }
      if (!item?.orderId || typeof item.text !== 'string' || !item.text) {
        totals.skipped += 1;
        continue;
      }
      if (!markSeen(item.orderId)) {
        totals.skipped += 1;
        continue;
      }

      const result = await sendToChannel(item);
      if (result.sent) {
        totals.sent += 1;
        await ack({ orderId: item.orderId, ok: true, tgMessageId: result.messageId });
      } else {
        totals.failed += 1;
        await ack({
          orderId: item.orderId,
          ok: false,
          error: result.error,
          errorKind: result.errorKind,
        });
      }
    }

    return totals;
  }

  /** Periodic runner. Returns a disposer; a no-op when disabled. */
  function start() {
    if (!config.enabled) {
      log.info?.(`[tg-broadcast] disabled: ${config.reason}`);
      return () => {};
    }
    let running = false;
    const tick = () => {
      if (running) return;
      running = true;
      runOnce()
        .then((result) => {
          if (result.sent || result.failed) log.info?.('[tg-broadcast]', JSON.stringify(result));
        })
        .catch((err) => log.warn?.('[tg-broadcast] cycle failed:', safeMessage(err?.message || err)))
        .finally(() => {
          running = false;
        });
    };
    tick();
    const timer = setInterval(tick, config.pollIntervalMs);
    if (typeof timer?.unref === 'function') timer.unref();
    return () => clearInterval(timer);
  }

  return { config, runOnce, start, markSeen, seen };
}
