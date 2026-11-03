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
import { MONEY_FLOWS_ENABLED, moneyFlowBlocked } from '@/lib/launch/flags';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';

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
// 策展人返佣 15% (Curate-to-Earn 裂变返佣)
const CURATOR_REBATE_RATIO = 0.15;

export async function POST(req: NextRequest) {
  if (!MONEY_FLOWS_ENABLED) return moneyFlowBlocked(undefined, req);

  const limited = rateLimit(`ap2-settle:${clientIp(req)}`, 20, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);
    if (!session || session.accessMode !== 'vessel') {
      return apiError('VESSEL_SESSION_REQUIRED', { request: req });
    }

    const body = await req.json();
    const { txHash, toDid, amountUsdc, fromAddress, ref, contentHash } = body;

    if (!txHash || !toDid || !amountUsdc) {
      return apiError('MISSING_FIELDS', { request: req });
    }

    const amount = Number(amountUsdc);
    if (!amount || amount <= 0) {
      return apiError('INVALID_AMOUNT', { request: req });
    }

    // ━━ 1. 链上验证交易真实性 ━━
    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch (e) {
      return apiError('TX_NOT_FOUND', { request: req });
    }

    if (!receipt || receipt.status !== 'success') {
      return apiError('TX_NOT_CONFIRMED', { request: req });
    }

    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });

    // 校验收款方为平台金库
    if (!tx.to || tx.to.toLowerCase() !== TREASURY_ADDR) {
      return apiError('RECIPIENT_MISMATCH', {
        request: req,
        params: { address: `${TREASURY_ADDR.slice(0, 10)}...` },
      });
    }

    // 校验付款方（优先用前端传的专用钱包地址 fromAddress，其次会话主钱包）
    const expectedFrom = (fromAddress || session?.primeDid?.replace('did:plvtvs:', '') || '').toLowerCase();
    if (expectedFrom && tx.from.toLowerCase() !== expectedFrom) {
      return apiError('SENDER_MISMATCH', { request: req });
    }

    // 校验金额匹配（允许 ±0.5% 误差）
    const expectedWei = parseUnits(amount.toFixed(6), 18);
    const actualWei = BigInt(tx.value || 0n);
    const diff = actualWei > expectedWei ? actualWei - expectedWei : expectedWei - actualWei;
    if (diff > expectedWei / 200n) {
      return apiError('AMOUNT_MISMATCH', { request: req });
    }

    // ━━ 2. 交易级防重放：同一 txHash 只允许入账一次 ━━
    try {
      await db.authNonce.create({
        data: {
          address: expectedFrom || session.primeDid.replace('did:plvtvs:', '').toLowerCase(),
          purpose: 'AP2_SETTLE_TX',
          nonce: BigInt(`0x${txHash.slice(2, 18)}`),
          signature: txHash.toLowerCase(),
          deadline: BigInt(Math.floor(Date.now() / 1000) + 86_400),
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return apiError('REPLAY', { request: req });
      }
      throw err;
    }

    // ━━ 3. 记账与计划分润（链上收款已确认；作者分账仍需出款） ━━
    const authorAmountUsdc = amount * (1 - PROTOCOL_FEE_RATIO);
    const protocolFeeUsdc = amount * PROTOCOL_FEE_RATIO;
    const curatorRef = typeof ref === 'string' && ref.trim() ? ref.trim() : null;
    const curatorAmountUsdc = curatorRef ? amount * CURATOR_REBATE_RATIO : 0;

    let ledgerId: string | null = null;
    let curatorLedgerId: string | null = null;
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
              curatorAmountUsdc,
              curatorRef,
              recipientPrimeId: recipientPrime?.id || null,
            }),
          },
        });
        ledgerId = log.id;
      }

      // 如果存在推荐人 ref，记录策展人分润日志
      if (curatorRef) {
        // 查找或记录策展人分润
        const curatorPrime = await db.prime.findFirst({
          where: {
            OR: [
              { did: curatorRef },
              { walletAddress: curatorRef.toLowerCase() },
            ],
          },
          include: { vessels: true },
        });

        const curatorVesselId = curatorPrime?.vessels?.[0]?.id || vessel?.id;
        if (curatorVesselId) {
          const curatorLog = await db.autonomousLog.create({
            data: {
              vesselId: curatorVesselId,
              action: 'curate_rebate',
              targetDid: curatorRef,
              targetContent: contentHash || null,
              yieldAmount: parseUnits(curatorAmountUsdc.toFixed(6), 18),
              metadata: JSON.stringify({
                sourceTxHash: txHash,
                totalPaymentUsdc: amount,
                curatorRebateUsdc: curatorAmountUsdc,
                rebateRate: '15%',
                curatorRef,
                payerDid: session?.vesselDid || fromAddress || null,
              }),
            },
          });
          curatorLedgerId = curatorLog.id;
        }
      }
    } catch (e) {
      console.warn('[ap2/settle] Ledger write skipped (non-fatal):', e);
    }

    return NextResponse.json({
      success: true,
      settled: true,
      realTxHash: txHash,
      amountUsdc: amount,
      walletReceivedUsdc: amount,
      split: {
        plannedAuthorAmountUsdc: Number(authorAmountUsdc.toFixed(6)),
        protocolFeeUsdc: Number(protocolFeeUsdc.toFixed(6)),
        authorRatio: '80%',
        protocolFeeRatio: '20%',
        ...(curatorRef ? {
          plannedCuratorAmountUsdc: Number(curatorAmountUsdc.toFixed(6)),
          curatorRatio: '15%',
          curatorRef,
        } : {}),
      },
      payoutStatus: 'PENDING_MANUAL_DISTRIBUTION',
      ledgerId,
      curatorLedgerId,
      explorerUrl: `https://explorer.arc.io/tx/${txHash}`,
      message: `链上打赏 ${amount.toFixed(2)} USDC 已确认进入平台金库；作者分账尚未自动执行，当前仅记录待分账台账。`,
    });
  } catch (err: any) {
    console.error('[ap2/settle] Error:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
