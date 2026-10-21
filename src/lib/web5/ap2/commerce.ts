// ════════════════════════════════════════════════════════════════
// src/lib/web5/ap2/commerce.ts
// AP2 bounty order state machine.
//
// Money rules:
// - A task is FUNDED only after a confirmed native-USDC transfer to escrow.
// - Submission sets SUBMITTED. SETTLED requires a confirmed payout transaction.
// - Seeded/demo rows are never created automatically and are labelled isDemo.
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { db } from '@/lib/db';
import { parseArcUsdc } from '@/lib/web5/auth/eip712-types';
import { sendNativeUsdc, verifyNativeTransfer } from '@/lib/web5/payments/arc';
import { ESCROW_PAYOUTS_ENABLED } from '@/lib/launch/flags';

export type OrderStatus =
  | 'CREATED'
  | 'FUNDED'
  | 'ASSIGNED'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'SETTLED'
  | 'REFUNDED';

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
  assignedAgentDid?: string | null;
  deliverableHash?: string | null;
  deliverableContent?: string | null;
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
  settledAt?: number | null;
}

export function isDemoOrder(record: {
  orderId: string;
  isDemo?: boolean | null;
}): boolean {
  return Boolean(record.isDemo) || /^ap2-task-(seed|meme)-/.test(record.orderId);
}

export function getAgentReputationForTask(task: {
  orderId: string;
  title: string;
  assignedAgentDid?: string | null;
}): {
  name: string;
  did: string;
  score: string;
  level: string;
  badges: string[];
} {
  return {
    name: task.assignedAgentDid
      ? `Agent ${task.assignedAgentDid.slice(-6)}`
      : 'Unassigned',
    did: task.assignedAgentDid || '',
    score: '—',
    level: 'Unverified',
    badges: [],
  };
}

function mapPrismaOrder(record: any): CommerceTaskOrder {
  const totalBounty = parseFloat(record.bountyUsdc) || 0;
  const agentReputation = getAgentReputationForTask({
    orderId: record.orderId,
    title: record.title,
    assignedAgentDid: record.assignedAgentDid,
  });

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
    assignedAgentDid: record.assignedAgentDid,
    deliverableHash: record.deliverableHash,
    deliverableContent: record.deliverableContent,
    deliverableSha256,
    agentReputation,
    split: totalBounty > 0 ? calculateRevenueSplit(totalBounty) : undefined,
    isDemo: isDemoOrder(record),
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.getTime()
        : new Date(record.createdAt).getTime(),
    submittedAt: record.submittedAt
      ? record.submittedAt instanceof Date
        ? record.submittedAt.getTime()
        : new Date(record.submittedAt).getTime()
      : null,
    settledAt: record.settledAt
      ? record.settledAt instanceof Date
        ? record.settledAt.getTime()
        : new Date(record.settledAt).getTime()
      : null,
  };
}

export async function createCommerceOrder(params: {
  creatorDid: string;
  title: string;
  description: string;
  bountyUsdc: string;
  escrowContract?: string;
  escrowTxHash?: string;
  orderId?: string;
}): Promise<CommerceTaskOrder> {
  const title = params.title?.trim();
  const description = params.description?.trim() || '';
  if (!title || title.length < 4 || title.length > 160) {
    throw new Error('Task title must be 4-160 characters');
  }
  if (description.length > 5000) {
    throw new Error('Task description is too long');
  }
  if (!/^(0|[1-9]\d{0,5})(\.\d{1,18})?$/.test(params.bountyUsdc)) {
    throw new Error('Invalid bounty amount');
  }

  const bountyWei = parseArcUsdc(params.bountyUsdc);
  if (bountyWei <= 0n) throw new Error('Bounty must be greater than zero');
  if (!params.escrowTxHash) {
    throw new Error('escrowTxHash is required: funds must be verifiably deposited first');
  }

  const escrowContract =
    params.escrowContract || '0xCA36335845E382129167fC44243F07A76827bA22';

  const duplicate = await db.taskOrder.findFirst({
    where: { escrowTxHash: params.escrowTxHash },
    select: { id: true },
  });
  if (duplicate) throw new Error('This escrow transaction was already used');

  const verified = await verifyNativeTransfer({
    txHash: params.escrowTxHash,
    to: escrowContract,
    minValueWei: bountyWei,
    minConfirmations: 3,
  });
  if (!verified.ok) {
    throw new Error(`Escrow verification failed: ${verified.reason}`);
  }

  const orderId =
    params.orderId ||
    `ap2-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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
      isDemo: false,
    },
  });

  return mapPrismaOrder(record);
}

export async function assignAgentToOrder(
  orderId: string,
  agentDid: string
): Promise<CommerceTaskOrder> {
  if (!agentDid || agentDid.length > 200) throw new Error('Invalid agent DID');

  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new Error('Task order not found');
  if (existing.status !== 'FUNDED') {
    throw new Error(`Cannot assign task in status: ${existing.status}`);
  }

  const updated = await db.taskOrder.update({
    where: { orderId },
    data: { assignedAgentDid: agentDid, status: 'ASSIGNED' },
  });
  return mapPrismaOrder(updated);
}

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

/**
 * Records a deliverable and moves the order to SUBMITTED. No money moves here.
 */
export async function submitOrder(
  orderId: string,
  deliverableHash: string,
  deliverableContent?: string
): Promise<CommerceTaskOrder> {
  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new Error('Task order not found');
  if (existing.status !== 'ASSIGNED') {
    throw new Error(`Cannot submit task in status: ${existing.status}`);
  }
  if (!deliverableHash || deliverableHash.length > 512) {
    throw new Error('Invalid deliverable hash');
  }

  const updated = await db.taskOrder.update({
    where: { orderId },
    data: {
      deliverableHash,
      deliverableContent: deliverableContent?.slice(0, 200_000) || null,
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  });
  return mapPrismaOrder(updated);
}

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

/**
 * Executes the creator share payout, then marks the order SETTLED.
 * Refuses to label an order settled when payouts are disabled or the transfer fails.
 */
export async function settleOrder(
  orderId: string
): Promise<CommerceTaskOrder & { payoutTxHash?: string }> {
  if (!ESCROW_PAYOUTS_ENABLED) {
    throw new Error(
      'ESCROW_PAYOUTS_ENABLED is off: settlement requires a verified payout transaction'
    );
  }

  const existing = await db.taskOrder.findUnique({ where: { orderId } });
  if (!existing) throw new Error('Task order not found');
  if (existing.status !== 'SUBMITTED' && existing.status !== 'VERIFIED') {
    throw new Error(`Cannot settle task in status: ${existing.status}`);
  }
  if (!existing.assignedAgentDid) throw new Error('Task has no assigned agent');

  const payoutAddress = await resolveAgentPayoutAddress(existing.assignedAgentDid);
  if (!payoutAddress) {
    throw new Error('Assigned agent has no payout wallet on record');
  }

  const totalWei = parseArcUsdc(existing.bountyUsdc);
  const creatorShareWei = (totalWei * 80n) / 100n;
  if (creatorShareWei <= 0n) throw new Error('Payout amount is zero');

  const payout = await sendNativeUsdc({ to: payoutAddress, amountWei: creatorShareWei });
  if (!payout.ok) {
    throw new Error(`Payout failed: ${payout.reason}`);
  }

  const settledDate = new Date();
  const updated = await db.taskOrder.update({
    where: { orderId },
    data: {
      status: 'SETTLED',
      settledAt: settledDate,
      payoutTxHash: payout.txHash,
    },
  });

  console.log(
    `[AP2] order ${orderId} settled: payout ${creatorShareWei.toString()} wei -> ${payoutAddress} tx=${payout.txHash}`
  );

  return { ...mapPrismaOrder(updated), payoutTxHash: payout.txHash };
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
  return records.map(mapPrismaOrder);
}
