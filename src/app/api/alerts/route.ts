// ════════════════════════════════════════════════════════════════
// src/app/api/alerts/route.ts
// 告警系统 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, markAlertRead } from '@/lib/web5/alerts/alerter';
import { apiError } from '@/lib/web5/api/errors';

export async function GET(req: NextRequest) {
  try {
    const did = req.nextUrl.searchParams.get('did');
    if (!did) return apiError('MISSING_DID', { request: req });
    const result = await getAlerts(did);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[alerts] read failed:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { alertId } = await req.json();
    if (!alertId) return apiError('MISSING_ALERT_ID', { request: req });
    await markAlertRead(alertId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[alerts] mark-read failed:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
