// ════════════════════════════════════════════════════════════════
// src/app/api/autonomous/tick/route.ts
// 自治调度点 — 由 VPS cron 每 5 分钟调用一次
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { autonomousTick } from '@/lib/web5/autonomous/scheduler';

export async function POST() {
  try {
    const results = await autonomousTick();
    return NextResponse.json({ success: true, vesselCount: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
