// ════════════════════════════════════════════════════════════════
// src/app/api/content/list/route.ts — 博客流列表 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawLimit = Number(url.searchParams.get('limit') || 20);
    const rawOffset = Number(url.searchParams.get('offset') || 0);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 20;
    const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
    const search = url.searchParams.get('q') || url.searchParams.get('search') || '';

    const where = search.trim() ? {
      OR: [
        { title: { contains: search.trim() } },
        { excerpt: { contains: search.trim() } },
        { bodyMd: { contains: search.trim() } },
      ],
    } : undefined;

    const [contents, total] = await Promise.all([
      db.content.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          prime: {
            select: {
              displayName: true,
              did: true,
              avatarSeed: true,
              bio: true,
            },
          },
          _count: {
            select: { interactions: true },
          },
        },
      }),
      db.content.count({ where }),
    ]);

    // 统计每篇内容的互动数
    const enriched = await Promise.all(
      contents.map(async (c) => {
        const tips = await db.interaction.aggregate({
          where: { contentId: c.id, type: 'TIP' },
          _sum: { amount: true },
          _count: true,
        });
        const reads = await db.interaction.count({
          where: { contentId: c.id, type: 'READ' },
        });
        const comments = await db.interaction.count({
          where: { contentId: c.id, type: 'COMMENT' },
        });
        return {
          id: c.id,
          arweaveHash: c.arweaveHash,
          tokenId: c.tokenId?.toString() || null,
          title: c.title,
          excerpt: c.excerpt,
          authorDid: c.authorDid,
          authorName: c.prime?.displayName || '飘叔 (piaoshu)',
          authorAvatarSeed: c.prime?.avatarSeed || 'default',
          authorBio: c.prime?.bio || '',
          license: c.license,
          royaltyRate: c.royaltyRate,
          arpVcId: c.nftStatus === 'MINTED' ? c.arpVcId : null,
          storageProvider: c.storageProvider,
          storageStatus: c.storageStatus,
          nftStatus: c.nftStatus,
          publishedAt: c.publishedAt.toISOString(),
          stats: {
            reads,
            comments,
            tips: tips._count,
            tipsAmount: tips._sum.amount?.toString() || '0',
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      contents: enriched,
      total,
      limit,
      offset,
      hasMore: offset + enriched.length < total,
    });
  } catch (err) {
    const e = err as Error;
    console.error('[content/list] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
