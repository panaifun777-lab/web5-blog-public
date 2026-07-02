// ════════════════════════════════════════════════════════════════
// src/app/api/admin/avatar/route.ts
// Avatar Admin API — Avatar identity management
// Auth: X-API-Key header
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/admin/auth';
import { setAgentDiscoveryHeaders } from '@/lib/admin/agent-discovery';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key');
  if (!validateApiKey(apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const eidolons = await db.eidolon.findMany({
    select: { id: true, did: true, name: true, status: true, lastActiveAt: true },
    take: 50,
  });

  const response = NextResponse.json({ avatars: eidolons });
  setAgentDiscoveryHeaders(response);
  return response;
}

export async function PATCH(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key');
  if (!validateApiKey(apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { did, status, budget } = await req.json();
  if (!did) return NextResponse.json({ error: 'DID required' }, { status: 400 });

  const updates: any = {};
  if (status) updates.status = status;
  if (budget) updates.budget = JSON.stringify(budget);

  await db.eidolon.updateMany({ where: { did }, data: updates });

  return NextResponse.json({ success: true, did, updates });
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}
