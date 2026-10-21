// ════════════════════════════════════════════════════════════════
// src/lib/web5/x402/settlement.ts
// x402 凭单结算：签名通过后，从付款方站内预付费余额原子扣减
// - 余额不足 / 未注册付款方 / 并发扣减 → 拒绝
// - AuthNonce 持久化，阻止跨进程重启的 nonce 重放
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import { TREASURY } from '@/lib/web5/contracts/addresses';
import { VOUCHER_TTL_MS, decimalToAtomicUsdc, type SessionVoucher } from './voucher-engine';

const X402_NONCE_PURPOSE = 'X402_VOUCHER';

export interface VoucherSettlementResult {
  ok: boolean;
  reason?: string;
  balanceAfterWei?: string;
}

/** 生产默认要求预付费余额；仅本地无资金联调时可显式关闭 */
export function isPrepaidSettlementRequired(): boolean {
  return process.env.X402_REQUIRE_PREPAID !== 'false';
}

export async function settleVoucherFromPrepaidBalance(
  voucher: SessionVoucher
): Promise<VoucherSettlementResult> {
  const amountAtomic = decimalToAtomicUsdc(voucher.amountUsdc);
  if (amountAtomic === null || amountAtomic <= 0n) {
    return { ok: false, reason: 'invalid_amount' };
  }

  const signer = voucher.signerAddress.toLowerCase();

  // 跨重启重放：同一张凭单签名只允许结算一次
  const settledSignature = await db.authNonce.findUnique({
    where: { signature: voucher.signature },
    select: { id: true },
  });
  if (settledSignature) {
    return { ok: false, reason: 'Replay detected: voucher already settled' };
  }

  const nonceTaken = await db.authNonce.findUnique({
    where: {
      address_purpose_nonce: {
        address: signer,
        purpose: X402_NONCE_PURPOSE,
        nonce: BigInt(voucher.nonce),
      },
    },
    select: { id: true },
  });
  if (nonceTaken) {
    return { ok: false, reason: 'Replay detected: nonce already settled' };
  }

  // 付款方可以是轻钱包本身，或已绑定主钱包对应的轻钱包
  const prime = await db.prime.findUnique({
    where: { walletAddress: signer },
    select: { id: true },
  });

  let wallet = await db.backupWallet.findUnique({ where: { address: signer } });
  if (!wallet && prime) {
    wallet = await db.backupWallet.findFirst({ where: { primeId: prime.id } });
  }
  if (!wallet) {
    return { ok: false, reason: 'payer_not_registered' };
  }
  if (wallet.asset !== 'USDC') {
    return { ok: false, reason: 'unsupported_payment_asset' };
  }

  const currentBalance = BigInt(wallet.balanceWei || '0');
  if (currentBalance < amountAtomic) {
    return { ok: false, reason: 'insufficient_prepaid_balance', balanceAfterWei: currentBalance.toString() };
  }
  const nextBalance = currentBalance - amountAtomic;

  try {
    await db.$transaction(async (tx) => {
      // 条件更新：余额在读取后被并发修改时拒绝，避免双花
      const updated = await tx.backupWallet.updateMany({
        where: { id: wallet.id, balanceWei: wallet.balanceWei },
        data: { balanceWei: nextBalance.toString() },
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
          targetAddress: TREASURY,
          status: 'SUCCESS',
          signature: voucher.signature,
          metadata: JSON.stringify({
            contentId: voucher.contentId,
            authorDid: voucher.authorDid,
            nonce: voucher.nonce,
            timestamp: voucher.timestamp,
          }),
        },
      });

      await tx.authNonce.create({
        data: {
          address: signer,
          primeId: prime?.id || null,
          purpose: X402_NONCE_PURPOSE,
          nonce: BigInt(voucher.nonce),
          signature: voucher.signature,
          deadline: BigInt(Math.floor((voucher.timestamp + VOUCHER_TTL_MS) / 1000)),
        },
      });
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return { ok: false, reason: 'Replay detected: nonce already settled' };
    }
    if (err?.message === 'concurrent_debit') {
      return { ok: false, reason: 'concurrent_debit' };
    }
    console.warn('[x402 Settlement] Debit failed:', err?.message);
    return { ok: false, reason: 'settlement_failed' };
  }

  return { ok: true, balanceAfterWei: nextBalance.toString() };
}
