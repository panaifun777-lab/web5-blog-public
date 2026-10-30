// Authorization (IDOR / privilege-escalation) negative tests for the commerce
// task API (src/app/api/commerce/tasks/route.ts).
//
// These guard both directions of broken access control:
//   - vertical escalation: an anonymous caller must not reach admin-only
//     surfaces (the audit evidence dump) even when it knows a valid orderId;
//   - horizontal escalation: a valid Vessel session belonging to a *different*
//     principal must not settle an order it does not orchestrate, nor submit a
//     deliverable for an order assigned to another vessel.
//
// Every request is unauthenticated (no cookie, no `authorization` header, no
// `x-api-key`) and no `ADMIN_API_KEY` is present in the environment, so the
// only thing under test is the route's own ownership checks.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeDb } from './helpers/fake-db';

vi.mock('@/lib/db', async () => {
  const { fakeDb: db } = await import('./helpers/fake-db');
  return { db: db.db };
});

vi.mock('@/lib/launch/flags', () => ({
  MONEY_FLOWS_ENABLED: true,
  ESCROW_PAYOUTS_ENABLED: true,
  REFUNDS_ENABLED: true,
  moneyFlowBlocked: () => new Response(null, { status: 503 }),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  clientIp: () => '127.0.0.1',
  rateLimit: () => ({ ok: true, retryAfter: 0 }),
}));

// Mutable session holder: each test decides who (if anyone) the bearer token
// resolves to. The mock factory only closes over the binding, so it is read at
// call time, after `currentSession` has been initialized.
let currentSession: any = null;

vi.mock('@/lib/web5/token-issuer', () => ({
  resolveVesselSessionFromToken: vi.fn(async () => currentSession),
}));

import { GET, POST } from '@/app/api/commerce/tasks/route';

const BASE = 'http://localhost/api/commerce/tasks';

function getRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  fakeDb.reset();
  currentSession = null;
  // Defensive: an accidental admin key would make authorizeAdmin() pass and
  // silently turn every negative test into a positive one.
  delete process.env.ADMIN_API_KEY;
});

describe('commerce task API authorization', () => {
  it('rejects an anonymous audit and leaks no check evidence', async () => {
    fakeDb.seedOrder({ orderId: 'ap2-task-authz-1', creatorDid: 'did:prime:0xcreator' });

    const res = await GET(
      getRequest(`${BASE}?action=audit&orderId=ap2-task-authz-1`)
    );

    expect(res.status).toBe(403);
    const text = await res.text();
    // The audit projection includes per-check evidence; a blocked caller must
    // not receive any of it, not even as an empty array.
    expect(text).not.toContain('checks');
    const body = JSON.parse(text);
    expect(body).not.toHaveProperty('checks');
    expect(body).not.toHaveProperty('allPassed');
    expect(body.error).toMatch(/admin authorization required/i);
  });

  it('rejects a vessel session that is not the order orchestrator when settling', async () => {
    fakeDb.seedOrder({
      orderId: 'ap2-task-authz-2',
      creatorDid: 'did:prime:0xcreator',
      assignedAgentDid: 'did:plvtvs:0xagent',
      status: 'VERIFIED',
      bountyUsdc: '10',
    });
    currentSession = {
      accessMode: 'vessel',
      vesselDid: 'did:plvtvs:0xattacker',
      primeDid: 'did:prime:0xattacker',
    };

    const res = await POST(postRequest({ action: 'settle', orderId: 'ap2-task-authz-2' }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('NOT_ORCHESTRATOR');
    expect(body.error).toMatch(/admin or orchestrator/i);
    // Money must not have moved: still VERIFIED, no payout recorded.
    expect(fakeDb.orders[0].status).toBe('VERIFIED');
    expect(fakeDb.orders[0].payoutTxHash).toBeNull();
    expect(fakeDb.ledger).toHaveLength(0);
  });

  it('rejects a vessel that is not the assignee when submitting', async () => {
    fakeDb.seedOrder({
      orderId: 'ap2-task-authz-3',
      creatorDid: 'did:prime:0xcreator',
      assignedAgentDid: 'did:plvtvs:0xagent',
      status: 'ASSIGNED',
    });
    currentSession = {
      accessMode: 'vessel',
      vesselDid: 'did:plvtvs:0xother',
      primeDid: 'did:prime:0xother',
    };

    const res = await POST(
      postRequest({
        action: 'submit',
        orderId: 'ap2-task-authz-3',
        deliverableHash: 'hash',
        provenance: { provider: 'arweave', hash: 'h', fallback: false },
      })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/assigned vessel/i);
    // The rejected submission must not touch the order.
    expect(fakeDb.orders[0].status).toBe('ASSIGNED');
    expect(fakeDb.orders[0].deliverableHash).toBeNull();
  });
});
