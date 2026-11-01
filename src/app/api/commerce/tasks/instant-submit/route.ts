// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/tasks/instant-submit/route.ts
// Instant delivery endpoint.
// It records a deliverable only; it never credits a wallet by itself.
// Settlement requires an admin-authorized, verified on-chain payout.
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { calculateRevenueSplit, isDemoOrder, submitOrder } from '@/lib/web5/ap2/commerce';
import { verifyNativeTransfer } from '@/lib/web5/payments/arc';
import { parseArcUsdc, formatArcUsdc } from '@/lib/web5/auth/eip712-types';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { MONEY_FLOWS_ENABLED, moneyFlowBlocked } from '@/lib/launch/flags';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';

function generateStructuredDeliverable(params: {
  bountyId: string;
  userThought: string;
  vesselDid: string;
  taskTitle: string;
  bountyUsdc: string;
}): string {
  const { bountyId, userThought, vesselDid, taskTitle, bountyUsdc } = params;
  return `# 《${taskTitle} · 交付草稿》

> **执行容器**: \`${vesselDid}\`
> **任务单号**: \`${bountyId}\`
> **任务赏金**: ${bountyUsdc} USDC
> **提交时间**: ${new Date().toISOString()}

## 一、核心观点

> “${userThought.trim()}”

## 二、结构化推演

1. **问题定义**：将上述观点拆解为可验证的命题与边界条件。
2. **论证路径**：给出支持与反对该命题的证据，并标注不确定项。
3. **可执行结论**：列出下一步可验证的行动与指标。

## 三、结算状态

本文件仅为提交稿。赏金仍锁定在托管地址，需委托方验收并由管理员执行链上分账后才会入账。在分账交易确认前，页面不会显示“已结算”。
`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bountyId = searchParams.get('bountyId');
    const backupWalletAddress = searchParams.get('backupWalletAddress');

    if (!bountyId) {
      return apiError('BOUNTY_ID_REQUIRED', { request: req });
    }

    const order = await db.taskOrder.findFirst({
      where: { OR: [{ orderId: bountyId }, { id: bountyId }] },
    });
    if (!order) {
      return apiError('TASK_ORDER_NOT_FOUND', { request: req });
    }

    let wallet: any = null;
    if (backupWalletAddress && /^0x[0-9a-fA-F]{40}$/.test(backupWalletAddress)) {
      wallet = await db.backupWallet.findUnique({
        where: { address: backupWalletAddress.toLowerCase() },
        select: { address: true, balanceWei: true },
      });
    }

    const bountyAmount = order.bountyUsdc;
    const split = calculateRevenueSplit(parseFloat(bountyAmount));

    return NextResponse.json(
      {
        success: true,
        demo: isDemoOrder(order),
        moneyFlowsEnabled: MONEY_FLOWS_ENABLED,
        order: {
          orderId: order.orderId,
          title: order.title,
          description: order.description,
          bountyUsdc: order.bountyUsdc,
          status: order.status,
          isDemo: isDemoOrder(order),
          escrowTxHash: order.escrowTxHash,
          assignedAgentDid: order.assignedAgentDid,
        },
        wallet: wallet
          ? {
              address: wallet.address,
              balanceWei: wallet.balanceWei,
              balanceUsdc: formatArcUsdc(wallet.balanceWei),
            }
          : null,
        split,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('[instant-submit] lookup failed:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(`instant-submit:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

  if (!MONEY_FLOWS_ENABLED) return moneyFlowBlocked();

  try {
    const token = (req.headers.get('authorization') || '')
      .replace(/^Bearer\s+/i, '')
      .trim();
    const session = await resolveVesselSessionFromToken(token);
    if (!session || session.accessMode !== 'vessel' || !session.vesselDid) {
      return apiError('VESSEL_SESSION_REQUIRED', {
        request: req,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      bountyId,
      userThought,
      backupWalletAddress,
      title,
    } = body as {
      bountyId?: string;
      userThought?: string;
      backupWalletAddress?: string;
      title?: string;
    };

    if (!bountyId) {
      return apiError('BOUNTY_ID_REQUIRED', { request: req });
    }
    if (!userThought || typeof userThought !== 'string' || !userThought.trim()) {
      return apiError('USER_THOUGHT_REQUIRED', { request: req });
    }
    if (userThought.length > 5000) {
      return apiError('USER_THOUGHT_TOO_LONG', { request: req });
    }

    const order = await db.taskOrder.findFirst({
      where: { OR: [{ orderId: bountyId }, { id: bountyId }] },
    });
    if (!order) {
      return apiError('TASK_ORDER_NOT_FOUND', { request: req });
    }
    if (isDemoOrder(order)) {
      return apiError('DEMO_ORDER_NOT_SUBMITTABLE', {
        request: req,
        extra: { demo: true },
      });
    }

    // The wallet must belong to this session; never credit an arbitrary address.
    const wallet = await db.backupWallet.findFirst({
      where: {
        OR: [
          { primeId: { not: null }, prime: { did: session.primeDid } },
          { vessel: { did: session.vesselDid } },
        ],
      },
      select: { id: true, address: true },
    });
    if (!wallet) {
      return apiError('WALLET_NOT_REGISTERED', { request: req });
    }
    if (
      backupWalletAddress &&
      backupWalletAddress.toLowerCase() !== wallet.address.toLowerCase()
    ) {
      return apiError('WALLET_NOT_OWNED_BY_SESSION', { request: req });
    }

    if (!order.escrowTxHash) {
      return apiError('ESCROW_DEPOSIT_MISSING', { request: req });
    }
    const escrow = await verifyNativeTransfer({
      txHash: order.escrowTxHash,
      to: order.escrowContract,
      minValueWei: parseArcUsdc(order.bountyUsdc),
      minConfirmations: 3,
    });
    if (!escrow.ok) {
      return apiError('ESCROW_VERIFICATION_FAILED', {
        request: req,
        params: { reason: escrow.reason ?? 'unknown' },
      });
    }

    let workingOrder = order;
    if (!workingOrder.assignedAgentDid) {
      workingOrder = await db.taskOrder.update({
        where: { id: order.id },
        data: { assignedAgentDid: session.vesselDid, status: 'ASSIGNED' },
      });
    } else if (workingOrder.assignedAgentDid !== session.vesselDid) {
      return apiError('ORDER_ASSIGNED_TO_ANOTHER_VESSEL', { request: req });
    }

    if (workingOrder.status !== 'ASSIGNED') {
      return apiError('ORDER_STATUS_NOT_SUBMITTABLE', {
        request: req,
        params: { status: workingOrder.status },
      });
    }

    const finalTitle = title?.trim() || order.title;
    const deliverableContent = generateStructuredDeliverable({
      bountyId: order.orderId,
      userThought,
      vesselDid: session.vesselDid,
      taskTitle: finalTitle,
      bountyUsdc: order.bountyUsdc,
    });

    const sha256Hex = crypto
      .createHash('sha256')
      .update(deliverableContent, 'utf8')
      .digest('hex');
    const deliverableHash = `sha256:${sha256Hex}`;

    const submitted = await submitOrder(
      order.orderId,
      deliverableHash,
      deliverableContent
    );

    return NextResponse.json(
      {
        success: true,
        message:
          '交付已提交。赏金仍锁定在托管地址，管理员验收并执行链上分账后才会入账。',
        payoutExecuted: false,
        order: {
          id: submitted.id,
          orderId: submitted.orderId,
          title: submitted.title,
          bountyUsdc: submitted.bountyUsdc,
          status: submitted.status,
          isDemo: submitted.isDemo,
          deliverableHash,
          deliverableContent: submitted.deliverableContent,
          submittedAt: submitted.submittedAt,
        },
        settlement: {
          status: 'SUBMITTED',
          escrowedAmountUsdc: order.bountyUsdc,
          creditedAmountUsdc: '0',
          note: 'No wallet balance was credited by this request.',
        },
        plannedSplit: calculateRevenueSplit(parseFloat(order.bountyUsdc)),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('[instant-submit] Error:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
