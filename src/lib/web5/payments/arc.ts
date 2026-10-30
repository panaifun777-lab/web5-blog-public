import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  isAddress,
  parseGwei,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getActiveChain, getTreasuryAddress } from '@/lib/web5/contracts/addresses';
import { db } from '@/lib/db';

const ACTIVE_CHAIN = getActiveChain();

export const arcChain = defineChain({
  id: ACTIVE_CHAIN.id,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ACTIVE_CHAIN.rpcUrl] } },
  blockExplorers: { default: { name: 'ArcScan', url: ACTIVE_CHAIN.explorer } },
});

export const arcPublicClient = createPublicClient({
  chain: arcChain,
  transport: http(ACTIVE_CHAIN.rpcUrl),
});

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
  code?: 'CAP_SINGLE' | 'CAP_DAILY' | 'NO_SIGNER' | 'TX_FAILED';
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

export function getPayoutAccount() {
  const key = process.env.TREASURY_PAYOUT_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    return { ok: false as const, reason: 'TREASURY_PAYOUT_PRIVATE_KEY is not configured' };
  }
  try {
    const account = privateKeyToAccount(key as `0x${string}`);
    if (account.address.toLowerCase() !== getTreasuryAddress().toLowerCase()) {
      return {
        ok: false as const,
        reason: 'Payout key does not belong to the treasury address',
      };
    }
    return { ok: true as const, account };
  } catch {
    return { ok: false as const, reason: 'Invalid payout private key' };
  }
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

  const payout = getPayoutAccount();
  if (!payout.ok) {
    return { ok: false, reason: payout.reason, code: 'NO_SIGNER', status: 503 };
  }

  try {
    const walletClient = createWalletClient({
      account: payout.account,
      chain: arcChain,
      transport: http(ACTIVE_CHAIN.rpcUrl),
    });

    const txHash = await walletClient.sendTransaction({
      to: getAddress(params.to),
      value: params.amountWei,
      maxFeePerGas: parseGwei('25'),
      maxPriorityFeePerGas: parseGwei('2'),
    });

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
    console.warn('[arc] Payout failed:', err?.shortMessage || err?.message);
    return { ok: false, reason: 'Payout transaction failed', code: 'TX_FAILED' };
  }
}
