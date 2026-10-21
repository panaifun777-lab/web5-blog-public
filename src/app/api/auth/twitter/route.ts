// ════════════════════════════════════════════════════════════════
// src/app/api/auth/twitter/route.ts
// Twitter/X 登录尚未接完 OAuth 校验，上线前保持关闭，禁止模拟登录。
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { featureDisabled } from '@/lib/launch/flags';

export async function GET() {
  return featureDisabled(
    'TWITTER_LOGIN_DISABLED',
    'Twitter/X 登录尚未开放：OAuth 回调与会话校验仍在完善中。'
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
