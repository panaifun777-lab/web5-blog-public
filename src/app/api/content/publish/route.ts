// ════════════════════════════════════════════════════════════════
// src/app/api/content/publish/route.ts
// 内容发布 API（容器登录后调用）
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { publishContent } from '@/lib/web5/content/publisher';
import { serializeForJson } from '@/lib/web5/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await publishContent(body);
    return NextResponse.json({ success: true, ...serializeForJson(result) });
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
