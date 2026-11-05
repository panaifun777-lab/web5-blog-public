// ════════════════════════════════════════════════════════════════
// src/app/api/autonomous/tick/route.ts
// 自治调度点 — 由 VPS cron 调用，需 AUTONOMOUS_TICK_SECRET
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { autonomousTick } from '@/lib/web5/autonomous/scheduler';
import { AUTONOMOUS_AGENTS_ENABLED, featureDisabled } from '@/lib/launch/flags';
import { apiError } from '@/lib/web5/api/errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!AUTONOMOUS_AGENTS_ENABLED) {
    return featureDisabled(
      'AUTONOMOUS_AGENTS_DISABLED',
      'flags.autonomousAgentsDisabled',
      req
    );
  }

  const secret = process.env.AUTONOMOUS_TICK_SECRET;
  if (!secret) {
    return featureDisabled(
      'AUTONOMOUS_TICK_SECRET_MISSING',
      'flags.autonomousTickSecretMissing',
      req
    );
  }
  const provided =
    req.headers.get('x-cron-secret') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (provided !== secret) {
    return apiError('UNAUTHORIZED', { request: req });
  }

  try {
    const results = await autonomousTick();
    return NextResponse.json({ success: true, vesselCount: results.length, results });
  } catch (err) {
    console.error('[autonomous/tick] Error:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
