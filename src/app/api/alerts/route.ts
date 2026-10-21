// ════════════════════════════════════════════════════════════════
// src/app/api/alerts/route.ts
// 告警系统 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, markAlertRead } from '@/lib/web5/alerts/alerter';

export async function GET(req: NextRequest) {
  try {
    const did = req.nextUrl.searchParams.get('did');
    if (!did) return NextResponse.json({ error: 'Missing did' }, { status: 400 });
    const result = await getAlerts(did);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { alertId } = await req.json();
    if (!alertId) return NextResponse.json({ error: 'Missing alertId' }, { status: 400 });
    await markAlertRead(alertId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
