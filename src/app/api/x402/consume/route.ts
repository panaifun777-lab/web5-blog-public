// ════════════════════════════════════════════════════════════════
// src/app/api/x402/consume/route.ts
// x402 Client Payment Consumption / Pre-paid Balance Deduction API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { db } from '@/lib/db';
import { decimalToAtomicUsdc } from '@/lib/web5/x402/voucher-engine';
import { TREASURY } from '@/lib/web5/contracts/addresses';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`x402-consume:${clientIp(req)}`, 30, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

  try {
    const body = await req.json();
    const { amountUsdc, recipient, contentId, authorDid, signerAddress, memo } = body || {};

    if (!amountUsdc || typeof amountUsdc !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing or invalid amountUsdc' }, { status: 400 });
    }

    const amountAtomic = decimalToAtomicUsdc(amountUsdc);
    if (amountAtomic === null || amountAtomic <= 0n) {
      return NextResponse.json({ success: false, error: 'Invalid amount atomic conversion' }, { status: 400 });
    }

    const signer = (signerAddress || '').trim().toLowerCase();
    if (!isAddress(signer)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid signerAddress' }, { status: 400 });
    }

    // Find backup wallet for signer
    const wallet = await db.backupWallet.findUnique({
      where: { address: signer },
    });

    if (!wallet) {
      return NextResponse.json({
        success: false,
        error: 'Payer not registered with prepaid balance',
        reason: 'payer_not_registered',
      }, { status: 402 });
    }

    const currentBalance = BigInt(wallet.balanceWei || '0');
    if (currentBalance < amountAtomic) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient prepaid balance',
        reason: 'insufficient_prepaid_balance',
        balanceWei: currentBalance.toString(),
        requiredWei: amountAtomic.toString(),
      }, { status: 402 });
    }

    const nextBalance = currentBalance - amountAtomic;
    const timestamp = Date.now();
    const nonce = Number(wallet.nonce || 0n) + 1;
    const receiptId = `x402_rcpt_${signer.slice(0, 8)}_${timestamp}_${nonce}`;
    const token = Buffer.from(JSON.stringify({ receiptId, signerAddress: signer, amountUsdc, timestamp, nonce })).toString('base64url');

    await db.$transaction(async (tx) => {
      const updated = await tx.backupWallet.updateMany({
        where: { id: wallet.id, balanceWei: wallet.balanceWei },
        data: {
          balanceWei: nextBalance.toString(),
          nonce: BigInt(nonce),
        },
      });

      if (updated.count !== 1) {
        throw new Error('concurrent_debit');
      }

      await tx.backupWalletTx.create({
        data: {
          backupWalletId: wallet.id,
          type: 'X402_SPEND',
          amountWei: amountAtomic.toString(),
          balanceAfterWei: nextBalance.toString(),
          targetAddress: recipient || TREASURY,
          status: 'SUCCESS',
          metadata: JSON.stringify({
            contentId: contentId || null,
            authorDid: authorDid || null,
            memo: memo || null,
            timestamp,
            nonce,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      receiptId,
      token,
      amountUsdc,
      recipient: recipient || TREASURY,
      balanceAfterWei: nextBalance.toString(),
      timestamp,
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Authorization': `Bearer ${token}`,
        'X-402-Payment-Receipt': receiptId,
      },
    });
  } catch (err: any) {
    if (err?.message === 'concurrent_debit') {
      return NextResponse.json({ success: false, error: 'Concurrent debit conflict, please retry', reason: 'concurrent_debit' }, { status: 409 });
    }
    console.error('[x402 Consume API] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
