import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from './helpers/fake-db';

vi.mock('@/lib/db', async () => {
  const { fakeDb: db } = await import('./helpers/fake-db');
  return { db: db.db };
});

import { GET as getMarket } from '@/app/api/market/x402-market/route';
import { GET as getLlms } from '@/app/api/market/llms/route';
import { PAYOUT_SINGLE_CAP_USDC, PAYOUT_DAILY_CAP_USDC } from '@/lib/web5/payments/arc';
import { settlementWindowMs } from '@/lib/web5/ap2/commerce';

// The machine-facing surfaces must describe the implementation, not an older
// draft of it. These assertions read the same constants the settlement path
// uses, so a future change to caps or the window fails here instead of silently
// mis-describing the contract to external agents.
const WINDOW_HOURS = settlementWindowMs() / 3_600_000;
const MAX_BOUNTY = (PAYOUT_SINGLE_CAP_USDC * 100) / 80;

async function market(): Promise<any> {
  return (await getMarket()).json();
}

async function llms(): Promise<string> {
  return (await getLlms()).text();
}

beforeEach(() => {
  fakeDb.reset();
});

describe('x402 market manifest', () => {
  it('refuses to advertise a CREATED state and starts at FUNDED', async () => {
    const m = await market();
    expect(m.bountyMarket.stateMachine).not.toContain('CREATED');
    expect(m.bountyMarket.stateMachine[0]).toBe('FUNDED');
    expect(m.bountyMarket.stateMachine).toContain('VERIFIED');
    expect(m.bountyMarket.stateMachine).toContain('DISPUTED');
    expect(m.bountyMarket.stateMachine).toContain('SETTLING');
  });

  it('states that bounty creation needs a vessel session and an escrow tx hash', async () => {
    const m = await market();
    expect(m.bountyMarket.createAuth).toMatch(/Bearer/);
    expect(m.bountyMarket.createBodySchema).toHaveProperty('escrowTxHash');
    expect(m.bountyMarket.createBodySchema).not.toHaveProperty('creatorDid');
  });

  it('publishes the real escrow rules', async () => {
    const { escrow } = (await market()).bountyMarket;
    expect(escrow.contract).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(escrow.exactAmount).toBe(true);
    expect(escrow.minConfirmations).toBe(3);
    expect(escrow.uniqueTxHash).toBe(true);
    expect(escrow.sender).toMatch(/creator wallet/i);
    expect(escrow.note).toMatch(/memo\/orderId alone does not fund/i);
    expect(escrow.note).toMatch(/server-fixed/i);
  });

  it('reports the caps and window the payout path enforces', async () => {
    const { limits, settlementRule } = (await market()).bountyMarket;
    expect(limits.payoutSingleUsdc).toBe(String(PAYOUT_SINGLE_CAP_USDC));
    expect(limits.payoutDailyUsdc).toBe(String(PAYOUT_DAILY_CAP_USDC));
    expect(limits.maxBountyUsdc).toBe(String(MAX_BOUNTY));
    expect(limits.settlementWindowHours).toBe(WINDOW_HOURS);
    expect(settlementRule.deliverer).toBe('80%');
    expect(settlementRule.protocol).toBe('20%');
    expect(settlementRule).not.toHaveProperty('protocolSplit');
  });

  it('points discovery at the live dynamic manifest, not a missing static file', async () => {
    const m = await market();
    expect(m.discovery.market).toMatch(/\/api\/market\/x402-market$/);
    expect(m.acceptancePolicy.disputeWindowHours).toBe(WINDOW_HOURS);
  });
});

describe('llms.txt', () => {
  it('documents escrow rules, caps and the settlement window', async () => {
    const text = await llms();
    expect(text).toMatch(/Escrow rules:/);
    expect(text).toContain(`Payout limits (server-enforced upper bounds): ${PAYOUT_SINGLE_CAP_USDC} USDC per payout`);
    expect(text).toContain(`${PAYOUT_DAILY_CAP_USDC} USDC per rolling 24h; max bounty ${MAX_BOUNTY} USDC`);
    expect(text).toContain(`Settlement window: ${WINDOW_HOURS}h`);
    expect(text).toMatch(/Escrow address[^\n]*0x[0-9a-fA-F]{40}/);
  });

  it('does not link to the removed static manifest', async () => {
    expect(await llms()).not.toContain('.well-known/x402-market.json');
  });

  it('shows escrowTxHash in the create example and keeps the amount inside the cap', async () => {
    const text = await llms();
    const createLine = text.split('\n').find((line) => line.startsWith('- Create bounty:')) || '';
    expect(createLine).toContain('"escrowTxHash"');
    const amount = Number(createLine.match(/"bountyUsdc":"([\d.]+)"/)?.[1]);
    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeLessThanOrEqual(MAX_BOUNTY);
  });
});

describe('static agent card', () => {
  const card = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/.well-known/agent.json'), 'utf8')
  );

  it('declares a mandatory, exactly-sized escrow deposit', () => {
    expect(card.escrow.required).toBe(true);
    expect(card.escrow.exactAmount).toBe(true);
    expect(card.escrow.minConfirmations).toBe(3);
    expect(card.escrow.uniqueTxHash).toBe(true);
    expect(card.escrow.vault).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(card.policies.bountyCreation).toMatch(/escrow deposit is required/i);
  });

  it('publishes caps that match the settlement constants', () => {
    expect(card.limits.payoutSingleUsdc).toBe(String(PAYOUT_SINGLE_CAP_USDC));
    expect(card.limits.payoutDailyUsdc).toBe(String(PAYOUT_DAILY_CAP_USDC));
    expect(card.limits.maxBountyUsdc).toBe(String(MAX_BOUNTY));
  });

  it('links to the live market route and drops the LP-burn claim', () => {
    expect(card.capabilities.discovery).toContain('/api/market/x402-market');
    expect(card.capabilities.discovery).not.toContain('/.well-known/x402-market.json');
    expect(card.economics.settlement).toMatch(/No LP buyback or burn/i);
  });
});
