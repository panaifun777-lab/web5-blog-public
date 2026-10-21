// ════════════════════════════════════════════════════════════════
// src/app/api/admin/avatar/route.ts
// Avatar Admin API — Avatar identity management
// Auth: admin wallet session cookie OR X-API-Key header
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authorizeAdmin } from '@/lib/admin/guard';
import { setAgentDiscoveryHeaders } from '@/lib/admin/agent-discovery';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const identity = authorizeAdmin(req);
  if (!identity.ok) {
    return NextResponse.json(
      { error: identity.error || 'Unauthorized' },
      { status: identity.status || 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const eidolons = await db.eidolon.findMany({
    select: { id: true, did: true, name: true, status: true, lastActiveAt: true },
    take: 50,
  });

  const response = NextResponse.json(
    { avatars: eidolons },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  setAgentDiscoveryHeaders(response);
  return response;
}

export async function PATCH(req: NextRequest) {
  const identity = authorizeAdmin(req);
  if (!identity.ok) {
    return NextResponse.json(
      { error: identity.error || 'Unauthorized' },
      { status: identity.status || 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const limited = rateLimit(`admin-avatar:${clientIp(req)}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { did, status } = body;
  if (!did || typeof did !== 'string') {
    return NextResponse.json({ error: 'DID required' }, { status: 400 });
  }

  const allowedStatus = new Set(['ACTIVE', 'INACTIVE', 'REVOKED', 'FROZEN']);
  if (status !== undefined && !allowedStatus.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await db.eidolon.updateMany({
    where: { did },
    data: status ? { status: status as never } : {},
  });

  return NextResponse.json({ success: true, did, updates: status ? { status } : {} });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
