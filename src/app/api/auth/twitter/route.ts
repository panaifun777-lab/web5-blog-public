// ════════════════════════════════════════════════════════════════
// src/app/api/auth/twitter/route.ts
// Twitter/X OAuth 授权入口 — 重定向至 Twitter 授权页面
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get('callback_url') || `${SITE_URL}/api/auth/twitter/callback`;

  // 如果没有配置 Twitter OAuth 凭据，走模拟模式
  if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
    // 模拟 OAuth：直接跳转回调，携带模拟的 code
    const mockCode = 'mock_twitter_' + Math.random().toString(36).slice(2, 10);
    const redirectUrl = new URL(callbackUrl);
    redirectUrl.searchParams.set('code', mockCode);
    redirectUrl.searchParams.set('state', 'mock');
    return NextResponse.redirect(redirectUrl);
  }

  // 真实 Twitter OAuth 2.0 PKCE 流程
  const state = Math.random().toString(36).slice(2, 15);
  const codeVerifier = Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);

  // 将 codeVerifier 和 state 存入 cookie 用于回调验证
  const response = NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=tweet.read%20users.read&state=${state}&code_challenge=${codeVerifier}&code_challenge_method=plain`
  );

  response.cookies.set('twitter_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  response.cookies.set('twitter_code_verifier', codeVerifier, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });

  return response;
}
