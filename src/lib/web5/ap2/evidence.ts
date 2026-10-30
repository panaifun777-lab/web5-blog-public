// ════════════════════════════════════════════════════════════════
// src/lib/web5/ap2/evidence.ts
// E1–E5 settlement evidence checks. Every check reads the DB row and
// (unless chain=false) the chain; nothing here trusts a status label.
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import { parseArcUsdc } from '@/lib/web5/auth/eip712-types';
import { verifyNativeTransfer } from '@/lib/web5/payments/arc';
import { getTreasuryAddress } from '@/lib/web5/contracts/addresses';

export type EvidenceId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5';

export interface EvidenceCheck {
  id: EvidenceId;
  pass: boolean;
  skipped?: boolean;
  detail: string;
}

export interface EvidenceLedgerRow {
  kind: string;
  address: string;
  amountWei: string;
  txHash: string | null;
  blockNumber: string | null;
}

export interface EvidenceReport {
  orderId: string;
  status: string;
  checks: EvidenceCheck[];
  summary: { pass: boolean; failed: EvidenceId[]; skipped: EvidenceId[] };
}

const TX_RE = /^0x[0-9a-fA-F]{64}$/;

export function readBlockNumbers(
  raw: string | null | undefined
): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function kindOf(status: string): 'terminal' | 'active' {
  return status === 'SETTLED' || status === 'REFUNDED' ? 'terminal' : 'active';
}

export async function auditOrderEvidence(
  orderId: string,
  opts: { chain?: boolean } = {}
): Promise<{
  checks: EvidenceCheck[];
  order: any;
  ledger: EvidenceLedgerRow[];
  summary: { pass: boolean; failed: EvidenceId[]; skipped: EvidenceId[] };
}> {
  const record = await db.taskOrder.findUnique({ where: { orderId } });
  if (!record) {
    const err = new Error('Task order not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  const chain = opts.chain !== false;
  const blocks = readBlockNumbers(record.blockNumbers);
  const ledger = (await db.payoutLedger.findMany({
    where: { orderId },
    orderBy: { createdAt: 'asc' },
  })) as EvidenceLedgerRow[];

  const status = record.status;
  const totalWei = parseArcUsdc(record.bountyUsdc);
  const checks: EvidenceCheck[] = [];

  const hashes = {
    escrow: record.escrowTxHash || '',
    payout: record.payoutTxHash || '',
    fee: record.feeTxHash || '',
    refund: record.refundTxHash || '',
  };

  // ── E1: hash + success receipt + block number are all recorded ──
  const e1Gaps: string[] = [];
  const requiredTx: Array<[string, string, string]> = [['escrow', hashes.escrow, blocks.escrow]];
  if (status === 'SETTLED') {
    requiredTx.push(['payout', hashes.payout, blocks.payout]);
    if (hashes.fee) requiredTx.push(['fee', hashes.fee, blocks.fee]);
  }
  if (status === 'REFUNDED') requiredTx.push(['refund', hashes.refund, blocks.refund]);
  for (const [label, hash, block] of requiredTx) {
    if (!TX_RE.test(hash)) e1Gaps.push(`${label}TxHash missing`);
    else if (!block) e1Gaps.push(`${label} blockNumber missing`);
  }
  checks.push({
    id: 'E1',
    pass: e1Gaps.length === 0,
    detail: e1Gaps.length
      ? e1Gaps.join('; ')
      : requiredTx.map(([label, hash]) => `${label}=${hash.slice(0, 10)}…@${blocks[label]}`).join(' '),
  });

  // ── E2: on-chain from/to/value equals what the DB declares ──
  if (!chain) {
    checks.push({ id: 'E2', pass: true, skipped: true, detail: 'chain check skipped (chain=false)' });
  } else {
    const e2Gaps: string[] = [];
    const escrowCheck = await verifyNativeTransfer({
      txHash: hashes.escrow,
      to: record.escrowContract,
      minValueWei: totalWei,
      exactValueWei: totalWei,
      minConfirmations: 1,
    });
    if (!escrowCheck.ok) e2Gaps.push(`escrow: ${escrowCheck.reason}`);

    const agentRow = ledger.find((row) => row.kind === 'AGENT' && row.txHash);
    if (agentRow) {
      const payoutCheck = await verifyNativeTransfer({
        txHash: agentRow.txHash as string,
        from: getTreasuryAddress(),
        to: agentRow.address,
        minValueWei: BigInt(agentRow.amountWei),
        exactValueWei: BigInt(agentRow.amountWei),
        minConfirmations: 1,
      });
      if (!payoutCheck.ok) e2Gaps.push(`payout: ${payoutCheck.reason}`);
    }
    const feeRow = ledger.find((row) => row.kind === 'FEE' && row.txHash);
    if (feeRow) {
      const feeCheck = await verifyNativeTransfer({
        txHash: feeRow.txHash as string,
        from: getTreasuryAddress(),
        to: feeRow.address,
        minValueWei: BigInt(feeRow.amountWei),
        exactValueWei: BigInt(feeRow.amountWei),
        minConfirmations: 1,
      });
      if (!feeCheck.ok) e2Gaps.push(`fee: ${feeCheck.reason}`);
    }
    const refundRow = ledger.find((row) => row.kind === 'REFUND' && row.txHash);
    if (refundRow) {
      const refundCheck = await verifyNativeTransfer({
        txHash: refundRow.txHash as string,
        from: getTreasuryAddress(),
        to: refundRow.address,
        minValueWei: BigInt(refundRow.amountWei),
        exactValueWei: BigInt(refundRow.amountWei),
        minConfirmations: 1,
      });
      if (!refundCheck.ok) e2Gaps.push(`refund: ${refundCheck.reason}`);
    }

    checks.push({
      id: 'E2',
      pass: e2Gaps.length === 0,
      detail: e2Gaps.length ? e2Gaps.join('; ') : 'all recorded transfers match on-chain from/to/value',
    });
  }

  // ── E3: every money movement is re-queryable by hash ──
  const e3Gaps: string[] = [];
  if (!TX_RE.test(hashes.escrow)) e3Gaps.push('escrowTxHash');
  if (kindOf(status) === 'terminal' && status === 'SETTLED') {
    if (!TX_RE.test(hashes.payout)) e3Gaps.push('payoutTxHash');
    const feeRetained = ledger.some((row) => row.kind === 'RETAINED');
    if (!TX_RE.test(hashes.fee) && !feeRetained) e3Gaps.push('feeTxHash');
  }
  if (status === 'REFUNDED' && !TX_RE.test(hashes.refund)) e3Gaps.push('refundTxHash');
  for (const row of ledger) {
    if (row.kind !== 'RETAINED' && !row.txHash) e3Gaps.push(`ledger:${row.kind} without txHash`);
  }
  checks.push({
    id: 'E3',
    pass: e3Gaps.length === 0,
    detail: e3Gaps.length ? `missing: ${e3Gaps.join(', ')}` : `hashes queried=${ledger.filter((r) => r.txHash).length + 1}`,
  });

  // ── E4: ledger total equals the bounty (treasury conservation) ──
  const ledgerSum = ledger.reduce((sum, row) => sum + BigInt(row.amountWei), 0n);
  const e4Relevant = kindOf(status) === 'terminal';
  checks.push({
    id: 'E4',
    pass: e4Relevant ? ledgerSum === totalWei : ledgerSum <= totalWei,
    detail: `ledger=${ledgerSum.toString()} bounty=${totalWei.toString()} rows=${ledger.length}`,
  });

  // ── E5: no state jump ──
  const e5Gaps: string[] = [];
  if (status === 'SETTLED') {
    if (!record.payoutTxHash) e5Gaps.push('SETTLED without payoutTxHash');
    if (!record.settledAt) e5Gaps.push('SETTLED without settledAt');
  }
  if (status === 'REFUNDED' && !record.refundTxHash) {
    e5Gaps.push('REFUNDED without refundTxHash');
  }
  if (status === 'SETTLING') e5Gaps.push('stuck in SETTLING (claim without completion)');
  checks.push({
    id: 'E5',
    pass: e5Gaps.length === 0,
    detail: e5Gaps.length ? e5Gaps.join('; ') : `status=${status}`,
  });

  const failed = checks.filter((c) => !c.pass).map((c) => c.id);
  const skipped = checks.filter((c) => c.skipped).map((c) => c.id);
  return {
    checks,
    order: record,
    ledger,
    summary: { pass: failed.length === 0, failed, skipped },
  };
}
