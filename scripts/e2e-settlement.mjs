#!/usr/bin/env node
// ---------------------------------------------------------------------------
// scripts/e2e-settlement.mjs
//
// AP2 escrow settlement end-to-end probe and opt-in driver for Web5.blog.
// Zero dependencies: node:crypto + global fetch only. Nothing is signed here.
//
// Endpoints used (verified against the routes in this tree):
//   GET  /api/commerce/tasks                           list + feature meta flags
//   POST /api/commerce/tasks                           { action: create | assign | submit | settle }
//   GET  /api/commerce/tasks?action=audit&orderId=...  admin audit projection (falls back to list)
//   POST /api/cron/settle                              x-cron-secret header; 404 = cron not deployed
//   GET  /api/daemon/health                            daemon.mode + voucherGateway stats
//   GET  /llms.txt                                     rewrite -> /api/market/llms
//   GET  /agent.json or /.well-known/agent.json        agent card
//
// Contract notes (read from src/app/api/commerce/tasks/route.ts):
//   * create requires a real, already-confirmed native-USDC escrow transfer
//     (escrowTxHash); this script never creates that transfer.
//   * submit persists deliverableHash + deliverableContent + provenance
//     ({ provider, hash, fallback }). Settlement refuses orders without a
//     permanent Arweave hash (E2E_ARWEAVE_HASH), so pass it in live mode.
//   * the order projection exposes feeTxHash, refundTxHash, blockNumbers,
//     acceptanceHash and deliverableArweaveHash; audits also return E1-E5.
//   * admin auth in src/lib/admin/guard.ts reads the cookie web5_admin_session
//     or the x-api-key header, so E2E_ADMIN_TOKEN is sent as x-api-key as well
//     as Authorization: Bearer.
//
// Modes:
//   default       --dry-run: read-only probes (GET only, cron probed with GET so
//                 a configured cron secret cannot trigger a settlement).
//   --live        drives create -> assign -> submit -> poll -> cron -> audit.
//
// Exit codes: 0 = every checked item PASS or SKIP (dry-run)
//             1 = at least one FAIL
//             2 = usage error / missing live environment
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';

const TOOL = 'e2e-settlement';
const VERSION = 1;
const RULE_WIDTH = 78;
const STARTED_AT = Date.now();

const TERMINAL_STATUSES = new Set(['VERIFIED', 'REJECTED', 'SETTLED', 'REFUNDED']);

const EVIDENCE_DEFS = [
  { id: 'E1', name: 'tx on chain + block' },
  { id: 'E2', name: 'fund flow matches' },
  { id: 'E3', name: 're-queryable by hash' },
  { id: 'E4', name: 'ledger conservation' },
  { id: 'E5', name: 'no state jump' },
];

const results = [];
const probes = {};
let liveOrder = null;
let liveOrderId = null;
let auditChecks = null;

// ---------------------------------------------------------------------------
// console helpers (ASCII only, no emojis)
// ---------------------------------------------------------------------------

function rule(char = '-') {
  console.log(char.repeat(RULE_WIDTH));
}

function section(title) {
  console.log('');
  console.log(`-- ${title} ${'-'.repeat(Math.max(0, RULE_WIDTH - title.length - 4))}`);
}

function pad(value, width) {
  const text = String(value ?? '');
  if (text.length > width) return `${text.slice(0, Math.max(0, width - 1))} `;
  return text.padEnd(width);
}

function trunc(value, max = 104) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function short(value, head = 10, tail = 6) {
  const text = String(value ?? '');
  if (!text) return '(empty)';
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function note(text) {
  console.log(`  note ${trunc(text, 112)}`);
}

function record(id, name, status, detail, extra) {
  const entry = { id, name, status, detail: String(detail ?? '') };
  if (extra !== undefined) entry.extra = extra;
  results.push(entry);
  console.log(`  ${pad(id, 4)} ${pad(status, 5)} ${pad(name, 26)} ${trunc(entry.detail)}`);
  return entry;
}

function banner(opts) {
  console.log('');
  rule('=');
  console.log('Web5.blog - AP2 escrow settlement E2E');
  rule('=');
  console.log(`mode     : ${opts.dryRun ? 'dry-run (read-only probes, no writes)' : 'live (drives escrow flow)'}`);
  console.log(`base url : ${opts.base}`);
  console.log(`started  : ${new Date(STARTED_AT).toISOString()}`);
  console.log('secrets  : no private keys are read, nothing is signed in this process');
  console.log('');
}

// ---------------------------------------------------------------------------
// http
// ---------------------------------------------------------------------------

async function http(base, method, path, options = {}) {
  const url = new URL(path, base);
  const headers = { accept: 'application/json, text/plain, */*', ...(options.headers || {}) };
  const init = {
    method,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
  };

  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  const started = Date.now();
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return {
      url: url.toString(),
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get('content-type') || '',
      text,
      json,
      ms: Date.now() - started,
    };
  } catch (err) {
    return {
      url: url.toString(),
      status: 0,
      ok: false,
      contentType: '',
      text: '',
      json: null,
      ms: Date.now() - started,
      error: err?.message || String(err),
    };
  }
}

function apiError(res) {
  if (res?.error) return res.error;
  const body = res?.json;
  if (body && typeof body.error === 'string') {
    return body.code ? `${body.error} [${body.code}]` : body.error;
  }
  if (res?.status === 0) return 'request failed (no HTTP status)';
  const tail = res?.text ? `: ${trunc(res.text, 100)}` : '';
  return `HTTP ${res?.status}${tail}`;
}

function postAuth(env) {
  const headers = {};
  if (env.sessionToken) headers.authorization = `Bearer ${env.sessionToken}`;
  if (env.adminToken) headers['x-api-key'] = env.adminToken;
  return headers;
}

function adminAuth(env) {
  const headers = {};
  if (env.adminToken) {
    headers.authorization = `Bearer ${env.adminToken}`;
    headers['x-api-key'] = env.adminToken;
  }
  return headers;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function intEnv(name, fallback) {
  const raw = process.env[name];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// ---------------------------------------------------------------------------
// field helpers
// ---------------------------------------------------------------------------

function isTxHash(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function parseBlocks(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function blockOf(blocks, key) {
  const value = blocks ? blocks[key] : undefined;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value) && Number(value) > 0) return Number(value);
  return null;
}

function fieldState(order, key) {
  const present = Boolean(order) && Object.prototype.hasOwnProperty.call(order, key);
  const value = present ? order[key] : undefined;
  const filled = present && value !== undefined && value !== null && value !== '';
  return { present, value, filled };
}

function missingReason(key, state) {
  if (!state.present) return `${key} absent from API projection`;
  if (!state.filled) return `${key}=${state.value === null ? 'null' : 'empty'}`;
  return `${key} present`;
}

// ---------------------------------------------------------------------------
// 1. discovery
// ---------------------------------------------------------------------------

async function checkDiscovery(opts) {
  section('1. discovery');

  const llms = await http(opts.base, 'GET', '/llms.txt', { timeoutMs: 15000 });
  probes.llmsTxt = {
    status: llms.status,
    contentType: llms.contentType,
    bytes: Buffer.byteLength(llms.text || '', 'utf8'),
  };
  if (!llms.ok) {
    record('1a', 'GET /llms.txt', 'FAIL', `${apiError(llms)} (rewrite target /api/market/llms)`);
  } else if (!/^#\s+/m.test(llms.text || '')) {
    record('1a', 'GET /llms.txt', 'FAIL', `HTTP ${llms.status} but body is not llms.txt markdown (${llms.contentType || 'no content-type'})`);
  } else {
    const urls = (llms.text.match(/https?:\/\/[^\s)]+/g) || []).length;
    record('1a', 'GET /llms.txt', 'PASS', `HTTP ${llms.status} ${llms.contentType} ${probes.llmsTxt.bytes}b ${urls} urls`);
  }

  const tried = [];
  let agent = null;
  for (const path of ['/agent.json', '/.well-known/agent.json']) {
    const res = await http(opts.base, 'GET', path, { timeoutMs: 15000 });
    tried.push({ path, status: res.status });
    if (res.ok && res.json && typeof res.json === 'object') {
      agent = { path, res };
      break;
    }
  }
  probes.agentJson = {
    foundAt: agent ? agent.path : null,
    tried,
    name: agent?.res?.json?.name ?? null,
  };
  if (agent) {
    record('1b', 'GET agent.json', 'PASS', `${agent.path} HTTP ${agent.res.status} name=${agent.res.json?.name ?? 'n/a'}`);
  } else {
    record('1b', 'GET agent.json', 'FAIL', `no parseable JSON (${tried.map((t) => `${t.path}:${t.status}`).join(', ')})`);
  }
}

// ---------------------------------------------------------------------------
// 2. tasks meta
// ---------------------------------------------------------------------------

async function checkTasksMeta(opts) {
  section('2. commerce tasks meta');

  const res = await http(opts.base, 'GET', '/api/commerce/tasks', { timeoutMs: 20000 });
  const body = res.json;
  const orderCount = Array.isArray(body?.orders) ? body.orders.length : null;
  probes.tasksMeta = body
    ? {
        httpStatus: res.status,
        count: typeof body.count === 'number' ? body.count : orderCount,
        ordersInPayload: orderCount,
        moneyFlowsEnabled: body.moneyFlowsEnabled,
        escrowPayoutsEnabled: body.escrowPayoutsEnabled,
      }
    : { httpStatus: res.status };

  if (!res.ok || !body) {
    record('2', 'tasks GET meta', 'FAIL', apiError(res));
    return;
  }

  const missing = [];
  if (typeof body.moneyFlowsEnabled !== 'boolean') missing.push('moneyFlowsEnabled');
  if (typeof body.escrowPayoutsEnabled !== 'boolean') missing.push('escrowPayoutsEnabled');

  if (missing.length) {
    record('2', 'tasks GET meta', 'FAIL', `flags missing or not boolean: ${missing.join(', ')}`);
    return;
  }

  record(
    '2',
    'tasks GET meta',
    'PASS',
    `orders=${body.count ?? orderCount ?? '?'} moneyFlowsEnabled=${body.moneyFlowsEnabled} escrowPayoutsEnabled=${body.escrowPayoutsEnabled}`
  );

  if (!body.moneyFlowsEnabled) {
    note('moneyFlowsEnabled=false: POST /api/commerce/tasks returns 503 until the flag is enabled');
  } else if (!body.escrowPayoutsEnabled) {
    note('ESCROW_PAYOUTS_ENABLED=false: create/assign/submit work, settlement payouts are blocked');
  }
}

// ---------------------------------------------------------------------------
// 3. daemon health
// ---------------------------------------------------------------------------

async function checkDaemonHealth(opts) {
  section('3. daemon health');

  const res = await http(opts.base, 'GET', '/api/daemon/health', { timeoutMs: 20000 });
  const body = res.json;
  const daemon = body?.daemon;
  const vouchers = body?.voucherGateway;
  probes.daemonHealth = body
    ? {
        httpStatus: res.status,
        status: body.status,
        database: body.checks?.database,
        mode: daemon?.mode,
        daemonEnabled: daemon?.enabled,
        vouchers: vouchers ?? null,
      }
    : { httpStatus: res.status };

  if (!body) {
    record('3', 'daemon health', 'FAIL', apiError(res));
    return;
  }
  if (daemon?.mode !== 'ACTIVE' && daemon?.mode !== 'DISABLED') {
    record('3', 'daemon health', 'FAIL', `daemon.mode=${daemon?.mode ?? 'missing'} (expected ACTIVE or DISABLED)`);
    return;
  }

  record(
    '3',
    'daemon health',
    'PASS',
    `mode=${daemon.mode} http=${res.status} db=${body.checks?.database ?? '?'} vouchers total=${vouchers?.totalVouchersAccepted ?? '?'} today=${vouchers?.acceptedToday ?? '?'}`
  );
  note(`voucherGateway: ${trunc(JSON.stringify(vouchers ?? {}), 100)}`);
}

// ---------------------------------------------------------------------------
// 4. cron route probe (dry-run only, GET so nothing executes)
// ---------------------------------------------------------------------------

async function probeCron(opts) {
  section('4. cron route');

  const res = await http(opts.base, 'GET', '/api/cron/settle', { timeoutMs: 10000 });
  probes.cronProbe = { method: 'GET', status: res.status };

  if (res.status === 404) {
    record('4', 'cron route', 'FAIL', 'cron not deployed: GET /api/cron/settle -> 404');
  } else if (res.status === 405) {
    record('4', 'cron route', 'PASS', 'exists, POST-only (GET -> 405)');
  } else if (res.status === 401 || res.status === 403) {
    record('4', 'cron route', 'PASS', `exists but locked (GET -> ${res.status})`);
  } else if (res.status === 503) {
    record('4', 'cron route', 'PASS', `exists but gated (GET -> 503 ${trunc(res.json?.code ?? '', 40)})`);
  } else if (res.ok) {
    record('4', 'cron route', 'PASS', `exists (GET -> ${res.status})`);
  } else {
    record('4', 'cron route', 'FAIL', apiError(res));
  }

  note('dry-run probes cron with GET so a configured SETTLEMENT_CRON_SECRET cannot trigger settlement');
}

// ---------------------------------------------------------------------------
// task endpoints
// ---------------------------------------------------------------------------

function postTask(opts, payload, env) {
  return http(opts.base, 'POST', '/api/commerce/tasks', {
    headers: postAuth(env),
    body: payload,
    timeoutMs: 60000,
  });
}

async function fetchOrder(opts, orderId) {
  const res = await http(opts.base, 'GET', '/api/commerce/tasks', { timeoutMs: 20000 });
  if (!res.ok || !res.json) return { order: null, error: apiError(res) };
  const found = extractOrder(res.json, orderId);
  return { order: found, error: found ? null : `order ${orderId} not present in GET /api/commerce/tasks` };
}

function extractOrder(payload, orderId) {
  if (!payload || !orderId) return null;
  if (Array.isArray(payload)) {
    return payload.find((entry) => entry && entry.orderId === orderId) || null;
  }
  if (payload.order && payload.order.orderId === orderId) return payload.order;
  if (Array.isArray(payload.orders)) {
    return payload.orders.find((entry) => entry && entry.orderId === orderId) || null;
  }
  if (payload.data) return extractOrder(payload.data, orderId);
  return null;
}

async function fetchAudit(opts, orderId, env) {
  const path = `/api/commerce/tasks?action=audit&orderId=${encodeURIComponent(orderId)}`;
  const res = await http(opts.base, 'GET', path, { headers: adminAuth(env), timeoutMs: 20000 });
  probes.audit = { httpStatus: res.status, hasOrder: Boolean(res.json?.order) };

  if (Array.isArray(res.json?.checks)) auditChecks = res.json.checks;
  const direct = res.json && typeof res.json === 'object' && !Array.isArray(res.json) ? res.json.order : null;
  if (direct && direct.orderId === orderId) {
    return { order: direct, dedicatedAction: true, auditStatus: res.status };
  }

  const fromBody = extractOrder(res.json, orderId);
  if (fromBody) {
    return { order: fromBody, dedicatedAction: false, auditStatus: res.status };
  }

  const fallback = await fetchOrder(opts, orderId);
  if (fallback.order) {
    return { order: fallback.order, dedicatedAction: false, auditStatus: res.status };
  }

  return { order: null, dedicatedAction: false, auditStatus: res.status, error: fallback.error || apiError(res) };
}

// ---------------------------------------------------------------------------
// deliverable
// ---------------------------------------------------------------------------

function buildDeliverable(orderId, env) {
  const content = [
    '# AP2 settlement E2E deliverable',
    '',
    `- orderId: ${orderId}`,
    `- generatedAt: ${new Date().toISOString()}`,
    `- acceptanceHash: ${env.acceptanceHash}`,
    '- expectation: Circle Arc native-USDC escrow, 80/20 agent/protocol split',
    '',
    'This document is generated by scripts/e2e-settlement.mjs. It carries no',
    'payment value and moves no funds. It exists so the order can move from',
    'SUBMITTED to VERIFIED under an acceptanceHash equality gate.',
  ].join('\n');

  const computedHash = `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
  const deliverableHash = env.acceptanceHash || computedHash;
  return { deliverableContent: content, deliverableHash, computedHash };
}

// ---------------------------------------------------------------------------
// live flow
// ---------------------------------------------------------------------------

async function runLive(opts, env) {
  section('live settlement flow');
  try {
    await driveFlow(opts, env);
  } catch (err) {
    record('F0', 'flow driver', 'FAIL', `unexpected error: ${err?.message || err}`);
  }
  finishEvidence();
}

async function driveFlow(opts, env) {
  let orderId = env.orderId;
  let order = null;

  if (orderId) {
    const found = await fetchOrder(opts, orderId);
    if (found.order) {
      order = found.order;
      liveOrder = order;
      record('F1', 'reuse order', 'PASS', `${orderId} status=${order.status}`);
    } else if (!env.escrowTxHash) {
      record('F1', 'reuse order', 'FAIL', `order ${orderId} not found and E2E_ESCROW_TX_HASH is unset, cannot create it`);
      return;
    } else {
      note(`order ${orderId} not found; creating it with the provided escrow hash`);
    }
  }

  if (!order) {
    const payload = {
      action: 'create',
      title: env.title,
      description: env.description,
      bountyUsdc: env.bountyUsdc,
      escrowTxHash: env.escrowTxHash,
      ...(orderId ? { orderId } : {}),
    };
    const res = await postTask(opts, payload, env);
    if (!res.ok) {
      record('F1', 'create', 'FAIL', apiError(res));
      return;
    }
    order = res.json?.order ?? null;
    orderId = order?.orderId || orderId;
    liveOrder = order;
    liveOrderId = orderId;
    record(
      'F1',
      'create',
      'PASS',
      `orderId=${orderId ?? '?'} status=${order?.status ?? '?'} bounty=${env.bountyUsdc} USDC escrow=${short(env.escrowTxHash)}`
    );
    if (!orderId) {
      record('F1', 'create', 'FAIL', 'create returned no orderId');
      return;
    }
  }

  liveOrderId = orderId;

  const refreshed = await fetchOrder(opts, orderId);
  if (refreshed.order) {
    order = refreshed.order;
    liveOrder = order;
  }

  // assign
  if (order?.status === 'FUNDED') {
    const payload = { action: 'assign', orderId, ...(env.agentDid ? { agentDid: env.agentDid } : {}) };
    const res = await postTask(opts, payload, env);
    if (!res.ok) {
      record('F2', 'assign', 'FAIL', apiError(res));
    } else {
      order = res.json?.order ?? order;
      liveOrder = order;
      record('F2', 'assign', 'PASS', `status=${order?.status} agent=${short(order?.assignedAgentDid ?? '(session vessel)')}`);
    }
  } else {
    record('F2', 'assign', 'SKIP', `status=${order?.status ?? 'unknown'} (assign requires FUNDED)`);
  }

  // submit
  const deliverable = buildDeliverable(orderId, env);
  if (order?.status === 'ASSIGNED') {
    const payload = {
      action: 'submit',
      orderId,
      deliverableHash: deliverable.deliverableHash,
      deliverableContent: deliverable.deliverableContent,
      ...(env.arweaveHash
        ? { provenance: { provider: 'arweave', hash: env.arweaveHash, fallback: false } }
        : {}),
      acceptanceHash: env.acceptanceHash,
    };
    const res = await postTask(opts, payload, env);
    if (!res.ok) {
      record('F3', 'submit', 'FAIL', apiError(res));
    } else {
      order = res.json?.order ?? order;
      liveOrder = order;
      record(
        'F3',
        'submit',
        'PASS',
        `status=${order?.status} deliverableHash=${short(deliverable.deliverableHash)} payoutExecuted=${res.json?.payoutExecuted}`
      );
      if (deliverable.deliverableHash !== deliverable.computedHash) {
        note(`deliverableHash mirrors E2E_ACCEPTANCE_HASH; computed content hash is ${deliverable.computedHash}`);
      }
      if (!env.arweaveHash) {
        note('E2E_ARWEAVE_HASH unset: submit has no permanent provenance, cron settlement will refuse (PROVENANCE_NOT_PERMANENT)');
      }
    }
  } else if (order && ['SUBMITTED', 'VERIFIED', 'SETTLED'].includes(order.status)) {
    record('F3', 'submit', 'SKIP', `already ${order.status}; reuse mode`);
  } else {
    record('F3', 'submit', 'FAIL', `cannot submit from status=${order?.status ?? 'unknown'}`);
  }

  // verdict poll
  let polled = order;
  if (!polled) {
    record('F4', 'verdict poll', 'FAIL', 'no order snapshot to poll');
  } else if (TERMINAL_STATUSES.has(polled.status)) {
    record('F4', 'verdict poll', 'PASS', `${polled.status} (pre-existing)`);
  } else if (polled.status !== 'SUBMITTED') {
    record('F4', 'verdict poll', 'FAIL', `status=${polled.status} is not awaiting verification (submit must reach SUBMITTED first)`);
  } else {
    const timeoutMs = intEnv('E2E_POLL_TIMEOUT_MS', 90000);
    const intervalMs = intEnv('E2E_POLL_INTERVAL_MS', 3000);
    const deadline = Date.now() + timeoutMs;
    let last = polled.status;
    let polls = 0;

    while (Date.now() < deadline) {
      await sleep(intervalMs);
      polls += 1;
      const res = await fetchOrder(opts, orderId);
      if (!res.order) continue;
      polled = res.order;
      liveOrder = polled;
      if (polled.status !== last) {
        console.log(`  wait ${pad('status', 10)} ${last} -> ${polled.status} (poll ${polls})`);
        last = polled.status;
      }
      if (TERMINAL_STATUSES.has(polled.status)) break;
    }

    if (!TERMINAL_STATUSES.has(polled.status)) {
      record('F4', 'verdict poll', 'FAIL', `timeout after ${timeoutMs}ms; last status=${polled.status}`);
    } else if (polled.status === 'REJECTED') {
      record('F4', 'verdict poll', 'FAIL', `REJECTED after ${polls} poll(s)`);
    } else {
      record('F4', 'verdict poll', 'PASS', `${polled.status} after ${polls} poll(s)`);
    }
  }

  // cron settle
  if (!env.cronSecret) {
    record('F5', 'cron settle', 'FAIL', 'SETTLEMENT_CRON_SECRET (or E2E_CRON_SECRET) is unset; POST would be rejected');
  } else {
    const res = await http(opts.base, 'POST', '/api/cron/settle', {
      headers: { 'x-cron-secret': env.cronSecret },
      body: {},
      timeoutMs: 60000,
    });
    probes.cronSettle = { status: res.status, body: res.json ?? null };

    if (res.status === 404) {
      record('F5', 'cron settle', 'FAIL', 'cron not deployed: POST /api/cron/settle -> 404');
    } else if (res.status === 401 || res.status === 403) {
      record('F5', 'cron settle', 'FAIL', `cron exists but locked (${res.status}); check SETTLEMENT_CRON_SECRET`);
    } else if (!res.ok) {
      record('F5', 'cron settle', 'FAIL', apiError(res));
    } else {
      record('F5', 'cron settle', 'PASS', `HTTP ${res.status} ${trunc(JSON.stringify(res.json ?? {}), 80)}`);
    }
  }

  // audit
  const audit = await fetchAudit(opts, orderId, env);
  if (!audit.order) {
    record('F6', 'audit GET', 'FAIL', audit.error || 'order not found in audit or list response');
  } else {
    liveOrder = audit.order;
    liveOrderId = orderId;
    if (audit.dedicatedAction) {
      record('F6', 'audit GET', 'PASS', `action=audit status=${audit.order.status}`);
    } else {
      record(
        'F6',
        'audit GET',
        'FAIL',
        `action=audit not implemented (HTTP ${audit.auditStatus}); fell back to list projection status=${audit.order.status}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// evidence E1-E5
// ---------------------------------------------------------------------------

function buildEvidence(order) {
  const rows = [];
  const push = (id, name, status, detail) => rows.push({ id, name, status, detail });

  if (!order) {
    for (const def of EVIDENCE_DEFS) {
      push(def.id, def.name, 'FAIL', 'no order snapshot (flow aborted before an order could be read)');
    }
    return rows;
  }

  const status = typeof order.status === 'string' ? order.status : 'unknown';
  const escrow = fieldState(order, 'escrowTxHash');
  const payout = fieldState(order, 'payoutTxHash');
  const fee = fieldState(order, 'feeTxHash');
  const refund = fieldState(order, 'refundTxHash');
  const blocks = parseBlocks(order.blockNumbers);
  const escrowBlock = blockOf(blocks, 'escrow');

  // E1: escrow tx hash + block number recorded
  if (!isTxHash(escrow.value)) {
    push('E1', 'escrow tx recorded', 'FAIL', `${missingReason('escrowTxHash', escrow)} (expected 0x + 64 hex)`);
  } else if (!escrowBlock) {
    push(
      'E1',
      'escrow tx recorded',
      'FAIL',
      `escrowTxHash=${short(escrow.value)} but blockNumbers.escrow is ${blocks ? 'missing' : 'not recorded'}`
    );
  } else {
    push('E1', 'escrow tx recorded', 'PASS', `escrow=${short(escrow.value)} block=${escrowBlock} status=${status}`);
  }

  // E2: payout (or refund) tx recorded
  if (status === 'REFUNDED') {
    if (isTxHash(refund.value)) {
      push('E2', 'payout/refund recorded', 'PASS', `refund=${short(refund.value)}`);
    } else {
      push('E2', 'payout/refund recorded', 'FAIL', `${missingReason('refundTxHash', refund)} while status=REFUNDED`);
    }
  } else if (status === 'SETTLED') {
    if (isTxHash(payout.value)) {
      push('E2', 'payout/refund recorded', 'PASS', `payout=${short(payout.value)}`);
    } else {
      push('E2', 'payout/refund recorded', 'FAIL', `${missingReason('payoutTxHash', payout)} while status=SETTLED`);
    }
  } else if (isTxHash(payout.value)) {
    push('E2', 'payout/refund recorded', 'PASS', `payout=${short(payout.value)} status=${status}`);
  } else {
    push('E2', 'payout/refund recorded', 'FAIL', `status=${status}; no settlement transfer recorded (${missingReason('payoutTxHash', payout)})`);
  }

  // E3: protocol fee tx recorded
  if (isTxHash(fee.value)) {
    push('E3', 'fee tx recorded', 'PASS', `fee=${short(fee.value)}`);
  } else {
    push(
      'E3',
      'fee tx recorded',
      'FAIL',
      `${missingReason('feeTxHash', fee)} (design allows RETAINED when PLATFORM_FEE_ADDRESS is unset, but E3 requires a hash)`
    );
  }

  // E4: block numbers recorded for each transfer
  if (!blocks) {
    push(
      'E4',
      'block numbers recorded',
      'FAIL',
      order.blockNumbers === undefined
        ? 'blockNumbers absent from API projection'
        : `blockNumbers not parseable JSON (${trunc(JSON.stringify(order.blockNumbers), 60)})`
    );
  } else {
    const required = { escrow: true, payout: status === 'SETTLED', fee: isTxHash(fee.value) };
    const missing = Object.entries(required)
      .filter(([key, needed]) => needed && !blockOf(blocks, key))
      .map(([key]) => key);
    if (missing.length) {
      push('E4', 'block numbers recorded', 'FAIL', `blockNumbers missing: ${missing.join(', ')} (got ${trunc(JSON.stringify(blocks), 70)})`);
    } else {
      const payoutBlock = blockOf(blocks, 'payout');
      push(
        'E4',
        'block numbers recorded',
        'PASS',
        `escrow=${escrowBlock} payout=${payoutBlock ?? 'n/a'} fee=${blockOf(blocks, 'fee') ?? 'n/a'}`
      );
    }
  }

  // E5: state machine consistency
  if (status === 'SETTLED') {
    if (isTxHash(payout.value) && order.settledAt) {
      push('E5', 'state machine consistent', 'PASS', `SETTLED + payoutTxHash + settledAt=${new Date(order.settledAt).toISOString()}`);
    } else {
      const gap = !isTxHash(payout.value) ? 'payoutTxHash' : 'settledAt';
      push('E5', 'state machine consistent', 'FAIL', `SETTLED without ${gap}`);
    }
  } else if (status === 'REFUNDED') {
    if (isTxHash(refund.value)) {
      push('E5', 'state machine consistent', 'PASS', 'REFUNDED + refundTxHash');
    } else {
      push('E5', 'state machine consistent', 'FAIL', `REFUNDED without refundTxHash (${missingReason('refundTxHash', refund)})`);
    }
  } else if (status === 'REJECTED') {
    push('E5', 'state machine consistent', 'FAIL', 'verdict REJECTED; order cannot settle');
  } else {
    push('E5', 'state machine consistent', 'FAIL', `status=${status} is not a settled/refunded terminal state`);
  }

  return rows;
}

function finishEvidence() {
  section('evidence E1-E5');
  if (Array.isArray(auditChecks) && auditChecks.length) {
    const names = Object.fromEntries(EVIDENCE_DEFS.map((d) => [d.id, d.name]));
    for (const check of auditChecks) {
      const status = check.skipped ? 'SKIP' : check.pass ? 'PASS' : 'FAIL';
      record(check.id, names[check.id] || 'evidence', status, check.detail);
    }
    return;
  }
  const rows = buildEvidence(liveOrder);
  for (const row of rows) record(row.id, row.name, row.status, row.detail);
}

function skipEvidence(reason) {
  section('evidence E1-E5');
  for (const def of EVIDENCE_DEFS) record(def.id, def.name, 'SKIP', reason);
}

// ---------------------------------------------------------------------------
// dry-run extras
// ---------------------------------------------------------------------------

function printPreconditions(env) {
  section('preconditions (informational, not scored)');
  const rows = [
    ['E2E_SESSION_TOKEN', env.sessionToken ? 'set' : 'unset'],
    ['E2E_ADMIN_TOKEN', env.adminToken ? 'set' : 'unset'],
    ['E2E_ORDER_ID', env.orderId || 'unset (a new order would be created)'],
    ['E2E_ESCROW_TX_HASH', env.escrowTxHash ? short(env.escrowTxHash) : 'unset (create step impossible)'],
    ['E2E_ACCEPTANCE_HASH', env.acceptanceHash || 'unset'],
    ['E2E_ARWEAVE_HASH', env.arweaveHash || 'unset'],
    ['SETTLEMENT_CRON_SECRET', env.cronSecret ? 'set' : 'unset (cron POST impossible)'],
  ];
  for (const [key, value] of rows) console.log(`  info ${pad(key, 24)} ${trunc(value, 90)}`);
}

function skipLiveFlow(env) {
  section('live plan (skipped: dry-run)');
  record('F1', 'create / reuse', 'SKIP', env.escrowTxHash ? 'would POST action=create with E2E_ESCROW_TX_HASH' : 'no E2E_ESCROW_TX_HASH; would reuse E2E_ORDER_ID');
  record('F2', 'assign', 'SKIP', 'would POST action=assign {orderId, agentDid?}');
  record('F3', 'submit', 'SKIP', 'would POST action=submit {orderId, deliverableHash, deliverableContent}');
  record('F4', 'verdict poll', 'SKIP', 'would poll GET /api/commerce/tasks until VERIFIED/REJECTED');
  record('F5', 'cron settle', 'SKIP', 'would POST /api/cron/settle with x-cron-secret');
  record('F6', 'audit GET', 'SKIP', 'would GET /api/commerce/tasks?action=audit&orderId=...');
}

// ---------------------------------------------------------------------------
// summary / report
// ---------------------------------------------------------------------------

function summarize() {
  const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
  for (const entry of results) counts[entry.status] = (counts[entry.status] || 0) + 1;

  const meta = probes.tasksMeta;
  const liveReady = Boolean(meta?.moneyFlowsEnabled && meta?.escrowPayoutsEnabled);
  const verdict = counts.FAIL === 0 ? 'PASS' : 'FAIL';

  return {
    counts,
    verdict,
    exitCode: counts.FAIL === 0 ? 0 : 1,
    liveReady,
    liveGates: meta
      ? { moneyFlowsEnabled: meta.moneyFlowsEnabled, escrowPayoutsEnabled: meta.escrowPayoutsEnabled }
      : null,
  };
}

function printSummary(opts, summary) {
  section('summary');
  const cronState =
    probes.cronSettle != null
      ? `POST -> HTTP ${probes.cronSettle.status}`
      : probes.cronProbe != null
        ? probes.cronProbe.status === 404
          ? 'not deployed (404)'
          : `present (GET -> ${probes.cronProbe.status})`
        : 'not probed';

  const rows = [
    ['mode', opts.dryRun ? 'dry-run (no mutations)' : 'live'],
    ['base url', opts.base],
    ['checks', `PASS ${summary.counts.PASS} | FAIL ${summary.counts.FAIL} | SKIP ${summary.counts.SKIP}`],
    [
      'money flows',
      summary.liveGates
        ? `moneyFlowsEnabled=${summary.liveGates.moneyFlowsEnabled} escrowPayoutsEnabled=${summary.liveGates.escrowPayoutsEnabled}`
        : 'unavailable',
    ],
    ['cron route', cronState],
    ['live readiness', opts.dryRun ? (summary.liveReady ? 'READY for --live' : 'BLOCKED: money-flow flags are off') : 'n/a (live run)'],
    ['verdict', summary.verdict],
    ['exit code', String(summary.exitCode)],
  ];

  for (const [key, value] of rows) console.log(`  ${pad(key, 16)} ${value}`);

  if (summary.counts.FAIL > 0) {
    console.log('');
    console.log('  failing items:');
    for (const entry of results.filter((item) => item.status === 'FAIL')) {
      console.log(`    ${pad(entry.id, 4)} ${pad(entry.name, 26)} ${trunc(entry.detail, 88)}`);
    }
  }

  if (opts.dryRun) {
    console.log('');
    console.log('  next: node scripts/e2e-settlement.mjs --live --base <url>');
    console.log('        requires E2E_SESSION_TOKEN, E2E_ADMIN_TOKEN, E2E_ACCEPTANCE_HASH, E2E_ARWEAVE_HASH,');
    console.log('        E2E_ORDER_ID or E2E_ESCROW_TX_HASH, and SETTLEMENT_CRON_SECRET for cron.');
  }

  console.log('');
  rule('=');
}

function snapshotOrder(order) {
  const keys = [
    'orderId',
    'status',
    'bountyUsdc',
    'escrowTxHash',
    'payoutTxHash',
    'feeTxHash',
    'refundTxHash',
    'blockNumbers',
    'deliverableHash',
    'acceptanceHash',
    'deliverableArweaveHash',
    'assignedAgentDid',
    'settledAt',
  ];
  const snapshot = {};
  for (const key of keys) {
    if (order && Object.prototype.hasOwnProperty.call(order, key)) snapshot[key] = order[key];
  }
  return snapshot;
}

async function writeReport(file, opts, env, summary) {
  const outPath = resolvePath(process.cwd(), file);
  const report = {
    tool: TOOL,
    version: VERSION,
    mode: opts.dryRun ? 'dry-run' : 'live',
    base: opts.base,
    startedAt: new Date(STARTED_AT).toISOString(),
    finishedAt: new Date().toISOString(),
    environment: {
      E2E_SESSION_TOKEN: env.sessionToken ? 'set' : 'unset',
      E2E_ADMIN_TOKEN: env.adminToken ? 'set' : 'unset',
      E2E_ORDER_ID: env.orderId || null,
      E2E_ESCROW_TX_HASH: env.escrowTxHash || null,
      E2E_ACCEPTANCE_HASH: env.acceptanceHash || null,
      E2E_ARWEAVE_HASH: env.arweaveHash || null,
      SETTLEMENT_CRON_SECRET: env.cronSecret ? 'set' : 'unset',
    },
    probes,
    orderId: liveOrderId,
    order: liveOrder ? snapshotOrder(liveOrder) : null,
    checks: results,
    summary: {
      pass: summary.counts.PASS,
      fail: summary.counts.FAIL,
      skip: summary.counts.SKIP,
      verdict: summary.verdict,
      exitCode: summary.exitCode,
      liveReady: summary.liveReady,
    },
  };

  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`  json report written: ${outPath}`);
}

// ---------------------------------------------------------------------------
// cli
// ---------------------------------------------------------------------------

function printHelp() {
  console.log('');
  console.log('Usage: node scripts/e2e-settlement.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --base <url>     target origin (default http://127.0.0.1:3000)');
  console.log('  --dry-run        read-only probes (default)');
  console.log('  --live           drive create/assign/submit/poll/cron/audit');
  console.log('  --json <file>    write the full report as JSON');
  console.log('  --help           show this help');
  console.log('');
  console.log('Environment:');
  console.log('  E2E_SESSION_TOKEN      vessel session bearer (creator)');
  console.log('  E2E_ADMIN_TOKEN        admin bearer / api key (sent as Bearer + x-api-key)');
  console.log('  E2E_ORDER_ID           reuse an existing AP2 orderId');
  console.log('  E2E_ESCROW_TX_HASH     already-confirmed escrow transfer; enables create');
  console.log('  E2E_ACCEPTANCE_HASH    acceptance gate hash (also used as deliverableHash)');
  console.log('  E2E_ARWEAVE_HASH       permanent 43-char Arweave tx id for the deliverable');
  console.log('  E2E_AGENT_DID          optional agentDid for assign (defaults to session vessel)');
  console.log('  E2E_BOUNTY_USDC        bounty for create (default 1)');
  console.log('  SETTLEMENT_CRON_SECRET cron secret (fallback E2E_CRON_SECRET)');
  console.log('  E2E_POLL_TIMEOUT_MS    verdict poll timeout (default 90000)');
  console.log('  E2E_POLL_INTERVAL_MS   verdict poll interval (default 3000)');
  console.log('');
  console.log('Exit codes: 0 all checks PASS/SKIP, 1 any FAIL, 2 usage or missing env');
  console.log('');
}

function parseArgs(argv) {
  const opts = { base: 'http://127.0.0.1:3000', dryRun: true, json: null, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--live' || arg === '--no-dry-run') {
      opts.dryRun = false;
    } else if (arg === '--base') {
      opts.base = argv[i + 1] ?? '';
      i += 1;
    } else if (arg.startsWith('--base=')) {
      opts.base = arg.slice('--base='.length);
    } else if (arg === '--json') {
      opts.json = argv[i + 1] ?? '';
      i += 1;
    } else if (arg.startsWith('--json=')) {
      opts.json = arg.slice('--json='.length);
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else {
      console.error(`unknown argument: ${arg}`);
      printHelp();
      process.exit(2);
    }
  }

  opts.base = String(opts.base || '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(opts.base)) {
    console.error(`invalid --base (need http:// or https://): ${opts.base || '(empty)'}`);
    process.exit(2);
  }
  if (opts.json !== null && !opts.json) {
    console.error('--json requires a file path');
    process.exit(2);
  }
  return opts;
}

function readEnv() {
  return {
    sessionToken: (process.env.E2E_SESSION_TOKEN || '').trim(),
    adminToken: (process.env.E2E_ADMIN_TOKEN || '').trim(),
    orderId: (process.env.E2E_ORDER_ID || '').trim(),
    escrowTxHash: (process.env.E2E_ESCROW_TX_HASH || '').trim(),
    acceptanceHash: (process.env.E2E_ACCEPTANCE_HASH || '').trim(),
    arweaveHash: (process.env.E2E_ARWEAVE_HASH || '').trim(),
    agentDid: (process.env.E2E_AGENT_DID || '').trim(),
    bountyUsdc: (process.env.E2E_BOUNTY_USDC || '1').trim(),
    cronSecret: (process.env.SETTLEMENT_CRON_SECRET || process.env.E2E_CRON_SECRET || '').trim(),
    title: (process.env.E2E_TITLE || 'E2E settlement probe task').trim(),
    description: (
      process.env.E2E_DESCRIPTION ||
      'Automated AP2 escrow settlement check. Delivery is a generated report; dry-run moves no funds.'
    ).trim(),
  };
}

function livePreconditions(env) {
  const missing = [];
  if (!env.sessionToken) missing.push('E2E_SESSION_TOKEN');
  if (!env.adminToken) missing.push('E2E_ADMIN_TOKEN');
  if (!env.acceptanceHash) missing.push('E2E_ACCEPTANCE_HASH');
  if (!env.arweaveHash) missing.push('E2E_ARWEAVE_HASH (needed for settlement)');
  if (env.arweaveHash && !/^[A-Za-z0-9_-]{43}$/.test(env.arweaveHash)) missing.push('E2E_ARWEAVE_HASH (expected 43-char Arweave tx id)');
  if (!env.orderId && !env.escrowTxHash) missing.push('E2E_ORDER_ID or E2E_ESCROW_TX_HASH');
  if (env.acceptanceHash && env.acceptanceHash.length > 512) missing.push('E2E_ACCEPTANCE_HASH (max 512 chars)');
  if (!/^(0|[1-9]\d{0,5})(\.\d{1,18})?$/.test(env.bountyUsdc)) missing.push('E2E_BOUNTY_USDC (invalid amount)');
  if (env.title.length < 4 || env.title.length > 160) missing.push('E2E_TITLE (4-160 chars)');
  if (env.escrowTxHash && !isTxHash(env.escrowTxHash)) missing.push('E2E_ESCROW_TX_HASH (expected 0x + 64 hex)');
  if (env.orderId && env.orderId.length > 200) missing.push('E2E_ORDER_ID (max 200 chars)');
  return missing;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const env = readEnv();
  banner(opts);

  await checkDiscovery(opts);
  await checkTasksMeta(opts);
  await checkDaemonHealth(opts);

  if (opts.dryRun) {
    await probeCron(opts);
    printPreconditions(env);
    skipLiveFlow(env);
    skipEvidence('dry-run: evidence rows require a live settlement');
  } else {
    section('live preconditions');
    const missing = livePreconditions(env);
    if (missing.length) {
      for (const item of missing) console.log(`  missing ${item}`);
      console.log('');
      console.log('  live mode refuses to run without the full set; nothing was sent.');
      printHelp();
      process.exitCode = 2;
      return;
    }
    for (const line of ['session token', 'admin token', 'acceptance hash', 'arweave hash', 'cron secret'].map((label, index) => {
      const set = [env.sessionToken, env.adminToken, env.acceptanceHash, env.arweaveHash, env.cronSecret][index];
      return `${pad(label, 18)} ${set ? 'set' : 'unset'}`;
    })) {
      console.log(`  ${line}`);
    }
    await runLive(opts, env);
  }

  const summary = summarize();
  printSummary(opts, summary);

  if (opts.json) {
    await writeReport(opts.json, opts, env, summary);
  }

  // Set exitCode instead of process.exit(): calling exit while undici sockets are
  // closing trips a libuv assertion on Windows and corrupts the exit status.
  process.exitCode = summary.exitCode;
}

main().catch((err) => {
  console.error('');
  console.error(`fatal: ${err?.stack || err?.message || err}`);
  process.exitCode = 2;
});
