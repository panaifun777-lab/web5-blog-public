// ════════════════════════════════════════════════════════════════
// src/lib/web5/autonomous/scheduler.ts
// 24/7 自治调度引擎 — 仅生成非资金动作，所有记录标记 simulated
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';

export interface TickResult {
  actions: { action: string; target: string }[];
  totalYield: string;
  totalSpent: string;
}

/**
 * 对所有活跃 Vessel 执行一次自治 tick。
 * 资金动作（tip/harvest）已移除：在真实托管、收益与分账上线前不得生成账本金额。
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
  const actions: { action: string; target: string }[] = [];
  const count = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < count; i++) {
    const actionType = pickWeighted(
      ['read', 'comment', 'distribute'],
      [0.4, 0.3, 0.3],
    );

    if (actionType === 'read') {
      const content = await getRandomContent();
      if (content) {
        await db.autonomousLog.create({
          data: {
            vesselId: vessel.id,
            action: 'read',
            targetContent: content.arweaveHash,
            metadata: JSON.stringify({ simulated: true, title: content.title }),
          },
        });
        actions.push({ action: 'read', target: content.title });
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
            aiScore: null,
          },
        });
        await db.autonomousLog.create({
          data: {
            vesselId: vessel.id,
            action: 'comment',
            targetContent: content.arweaveHash,
            metadata: JSON.stringify({ simulated: true, comment }),
          },
        });
        actions.push({ action: 'comment', target: content.title });
      }
    } else if (actionType === 'distribute') {
      const content = await getRandomContent();
      if (content) {
        await db.autonomousLog.create({
          data: {
            vesselId: vessel.id,
            action: 'distribute',
            targetContent: content.arweaveHash,
            metadata: JSON.stringify({ simulated: true, platform: 'Farcaster' }),
          },
        });
        actions.push({ action: 'distribute', target: 'Farcaster: ' + content.title });
      }
    }
  }
  return { actions, totalYield: '0', totalSpent: '0' };
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
