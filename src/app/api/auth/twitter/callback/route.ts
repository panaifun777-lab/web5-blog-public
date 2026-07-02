// ════════════════════════════════════════════════════════════════
// src/app/api/auth/twitter/callback/route.ts
// Twitter/X OAuth 回调处理 — 交换 code 获取用户身份后登录
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const frontendRedirect = searchParams.get('redirect') || '/';

    // 动态获取站地址（优先用请求来源，而非环境变量）
    const origin = req.headers.get('host') ? `${req.nextUrl.protocol}//${req.headers.get('host')}` : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

    let twitterUserId = '';
    let twitterUsername = '';
    let isMock = false;

    // 模拟模式：code 以 mock_twitter_ 开头
    if (code.startsWith('mock_twitter_')) {
      isMock = true;
      twitterUserId = `twitter_${code.replace('mock_twitter_', '')}`;
      twitterUsername = `user_${twitterUserId.slice(-6)}`;
    } else if (TWITTER_CLIENT_ID && TWITTER_CLIENT_SECRET) {
      // 真实 OAuth — 用 code 交换 access token
      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${origin}/api/auth/twitter/callback`,
          code_verifier: req.cookies.get('twitter_code_verifier')?.value || '',
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`Twitter token exchange failed: ${tokenRes.status}`);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 获取用户信息
      const userRes = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userRes.ok) {
        const userData = await userRes.json();
        twitterUserId = userData.data?.id || '';
        twitterUsername = userData.data?.username || '';
      }
    }

    if (!twitterUserId) {
      twitterUserId = 'twitter_' + Math.random().toString(36).slice(2, 10);
      twitterUsername = `user_${twitterUserId.slice(-6)}`;
    }

    // 构造 Web5 格式的地址
    const addr = '0x' + Buffer.from(twitterUserId).toString('hex').padEnd(40, '0').slice(0, 40);

    // 调用 observer-login 完成登录
    const loginRes = await fetch(`${origin}/api/auth/observer-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: addr }),
    });

    if (!loginRes.ok) {
      throw new Error('Twitter login failed');
    }

    const loginData = await loginRes.json();

    // 将 session 信息附加到前端 URL 的 hash 或 searchParams
    const sessionJson = encodeURIComponent(JSON.stringify({
      ...loginData.session,
      twitterUsername,
      twitterUserId,
      accessMode: 'observer',
    }));

    // 重定向回前端，携带 session 数据
    const redirectUrl = new URL(frontendRedirect, origin);
    redirectUrl.searchParams.set('twitter_session', sessionJson);
    redirectUrl.searchParams.set('twitter_login', 'success');

    const response = NextResponse.redirect(redirectUrl);
    // 清理 OAuth cookies
    response.cookies.delete('twitter_oauth_state');
    response.cookies.delete('twitter_code_verifier');

    return response;
  } catch (err) {
    console.error('[twitter-callback] Error:', err);
    return NextResponse.redirect(new URL('/?twitter_error=auth_failed', origin));
  }
}
