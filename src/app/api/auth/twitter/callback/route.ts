// ════════════════════════════════════════════════════════════════
// src/app/api/auth/twitter/callback/route.ts
// Twitter/X OAuth 回调处理 — 交换 code 获取用户身份后登录
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash, randomBytes } from 'crypto';
import { getDefaultBudget } from '@/lib/web5/vessel-verifier';
import { serializeForJson, RFC_CONSTANTS } from '@/lib/web5/types';
import { getVesselTokenSecret } from '@/lib/web5/token-secret';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog';

export async function GET(req: NextRequest) {
  // 动态获取站地址（优先用请求来源，而非固定环境变量）
  const origin = req.headers.get('host')
    ? `${req.nextUrl.protocol}//${req.headers.get('host')}`
    : (process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog');

  try {
    const { searchParams } = req.nextUrl;
    const code = searchParams.get('code') || '';
    const state = searchParams.get('state') || '';
    const frontendRedirect = searchParams.get('redirect') || '/';

    let twitterUserId = '';
    let twitterUsername = '';

    // 模拟模式：code 以 mock_twitter_ 开头，或未配置 Twitter Client ID
    if (code.startsWith('mock_twitter_') || !TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
      twitterUserId = code.startsWith('mock_twitter_') ? code.replace('mock_twitter_', '') : Math.random().toString(36).slice(2, 10);
      twitterUsername = `X_User_${twitterUserId.slice(-6)}`;
    } else {
      // 真实 OAuth 2.0 PKCE 流程
      try {
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

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;
          const userRes = await fetch('https://api.twitter.com/2/users/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            twitterUserId = userData.data?.id || '';
            twitterUsername = userData.data?.username || '';
          }
        }
      } catch (e) {
        console.warn('[Twitter Auth] Token exchange fallback to identity mapping:', e);
      }
    }

    if (!twitterUserId) {
      twitterUserId = 'x_' + Math.random().toString(36).slice(2, 10);
      twitterUsername = `pioneer_${twitterUserId.slice(-6)}`;
    }

    // 构造 Web5 格式的唯一地址与 DID
    const addr = '0x' + Buffer.from(twitterUserId).toString('hex').padEnd(40, '0').slice(0, 40);
    const primeDid = `did:plvtvs:${addr.toLowerCase()}`;

    // 直接在本地数据库更新/创建 Prime 身份（消除任何 HTTP 回环死锁隐患）
    const prime = await db.prime.upsert({
      where: { walletAddress: addr.toLowerCase() },
      update: { lastActiveAt: new Date(), displayName: `@${twitterUsername}` },
      create: {
        did: primeDid,
        walletAddress: addr.toLowerCase(),
        displayName: `@${twitterUsername}`,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    const nonce = randomBytes(16).toString('hex');
    const expiresAt = Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000;
    const payload = `twitter:${prime.did}:${expiresAt}:${nonce}`;
    const secret = getVesselTokenSecret();
    const signature = createHash('sha256').update(payload + secret).digest('hex');
    const sessionToken = `${payload}.${signature}`;

    const sessionObj = serializeForJson({
      vesselDid: `did:vessel:${addr.toLowerCase()}`,
      eidolonDid: `did:eidolon:${addr.toLowerCase().slice(-16)}`,
      primeDid: prime.did,
      sessionToken,
      expiresAt,
      ap2Budget: getDefaultBudget(),
      permissions: ['read', 'comment'],
      accessMode: 'observer' as const,
      twitterUsername,
      twitterUserId,
    });

    // 重定向回前端，携带 session 数据
    const redirectUrl = new URL(frontendRedirect, origin);
    redirectUrl.searchParams.set('twitter_session', encodeURIComponent(JSON.stringify(sessionObj)));
    redirectUrl.searchParams.set('twitter_login', 'success');

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('twitter_oauth_state');
    response.cookies.delete('twitter_code_verifier');
    return response;
  } catch (err) {
    console.error('[twitter-callback] Error:', err);
    return NextResponse.redirect(new URL('/?twitter_error=auth_failed', origin));
  }
}
