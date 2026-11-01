import { isAddress } from 'viem';
import { getTreasuryAddress } from '@/lib/web5/contracts/addresses';
import { db } from '@/lib/db';
import { arcChain, arcPublicClient } from './arc-chain';
import { PayoutSignerError, assertPayoutSignerReady, loadLocalPayoutAccount } from './signer';
import type { PayoutSigner } from './signer';
import { checkHotWalletCeiling } from './hot-wallet';

// Chain/client live in ./arc-chain so the signer module can reuse them without
// importing this Prisma-backed file. Re-exported for existing importers.
export { arcChain, arcPublicClient };

/** 服务端硬上限：env 只能调低，不能突破 5 / 25。 */
export const PAYOUT_SINGLE_CAP_USDC = Math.min(
  Number(process.env.PAYOUT_SINGLE_CAP_USDC || 5) || 5,
  5
);
export const PAYOUT_DAILY_CAP_USDC = Math.min(
  Number(process.env.PAYOUT_DAILY_CAP_USDC || 25) || 25,
  25
);
const SINGLE_CAP_USDC = PAYOUT_SINGLE_CAP_USDC;
const DAILY_CAP_USDC = PAYOUT_DAILY_CAP_USDC;

export type PayoutFailure = {
  ok: false;
  reason: string;
  code?: 'CAP_SINGLE' | 'CAP_DAILY' | 'CAP_HOT_WALLET' | 'BALANCE_UNAVAILABLE' | 'NO_SIGNER' | 'TX_FAILED';
  status?: number;
};

export interface VerifiedTransfer {
  txHash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  valueWei: bigint;
  blockNumber: bigint;
  confirmations: number;
}

export async function verifyNativeTransfer(params: {
  txHash: string;
  to?: string;
  from?: string;
  minValueWei: bigint;
  exactValueWei?: bigint;
  minConfirmations?: number;
}): Promise<{ ok: true; transfer: VerifiedTransfer } | { ok: false; reason: string }> {
  const { txHash, to, from, minValueWei, exactValueWei, minConfirmations = 3 } = params;

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { ok: false, reason: 'Malformed transaction hash' };
  }

  try {
    const receipt = await arcPublicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
    if (!receipt || receipt.status !== 'success') {
      return { ok: false, reason: 'Transaction is not confirmed or failed' };
    }

    const tx = await arcPublicClient.getTransaction({
      hash: txHash as `0x${string}`,
    });
    if (tx.to && to && tx.to.toLowerCase() !== to.toLowerCase()) {
      return { ok: false, reason: 'Recipient mismatch' };
    }
    if (from && tx.from.toLowerCase() !== from.toLowerCase()) {
      return { ok: false, reason: 'Sender mismatch' };
    }
    if (tx.value < minValueWei) {
      return { ok: false, reason: 'Transferred amount is below the required amount' };
    }
    if (exactValueWei !== undefined && tx.value !== exactValueWei) {
      return { ok: false, reason: 'Transferred amount does not match the recorded amount' };
    }

    const blockNumber = await arcPublicClient.getBlockNumber();
    const confirmations = Number(blockNumber - receipt.blockNumber + 1n);
    if (confirmations < minConfirmations) {
      return {
        ok: false,
        reason: `Waiting for confirmations (${confirmations}/${minConfirmations})`,
      };
    }

    return {
      ok: true,
      transfer: {
        txHash: txHash as `0x${string}`,
        from: tx.from,
        to: (tx.to || '0x0') as `0x${string}`,
        valueWei: tx.value,
        blockNumber: receipt.blockNumber,
        confirmations,
      },
    };
  } catch (err: any) {
    console.warn('[arc] Transfer verification failed:', err?.shortMessage || err?.message);
    return { ok: false, reason: 'Transaction not found on Arc Mainnet' };
  }
}

/**
 * @deprecated Use the signer abstraction (`resolveSigner()` from ./signer).
 * Kept for the withdraw route: returns the validated local treasury account.
 * Delegates to the single loader in ./signer so messages cannot drift.
 */
export function getPayoutAccount() {
  return loadLocalPayoutAccount();
}

const USDC_UNIT = 10n ** 18n;

/**
 * 单笔与滚动 24h 上限校验。以 PayoutLedger 的真实出款为基准，
 * 超限时不发任何交易。
 */
export async function checkPayoutCaps(amountWei: bigint): Promise<
  { ok: true } | { ok: false; reason: string; code: 'CAP_SINGLE' | 'CAP_DAILY'; status: number }
> {
  const singleCapWei = BigInt(SINGLE_CAP_USDC) * USDC_UNIT;
  if (amountWei > singleCapWei) {
    return {
      ok: false,
      reason: `单笔出款超过上限 ${SINGLE_CAP_USDC} USDC`,
      code: 'CAP_SINGLE',
      status: 409,
    };
  }

  const windowStart = new Date(Date.now() - 24 * 3600 * 1000);
  const rows = await db.payoutLedger.findMany({
    where: {
      createdAt: { gte: windowStart },
      kind: { in: ['AGENT', 'FEE', 'REFUND'] },
    },
    select: { amountWei: true },
  });
  const spent = rows.reduce((sum, row) => sum + BigInt(row.amountWei), 0n);
  if (spent + amountWei > BigInt(DAILY_CAP_USDC) * USDC_UNIT) {
    return {
      ok: false,
      reason: `24h 出款超过上限 ${DAILY_CAP_USDC} USDC`,
      code: 'CAP_DAILY',
      status: 409,
    };
  }

  return { ok: true };
}

// Serializes cap-check + broadcast inside this process so two concurrent
// payouts cannot both read the same spent total and overshoot the cap.
let payoutQueue: Promise<unknown> = Promise.resolve();

export async function sendNativeUsdc(params: {
  to: string;
  amountWei: bigint;
}): Promise<
  | { ok: true; txHash: `0x${string}`; blockNumber: string }
  | PayoutFailure
> {
  const run = payoutQueue.then(() => sendNativeUsdcSerialized(params));
  payoutQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function sendNativeUsdcSerialized(params: {
  to: string;
  amountWei: bigint;
}): Promise<
  | { ok: true; txHash: `0x${string}`; blockNumber: string }
  | PayoutFailure
> {
  if (!isAddress(params.to)) return { ok: false, reason: 'Invalid recipient address', code: 'TX_FAILED' };
  if (params.amountWei <= 0n) return { ok: false, reason: 'Amount must be positive', code: 'TX_FAILED' };

  const capped = await checkPayoutCaps(params.amountWei);
  if (!capped.ok) return { ok: false, reason: capped.reason, code: capped.code, status: capped.status };

  // Signer selection: remote KMS when explicitly configured, otherwise the
  // unchanged local key. A half-configured KMS fails closed here (NO_SIGNER);
  // it never degrades to signing with the VPS key.
  let signer: PayoutSigner;
  try {
    signer = assertPayoutSignerReady();
  } catch (err) {
    if (err instanceof PayoutSignerError) {
      return { ok: false, reason: err.message, code: 'NO_SIGNER', status: 503 };
    }
    throw err;
  }

  // Hot-wallet exposure rail: refuse before anything is signed or sent.
  try {
    const balanceWei = await arcPublicClient.getBalance({ address: getTreasuryAddress() });
    const ceiling = checkHotWalletCeiling({ balanceWei, pendingPayoutWei: params.amountWei });
    if (!ceiling.ok) {
      console.warn('[arc] Payout refused by hot-wallet rail:', ceiling.reason);
      return { ok: false, reason: ceiling.detail, code: 'CAP_HOT_WALLET', status: 409 };
    }
  } catch (err: any) {
    console.warn('[arc] Hot-wallet balance check failed:', err?.shortMessage || err?.message);
    return {
      ok: false,
      reason: 'Cannot read the treasury hot-wallet balance; refusing to sign',
      code: 'BALANCE_UNAVAILABLE',
      status: 503,
    };
  }

  try {
    const txHash = await signer.sendNativeUsdc(params.to as `0x${string}`, params.amountWei);

    const receipt = await arcPublicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 120_000,
    });
    if (receipt.status !== 'success') {
      return { ok: false, reason: 'Payout transaction reverted', code: 'TX_FAILED' };
    }
    return { ok: true, txHash, blockNumber: receipt.blockNumber.toString() };
  } catch (err: any) {
    if (err instanceof PayoutSignerError) {
      console.warn('[arc] Payout signer unavailable:', err.code);
      return { ok: false, reason: err.message, code: 'NO_SIGNER', status: 503 };
    }
    console.warn('[arc] Payout failed:', err?.shortMessage || err?.message);
    return { ok: false, reason: 'Payout transaction failed', code: 'TX_FAILED' };
  }
}
