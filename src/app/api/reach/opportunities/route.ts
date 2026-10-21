// ════════════════════════════════════════════════════════════════
// src/app/api/reach/opportunities/route.ts
// 读取已抓取的外部机会（按推荐分排序）+ 支持导入为站内悬赏
//   GET  ?limit=20&minScore=0&source=github
//   POST { id }  -> 导入为 TaskOrder
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createCommerceOrder } from '@/lib/web5/ap2/commerce';
import { isProposedReward } from '@/lib/web5/reach/crawler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const minScore = Number(searchParams.get('minScore')) || 0;
    const source = searchParams.get('source');

    const where: any = { status: 'OPEN', matchScore: { gte: minScore } };
    if (source) where.source = source;

    const [rows, total] = await Promise.all([
      db.externalOpportunity.findMany({
        where,
        orderBy: [{ matchScore: 'desc' }, { fetchedAt: 'desc' }],
        take: limit,
      }),
      db.externalOpportunity.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      items: rows.map((r) => {
        const tags = safeJson<string[]>(r.tags, []);
        // 兼容历史数据：未打标的提案金额在此兜底，避免按真实报酬展示
        const proposed = isProposedReward({
          title: r.title,
          description: r.description,
          rewardText: r.rewardText,
          tags,
        });
        return {
          id: r.id,
          source: r.source,
          title: r.title,
          organization: r.organization,
          url: r.url,
          description: r.description,
          rewardText: r.rewardText,
          rewardUsdc: proposed ? null : r.rewardUsdc,
          tags: proposed && !tags.includes('proposed') ? [...tags, 'proposed'] : tags,
          matchScore: r.matchScore,
          matchReasons: safeJson(r.matchReasons, []),
          publishedAt: r.publishedAt,
          fetchedAt: r.fetchedAt,
          status: r.status,
        };
      }),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || '读取失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    const op = await db.externalOpportunity.findUnique({ where: { id } });
    if (!op) return NextResponse.json({ error: '机会不存在' }, { status: 404 });
    if (op.status === 'IMPORTED') {
      return NextResponse.json({ error: '该机会已导入' }, { status: 409 });
    }
    if (
      isProposedReward({
        title: op.title,
        description: op.description,
        rewardText: op.rewardText,
        tags: safeJson<string[]>(op.tags, []),
      })
    ) {
      return NextResponse.json(
        { error: '该机会的金额仍为提案（未确认），请确认后再创建悬赏' },
        { status: 409 }
      );
    }

    const bounty = op.rewardUsdc && op.rewardUsdc > 0
      ? String(Math.min(Math.round(op.rewardUsdc), 500))
      : '25.0';

    const order = await createCommerceOrder({
      creatorDid: 'did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
      title: op.title.slice(0, 200),
      description: `${op.description || ''}\n\n来源：${op.source} · ${op.url}`.slice(0, 2000),
      bountyUsdc: bounty,
    });

    await db.externalOpportunity.update({
      where: { id },
      data: { status: 'IMPORTED', importedTaskId: order.orderId },
    });

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      bountyUsdc: bounty,
      message: `已导入为站内悬赏（${bounty} USDC 托管）`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || '导入失败' }, { status: 500 });
  }
}

function safeJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
