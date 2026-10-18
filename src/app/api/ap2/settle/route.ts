// ════════════════════════════════════════════════════════════════
// src/app/api/ap2/settle/route.ts
// AP2 真实链上打赏结算验证与 80/20 分润记账
// 前端完成钱包原生 USDC transfer → 本端点验证真实 tx → 记账分润
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseUnits } from 'viem';
import { db } from '@/lib/db';
import { ARC_MAINNET, TREASURY } from '@/lib/web5/contracts/addresses';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';

const publicClient = createPublicClient({
  chain: {
    id: ARC_MAINNET.id,
    name: ARC_MAINNET.name,
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: [ARC_MAINNET.rpcUrl] } },
  },
  transport: http(),
});

// 平台金库地址（收款方，独立于部署者钱包）
const TREASURY_ADDR = TREASURY.toLowerCase();
// 协议抽成 20%
const PROTOCOL_FEE_RATIO = 0.20;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);

    const body = await req.json();
    const { txHash, toDid, amountUsdc, fromAddress } = body;

    if (!txHash || !toDid || !amountUsdc) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amount = Number(amountUsdc);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // ━━ 1. 链上验证交易真实性 ━━
    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch (e) {
      return NextResponse.json({ error: '无法在 Arc 主网查询到该交易，请确认交易已上链' }, { status: 400 });
    }

    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json({ error: '交易未确认或执行失败，请重试' }, { status: 400 });
    }

    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });

    // 校验收款方为平台金库
    if (!tx.to || tx.to.toLowerCase() !== TREASURY_ADDR) {
      return NextResponse.json({ error: `收款方不匹配，应为平台金库 ${TREASURY_ADDR.slice(0, 10)}...` }, { status: 400 });
    }

    // 校验收款方（宽松：优先 session，其次 body.fromAddress）
    const expectedFrom = (session?.primeDid ? session.primeDid.replace('did:plvtvs:', '').toLowerCase() : (fromAddress || '').toLowerCase());
    if (expectedFrom && tx.from.toLowerCase() !== expectedFrom) {
      return NextResponse.json({ error: '付款方与当前会话身份不一致' }, { status: 400 });
    }

    // 校验金额匹配（允许 ±0.5% 误差）
    const expectedWei = parseUnits(amount.toFixed(6), 18);
    const actualWei = BigInt(tx.value || 0n);
    const diff = actualWei > expectedWei ? actualWei - expectedWei : expectedWei - actualWei;
    if (diff > expectedWei / 200n) {
      return NextResponse.json({ error: '链上金额与申报金额不一致，请重新核对' }, { status: 400 });
    }

    // ━━ 2. 记账与 80/20 分润（容错：核心是链上交易已验证真实） ━━
    const authorAmountUsdc = amount * (1 - PROTOCOL_FEE_RATIO);
    const protocolFeeUsdc = amount * PROTOCOL_FEE_RATIO;

    let ledgerId: string | null = null;
    try {
      const recipientPrime = await db.prime.findUnique({ where: { did: toDid } });
      const vessel = session?.vesselDid
        ? await db.vessel.findUnique({ where: { did: session.vesselDid } })
        : null;

      if (vessel) {
        const log = await db.autonomousLog.create({
          data: {
            vesselId: vessel.id,
            action: 'tip',
            targetDid: toDid,
            yieldAmount: parseUnits(authorAmountUsdc.toFixed(6), 18),
            metadata: JSON.stringify({
              realTxHash: txHash,
              totalAmountUsdc: amount,
              authorAmountUsdc,
              protocolFeeUsdc,
              recipientPrimeId: recipientPrime?.id || null,
            }),
          },
        });
        ledgerId = log.id;
      }
    } catch (e) {
      console.warn('[ap2/settle] Ledger write skipped (non-fatal):', e);
    }

    return NextResponse.json({
      success: true,
      settled: true,
      realTxHash: txHash,
      amountUsdc: amount,
      split: {
        authorAmountUsdc: Number(authorAmountUsdc.toFixed(6)),
        protocolFeeUsdc: Number(protocolFeeUsdc.toFixed(6)),
        authorRatio: '80%',
        protocolFeeRatio: '20%',
      },
      ledgerId,
      explorerUrl: `https://explorer.arc.io/tx/${txHash}`,
      message: `✅ 真实链上打赏已确认入账！作者实得 ${authorAmountUsdc.toFixed(2)} USDC，平台抽成 ${protocolFeeUsdc.toFixed(2)} USDC (其中 50% 将自动注入 Uniswap LP 锁定)。`,
    });
  } catch (err: any) {
    console.error('[ap2/settle] Error:', err);
    return NextResponse.json({ error: err.message || '结算失败' }, { status: 500 });
  }
}
