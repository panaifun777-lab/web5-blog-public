// ════════════════════════════════════════════════════════════════
// src/app/api/reach/crawl/route.ts
// 触发外部劳务机会抓取 + 打分入库
//   POST { skills?: string[], domains?: string[], limit?: number }
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crawlAllSources } from '@/lib/web5/reach/crawler';
import { rankOpportunities } from '@/lib/web5/reach/recommender';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limited = rateLimit(`reach-crawl:${clientIp(req)}`, 2, 300_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: '抓取请求过于频繁，请稍后再试。' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const skills: string[] = Array.isArray(body?.skills) ? body.skills : [];
    const domains: string[] = Array.isArray(body?.domains) ? body.domains : [];
    const limit = Math.min(Math.max(Number(body?.limit) || 12, 3), 30);

    const t0 = Date.now();
    const { items, stats, errors } = await crawlAllSources(limit);
    const ranked = rankOpportunities(items, { skills, domains });

    let inserted = 0;
    let updated = 0;

    for (const op of ranked) {
      const existing = await db.externalOpportunity.findUnique({
        where: { source_externalId: { source: op.source, externalId: op.externalId } },
        select: { id: true, status: true },
      });

      const payload = {
        title: op.title.slice(0, 300),
        organization: op.organization?.slice(0, 200) || null,
        url: op.url,
        description: op.description || null,
        rewardText: op.rewardText || null,
        rewardUsdc: op.rewardUsdc ?? null,
        tags: JSON.stringify(op.tags || []),
        remote: op.remote,
        publishedAt: op.publishedAt || null,
        matchScore: op.matchScore,
        matchReasons: JSON.stringify(op.matchReasons),
        fetchedAt: new Date(),
      };

      if (existing) {
        await db.externalOpportunity.update({
          where: { id: existing.id },
          data: payload,
        });
        updated++;
      } else {
        await db.externalOpportunity.create({
          data: {
            source: op.source,
            externalId: op.externalId,
            ...payload,
          },
        });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      elapsedMs: Date.now() - t0,
      stats,
      errors,
      fetched: items.length,
      inserted,
      updated,
      top: ranked.slice(0, 5).map((r) => ({
        title: r.title,
        source: r.source,
        score: r.matchScore,
        rewardUsdc: r.rewardUsdc ?? null,
      })),
    });
  } catch (err: any) {
    console.error('[reach/crawl] Error:', err);
    return NextResponse.json(
      { error: err?.message || '抓取失败' },
      { status: 500 }
    );
  }
}
