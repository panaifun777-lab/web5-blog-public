// ════════════════════════════════════════════════════════════════
// src/app/api/x402/reconciliation/route.ts
// x402 预付费对账 — 管理员查看余额与流水是否一致
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authorizeAdmin } from '@/lib/admin/guard';
import { formatArcUsdc } from '@/lib/web5/auth/eip712-types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const identity = authorizeAdmin(req);
  if (!identity.ok) {
    return NextResponse.json(
      { error: identity.error || 'Unauthorized' },
      { status: identity.status || 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const wallets = await db.backupWallet.findMany({
    include: {
      transactions: {
        select: { type: true, status: true, amountWei: true, txHash: true, createdAt: true },
      },
      deposits: {
        select: { txHash: true, amountWei: true, status: true, createdAt: true },
      },
    },
  });

  let totalActual = 0n;
  let totalExpected = 0n;
  let mismatchCount = 0;

  const rows = wallets.map((wallet) => {
    let credited = 0n;
    let debited = 0n;
    for (const tx of wallet.transactions) {
      const amount = BigInt(tx.amountWei || '0');
      if (tx.type === 'DEPOSIT' && tx.status === 'SUCCESS') credited += amount;
      if (tx.type === 'X402_SPEND' && tx.status === 'SUCCESS') debited += amount;
      if (tx.type === 'WITHDRAW_SETTLEMENT' && tx.status === 'SUCCESS') debited += amount;
    }
    const actual = BigInt(wallet.balanceWei || '0');
    const expected = credited - debited;
    const discrepancy = actual - expected;
    if (discrepancy !== 0n) mismatchCount++;
    totalActual += actual;
    totalExpected += expected;

    return {
      address: wallet.address,
      balanceWei: actual.toString(),
      balanceUsdc: formatArcUsdc(actual),
      expectedBalanceWei: expected.toString(),
      expectedBalanceUsdc: formatArcUsdc(expected),
      discrepancyWei: discrepancy.toString(),
      depositCount: wallet.deposits.length,
      txCount: wallet.transactions.length,
      updatedAt: wallet.updatedAt,
    };
  });

  return NextResponse.json(
    {
      success: true,
      walletCount: wallets.length,
      mismatchCount,
      totals: {
        actualBalanceWei: totalActual.toString(),
        actualBalanceUsdc: formatArcUsdc(totalActual),
        expectedBalanceWei: totalExpected.toString(),
        expectedBalanceUsdc: formatArcUsdc(totalExpected),
        discrepancyWei: (totalActual - totalExpected).toString(),
      },
      wallets: rows,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
