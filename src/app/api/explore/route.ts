// ════════════════════════════════════════════════════════════════
// src/app/api/explore/route.ts — 探索 API
// 用户排行 / 内容统计 / 邀请码状态 / 合约地址
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ADDRESSES, CHAIN, SUPERADMIN, CONTRACTS_DEPLOYED } from '@/lib/web5/contracts/addresses';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const section = url.searchParams.get('section') || 'overview';

    if (section === 'overview') {
      // 全局统计
      const [primeCount, vesselCount, contentCount, interactionCount, totalYieldAgg] =
        await Promise.all([
          db.prime.count(),
          db.vessel.count({ where: { status: 'ACTIVE' } }),
          db.content.count(),
          db.interaction.count(),
          db.autonomousLog.aggregate({
            where: {
              yieldAmount: { not: null },
              metadata: { contains: '"realTxHash"' },
            },
            _sum: { yieldAmount: true },
          }),
        ]);

      // 转化统计
      const conversionStats = await db.systemConfig.findUnique({
        where: { key: 'conversion_stats' },
      });

      // Top Vessels（按收益）
      const topVessels = await db.vessel.findMany({
        where: { status: 'ACTIVE' },
        take: 10,
        include: {
          prime: { select: { displayName: true, did: true, avatarSeed: true, bio: true } },
          eidolon: { select: { name: true, did: true } },
          autonomousLogs: {
            where: {
              yieldAmount: { not: null },
              metadata: { contains: '"realTxHash"' },
            },
            select: { yieldAmount: true },
          },
        },
      });

      const topVesselsRanked = topVessels
        .map((v) => ({
          vesselDid: v.did,
          primeDid: v.prime?.did ?? null,
          displayName:
            v.prime?.displayName ||
            v.eidolon.name ||
            `未命名分身 / Unnamed Vessel (${v.did})`,
          avatarSeed: v.prime?.avatarSeed || 'default',
          bio: v.prime?.bio || '',
          eidolonName: v.eidolon.name,
          smartAccountAddress: v.smartAccountAddress,
          lastActiveAt: v.lastActiveAt?.toISOString() || null,
          totalYield: v.autonomousLogs
            .reduce((sum, log) => sum + (log.yieldAmount || 0n), 0n)
            .toString(),
        }))
        .sort((a, b) => BigInt(b.totalYield) - BigInt(a.totalYield) > 0n ? 1 : -1)
        .slice(0, 10);

      return NextResponse.json({
        success: true,
        stats: {
          primes: primeCount,
          activeVessels: vesselCount,
          contents: contentCount,
          interactions: interactionCount,
          totalYield: (totalYieldAgg._sum.yieldAmount || 0n).toString(),
        },
        conversion: conversionStats?.value ? JSON.parse(conversionStats.value) : null,
        topVessels: topVesselsRanked,
        contracts: {
          deployed: CONTRACTS_DEPLOYED,
          addresses: ADDRESSES,
          chain: CHAIN,
          superadmin: SUPERADMIN,
        },
      });
    }

    if (section === 'contents') {
      const contents = await db.content.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 50,
        include: {
          prime: {
            select: { displayName: true, did: true, avatarSeed: true },
          },
        },
      });

      const enriched = await Promise.all(
        contents.map(async (c) => {
          const tips = await db.interaction.aggregate({
            where: { contentId: c.id, type: 'TIP' },
            _sum: { amount: true },
            _count: true,
          });
          return {
            arweaveHash: c.arweaveHash,
            tokenId: c.tokenId?.toString() || null,
            title: c.title,
            excerpt: c.excerpt?.slice(0, 150) + '...',
            authorName: c.prime?.displayName || '飘叔 (piaoshu)',
            authorAvatarSeed: c.prime?.avatarSeed || 'default',
            license: c.license,
            royaltyRate: c.royaltyRate,
            arpVcId: c.nftStatus === 'MINTED' ? c.arpVcId : null,
            publishedAt: c.publishedAt.toISOString(),
            tipsCount: tips._count,
            tipsAmount: tips._sum.amount?.toString() || '0',
          };
        })
      );

      return NextResponse.json({ success: true, contents: enriched });
    }

    if (section === 'invite-codes') {
      const codes = await db.systemConfig.findMany({
        where: { key: { startsWith: 'invite:' } },
      });
      return NextResponse.json({
        success: true,
        codes: codes.map((c) => JSON.parse(c.value)),
      });
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  } catch (err) {
    const e = err as Error;
    console.error('[explore] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
