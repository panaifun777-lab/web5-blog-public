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
import { ARC_MAINNET, TREASURY } from '@/lib/web5/contracts/addresses';

export const arcChain = defineChain({
  id: ARC_MAINNET.id,
  name: ARC_MAINNET.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_MAINNET.rpcUrl] } },
  blockExplorers: { default: { name: 'ArcScan', url: ARC_MAINNET.explorer } },
});

export const arcPublicClient = createPublicClient({
  chain: arcChain,
  transport: http(ARC_MAINNET.rpcUrl),
});

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
  minConfirmations?: number;
}): Promise<{ ok: true; transfer: VerifiedTransfer } | { ok: false; reason: string }> {
  const { txHash, to, from, minValueWei, minConfirmations = 3 } = params;

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
    if (account.address.toLowerCase() !== TREASURY.toLowerCase()) {
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

export async function sendNativeUsdc(params: {
  to: string;
  amountWei: bigint;
}): Promise<{ ok: true; txHash: `0x${string}` } | { ok: false; reason: string }> {
  if (!isAddress(params.to)) return { ok: false, reason: 'Invalid recipient address' };
  if (params.amountWei <= 0n) return { ok: false, reason: 'Amount must be positive' };

  const payout = getPayoutAccount();
  if (!payout.ok) return { ok: false, reason: payout.reason };

  try {
    const walletClient = createWalletClient({
      account: payout.account,
      chain: arcChain,
      transport: http(ARC_MAINNET.rpcUrl),
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
      return { ok: false, reason: 'Payout transaction reverted' };
    }
    return { ok: true, txHash };
  } catch (err: any) {
    console.warn('[arc] Payout failed:', err?.shortMessage || err?.message);
    return { ok: false, reason: 'Payout transaction failed' };
  }
}
