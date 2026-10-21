// ════════════════════════════════════════════════════════════════
// src/app/api/content/publish/route.ts
// 内容发布 API（容器登录后调用）
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { publishContent } from '@/lib/web5/content/publisher';
import { serializeForJson } from '@/lib/web5/types';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);

    const body = await req.json();
    const result = await publishContent(body, session);
    return NextResponse.json({
      success: true,
      arweaveHash: result.arweaveHash,
      tokenId: result.tokenId ? result.tokenId.toString() : null,
      arpVcId: result.arpVcId,
      contentId: result.contentId,
      uploadFallback: Boolean(result.uploadFallback),
      uploadSize: Number(result.uploadSize || 0),
    });
  } catch (err) {
    const e = err as Error;
    console.error('[content/publish] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { searchParams } = new URL('http://x');
    const contents = await import('@/lib/web5/content/publisher').then(m => m.listContents({
      limit: 20,
      offset: 0,
    }));
    return NextResponse.json({ success: true, contents });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
