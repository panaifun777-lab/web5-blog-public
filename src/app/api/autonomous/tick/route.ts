// ════════════════════════════════════════════════════════════════
// src/app/api/autonomous/tick/route.ts
// 自治调度点 — 由 VPS cron 调用，需 AUTONOMOUS_TICK_SECRET
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { autonomousTick } from '@/lib/web5/autonomous/scheduler';
import { AUTONOMOUS_AGENTS_ENABLED, featureDisabled } from '@/lib/launch/flags';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!AUTONOMOUS_AGENTS_ENABLED) {
    return featureDisabled(
      'AUTONOMOUS_AGENTS_DISABLED',
      '自治代理目前为展示功能，尚未启用自动互动。'
    );
  }

  const secret = process.env.AUTONOMOUS_TICK_SECRET;
  if (!secret) {
    return featureDisabled(
      'AUTONOMOUS_TICK_SECRET_MISSING',
      '自治调度未配置访问密钥，已拒绝执行。'
    );
  }
  const provided =
    req.headers.get('x-cron-secret') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await autonomousTick();
    return NextResponse.json({ success: true, vesselCount: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
