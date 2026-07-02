// ════════════════════════════════════════════════════════════════
// src/lib/web5/distribution/farcaster.ts
// Farcaster 自动分发模拟 — AI 分身内容分发至社交图谱
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';

export interface DistributionResult {
  platform: string;
  contentArweaveHash: string;
  impressions: number;
  engagements: number;
  timestamp: Date;
}

/**
 * 模拟将内容分发至 Farcaster
 * 生产环境会调用 Farcaster Hub API
 */
export async function distributeToFarcaster(
  vesselId: string,
  contentArweaveHash: string,
): Promise<DistributionResult> {
  const vessel = await db.vessel.findUnique({ where: { id: vesselId } });
  if (!vessel) throw new Error('Vessel not found');

  const content = await db.content.findUnique({ where: { arweaveHash: contentArweaveHash } });
  if (!content) throw new Error('Content not found');

  const impressions = Math.floor(Math.random() * 150) + 20;
  const engagements = Math.floor(impressions * (0.02 + Math.random() * 0.08));

  await db.autonomousLog.create({
    data: {
      vesselId,
      action: 'distribute',
      targetContent: contentArweaveHash,
      metadata: JSON.stringify({
        platform: 'Farcaster',
        channel: `/${content.title.slice(0, 20).toLowerCase().replace(/\s+/g, '-')}`,
        impressions,
        engagements,
        likes: Math.floor(engagements * 0.3),
        recasts: Math.floor(engagements * 0.1),
      }),
    },
  });

  return { platform: 'Farcaster', contentArweaveHash, impressions, engagements, timestamp: new Date() };
}

/**
 * 查询 Vessel 的 Farcaster 分发统计
 */
export async function getDistributionStats(vesselDid: string): Promise<{
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  recentDistributions: any[];
}> {
  const vessel = await db.vessel.findUnique({ where: { did: vesselDid } });
  if (!vessel) return { totalPosts: 0, totalImpressions: 0, totalEngagements: 0, recentDistributions: [] };

  const distributions = await db.autonomousLog.findMany({
    where: { vesselId: vessel.id, action: 'distribute' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  let totalImpressions = 0;
  let totalEngagements = 0;
  for (const d of distributions) {
    const meta = JSON.parse(d.metadata || '{}');
    totalImpressions += meta.impressions || 0;
    totalEngagements += meta.engagements || 0;
  }

  return {
    totalPosts: distributions.length,
    totalImpressions,
    totalEngagements,
    recentDistributions: distributions.map(d => ({
      platform: JSON.parse(d.metadata || '{}').platform || 'unknown',
      impressions: JSON.parse(d.metadata || '{}').impressions || 0,
      engagements: JSON.parse(d.metadata || '{}').engagements || 0,
      createdAt: d.createdAt,
    })),
  };
}
