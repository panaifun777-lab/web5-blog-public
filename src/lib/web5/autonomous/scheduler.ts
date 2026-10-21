// ════════════════════════════════════════════════════════════════
// src/lib/web5/autonomous/scheduler.ts
// 24/7 自治调度引擎 — AI 分身自动交互
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';

export interface TickResult {
  actions: { action: string; target: string; yieldAmount?: string; spentAmount?: string }[];
  totalYield: string;
  totalSpent: string;
}

/**
 * 对所有活跃 Vessel 执行一次自治 tick
 * 模拟 AI 分身 24/7 的自动交互行为
 */
export async function autonomousTick(): Promise<TickResult[]> {
  const activeVessels = await db.vessel.findMany({
    where: { status: 'ACTIVE' },
    include: { ap2Budgets: true },
  });
  const results: TickResult[] = [];
  for (const vessel of activeVessels) {
    results.push(await generateActions(vessel));
  }
  return results;
}

async function generateActions(vessel: any): Promise<TickResult> {
  const actions: any[] = [];
  let totalYield = 0n;
  let totalSpent = 0n;
  const count = Math.floor(Math.random() * 4) + 1; // 1-4 次动作/每 tick

  for (let i = 0; i < count; i++) {
    const actionType = pickWeighted(
      ['read', 'tip', 'comment', 'harvest', 'distribute'],
      [0.3, 0.15, 0.2, 0.25, 0.1],
    );

    if (actionType === 'read') {
      const content = await getRandomContent();
      if (content) {
        await db.autonomousLog.create({
          data: {
            vesselId: vessel.id,
            action: 'read',
            targetContent: content.arweaveHash,
            metadata: JSON.stringify({ title: content.title, aiScore: 0.5 + Math.random() * 0.5 }),
          },
        });
        actions.push({ action: 'read', target: content.title });
      }
    } else if (actionType === 'tip') {
      const budget = vessel.ap2Budgets[0];
      if (budget && budget.spentToday < budget.dailyLimit) {
        const amount = BigInt(Math.floor(Math.random() * 500) + 100);
        const content = await getRandomContent();
        if (content) {
          const existing = vessel;
          await db.autonomousLog.create({
            data: {
              vesselId: vessel.id,
              action: 'tip',
              targetContent: content.arweaveHash,
              spentAmount: amount,
              metadata: JSON.stringify({ title: content.title, reason: 'quality_content' }),
            },
          });
          // 更新已花费
          await db.aP2Budget.update({
            where: { id: budget.id },
            data: { spentToday: { increment: amount } },
          });
          actions.push({ action: 'tip', target: content.title, spentAmount: amount.toString() });
          totalSpent += amount;
        }
      }
    } else if (actionType === 'comment') {
      const content = await getRandomContent();
      if (content) {
        const comments = [
          '深入浅出，分析透彻。', '这个角度很新颖，值得思考。', '整理得很好，收藏了。',
          '有启发，特别是关于 Web5 的部分。', '认可这种观点，但我觉得还需要考虑...',
          '很棒的内容，期待后续。', '这个案例很有参考价值。',
        ];
        const comment = comments[Math.floor(Math.random() * comments.length)];
        await db.interaction.create({
          data: {
            contentId: content.id,
            vesselDid: vessel.did,
            vesselId: vessel.id,
            type: 'COMMENT',
            comment,
            aiScore: 0.7 + Math.random() * 0.3,
          },
        });
        await db.autonomousLog.create({
          data: {
            vesselId: vessel.id,
            action: 'comment',
            targetContent: content.arweaveHash,
            metadata: JSON.stringify({ comment }),
          },
        });
        actions.push({ action: 'comment', target: content.title });
      }
    } else if (actionType === 'harvest') {
      const yieldAmount = BigInt(Math.floor(Math.random() * 2000) + 500);
      await db.autonomousLog.create({
        data: {
          vesselId: vessel.id,
          action: 'harvest',
          yieldAmount,
          metadata: JSON.stringify({ source: 'DeFi Yield', pool: 'Aave USDC', apy: (3 + Math.random() * 5).toFixed(2) + '%' }),
        },
      });
      actions.push({ action: 'harvest', target: 'DeFi Yield', yieldAmount: yieldAmount.toString() });
      totalYield += yieldAmount;
    } else if (actionType === 'distribute') {
      const content = await getRandomContent();
      if (content) {
        await db.autonomousLog.create({
          data: {
            vesselId: vessel.id,
            action: 'distribute',
            targetContent: content.arweaveHash,
            metadata: JSON.stringify({ platform: 'Farcaster', channel: 'web5', impressions: Math.floor(Math.random() * 100) + 10 }),
          },
        });
        actions.push({ action: 'distribute', target: 'Farcaster: ' + content.title });
      }
    }
  }
  return { actions, totalYield: totalYield.toString(), totalSpent: totalSpent.toString() };
}

async function getRandomContent() {
  const contents = await db.content.findMany({ take: 20, orderBy: { publishedAt: 'desc' } });
  if (contents.length === 0) return null;
  return contents[Math.floor(Math.random() * contents.length)];
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
