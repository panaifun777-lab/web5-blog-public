// ════════════════════════════════════════════════════════════════
// src/app/api/admin/agent/route.ts
// Agent Admin API — AI agent discovery & management
// Auth: admin wallet session cookie OR X-API-Key header
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authorizeAdmin } from '@/lib/admin/guard';
import { setAgentDiscoveryHeaders, AGENT_META } from '@/lib/admin/agent-discovery';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

function unauthorized(identity: ReturnType<typeof authorizeAdmin>) {
  return NextResponse.json(
    { error: identity.error || 'Unauthorized' },
    { status: identity.status || 401, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET(req: NextRequest) {
  const identity = authorizeAdmin(req);
  if (!identity.ok) return unauthorized(identity);

  const limited = rateLimit(`admin-agent:${clientIp(req)}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const [userCount, contentCount, vesselCount, interactionCount, recentContent, recentUsers, invites] =
    await Promise.all([
      db.prime.count(),
      db.content.count(),
      db.vessel.count(),
      db.interaction.count(),
      db.content.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          arweaveHash: true,
          authorDid: true,
          publishedAt: true,
        },
      }),
      db.prime.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          did: true,
          displayName: true,
          role: true,
          status: true,
          accountStage: true,
          createdAt: true,
        },
      }),
      db.systemConfig.findMany({
        where: { key: { startsWith: 'invite:' } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ]);

  const response = NextResponse.json({
    platform: AGENT_META.platform,
    version: AGENT_META.version,
    auth: { via: identity.via, address: identity.address || null },
    stats: {
      users: userCount,
      articles: contentCount,
      vessels: vesselCount,
      interactions: interactionCount,
    },
    recentContent,
    recentUsers,
    invites: invites.map((row) => {
      let parsed: any = null;
      try {
        parsed = JSON.parse(row.value);
      } catch {}
      return {
        code: parsed?.code || row.key.replace(/^invite:/, ''),
        maxUses: parsed?.maxUses ?? 0,
        usedCount: parsed?.usedCount ?? 0,
        createdAt: parsed?.createdAt || row.updatedAt.toISOString(),
      };
    }),
    contracts: AGENT_META.contracts,
    superadmin: AGENT_META.superadmin,
    endpoints: AGENT_META.endpoints,
    protocols: AGENT_META.protocols,
  }, { headers: { 'Cache-Control': 'no-store' } });

  setAgentDiscoveryHeaders(response);
  return response;
}

export async function POST(req: NextRequest) {
  const identity = authorizeAdmin(req);
  if (!identity.ok) return unauthorized(identity);

  const limited = rateLimit(`admin-agent-post:${clientIp(req)}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  switch (action) {
    case 'generate_invite': {
      const code = `WEB5-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await db.systemConfig.create({
        data: {
          key: `invite:${code}`,
          value: JSON.stringify({
            code,
            maxUses: 10,
            usedCount: 0,
            createdAt: new Date().toISOString(),
          }),
          updatedBy: identity.address || 'api-key',
        },
      });
      return NextResponse.json({ success: true, inviteCode: code });
    }
    case 'stats': {
      const [users, articles, vessels] = await Promise.all([
        db.prime.count(),
        db.content.count(),
        db.vessel.count(),
      ]);
      return NextResponse.json({ users, articles, vessels });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
