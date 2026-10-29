// ════════════════════════════════════════════════════════════════
// src/lib/web5/ap2/commerce.ts
// AP2 bounty order state machine.
//
// Money rules:
// - FUNDED requires a confirmed native-USDC transfer to escrow.
// - Money leaves only in settleOrder / refundOrder, each of which
//   records a PayoutLedger row and a block number (evidence E1/E2/E4).
// - SETTLED without payoutTxHash, or REFUNDED without refundTxHash,
//   is never written.
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { parseArcUsdc } from '@/lib/web5/auth/eip712-types';
import { sendNativeUsdc, verifyNativeTransfer } from '@/lib/web5/payments/arc';
import {
  auditOrderEvidence,
  readBlockNumbers,
  type EvidenceCheck,
  type EvidenceLedgerRow,
} from '@/lib/web5/ap2/evidence';
import { ESCROW_PAYOUTS_ENABLED, REFUNDS_ENABLED } from '@/lib/launch/flags';

export type OrderStatus =
  | 'FUNDED'
  | 'ASSIGNED'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'SETTLING'
  | 'SETTLED'
  | 'REFUNDING'
  | 'REFUNDED';

export class CommerceError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'COMMERCE_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type SettlementActor =
  | { kind: 'admin' }
  | { kind: 'orchestrator'; did: string }
  | { kind: 'cron' };

export interface CommerceTaskOrder {
  id?: string;
  orderId: string;
  creatorDid: string;
  title: string;
  description: string;
  bountyUsdc: string;
  status: OrderStatus;
  escrowContract: string;
  escrowTxHash?: string | null;
  payoutTxHash?: string | null;
  feeTxHash?: string | null;
  refundTxHash?: string | null;
  blockNumbers?: Record<string, string>;
  assignedAgentDid?: string | null;
  deliverableHash?: string | null;
  deliverableContent?: string | null;
  deliverableArweaveHash?: string | null;
  acceptanceHash?: string | null;
  deliverableSha256?: string | null;
  agentReputation?: {
    name: string;
    did: string;
    score: string;
    level: string;
    badges: string[];
  };
  split?: ReturnType<typeof calculateRevenueSplit>;
  isDemo: boolean;
  createdAt: number;
  submittedAt?: number | null;
  verifiedAt?: number | null;
  settlementDueAt?: number | null;
  disputedAt?: number | null;
  settledAt?: number | null;
}

const SETTLEMENT_WINDOW_MS =
  Math.max(1, Number(process.env.SETTLEMENT_WINDOW_HOURS || 72)) * 3600 * 1000;

export function isDemoOrder(record: {
  orderId: string;
  isDemo?: boolean | null;
}): boolean {
  return Boolean(record.isDemo) || /^ap2-task-(seed|meme)-/.test(record.orderId);
}

/**
 * Single query rule for every aggregate/counter that must exclude demo rows.
 * Mirrors isDemoOrder(), including rows seeded before `isDemo` was written.
 */
export const NON_DEMO_ORDER_WHERE: Prisma.TaskOrderWhereInput = {
  isDemo: false,
  NOT: [
    { orderId: { startsWith: 'ap2-task-seed-' } },
    { orderId: { startsWith: 'ap2-task-meme-' } },
  ],
};

export function getAgentReputationForTask(task: {
  orderId: string;
  title: string;
  assignedAgentDid?: string | null;
}) {
  return {
    name: task.assignedAgentDid
      ? `Agent ${task.assignedAgentDid.slice(-6)}`
      : 'Unassigned',
    did: task.assignedAgentDid || '',
    score: '—',
    level: 'Unverified',
    badges: [] as string[],
  };
}

/**
 * Reputation is derived only from confirmed chain outcomes:
 * `successCount` is bumped after a confirmed payout, `failCount` after a refund.
 */
export function reputationFromCounts(successCount: number, failCount: number) {
  const total = successCount + failCount;
  if (total === 0) {
    return { score: '—', level: 'Unverified', badges: [] as string[] };
  }
  const rate = successCount / total;
  const badges = [`${successCount} settled`];
  if (failCount > 0) badges.push(`${failCount} refunded`);
  if (rate === 1 && successCount >= 5) badges.push('no-refund');
  return {
    score: `${(rate * 100).toFixed(1)}%`,
    level: rate === 1 && successCount >= 5 ? 'Trusted' : rate >= 0.8 ? 'Reliable' : 'Probation',
    badges,
  };
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  return value instanceof Date ? value.getTime() : new Date(value as string).getTime();
}

function mapPrismaOrder(
  record: any,
  counts?: { successCount: number; failCount: number } | null
): CommerceTaskOrder {
  const totalBounty = parseFloat(record.bountyUsdc) || 0;

  let deliverableSha256: string | null = null;
  if (record.deliverableContent) {
    deliverableSha256 = `0x${crypto
      .createHash('sha256')
      .update(record.deliverableContent)
      .digest('hex')}`;
  } else if (record.deliverableHash) {
    deliverableSha256 = `0x${crypto
      .createHash('sha256')
      .update(record.deliverableHash)
      .digest('hex')}`;
  }

  return {
    id: record.id,
    orderId: record.orderId,
    creatorDid: record.creatorDid,
    title: record.title,
    description: record.description,
    bountyUsdc: record.bountyUsdc,
    status: record.status as OrderStatus,
    escrowContract: record.escrowContract,
    escrowTxHash: record.escrowTxHash,
    payoutTxHash: record.payoutTxHash || null,
    feeTxHash: record.feeTxHash || null,
    refundTxHash: record.refundTxHash || null,
    blockNumbers: readBlockNumbers(record.blockNumbers),
    assignedAgentDid: record.assignedAgentDid,
    deliverableHash: record.deliverableHash,
    deliverableContent: record.deliverableContent,
    deliverableArweaveHash: record.deliverableArweaveHash || null,
    acceptanceHash: record.acceptanceHash || null,
    deliverableSha256,
    agentReputation: {
      ...getAgentReputationForTask({
        orderId: record.orderId,
        title: record.title,
        assignedAgentDid: record.assignedAgentDid,
      }),
      ...(counts ? reputationFromCounts(counts.successCount, counts.failCount) : {}),
    },
    split: totalBounty > 0 ? calculateRevenueSplit(totalBounty) : undefined,
    isDemo: isDemoOrder(record),
    createdAt: toMillis(record.createdAt) || 0,
    submittedAt: toMillis(record.submittedAt),
    verifiedAt: toMillis(record.verifiedAt),
    settlementDueAt: toMillis(record.settlementDueAt),
    disputedAt: toMillis(record.disputedAt),
    settledAt: toMillis(record.settledAt),
  };
}

// ── order creation / assignment ────────────────────────────────

export async function createCommerceOrder(params: {
  creatorDid: string;
  title: string;
  description: string;
  bountyUsdc: string;
  escrowContract?: string;
  escrowTxHash?: string;
  orderId?: string;
  acceptanceHash?: string;
  deliveryHours?: number;
}): Promise<CommerceTaskOrder> {
  const title = params.title?.trim();
  const description = params.description?.trim() || '';
  if (!title || title.length < 4 || title.length > 160) {
    throw new CommerceError('Task title must be 4-160 characters');
  }
  if (description.length > 5000) {
    throw new CommerceError('Task description is too long');
  }
  if (!/^(0|[1-9]\d{0,5})(\.\d{1,18})?$/.test(params.bountyUsdc)) {
    throw new CommerceError('Invalid bounty amount');
  }
  if (params.acceptanceHash && params.acceptanceHash.length > 512) {
    throw new CommerceError('Invalid acceptance hash');
  }

  const bountyWei = parseArcUsdc(params.bountyUsdc);
  if (bountyWei <= 0n) throw new CommerceError('Bounty must be greater than zero');
  if (!params.escrowTxHash) {
    throw new CommerceError('escrowTxHash is required: funds must be verifiably deposited first');
  }

  const escrowContract =
    params.escrowContract || '0xCA36335845E382129167fC44243F07A76827bA22';

  const duplicate = await db.taskOrder.findFirst({
    where: { escrowTxHash: params.escrowTxHash },
    select: { id: true },
  });
  if (duplicate) throw new CommerceError('This escrow transaction was already used', 409);

  const verified = await verifyNativeTransfer({
    txHash: params.escrowTxHash,
    to: escrowContract,
    minValueWei: bountyWei,
    minConfirmations: 3,
  });
  if (!verified.ok) {
    throw new CommerceError(`Escrow verification failed: ${verified.reason}`, 400);
  }

  const orderId =
    params.orderId ||
    `ap2-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const deliveryHours = Math.max(1, params.deliveryHours || 72);

  const record = await db.taskOrder.create({
    data: {
      orderId,
      creatorDid: params.creatorDid,
      title,
      description,
      bountyUsdc: params.bountyUsdc,
      status: 'FUNDED',
      escrowContract,
      escrowTxHash: verified.transfer.txHash,
      acceptanceHash: params.acceptanceHash || null,
      deliveryDueAt: new Date(Date.now() + deliveryHours * 3600 * 1000),
      blockNumbers: JSON.stringify({ escrow: verified.transfer.blockNumber.toString() }),
      isDemo: false,
    },
  });

  return mapPrismaOrder(record);
}

export async function assignAgentToOrder(
  orderId: string,
  agentDid: string
): Promise<CommerceTaskOrder> {
  if (!agentDid || agentDid.length > 200) throw new CommerceError('Invalid agent DID');

  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new CommerceError('Task order not found', 404);
  if (existing.status !== 'FUNDED') {
    throw new CommerceError(`Cannot assign task in status: ${existing.status}`, 409);
  }

  const updated = await db.taskOrder.update({
    where: { orderId },
    data: { assignedAgentDid: agentDid, status: 'ASSIGNED' },
  });
  return mapPrismaOrder(updated);
}

// ── revenue split (planning only) ──────────────────────────────

export const REVENUE_ROUTING = {
  OPERATIONAL_TREASURY_ADDRESS: '0xCA36335845E382129167fC44243F07A76827bA22',
  PROTOCOL_FEE_RATIO: 0.2,
  CURATOR_REBATE_RATIO: 0.15,
  OPERATIONAL_SPLIT_RATIO: 0.5,
  LP_BUYBACK_LOCK_RATIO: 0.5,
  UNISWAP_V4_POOL: '0xa4fed17b161f3c6ad0dbecbf837d1fa9079c69f78e564e676183656e8500abf1',
  BURN_ADDRESS: '0x000000000000000000000000000000000000dEaD',
} as const;

/** Planned split only. It does not imply a transfer has happened. */
export function calculateRevenueSplit(totalAmountUsdc: number, curatorRef?: string) {
  const protocolFee = totalAmountUsdc * REVENUE_ROUTING.PROTOCOL_FEE_RATIO;
  const authorEarnings = totalAmountUsdc * (1 - REVENUE_ROUTING.PROTOCOL_FEE_RATIO);

  let curatorEarnings = 0;
  let netProtocolFee = protocolFee;
  if (curatorRef) {
    curatorEarnings = totalAmountUsdc * REVENUE_ROUTING.CURATOR_REBATE_RATIO;
    netProtocolFee = Math.max(0, protocolFee - curatorEarnings * 0.25);
  }

  const operationalUsdc = netProtocolFee * REVENUE_ROUTING.OPERATIONAL_SPLIT_RATIO;
  const lpLockUsdc = netProtocolFee * REVENUE_ROUTING.LP_BUYBACK_LOCK_RATIO;
  const wbogAmount = (lpLockUsdc / 0.00008434).toFixed(2);

  return {
    totalUsdc: totalAmountUsdc,
    authorShare: {
      amountUsdc: authorEarnings.toFixed(4),
      percent: '80%',
      purpose: 'Creator net earnings (planned)',
    },
    protocolFee: {
      amountUsdc: protocolFee.toFixed(4),
      percent: '20%',
    },
    ...(curatorRef
      ? {
          curatorShare: {
            recipientRef: curatorRef,
            amountUsdc: curatorEarnings.toFixed(4),
            percent: '15%',
            purpose: 'Curate-to-Earn referral rebate (planned)',
          },
        }
      : {}),
    operationalTreasury: {
      recipient: REVENUE_ROUTING.OPERATIONAL_TREASURY_ADDRESS,
      amountUsdc: operationalUsdc.toFixed(4),
      purpose: 'Operations (planned)',
    },
    lpBuybackLock: {
      pool: REVENUE_ROUTING.UNISWAP_V4_POOL,
      amountUsdc: lpLockUsdc.toFixed(4),
      estimatedWbogBurnedOrLocked: wbogAmount,
      purpose: 'LP/buyback (planned)',
    },
  };
}

// ── submission & acceptance ────────────────────────────────────

export interface DeliverableProvenance {
  provider: 'arweave' | 'local';
  hash: string;
  fallback: boolean;
}

/**
 * Records a deliverable. With acceptanceHash configured, the order moves
 * straight to VERIFIED or REJECTED; otherwise it waits in SUBMITTED for
 * an admin verdict. The 72h dispute window starts at submission.
 */
export async function submitOrder(
  orderId: string,
  deliverableHash: string,
  deliverableContent?: string,
  provenance?: DeliverableProvenance
): Promise<CommerceTaskOrder> {
  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new CommerceError('Task order not found', 404);
  if (existing.status !== 'ASSIGNED') {
    throw new CommerceError(`Cannot submit task in status: ${existing.status}`, 409);
  }
  if (!deliverableHash || deliverableHash.length > 512) {
    throw new CommerceError('Invalid deliverable hash');
  }
  if (provenance?.fallback) {
    throw new CommerceError('交付物未完成永久存证（fallback=true），拒绝提交', 422, 'PROVENANCE_NOT_PERMANENT');
  }
  if (provenance?.provider === 'arweave' && !/^[A-Za-z0-9_-]{43}$/.test(provenance.hash || '')) {
    throw new CommerceError('Arweave 交易 ID 不合法', 422, 'PROVENANCE_INVALID');
  }

  const accepted =
    !existing.acceptanceHash || existing.acceptanceHash === deliverableHash;
  const submittedAt = new Date();

  const updated = await db.taskOrder.update({
    where: { orderId },
    data: {
      deliverableHash,
      deliverableContent: deliverableContent?.slice(0, 200_000) || null,
      deliverableArweaveHash: provenance?.hash || null,
      status: accepted ? (existing.acceptanceHash ? 'VERIFIED' : 'SUBMITTED') : 'REJECTED',
      submittedAt,
      verifiedAt: accepted && existing.acceptanceHash ? submittedAt : null,
      settlementDueAt: new Date(submittedAt.getTime() + SETTLEMENT_WINDOW_MS),
    },
  });
  return mapPrismaOrder(updated);
}

/** Admin acceptance verdict for orders without an acceptanceHash. */
export async function verifyOrder(orderId: string): Promise<CommerceTaskOrder> {
  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new CommerceError('Task order not found', 404);
  if (existing.status !== 'SUBMITTED') {
    throw new CommerceError(`Cannot verify task in status: ${existing.status}`, 409);
  }
  if (existing.acceptanceHash && existing.acceptanceHash !== existing.deliverableHash) {
    throw new CommerceError('Deliverable does not match acceptance hash', 422);
  }

  const updated = await db.taskOrder.update({
    where: { orderId },
    data: { status: 'VERIFIED', verifiedAt: new Date() },
  });
  return mapPrismaOrder(updated);
}

export async function disputeOrder(
  orderId: string,
  actorDid: string,
  reason: string
): Promise<CommerceTaskOrder> {
  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new CommerceError('Task order not found', 404);
  if (existing.status !== 'SUBMITTED' && existing.status !== 'VERIFIED') {
    throw new CommerceError(`Cannot dispute task in status: ${existing.status}`, 409);
  }
  if (existing.creatorDid !== actorDid) {
    throw new CommerceError('Only the task creator can dispute', 403);
  }
  if (existing.settlementDueAt && existing.settlementDueAt.getTime() <= Date.now()) {
    throw new CommerceError('Dispute window has closed', 409);
  }

  const updated = await db.taskOrder.update({
    where: { orderId },
    data: {
      status: 'DISPUTED',
      disputedAt: new Date(),
      disputeReason: (reason || '').slice(0, 2000) || null,
    },
  });
  return mapPrismaOrder(updated);
}

// ── payouts ────────────────────────────────────────────────────

async function resolveAgentPayoutAddress(agentDid: string): Promise<string | null> {
  if (/^0x[0-9a-fA-F]{40}$/.test(agentDid)) return agentDid;
  if (agentDid.startsWith('did:plvtvs:')) {
    const raw = agentDid.replace('did:plvtvs:', '');
    if (/^0x[0-9a-fA-F]{40}$/.test(raw)) return raw;
  }

  const vessel = await db.vessel.findUnique({
    where: { did: agentDid },
    select: { smartAccountAddress: true, prime: { select: { walletAddress: true } } },
  });
  if (vessel?.smartAccountAddress) return vessel.smartAccountAddress;
  if (vessel?.prime?.walletAddress) return vessel.prime.walletAddress;

  const prime = await db.prime.findUnique({
    where: { did: agentDid },
    select: { walletAddress: true },
  });
  return prime?.walletAddress || null;
}

async function resolveCreatorAddress(creatorDid: string): Promise<string | null> {
  const prime = await db.prime.findUnique({
    where: { did: creatorDid },
    select: { walletAddress: true },
  });
  return prime?.walletAddress || null;
}

function feeAddress(): string | null {
  const raw = (process.env.PLATFORM_FEE_ADDRESS || '').trim();
  return /^0x[0-9a-fA-F]{40}$/.test(raw) ? raw : null;
}

/**
 * Settles a verified order: 80% to the agent, 20% to the fee address.
 * Idempotent — concurrent callers lose the SETTLING claim and receive
 * the in-flight order instead of a second transfer.
 */
export async function settleOrder(
  orderId: string,
  actor: SettlementActor = { kind: 'admin' },
  opts: { force?: boolean } = {}
): Promise<CommerceTaskOrder> {
  if (!ESCROW_PAYOUTS_ENABLED) {
    throw new CommerceError(
      'Settlement payouts are disabled (ESCROW_PAYOUTS_ENABLED)',
      503,
      'ESCROW_PAYOUTS_DISABLED'
    );
  }

  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new CommerceError('Task order not found', 404);
  if (existing.disputedAt) throw new CommerceError('Task is disputed', 409, 'DISPUTED');

  const settleable = existing.status === 'VERIFIED' || existing.status === 'SUBMITTED';
  if (!settleable) {
    throw new CommerceError(`Cannot settle task in status: ${existing.status}`, 409);
  }
  if (existing.status === 'SUBMITTED' && actor.kind !== 'admin') {
    throw new CommerceError('Order has no acceptance verdict', 409, 'NOT_VERIFIED');
  }
  if (!existing.assignedAgentDid) throw new CommerceError('Task has no assigned agent', 409);

  // Evidence E3: payout requires permanent provenance, never a local fallback hash.
  if (!existing.deliverableArweaveHash && !isDemoOrder(existing) && !(actor.kind === 'admin' && opts.force)) {
    throw new CommerceError(
      '交付物缺少 Arweave 永久存证，拒绝结算',
      422,
      'PROVENANCE_NOT_PERMANENT'
    );
  }

  const dueAt = existing.settlementDueAt?.getTime() ?? 0;
  if (dueAt > Date.now() && !(actor.kind === 'admin' && opts.force)) {
    throw new CommerceError('Settlement window has not elapsed', 409, 'WINDOW_OPEN');
  }

  if (actor.kind === 'orchestrator') {
    if (actor.did === existing.assignedAgentDid) {
      throw new CommerceError('Self-dealing blocked: settler cannot be the deliverer', 403, 'SELF_DEALING');
    }
    if (!actor.did) throw new CommerceError('Orchestrator DID required', 403);
  }

  // Claim the order; only one caller wins.
  const claim = await db.taskOrder.updateMany({
    where: { orderId, status: { in: ['VERIFIED', 'SUBMITTED'] }, disputedAt: null },
    data: { status: 'SETTLING' },
  });
  if (claim.count !== 1) {
    const current = await db.taskOrder.findUnique({ where: { orderId } });
    return mapPrismaOrder(current);
  }

  const payoutAddress = await resolveAgentPayoutAddress(existing.assignedAgentDid);
  if (!payoutAddress) {
    await db.taskOrder.update({
      where: { orderId },
      data: { status: existing.status, settlementError: 'Assigned agent has no payout wallet on record' },
    });
    throw new CommerceError('Assigned agent has no payout wallet on record', 409);
  }

  const totalWei = parseArcUsdc(existing.bountyUsdc);
  const agentWei = (totalWei * 80n) / 100n;
  const feeWei = totalWei - agentWei;
  const blocks = readBlockNumbers(existing.blockNumbers);

  let payoutTxHash = existing.payoutTxHash || '';
  let payoutBlock = blocks.payout || '';
  let feeTxHash = existing.feeTxHash || '';
  let feeBlock = blocks.fee || '';

  // Retry-safe: reuse anything already paid before sending again.
  const ledger = await db.payoutLedger.findMany({ where: { orderId } });

  try {
    if (!payoutTxHash) {
      const payout = await sendNativeUsdc({ to: payoutAddress, amountWei: agentWei });
      if (!payout.ok) {
        throw new CommerceError(`Payout failed: ${payout.reason}`, payout.status || 502, payout.code || 'PAYOUT_FAILED');
      }
      payoutTxHash = payout.txHash;
      payoutBlock = payout.blockNumber;
      await db.payoutLedger.create({
        data: {
          orderId,
          kind: 'AGENT',
          address: payoutAddress.toLowerCase(),
          amountWei: agentWei.toString(),
          txHash: payout.txHash,
          blockNumber: payout.blockNumber,
        },
      });
    }

    const feeTo = feeAddress();
    const feeAlreadyPaid = ledger.some((row) => row.kind === 'FEE' && row.txHash);
    if (feeWei > 0n && !feeTxHash && feeTo && !feeAlreadyPaid) {
      const fee = await sendNativeUsdc({ to: feeTo, amountWei: feeWei });
      if (!fee.ok) {
        throw new CommerceError(
          `Fee transfer failed after agent payout ${payoutTxHash}: ${fee.reason}`,
          fee.status || 502,
          fee.code || 'FEE_FAILED'
        );
      }
      feeTxHash = fee.txHash;
      feeBlock = fee.blockNumber;
      await db.payoutLedger.create({
        data: {
          orderId,
          kind: 'FEE',
          address: feeTo.toLowerCase(),
          amountWei: feeWei.toString(),
          txHash: fee.txHash,
          blockNumber: fee.blockNumber,
        },
      });
    } else if (feeWei > 0n && !feeTo && !ledger.some((row) => row.kind === 'RETAINED')) {
      // No fee address configured: the 20% stays in treasury. Record it
      // as retained so E4 can reconcile without inventing a tx.
      await db.payoutLedger.create({
        data: {
          orderId,
          kind: 'RETAINED',
          address: REVENUE_ROUTING.OPERATIONAL_TREASURY_ADDRESS.toLowerCase(),
          amountWei: feeWei.toString(),
        },
      });
    }

    const updated = await db.taskOrder.update({
      where: { orderId },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        payoutTxHash,
        feeTxHash: feeTxHash || null,
        blockNumbers: JSON.stringify({
          ...blocks,
          payout: payoutBlock,
          ...(feeBlock ? { fee: feeBlock } : {}),
        }),
        settlementError: null,
      },
    });

    await db.vessel.updateMany({
      where: { did: existing.assignedAgentDid },
      data: { successCount: { increment: 1 } },
    });

    console.log(
      `[AP2] order ${orderId} settled: agent ${agentWei} wei -> ${payoutAddress} tx=${payoutTxHash}` +
        (feeTxHash ? `; fee ${feeWei} wei tx=${feeTxHash}` : '; fee retained')
    );

    return mapPrismaOrder(updated);
  } catch (err: any) {
    await db.taskOrder.update({
      where: { orderId },
      data: {
        status: 'VERIFIED',
        settlementError: String(err?.message || err).slice(0, 500),
      },
    });
    throw err instanceof CommerceError
      ? err
      : new CommerceError(String(err?.message || 'Settlement failed'), 502);
  }
}

/** Refunds the full bounty to the creator. Requires REFUNDS_ENABLED. */
export async function refundOrder(
  orderId: string,
  actor: SettlementActor = { kind: 'admin' },
  reason = ''
): Promise<CommerceTaskOrder> {
  if (!REFUNDS_ENABLED) {
    throw new CommerceError('Refunds are disabled (REFUNDS_ENABLED)', 503, 'REFUNDS_DISABLED');
  }

  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new CommerceError('Task order not found', 404);
  if (!['FUNDED', 'ASSIGNED', 'SUBMITTED', 'VERIFIED', 'DISPUTED'].includes(existing.status)) {
    throw new CommerceError(`Cannot refund task in status: ${existing.status}`, 409);
  }
  if (existing.status === 'DISPUTED' && actor.kind !== 'admin') {
    throw new CommerceError('Disputed tasks require admin refund', 403);
  }

  const creatorAddress = await resolveCreatorAddress(existing.creatorDid);
  if (!creatorAddress) {
    throw new CommerceError('Creator has no wallet on record', 409);
  }

  const claim = await db.taskOrder.updateMany({
    where: { orderId, status: existing.status },
    data: { status: 'REFUNDING' },
  });
  if (claim.count !== 1) {
    const current = await db.taskOrder.findUnique({ where: { orderId } });
    return mapPrismaOrder(current);
  }

  const totalWei = parseArcUsdc(existing.bountyUsdc);
  try {
    const refund = await sendNativeUsdc({ to: creatorAddress, amountWei: totalWei });
    if (!refund.ok) {
      throw new CommerceError(`Refund failed: ${refund.reason}`, refund.status || 502, refund.code || 'REFUND_FAILED');
    }

    await db.payoutLedger.create({
      data: {
        orderId,
        kind: 'REFUND',
        address: creatorAddress.toLowerCase(),
        amountWei: totalWei.toString(),
        txHash: refund.txHash,
        blockNumber: refund.blockNumber,
      },
    });

    const blocks = readBlockNumbers(existing.blockNumbers);
    const updated = await db.taskOrder.update({
      where: { orderId },
      data: {
        status: 'REFUNDED',
        refundTxHash: refund.txHash,
        blockNumbers: JSON.stringify({ ...blocks, refund: refund.blockNumber }),
        settlementError: reason ? `refund: ${reason}`.slice(0, 500) : null,
      },
    });

    if (existing.assignedAgentDid) {
      await db.vessel.updateMany({
        where: { did: existing.assignedAgentDid },
        data: { failCount: { increment: 1 } },
      });
    }

    return mapPrismaOrder(updated);
  } catch (err: any) {
    await db.taskOrder.update({
      where: { orderId },
      data: {
        status: existing.status,
        settlementError: String(err?.message || err).slice(0, 500),
      },
    });
    throw err instanceof CommerceError
      ? err
      : new CommerceError(String(err?.message || 'Refund failed'), 502);
  }
}

// ── audits & schedulers ────────────────────────────────────────

export type AuditCheck = EvidenceCheck;

/** E1–E5 audit; see src/lib/web5/ap2/evidence.ts for the judging rules. */
export async function auditOrder(
  orderId: string,
  opts: { chain?: boolean } = {}
): Promise<{
  checks: AuditCheck[];
  order: CommerceTaskOrder;
  ledger: EvidenceLedgerRow[];
  summary: { pass: boolean; failed: string[]; skipped: string[] };
}> {
  try {
    const result = await auditOrderEvidence(orderId, opts);
    return {
      checks: result.checks,
      order: mapPrismaOrder(result.order),
      ledger: result.ledger,
      summary: result.summary,
    };
  } catch (err: any) {
    throw err instanceof CommerceError
      ? err
      : new CommerceError(err?.message || 'Audit failed', err?.status || 500);
  }
}

/** Orders whose dispute window closed and that are ready for payout. */
export async function listSettlementsDue(limit = 20) {
  return db.taskOrder.findMany({
    where: {
      status: 'VERIFIED',
      disputedAt: null,
      settlementDueAt: { lte: new Date() },
    },
    orderBy: { settlementDueAt: 'asc' },
    take: limit,
  });
}

/** Assigned/funded orders past their delivery deadline. */
export async function listExpiredDeliveries(limit = 20) {
  return db.taskOrder.findMany({
    where: {
      status: { in: ['FUNDED', 'ASSIGNED'] },
      deliveryDueAt: { lte: new Date() },
    },
    orderBy: { deliveryDueAt: 'asc' },
    take: limit,
  });
}

/** Backwards-compatible wrapper: submission never settles money. */
export async function submitAndSettleOrder(
  orderId: string,
  deliverableHash: string,
  deliverableContent?: string
): Promise<CommerceTaskOrder> {
  return submitOrder(orderId, deliverableHash, deliverableContent);
}

export async function listActiveCommerceOrders(): Promise<CommerceTaskOrder[]> {
  const records = await db.taskOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const dids = [
    ...new Set(records.map((r) => r.assignedAgentDid).filter((d): d is string => Boolean(d))),
  ];
  const vessels = dids.length
    ? await db.vessel.findMany({
        where: { did: { in: dids } },
        select: { did: true, successCount: true, failCount: true },
      })
    : [];
  const countsByDid = new Map(vessels.map((v) => [v.did, v]));

  return records.map((record) =>
    mapPrismaOrder(
      record,
      record.assignedAgentDid ? countsByDid.get(record.assignedAgentDid) : null
    )
  );
}
