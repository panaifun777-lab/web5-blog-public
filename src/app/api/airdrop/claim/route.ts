// ════════════════════════════════════════════════════════════════
// src/app/api/airdrop/claim/route.ts
// Genesis airdrop claim. Disabled by default.
// Requires a fresh wallet signature; the recipient is recovered from it.
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  createWalletClient,
  createPublicClient,
  http,
  isAddress,
  parseUnits,
  parseGwei,
  verifyMessage,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { db } from '@/lib/db';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';
import { arcChain } from '@/lib/web5/payments/arc';
import { AIRDROP_ENABLED, featureDisabled } from '@/lib/launch/flags';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

function claimMessage(address: string, timestamp: number) {
  return [
    'Web5.blog Genesis Airdrop Claim',
    '',
    `Wallet: ${address.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    '',
    'Signing does not move funds. It only proves control of this wallet.',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(`airdrop:${clientIp(req)}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  if (!AIRDROP_ENABLED) {
    return featureDisabled('AIRDROP_DISABLED', '创世空投处于内测展示阶段，尚未开放领取。');
  }

  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
    const timestamp = Number(body.timestamp);
    const signature = typeof body.signature === 'string' ? body.signature : '';

    if (!isAddress(walletAddress) || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      return NextResponse.json(
        { error: '钱包地址与签名必填' },
        { status: 400 }
      );
    }
    if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60_000) {
      return NextResponse.json(
        { error: '签名已过期，请重新签名' },
        { status: 401 }
      );
    }

    const normalized = walletAddress.toLowerCase();
    const message = claimMessage(normalized, timestamp);

    let valid = false;
    try {
      valid = await verifyMessage({
        address: normalized as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      valid = false;
    }
    if (!valid) {
      return NextResponse.json({ error: '签名验证失败' }, { status: 401 });
    }

    const deployerPk = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
    if (!deployerPk || !/^0x[0-9a-fA-F]{64}$/.test(deployerPk)) {
      return featureDisabled('AIRDROP_SIGNER_MISSING', '空投出纳签名器未配置。');
    }

    // Claim once per wallet. The record is created before broadcasting.
    let claimRecordId: string;
    try {
      const record = await db.authNonce.create({
        data: {
          address: normalized,
          purpose: 'AIRDROP_CLAIM',
          nonce: 0n,
          signature,
          deadline: BigInt(Math.floor(timestamp / 1000) + 300),
        },
      });
      claimRecordId = record.id;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return NextResponse.json(
          {
            success: true,
            alreadyClaimed: true,
            message: '该钱包已提交过创世空投领取。',
          },
          { status: 200 }
        );
      }
      throw err;
    }

    try {
      const account = privateKeyToAccount(deployerPk);
      const walletClient = createWalletClient({
        account,
        chain: arcChain,
        transport: http(ARC_MAINNET.rpcUrl),
      });
      const publicClient = createPublicClient({
        chain: arcChain,
        transport: http(ARC_MAINNET.rpcUrl),
      });

      const amount = parseUnits('1000', 18);
      const txHash = await walletClient.writeContract({
        address: ARC_MAINNET.addresses.WBOG as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [normalized as `0x${string}`, amount],
        maxFeePerGas: parseGwei('25'),
        maxPriorityFeePerGas: parseGwei('2'),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
        timeout: 120_000,
      });
      if (receipt.status !== 'success') {
        throw new Error('Airdrop transaction reverted');
      }

      return NextResponse.json(
        {
          success: true,
          amount: 1000,
          token: 'WBOG',
          recipient: normalized,
          txHash,
          explorerUrl: `${ARC_MAINNET.explorer}/tx/${txHash}`,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (err: any) {
      await db.authNonce.delete({ where: { id: claimRecordId } }).catch(() => {});
      console.error('[Airdrop Claim Error]:', err);
      return NextResponse.json(
        { error: '空投划拨失败，请稍后重试' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('[Airdrop Claim Error]:', err);
    return NextResponse.json(
      { error: err.message || '空投划拨失败' },
      { status: 500 }
    );
  }
}
