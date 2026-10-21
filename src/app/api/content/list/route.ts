// ════════════════════════════════════════════════════════════════
// src/app/api/content/list/route.ts — 博客流列表 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || 20);
    const offset = Number(url.searchParams.get('offset') || 0);
    const search = url.searchParams.get('q') || url.searchParams.get('search') || '';

    const where = search.trim() ? {
      OR: [
        { title: { contains: search.trim() } },
        { excerpt: { contains: search.trim() } },
        { bodyMd: { contains: search.trim() } },
      ],
    } : undefined;

    const contents = await db.content.findMany({
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
    });

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
          arpVcId: c.arpVcId,
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
      total: enriched.length,
      hasMore: enriched.length === limit,
    });
  } catch (err) {
    const e = err as Error;
    console.error('[content/list] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
