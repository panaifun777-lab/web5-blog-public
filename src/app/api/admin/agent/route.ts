// ════════════════════════════════════════════════════════════════
// src/app/api/admin/agent/route.ts
// Agent Admin API — AI agent discovery & management
// Auth: X-API-Key header (ADMIN_API_KEY env var)
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/admin/auth';
import { setAgentDiscoveryHeaders, AGENT_META } from '@/lib/admin/agent-discovery';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key');
  if (!validateApiKey(apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [userCount, contentCount] = await Promise.all([
    db.prime.count(),
    db.content.count(),
  ]);

  const response = NextResponse.json({
    platform: AGENT_META.platform,
    version: AGENT_META.version,
    stats: { users: userCount, articles: contentCount },
    contracts: AGENT_META.contracts,
    superadmin: AGENT_META.superadmin,
    endpoints: AGENT_META.endpoints,
    protocols: AGENT_META.protocols,
  });

  setAgentDiscoveryHeaders(response);
  return response;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key');
  if (!validateApiKey(apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case 'generate_invite': {
      const code = `WEB5-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await db.systemConfig.create({
        data: {
          key: `invite:${code}`,
          value: JSON.stringify({ code, maxUses: 10, usedCount: 0, createdAt: new Date().toISOString() }),
        },
      });
      return NextResponse.json({ success: true, inviteCode: code });
    }
    case 'stats': {
      const [users, articles] = await Promise.all([db.prime.count(), db.content.count()]);
      return NextResponse.json({ users, articles });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}
