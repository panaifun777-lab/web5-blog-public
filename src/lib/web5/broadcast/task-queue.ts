// ════════════════════════════════════════════════════════════════
// src/lib/web5/broadcast/task-queue.ts
// Telegram public-channel broadcast queue for bounty orders.
//
// Why this exists: order creation is on-chain-gated and must stay that way;
// announcing an order is a separate, advisory side effect. So:
//   - creation only pushes the orderId onto a queue (fire-and-forget);
//   - the Next server NEVER calls api.telegram.org (it holds no bot token);
//   - the PM2 bot process (scripts/tg-bot.mjs) claims records over an
//     authenticated endpoint, posts to the channel, and acks.
//
// Persistence: SystemConfig (key `broadcast:telegram:queue`), one JSON
// document. No Prisma model or field is added — the production VPS runs a
// hand-synced client, so the schema is frozen.
//
// Only the orderId and bookkeeping live here. User-authored title/description
// are NOT stored in the queue document; the claim path reads the order row and
// renders it through the pure template (telegram-message.ts) at send time.
//
// Structure follows the repo precedents:
//   - pure functions separated from Prisma I/O  (hot-wallet.ts)
//   - in-process serialized writes              (payoutQueue in payments/arc.ts)
//   - fail-closed env gate + 503 when unset     (SETTLEMENT_CRON_SECRET)
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { db } from '@/lib/db';
import {
  renderTaskBroadcastMessage,
  type TaskBroadcastPayload,
} from '@/lib/web5/broadcast/telegram-message';

export const BROADCAST_QUEUE_CONFIG_KEY = 'broadcast:telegram:queue';
export const BROADCAST_SECRET_ENV = 'TG_BROADCAST_SECRET';
export const BROADCAST_SECRET_HEADER = 'x-broadcast-secret';
export const BROADCAST_CHANNEL_ENV = 'TG_CHANNEL_ID';
export const BROADCAST_CHANNEL_ENV_ALIAS = 'TG_BROADCAST_CHANNEL';

/** Same floor as SETTLEMENT_CRON_SECRET. */
export const MIN_BROADCAST_SECRET_LENGTH = 16;

/** Retained history ceiling; the document stays small enough for one row. */
export const DEFAULT_MAX_QUEUE_RECORDS = 200;
export const HARD_MAX_QUEUE_RECORDS = 2_000;
/** A claimed-but-unacked record becomes re-claimable after this. */
export const DEFAULT_CLAIM_TTL_MS = 10 * 60_000;
/** Terminal failures: after this many send attempts the record is SKIPPED. */
export const DEFAULT_MAX_ATTEMPTS = 3;

export type BroadcastStatus = 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED';

export type BroadcastErrorKind =
  | 'FLOOD_WAIT'
  | 'HTTP_ERROR'
  | 'NETWORK'
  | 'BAD_RESPONSE'
  | 'UNKNOWN';

export const BROADCAST_ERROR_KINDS: BroadcastErrorKind[] = [
  'FLOOD_WAIT',
  'HTTP_ERROR',
  'NETWORK',
  'BAD_RESPONSE',
  'UNKNOWN',
];

export interface BroadcastRecord {
  orderId: string;
  status: BroadcastStatus;
  tgMessageId?: number | null;
  attempts: number;
  lastError?: string | null;
  lastErrorKind?: BroadcastErrorKind | null;
  /** ISO timestamps — the document must stay JSON-serializable and clock-free. */
  queuedAt: string;
  claimedAt?: string | null;
  sentAt?: string | null;
}

export interface BroadcastQueueDoc {
  version: 1;
  updatedAt: string;
  records: BroadcastRecord[];
}

export type EnqueueAction =
  | 'queued'
  | 'already-sent'
  | 'already-pending'
  | 'skipped-demo'
  | 'skipped-invalid-id'
  | 'skipped-disabled'
  | 'dropped-queue-full'
  | 'failed';

export interface EnqueueResult {
  action: EnqueueAction;
  record: BroadcastRecord | null;
}

export interface BroadcastCounts {
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface BroadcastConfigDescription {
  /** True only when the queue/route surface is armed (secret configured). */
  enabled: boolean;
  secretConfigured: boolean;
  channelConfigured: boolean;
  /** Never the value — the point of this function is a secret-free report. */
  maxRecords: number;
}

// ── pure helpers (no I/O) ───────────────────────────────────────

function isoNow(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

/** Bounded, integer-only env reader that may only tighten a server default. */
function clampNumber(raw: string | undefined, fallback: number, hardMax: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), hardMax);
}

export function getMaxQueueRecords(env: Record<string, string | undefined> = process.env): number {
  return clampNumber(env.BROADCAST_QUEUE_MAX_RECORDS, DEFAULT_MAX_QUEUE_RECORDS, HARD_MAX_QUEUE_RECORDS);
}

export function getMaxAttempts(env: Record<string, string | undefined> = process.env): number {
  return clampNumber(env.BROADCAST_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS, 10);
}

export function getClaimTtlMs(env: Record<string, string | undefined> = process.env): number {
  return clampNumber(env.BROADCAST_CLAIM_TTL_MS, DEFAULT_CLAIM_TTL_MS, 24 * 3600_000);
}

export function broadcastSecretConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const secret = (env[BROADCAST_SECRET_ENV] || '').trim();
  return secret.length >= MIN_BROADCAST_SECRET_LENGTH;
}

export function broadcastChannelConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const id = (env[BROADCAST_CHANNEL_ENV] || env[BROADCAST_CHANNEL_ENV_ALIAS] || '').trim();
  return id.length > 0;
}

/**
 * The queue is armed by TG_BROADCAST_SECRET alone: unset (production today)
 * means enqueue is a no-op and the claim/ack endpoints answer 503.
 */
export function broadcastQueueEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return broadcastSecretConfigured(env);
}

export function describeBroadcastConfig(
  env: Record<string, string | undefined> = process.env
): BroadcastConfigDescription {
  return {
    enabled: broadcastQueueEnabled(env),
    secretConfigured: broadcastSecretConfigured(env),
    channelConfigured: broadcastChannelConfigured(env),
    maxRecords: getMaxQueueRecords(env),
  };
}

/**
 * Constant-time comparison, mirroring the settlement cron: an unset/short
 * secret is NOT_CONFIGURED (503, inert), a mismatch is UNAUTHORIZED (401).
 * The secret value is never returned or logged.
 */
export function verifyBroadcastSecret(
  provided: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): { ok: true } | { ok: false; code: 'BROADCAST_NOT_CONFIGURED' | 'BROADCAST_UNAUTHORIZED' } {
  const secret = (env[BROADCAST_SECRET_ENV] || '').trim();
  if (secret.length < MIN_BROADCAST_SECRET_LENGTH) {
    console.error(`[broadcast] ${BROADCAST_SECRET_ENV} is missing or shorter than ${MIN_BROADCAST_SECRET_LENGTH} chars`);
    return { ok: false, code: 'BROADCAST_NOT_CONFIGURED' };
  }
  const a = Buffer.from(String(provided ?? ''));
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: 'BROADCAST_UNAUTHORIZED' };
  }
  return { ok: true };
}

export function emptyQueueDoc(): BroadcastQueueDoc {
  return { version: 1, updatedAt: '', records: [] };
}

/** Corrupt or unexpected JSON degrades to an empty queue, never a throw. */
export function parseQueueDoc(raw: string | null | undefined, nowMs = Date.now()): BroadcastQueueDoc {
  if (!raw) return emptyQueueDoc();
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[broadcast] queue document is not valid JSON; starting from an empty queue');
    return emptyQueueDoc();
  }
  const records = Array.isArray(parsed?.records) ? parsed.records : [];
  return {
    version: 1,
    updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : isoNow(nowMs),
    records: records
      .filter((row: any) => row && typeof row.orderId === 'string' && isStatus(row.status))
      .map((row: any) => normalizeRecord(row)),
  };
}

function isStatus(value: unknown): value is BroadcastStatus {
  return value === 'PENDING' || value === 'SENT' || value === 'SKIPPED' || value === 'FAILED';
}

function normalizeRecord(row: any): BroadcastRecord {
  const attempts = Number(row.attempts);
  return {
    orderId: String(row.orderId),
    status: row.status,
    tgMessageId: Number.isFinite(row.tgMessageId) ? Math.trunc(row.tgMessageId) : null,
    attempts: Number.isFinite(attempts) && attempts > 0 ? Math.trunc(attempts) : 0,
    lastError: typeof row.lastError === 'string' ? row.lastError.slice(0, 500) : null,
    lastErrorKind: isKind(row.lastErrorKind) ? row.lastErrorKind : null,
    queuedAt: typeof row.queuedAt === 'string' ? row.queuedAt : '',
    claimedAt: typeof row.claimedAt === 'string' ? row.claimedAt : null,
    sentAt: typeof row.sentAt === 'string' ? row.sentAt : null,
  };
}

function isKind(value: unknown): value is BroadcastErrorKind {
  return (BROADCAST_ERROR_KINDS as string[]).includes(String(value));
}

/**
 * Bounded history. PENDING records are never dropped (dropping one loses real
 * work); terminal records age out oldest-first. When the retained history is
 * entirely PENDING the caller must reject the new enqueue instead of evicting.
 */
export function trimQueue(
  records: BroadcastRecord[],
  maxRecords: number
): { records: BroadcastRecord[]; overflow: boolean } {
  const cap = Math.max(1, Math.floor(maxRecords));
  if (records.length <= cap) return { records, overflow: false };

  const droppable = records.filter((row) => row.status !== 'PENDING');
  const keepCount = cap;
  if (droppable.length === 0) {
    return { records, overflow: true };
  }

  const excess = records.length - cap;
  const toDrop = new Set(droppable.slice(0, excess));
  const kept = records.filter((row) => !toDrop.has(row));
  // Defensive: keep the newest `cap` records overall, oldest first.
  return { records: kept.slice(-keepCount), overflow: kept.length > cap };
}

/**
 * Pure enqueue. Idempotent: a SENT/SKIPPED order is never re-queued, and a
 * PENDING order keeps its original queuedAt and attempt counter.
 */
export function enqueueIntoDoc(
  doc: BroadcastQueueDoc,
  orderId: string,
  options: { nowMs: number; maxRecords: number; isDemo?: boolean | null }
): { doc: BroadcastQueueDoc; action: EnqueueAction; record: BroadcastRecord | null } {
  const id = String(orderId ?? '').trim();
  if (!id) return { doc, action: 'skipped-invalid-id', record: null };
  // Demo/seed orders are not real bounties; announcing them would be fiction.
  if (options.isDemo || /^ap2-task-(seed|meme)-/.test(id)) {
    return { doc, action: 'skipped-demo', record: null };
  }

  const existing = doc.records.find((row) => row.orderId === id);
  if (existing) {
    if (existing.status === 'PENDING' || existing.status === 'FAILED') {
      return { doc, action: 'already-pending', record: existing };
    }
    // SENT is final; SKIPPED stays skipped (an operator decision, not a race).
    return { doc, action: existing.status === 'SENT' ? 'already-sent' : 'already-pending', record: existing };
  }

  const record: BroadcastRecord = {
    orderId: id,
    status: 'PENDING',
    tgMessageId: null,
    attempts: 0,
    lastError: null,
    lastErrorKind: null,
    queuedAt: isoNow(options.nowMs),
    claimedAt: null,
    sentAt: null,
  };

  const trimmed = trimQueue([...doc.records, record], options.maxRecords);
  if (trimmed.overflow) {
    // Backpressure: the queue is all-pending and full. Never evict real work
    // to make room; drop the newcomer and keep the doc unchanged.
    return { doc, action: 'dropped-queue-full', record: null };
  }

  return {
    doc: { version: 1, updatedAt: isoNow(options.nowMs), records: trimmed.records },
    action: 'queued',
    record,
  };
}

/**
 * Pick the records a claim may hand out.
 *
 * Claimable = PENDING, or FAILED with attempts still under maxAttempts, and no
 * live claim stamp (claimedAt within claimTtlMs) from a previous claim that has
 * not acked yet. Claimed records get `attempts + 1` and `claimedAt = now`, so a
 * second concurrent claim inside the TTL cannot post the same order twice.
 * A FAILED record that ran out of attempts becomes SKIPPED: it is terminal,
 * reported back, and never retried forever.
 */
export function pickClaimable(
  doc: BroadcastQueueDoc,
  options: {
    nowMs: number;
    limit: number;
    claimTtlMs: number;
    maxAttempts: number;
    maxRecords: number;
  }
): { doc: BroadcastQueueDoc; claimed: BroadcastRecord[]; exhausted: BroadcastRecord[] } {
  const nowIso = isoNow(options.nowMs);
  const claimedNow: BroadcastRecord[] = [];
  const exhausted: BroadcastRecord[] = [];

  const next = doc.records.map((row) => {
    if (row.status !== 'PENDING' && row.status !== 'FAILED') return row;

    if (row.status === 'FAILED' && row.attempts >= Math.max(1, options.maxAttempts)) {
      const skipped: BroadcastRecord = { ...row, status: 'SKIPPED', claimedAt: null };
      exhausted.push(skipped);
      return skipped;
    }

    const inFlight =
      typeof row.claimedAt === 'string' &&
      row.claimedAt.length > 0 &&
      new Date(row.claimedAt).getTime() + Math.max(1000, options.claimTtlMs) > options.nowMs;
    if (inFlight) return row;

    if (claimedNow.length >= Math.max(1, options.limit)) return row;

    const claim: BroadcastRecord = { ...row, attempts: row.attempts + 1, claimedAt: nowIso };
    claimedNow.push(claim);
    return claim;
  });

  return {
    doc: {
      version: 1,
      updatedAt: nowIso,
      records: trimQueue(next, options.maxRecords).records,
    },
    claimed: claimedNow,
    exhausted,
  };
}

export interface AckInput {
  orderId: string;
  ok: boolean;
  tgMessageId?: number | string | null;
  error?: string | null;
  errorKind?: string | null;
  status?: 'SENT' | 'FAILED' | 'SKIPPED';
  nowMs: number;
  /** Terminal after this many attempts; defaults to BROADCAST_MAX_ATTEMPTS. */
  maxAttempts?: number;
}

/** Pure ack. SENT is idempotent; acking an unknown order reports not-found. */
export function ackIntoDoc(
  doc: BroadcastQueueDoc,
  input: AckInput
): { doc: BroadcastQueueDoc; record: BroadcastRecord | null; action: 'sent' | 'failed' | 'skipped' | 'already-sent' | 'not-found' } {
  const index = doc.records.findIndex((row) => row.orderId === input.orderId);
  if (index === -1) return { doc, record: null, action: 'not-found' };

  const current = doc.records[index];
  if (current.status === 'SENT') {
    // Idempotent: a repeated ack of a delivered post never re-opens the record.
    return { doc, record: current, action: 'already-sent' };
  }

  const nowIso = isoNow(input.nowMs);
  const messageId = toMessageId(input.tgMessageId);
  const maxAttempts = Math.max(1, Math.floor(input.maxAttempts ?? getMaxAttempts()));

  let updated: BroadcastRecord;
  let action: 'sent' | 'failed' | 'skipped';

  if (input.ok) {
    updated = {
      ...current,
      status: 'SENT',
      tgMessageId: messageId,
      sentAt: nowIso,
      claimedAt: nowIso,
      lastError: null,
      lastErrorKind: null,
    };
    action = 'sent';
  } else if (input.status === 'SKIPPED') {
    updated = {
      ...current,
      status: 'SKIPPED',
      claimedAt: null,
      lastError: slice(input.error),
      lastErrorKind: normalizeKind(input.errorKind),
    };
    action = 'skipped';
  } else {
    const attempts = Math.max(current.attempts, 1);
    updated = {
      ...current,
      status: attempts >= maxAttempts ? 'SKIPPED' : 'FAILED',
      attempts,
      claimedAt: null,
      lastError: slice(input.error),
      lastErrorKind: normalizeKind(input.errorKind),
    };
    action = 'failed';
  }

  const records = doc.records.slice();
  records[index] = updated;
  return {
    doc: { version: 1, updatedAt: nowIso, records: trimQueue(records, getMaxQueueRecords()).records },
    record: updated,
    action,
  };
}

function toMessageId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^\d{1,15}$/.test(value.trim())) return Number(value.trim());
  return null;
}

function slice(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  return raw ? raw.slice(0, 500) : null;
}

function normalizeKind(value: unknown): BroadcastErrorKind {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'FLOOD_WAIT') return 'FLOOD_WAIT';
  if (raw === 'HTTP_ERROR') return 'HTTP_ERROR';
  if (raw === 'NETWORK') return 'NETWORK';
  if (raw === 'BAD_RESPONSE') return 'BAD_RESPONSE';
  return 'UNKNOWN';
}

export function queueCounts(doc: BroadcastQueueDoc): BroadcastCounts {
  let pending = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of doc.records) {
    if (row.status === 'PENDING') pending += 1;
    else if (row.status === 'SENT') sent += 1;
    else if (row.status === 'FAILED') failed += 1;
    else skipped += 1;
  }
  return { pending, sent, failed, skipped, total: doc.records.length };
}

/** Most recent failure kind still present in the retained history. */
export function lastErrorKind(doc: BroadcastQueueDoc): BroadcastErrorKind | null {
  for (let i = doc.records.length - 1; i >= 0; i -= 1) {
    const row = doc.records[i];
    if ((row.status === 'FAILED' || row.status === 'SKIPPED') && row.lastErrorKind) return row.lastErrorKind;
  }
  return null;
}

// ── Prisma I/O (SystemConfig-backed, serialized) ────────────────

/**
 * Serializes read-modify-write inside this process, exactly like `payoutQueue`
 * in payments/arc.ts: two concurrent enqueues cannot clobber each other.
 * Cross-process safety comes from the single consumer (the bot claims, the web
 * process only appends), plus the idempotent enqueue/ack semantics above.
 */
let queueWrite: Promise<unknown> = Promise.resolve();

function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueWrite.then(fn, fn);
  queueWrite = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readDoc(): Promise<BroadcastQueueDoc> {
  const row = await db.systemConfig.findUnique({ where: { key: BROADCAST_QUEUE_CONFIG_KEY } });
  return parseQueueDoc(row?.value);
}

async function writeDoc(doc: BroadcastQueueDoc): Promise<void> {
  const value = JSON.stringify(doc);
  const existing = await db.systemConfig.findUnique({ where: { key: BROADCAST_QUEUE_CONFIG_KEY } });
  if (existing) {
    await db.systemConfig.update({ where: { key: BROADCAST_QUEUE_CONFIG_KEY }, data: { value } });
    return;
  }
  await db.systemConfig.create({
    data: { key: BROADCAST_QUEUE_CONFIG_KEY, value, updatedBy: 'system:telegram-broadcast' },
  });
}

/** Test seam: exports the lock so concurrency is observable without a DB. */
export async function withBroadcastQueue<T>(fn: () => Promise<T>): Promise<T> {
  return withQueueLock(fn);
}

/**
 * Fire-and-forget enqueue used by order creation. Never throws: every failure
 * path (disabled, DB error, full queue) returns a result object, and the
 * caller in commerce.ts additionally catches.
 */
export async function enqueueTaskBroadcast(
  order: { orderId: string; isDemo?: boolean | null },
  options: { nowMs?: number; env?: Record<string, string | undefined> } = {}
): Promise<EnqueueResult> {
  const env = options.env ?? process.env;
  if (!broadcastQueueEnabled(env)) {
    return { action: 'skipped-disabled', record: null };
  }
  const nowMs = options.nowMs ?? Date.now();
  const maxRecords = getMaxQueueRecords(env);

  try {
    return await withQueueLock(async () => {
      const doc = await readDoc();
      const result = enqueueIntoDoc(doc, order.orderId, {
        nowMs,
        maxRecords,
        isDemo: order.isDemo,
      });
      if (result.action !== 'queued') {
        return { action: result.action, record: result.record };
      }
      await writeDoc(result.doc);
      return { action: result.action, record: result.record };
    });
  } catch (err: any) {
    console.warn(`[broadcast] enqueue failed for ${order.orderId}:`, err?.message || err);
    return { action: 'failed', record: null };
  }
}

/**
 * Claim a batch for the bot: marks them claimed (attempts + 1, claimedAt) so a
 * concurrent claim within the TTL does not post the same order twice, then
 * renders each from the live order row.
 */
export async function claimPendingBroadcasts(
  options: { limit?: number; nowMs?: number; env?: Record<string, string | undefined> } = {}
): Promise<{ items: TaskBroadcastPayload[]; pending: number; skipped: number }> {
  const env = options.env ?? process.env;
  const nowMs = options.nowMs ?? Date.now();
  const limit = clampNumber(String(options.limit ?? 5), 5, 20);
  const claimTtlMs = getClaimTtlMs(env);
  const maxAttempts = getMaxAttempts(env);
  const maxRecords = getMaxQueueRecords(env);

  const claim = await withQueueLock(async () => {
    const doc = await readDoc();
    const picked = pickClaimable(doc, { nowMs, limit, claimTtlMs, maxAttempts, maxRecords });
    // Persist the claim stamps: without this a second claim could hand out the
    // same order while the first one is still in flight.
    if (picked.claimed.length > 0 || picked.exhausted.length > 0) {
      await writeDoc(picked.doc);
    }
    return picked;
  });

  const orderIds = claim.claimed.map((row) => row.orderId);
  if (orderIds.length === 0) {
    const doc = await readDoc();
    return { items: [], pending: queueCounts(doc).pending, skipped: claim.exhausted.length };
  }

  const orders = await db.taskOrder.findMany({ where: { orderId: { in: orderIds } } });
  const byId = new Map<string, any>(orders.map((row: any) => [row.orderId, row]));

  const items: TaskBroadcastPayload[] = [];
  for (const record of claim.claimed) {
    const order = byId.get(record.orderId);
    if (!order) continue;
    const rendered = renderTaskBroadcastMessage(
      {
        orderId: order.orderId,
        title: order.title,
        description: order.description,
        bountyUsdc: order.bountyUsdc,
        escrowTxHash: order.escrowTxHash,
        status: order.status,
      },
      { env }
    );
    items.push({
      orderId: record.orderId,
      parseMode: rendered.parseMode,
      text: rendered.text,
      canonicalUrl: rendered.canonicalUrl,
      rewardUsdc: rendered.rewardUsdc,
      escrowVerified: rendered.escrowVerified,
      queuedAt: record.queuedAt,
      attempts: record.attempts,
    });
  }

  const counts = queueCounts(claim.doc);
  return { items, pending: counts.pending, skipped: claim.exhausted.length };
}

export interface AckResult {
  action: 'sent' | 'failed' | 'skipped' | 'already-sent' | 'not-found';
  record: BroadcastRecord | null;
}

export async function ackBroadcast(
  input: AckInput,
  options: { env?: Record<string, string | undefined> } = {}
): Promise<AckResult> {
  void options;
  const nowMs = input.nowMs ?? Date.now();
  return withQueueLock(async () => {
    const doc = await readDoc();
    const result = ackIntoDoc(doc, { ...input, nowMs });
    if (result.action !== 'not-found') await writeDoc(result.doc);
    return { action: result.action, record: result.record };
  });
}

/** Secret-free status for /api/daemon/health. */
export async function getBroadcastStatus(
  env: Record<string, string | undefined> = process.env
): Promise<{ enabled: boolean; pending: number; sent: number; lastErrorKind: BroadcastErrorKind | null }> {
  const enabled = broadcastQueueEnabled(env);
  if (!enabled) return { enabled: false, pending: 0, sent: 0, lastErrorKind: null };
  const doc = await withQueueLock(readDoc);
  const counts = queueCounts(doc);
  return { enabled: true, pending: counts.pending, sent: counts.sent, lastErrorKind: lastErrorKind(doc) };
}

/** Test/ops helper: read the current document (no writes). */
export async function readBroadcastQueueDoc(): Promise<BroadcastQueueDoc> {
  return withQueueLock(readDoc);
}
