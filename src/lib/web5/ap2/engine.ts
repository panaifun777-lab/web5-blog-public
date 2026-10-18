// ════════════════════════════════════════════════════════════════
// src/lib/web5/ap2/engine.ts
// AP2 微支付引擎 — off-chain ledger + batched on-chain
// 复用 AP2-Protocol-Explorer escrow.ts 的 BudgetFence 三道闸逻辑
// 三道闸：Scope Lock / Daily Cap / Decaying Auth
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import {
  type MicropaymentIntent, type BudgetFence, type AP2Category, type VesselSession,
  RFC_CONSTANTS, toTokenUnits, fromTokenUnits,
} from '@/lib/web5/types';
import { getCurrentVesselSession } from '@/lib/web5/vessel-auth';

/**
 * BudgetFence 校验 — 三道闸
 * Gate 1: Scope Lock（白名单 + perTx 限制）
 * Gate 2: Daily Cap（每日总限额）
 * Gate 3: Decaying Auth（速率限制 + 类别限额）
 */
export function checkBudgetFence(
  intent: MicropaymentIntent,
  budget: BudgetFence,
  spentToday: bigint,
  recentTxCount: number
): { ok: boolean; reason?: string; gate?: 1 | 2 | 3 } {
  // Gate 1: Scope Lock
  if (intent.amount > budget.perTxLimit) {
    return { ok: false, reason: `Per-tx limit exceeded: ${fromTokenUnits(intent.amount)} > ${fromTokenUnits(budget.perTxLimit)}`, gate: 1 };
  }
  if (budget.whitelist.length > 0 && !budget.whitelist.includes(intent.to)) {
    return { ok: false, reason: `Recipient not in whitelist: ${intent.to}`, gate: 1 };
  }

  // Gate 2: Daily Cap
  if (spentToday + intent.amount > budget.dailyLimit) {
    return {
      ok: false,
      reason: `Daily cap exceeded: ${fromTokenUnits(spentToday + intent.amount)} > ${fromTokenUnits(budget.dailyLimit)}`,
      gate: 2,
    };
  }

  // Gate 3: Decaying Auth
  if (recentTxCount >= budget.rateLimitPerMin) {
    return { ok: false, reason: `Rate limit exceeded: ${recentTxCount} tx/min`, gate: 3 };
  }
  if (budget.categoryLimit) {
    const catLimit = budget.categoryLimit[intent.category];
    if (catLimit && intent.amount > catLimit) {
      return {
        ok: false,
        reason: `Category ${intent.category} limit exceeded: ${fromTokenUnits(intent.amount)} > ${fromTokenUnits(catLimit)}`,
        gate: 3,
      };
    }
  }

  return { ok: true };
}

/**
 * 发起 AP2 微支付
 * 写入 off-chain ledger，触发批量结算检查
 */
export async function ap2Pay(
  intent: MicropaymentIntent,
  sessionOverride?: VesselSession | null
): Promise<{ accepted: boolean; reason?: string; ledgerId?: string }> {
  const session = sessionOverride || getCurrentVesselSession();
  if (!session) {
    return { accepted: false, reason: 'No vessel session' };
  }
  if (session.accessMode === 'observer') {
    return { accepted: false, reason: 'Observer Mode cannot pay' };
  }
  if (!session.permissions.includes('micropay')) {
    return { accepted: false, reason: 'Vessel lacks micropay permission' };
  }

  // 从数据库查询 BudgetFence
  const vessel = await db.vessel.findUnique({
    where: { did: session.vesselDid },
    include: { ap2Budgets: true },
  });
  if (!vessel || !vessel.ap2Budgets[0]) {
    return { accepted: false, reason: 'BudgetFence not configured' };
  }

  const budgetRecord = vessel.ap2Budgets[0];
  const budget: BudgetFence = {
    dailyLimit: budgetRecord.dailyLimit,
    perTxLimit: budgetRecord.perTxLimit,
    rateLimitPerMin: budgetRecord.rateLimitPerMin,
    whitelist: JSON.parse(budgetRecord.whitelist || '[]'),
    categoryLimit: budgetRecord.categoryLimit
      ? JSON.parse(budgetRecord.categoryLimit)
      : undefined,
  };

  // 检查最近 1 分钟交易数
  const oneMinAgo = new Date(Date.now() - 60_000);
  const recentCount = await db.interaction.count({
    where: {
      vesselDid: session.vesselDid,
      createdAt: { gte: oneMinAgo },
      type: { in: ['TIP', 'READ', 'SUBSCRIBE'] },
    },
  });

  // BudgetFence 校验
  const check = checkBudgetFence(intent, budget, budgetRecord.spentToday, recentCount);
  if (!check.ok) {
    // 记录被拦截的支付（审计）
    await db.autonomousLog.create({
      data: {
        vesselId: vessel.id,
        action: 'ap2_blocked',
        targetDid: intent.to,
        metadata: JSON.stringify({ reason: check.reason, gate: check.gate, amount: intent.amount.toString() }),
      },
    });
    return { accepted: false, reason: check.reason };
  }

  // 找到目标内容（若有 ref）
  let contentId: string | undefined;
  if (intent.ref) {
    const content = await db.content.findUnique({ where: { arweaveHash: intent.ref } });
    if (content) contentId = content.id;
  }

  // 找到目标 Prime（收款方）
  let recipientPrimeId: string | undefined;
  const recipientPrime = await db.prime.findUnique({ where: { did: intent.to } });
  if (recipientPrime) recipientPrimeId = recipientPrime.id;

  // 写入 off-chain ledger（Interaction 表）
  const ledger = await db.interaction.create({
    data: {
      contentId: contentId || 'placeholder',
      vesselDid: session.vesselDid,
      vesselId: vessel.id,
      primeId: vessel.primeId,
      type: mapCategoryToType(intent.category),
      amount: intent.amount,
      ap2TxHash: null, // 批量结算时填入
      arpRef: intent.ref,
      aiScore: null,
    },
  });

  // 更新已花费金额（vesselId 非唯一，使用 updateMany 容错）
  await db.aP2Budget.updateMany({
    where: { vesselId: vessel.id },
    data: { spentToday: { increment: intent.amount } },
  });

  // 检查是否触发批量结算
  const pendingAmount = await db.interaction.aggregate({
    where: { vesselDid: session.vesselDid, ap2TxHash: null },
    _sum: { amount: true },
  });

  if ((pendingAmount._sum.amount || 0n) >= RFC_CONSTANTS.SETTLEMENT_BATCH_THRESHOLD) {
    await batchSettle(session.vesselDid);
  }

  return { accepted: true, ledgerId: ledger.id };
}

/** 批量结算 — 提交至链上 BudgetFence 合约 */
async function batchSettle(vesselDid: string): Promise<void> {
  // MVP：仅生成模拟 tx hash
  const pending = await db.interaction.findMany({
    where: { vesselDid, ap2TxHash: null },
  });
  if (pending.length === 0) return;

  const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
  await db.interaction.updateMany({
    where: { id: { in: pending.map((p) => p.id) } },
    data: { ap2TxHash: mockTxHash },
  });
}

function mapCategoryToType(category: AP2Category): 'READ' | 'TIP' | 'SUBSCRIBE' | 'ROYALTY' {
  const map: Record<AP2Category, 'READ' | 'TIP' | 'SUBSCRIBE' | 'ROYALTY'> = {
    read: 'READ',
    tip: 'TIP',
    subscribe: 'SUBSCRIBE',
    royalty: 'ROYALTY',
    harvest: 'TIP',
  };
  return map[category];
}

/** 获取 AP2 财务摘要 */
export async function getAp2Treasury(vesselDid: string) {
  // 先通过 vesselDid 查 Vessel，再用 vesselId 查 Budget
  const vessel = await db.vessel.findUnique({ where: { did: vesselDid } });
  if (!vessel) return null;

  const budget = await db.aP2Budget.findFirst({ where: { vesselId: vessel.id } });
  if (!budget) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySpent = await db.interaction.aggregate({
    where: { vesselDid, createdAt: { gte: today }, ap2TxHash: { not: null } },
    _sum: { amount: true },
  });

  const totalHarvest = await db.autonomousLog.aggregate({
    where: { vesselId: vessel.id, yieldAmount: { not: null } },
    _sum: { yieldAmount: true },
  });

  return {
    dailyLimit: budget.dailyLimit,
    spentToday: budget.spentToday,
    dailyRemaining: budget.dailyLimit - budget.spentToday,
    perTxLimit: budget.perTxLimit,
    rateLimitPerMin: budget.rateLimitPerMin,
    totalHarvest: totalHarvest._sum.yieldAmount || 0n,
    todaySpentOnChain: todaySpent._sum.amount || 0n,
  };
}
