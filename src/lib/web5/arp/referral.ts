// ════════════════════════════════════════════════════════════════
// src/lib/web5/arp/referral.ts
// ARP 推荐分润系统 — 推荐链追踪 + 版税分成
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';

/**
 * 记录一条推荐：Vessel A 通过 Vessel B 的推荐阅读了内容
 */
export async function recordReferral(
  referrerDid: string,
  referredDid: string,
  contentArweaveHash: string,
): Promise<void> {
  const existing = await db.interaction.findFirst({
    where: { vesselDid: referredDid, arpRef: `referral:${referrerDid}:${contentArweaveHash}` },
  });
  if (existing) return;

  const content = await db.content.findUnique({ where: { arweaveHash: contentArweaveHash } });
  if (!content) return;

  const referrerVessel = await db.vessel.findUnique({ where: { did: referrerDid } });
  if (!referrerVessel) return;

  await db.interaction.create({
    data: {
      contentId: content.id,
      vesselDid: referredDid,
      type: 'ROYALTY',
      amount: 0n,
      arpRef: `referral:${referrerDid}:${contentArweaveHash}`,
      aiScore: 0.9,
    },
  });

  await db.autonomousLog.create({
    data: {
      vesselId: referrerVessel.id,
      action: 'distribute',
      targetContent: contentArweaveHash,
      metadata: JSON.stringify({ type: 'referral', referredBy: referrerDid, commissionRate: 10 }),
    },
  });
}

/**
 * 查询指定 Vessel 的推荐收益
 */
export async function getReferralEarnings(did: string): Promise<{
  totalReferrals: number;
  totalEarnings: string;
  recentReferrals: any[];
}> {
  const referrals = await db.interaction.findMany({
    where: { arpRef: { startsWith: `referral:${did}:` } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  let totalEarnings = 0n;
  // 查找推荐链下游的打赏，计算 10% 分润
  for (const ref of referrals) {
    const refContentId = ref.contentId;
    const referredDid = ref.vesselDid;
    // 找到被推荐用户对该内容的所有 TIP
    const tips = await db.interaction.findMany({
      where: { vesselDid: referredDid, contentId: refContentId, type: 'TIP' },
    });
    for (const tip of tips) {
      if (tip.amount) totalEarnings += (tip.amount * 10n) / 100n; // 10%
    }
  }

  return {
    totalReferrals: referrals.length,
    totalEarnings: totalEarnings.toString(),
    recentReferrals: referrals.slice(0, 10).map(r => ({
      id: r.id,
      contentId: r.contentId,
      createdAt: r.createdAt,
      amount: r.amount?.toString() || '0',
    })),
  };
}
