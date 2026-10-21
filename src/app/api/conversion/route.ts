// ════════════════════════════════════════════════════════════════
// src/app/api/conversion/route.ts — Observer → Vessel 转化追踪
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 统计 Observer Mode 用户（无 Vessel 的 Prime）
    const observerCount = await db.prime.count({
      where: { vessels: { none: {} } },
    });

    // 统计 Vessel Mode 用户（至少有一个 Vessel 的 Prime）
    const vesselCount = await db.prime.count({
      where: { vessels: { some: { status: 'ACTIVE' } } },
    });

    // 查找从 Observer 转为 Vessel 的用户
    // （通过 AutonomousLog 中是否有 vessel 创建后立即激活的记录来推断）
    const convertedPrimes = await db.prime.findMany({
      where: {
        vessels: { some: { status: 'ACTIVE' } },
        createdAt: { gte: new Date(Date.now() - 30 * 86400 * 1000) },
      },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
        lastActiveAt: true,
        vessels: {
          where: { status: 'ACTIVE' },
          select: { createdAt: true, lastActiveAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    const conversionTimeline = convertedPrimes
      .filter((p) => p.vessels.length > 0)
      .map((p) => ({
        primeId: p.id,
        displayName: p.displayName,
        primeCreatedAt: p.createdAt.toISOString(),
        vesselActivatedAt: p.vessels[0].createdAt.toISOString(),
        conversionDelayMs:
          p.vessels[0].createdAt.getTime() - p.createdAt.getTime(),
      }))
      .sort((a, b) => b.conversionDelayMs - a.conversionDelayMs);

    const totalConverted = conversionTimeline.length;
    const conversionRate =
      observerCount + vesselCount > 0
        ? ((vesselCount / (observerCount + vesselCount)) * 100).toFixed(1)
        : '0';

    // 平均转化时长
    const avgConversionMs =
      conversionTimeline.length > 0
        ? conversionTimeline.reduce((sum, c) => sum + c.conversionDelayMs, 0) /
          conversionTimeline.length
        : 0;

    return NextResponse.json({
      success: true,
      stats: {
        observerMode: observerCount,
        vesselMode: vesselCount,
        converted: totalConverted,
        conversionRate: `${conversionRate}%`,
        avgConversionTimeMs: avgConversionMs,
        avgConversionTimeHuman: formatDuration(avgConversionMs),
      },
      timeline: conversionTimeline.slice(0, 20),
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function formatDuration(ms: number): string {
  if (ms === 0) return 'N/A';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(ms / (1000 * 60))} 分钟`;
  if (hours < 24) return `${hours.toFixed(1)} 小时`;
  return `${(hours / 24).toFixed(1)} 天`;
}
