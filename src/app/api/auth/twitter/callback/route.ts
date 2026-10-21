// ════════════════════════════════════════════════════════════════
// src/app/api/auth/twitter/callback/route.ts
// 回调入口关闭，避免在未校验 OAuth 的情况下创建本地身份。
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/?twitter_error=disabled', req.url));
}
