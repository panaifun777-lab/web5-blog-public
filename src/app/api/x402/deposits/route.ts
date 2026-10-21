// ════════════════════════════════════════════════════════════════
// src/app/api/x402/deposits/route.ts
// x402 预付费充值：校验链上 USDC 转账后 credited 到付款方余额
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { db } from '@/lib/db';
import { TREASURY } from '@/lib/web5/contracts/addresses';
import { verifyNativeTransfer } from '@/lib/web5/payments/arc';
import { ARC_MAINNET_CHAIN_ID, formatArcUsdc } from '@/lib/web5/auth/eip712-types';
import { X402_DEPOSITS_ENABLED, featureDisabled } from '@/lib/launch/flags';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!X402_DEPOSITS_ENABLED) {
    return featureDisabled(
      'X402_DEPOSITS_DISABLED',
      'x402 预付费充值尚未开放：对账与提现链路仍在验证中。'
    );
  }

  const limited = rateLimit(`x402-deposit:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : '';
    const address = typeof body?.address === 'string' ? body.address.trim() : '';

    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'Invalid txHash' }, { status: 400 });
    }
    if (!isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    const sender = address.toLowerCase();

    const existing = await db.chainDeposit.findUnique({ where: { txHash } });
    if (existing) {
      return NextResponse.json(
        { error: 'This deposit transaction was already credited' },
        { status: 409 }
      );
    }

    // 必须是从付款地址发往平台金库的真实原生 USDC 转账
    const verified = await verifyNativeTransfer({
      txHash,
      from: sender,
      to: TREASURY,
      minValueWei: 1n,
      minConfirmations: 3,
    });
    if (!verified.ok) {
      return NextResponse.json(
        { error: `Deposit verification failed: ${verified.reason}` },
        { status: 400 }
      );
    }

    const amountWei = verified.transfer.valueWei;
    const result = await db.$transaction(async (tx) => {
      const wallet = await tx.backupWallet.upsert({
        where: { address: sender },
        update: {},
        create: {
          address: sender,
          balanceWei: '0',
          asset: 'USDC',
        },
      });

      await tx.chainDeposit.create({
        data: {
          txHash,
          fromAddress: sender,
          toAddress: verified.transfer.to.toLowerCase(),
          amountWei: amountWei.toString(),
          asset: 'USDC',
          chainId: ARC_MAINNET_CHAIN_ID,
          blockNumber: verified.transfer.blockNumber.toString(),
          status: 'CREDITED',
          backupWalletId: wallet.id,
        },
      });

      const nextBalance = (BigInt(wallet.balanceWei) + amountWei).toString();
      const updatedCount = await tx.backupWallet.updateMany({
        where: { id: wallet.id, balanceWei: wallet.balanceWei },
        data: { balanceWei: nextBalance },
      });
      if (updatedCount.count !== 1) {
        throw new Error('concurrent_deposit');
      }
      const updated = { ...wallet, balanceWei: nextBalance };

      await tx.backupWalletTx.create({
        data: {
          backupWalletId: wallet.id,
          type: 'DEPOSIT',
          amountWei: amountWei.toString(),
          balanceAfterWei: updated.balanceWei,
          txHash,
          targetAddress: TREASURY,
          status: 'SUCCESS',
          metadata: JSON.stringify({
            chainId: ARC_MAINNET_CHAIN_ID,
            blockNumber: verified.transfer.blockNumber.toString(),
            confirmations: verified.transfer.confirmations,
          }),
        },
      });

      return updated;
    });

    return NextResponse.json(
      {
        success: true,
        credited: true,
        txHash,
        address: sender,
        amountWei: amountWei.toString(),
        amountUsdc: formatArcUsdc(amountWei),
        balanceWei: result.balanceWei,
        balanceUsdc: formatArcUsdc(result.balanceWei),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'This deposit transaction was already credited' },
        { status: 409 }
      );
    }
    if (err?.message === 'concurrent_deposit') {
      return NextResponse.json(
        { error: 'Concurrent deposit detected, please retry' },
        { status: 409 }
      );
    }
    console.error('[x402/deposits] Error:', err);
    return NextResponse.json({ error: 'Deposit failed' }, { status: 500 });
  }
}
