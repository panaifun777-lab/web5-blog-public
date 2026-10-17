// ════════════════════════════════════════════════════════════════
// src/app/api/airdrop/claim/route.ts
// 创世先锋 1,000 $WBOG 链上空投申领 API (Circle ARC Mainnet 5042)
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, defineChain, parseUnits, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { db } from '@/lib/db';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

const arcMainnetChain = defineChain({
  id: ARC_MAINNET.id,
  name: ARC_MAINNET.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_MAINNET.rpcUrl] } },
  blockExplorers: { default: { name: 'ArcScan', url: ARC_MAINNET.explorer } },
});

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
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, primeDid } = await req.json();
    const recipient = (walletAddress || (primeDid ? primeDid.replace('did:plvtvs:', '') : '')).toLowerCase();

    if (!recipient || !recipient.startsWith('0x') || recipient.length !== 42) {
      return NextResponse.json({ error: '无效的 Web3 钱包地址，无法接收代币' }, { status: 400 });
    }

    // 检查是否已在数据库中领取过 (防女巫双花)
    const existing = await db.interaction.findFirst({
      where: {
        primeId: recipient,
        type: 'TIP',
        comment: { startsWith: '[GENESIS_AIRDROP_CLAIMED]' },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        message: '该钱包已领取过创世先锋 1,000 $WBOG 空投！',
        txHash: (existing.comment || '').replace('[GENESIS_AIRDROP_CLAIMED]:', '').trim(),
      });
    }

    const deployerPk = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
    if (!deployerPk || !deployerPk.startsWith('0x')) {
      return NextResponse.json({ error: '出纳私钥未就绪' }, { status: 500 });
    }

    const account = privateKeyToAccount(deployerPk);
    const walletClient = createWalletClient({
      account,
      chain: arcMainnetChain,
      transport: http(),
    });
    const publicClient = createPublicClient({
      chain: arcMainnetChain,
      transport: http(),
    });

    const amount = parseUnits('1000', 18);

    console.log(`[Airdrop] Transferring 1,000 $WBOG to ${recipient} on Circle ARC...`);
    const txHash = await walletClient.writeContract({
      address: ARC_MAINNET.addresses.WBOG as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient as `0x${string}`, amount],
      maxFeePerGas: parseGwei('25'),
      maxPriorityFeePerGas: parseGwei('2'),
    });

    console.log(`[Airdrop] Tx submitted: ${txHash}`);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[Airdrop] Confirmed: ${txHash}`);

    // 记录在数据库中防止重复领取
    try {
      await db.interaction.create({
        data: {
          contentId: 'genesis-airdrop-pool',
          vesselDid: `did:eidolon:airdrop-cashier`,
          primeId: recipient,
          type: 'TIP',
          amount: amount,
          comment: `[GENESIS_AIRDROP_CLAIMED]:${txHash}`,
        },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      amount: 1000,
      token: 'WBOG',
      recipient,
      txHash,
      explorerUrl: `https://explorer.arc.io/tx/${txHash}`,
    });
  } catch (err: any) {
    console.error('[Airdrop Claim Error]:', err);
    return NextResponse.json({ error: err.message || '空投划拨失败' }, { status: 500 });
  }
}
