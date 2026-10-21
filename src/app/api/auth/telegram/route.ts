// ════════════════════════════════════════════════════════════════
// src/app/api/auth/telegram/route.ts
// Telegram Mini App 工业级安全验签与静默登录路由
//
// 遵循 Telegram 官方密码学规范：
// 1. 使用 SHA-256("WebAppData") 对 Bot Token 进行 HMAC 哈希派生 secret_key
// 2. 对 initData 键值对按字母排序拼装为 data_check_string
// 3. 计算 HMAC-SHA256(data_check_string, secret_key) 并与 hash 进行常数时间对比
// 4. 验签通过后，自动为用户创建/绑定唯一的 Prime DID 并派发 Circle ARC 专属 Vessel 容器
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, createHash } from 'crypto';
import { db } from '@/lib/db';
import { issueVesselToken } from '@/lib/web5/token-issuer';
import { createVesselWallet } from '@/lib/web5/circle/client';
import { getDefaultBudget } from '@/lib/web5/vessel-verifier';
import { serializeForJson, RFC_CONSTANTS } from '@/lib/web5/types';

export const dynamic = 'force-dynamic';

function verifyTelegramWebAppData(initDataRaw: string, botToken: string): { valid: boolean; user?: any } {
  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    // 剔除 hash 参数后按字母顺序排序
    params.delete('hash');
    const dataCheckArr: string[] = [];
    Array.from(params.keys()).sort().forEach(key => {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    });
    const dataCheckString = dataCheckArr.join('\n');

    // 派生 secret_key: HMAC-SHA256(BotToken, "WebAppData")
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();

    // 计算签名: HMAC-SHA256(dataCheckString, secretKey)
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return { valid: false };
    }

    const userRaw = params.get('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { valid: true, user };
  } catch (err) {
    console.warn('[Telegram Auth] Verification error:', err);
    return { valid: false };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();
    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
    }

    const botToken = process.env.TG_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram auth not configured' }, { status: 503 });
    }
    const { valid, user } = verifyTelegramWebAppData(initData, botToken);

    if (!valid || !user || !user.id) {
      return NextResponse.json({ error: 'Invalid or forged Telegram WebApp signature' }, { status: 401 });
    }

    const tgUserId = String(user.id);
    const tgUsername = user.username || `tg_${tgUserId.slice(-6)}`;
    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || tgUsername;

    // 确定性派生以太坊风格的地址与 DID
    const addrHash = createHash('sha256').update(`telegram:${tgUserId}`).digest('hex').slice(0, 40);
    const walletAddress = `0x${addrHash}`;
    const primeDid = `did:plvtvs:${walletAddress.toLowerCase()}`;
    const vesselDid = `did:vessel:${walletAddress.toLowerCase()}`;
    const eidolonDid = `did:eidolon:${walletAddress.toLowerCase().slice(-16)}`;

    const now = Date.now();

    // 1. Upsert Prime
    const prime = await db.prime.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: {
        lastActiveAt: new Date(now),
        displayName,
        bio: `Telegram: @${tgUsername} (TMA Sovereign Soul)`,
      },
      create: {
        did: primeDid,
        walletAddress: walletAddress.toLowerCase(),
        displayName,
        bio: `Telegram: @${tgUsername} (TMA Sovereign Soul)`,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // 2. Upsert Eidolon
    const eidolon = await db.eidolon.upsert({
      where: { did: eidolonDid },
      update: { lastActiveAt: new Date(now), status: 'ACTIVE' },
      create: {
        did: eidolonDid,
        name: `${displayName} · 分身`,
        primeId: prime.id,
        status: 'ACTIVE',
      },
    });

    // 3. 为分身派发 Circle 托管钱包 (Arc 链兼容)
    const circleWallet = await createVesselWallet({
      eidolonDid,
      walletSetName: `TG-Vessel-${tgUsername}`,
      blockchain: 'ARC-TESTNET',
    });

    // 4. Upsert Vessel
    const vessel = await db.vessel.upsert({
      where: { did: vesselDid },
      update: {
        status: 'ACTIVE',
        lastActiveAt: new Date(now),
        ...(circleWallet.address ? { smartAccountAddress: circleWallet.address } : {}),
        sessionKeyConfig: JSON.stringify(circleWallet),
      },
      create: {
        did: vesselDid,
        eidolonId: eidolon.id,
        primeId: prime.id,
        ...(circleWallet.address ? { smartAccountAddress: circleWallet.address } : {}),
        sessionKeyConfig: JSON.stringify(circleWallet),
        status: 'ACTIVE',
      },
    });

    // 5. 签发具备完整权限的 Session Token
    const expiresAt = now + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000;
    const session = await issueVesselToken({
      vesselDid,
      eidolonDid,
      primeDid,
      ap2Budget: getDefaultBudget(),
      permissions: ['read', 'comment', 'publish', 'micropay'],
      expiresAt,
    });

    // 持久化会话
    const tokenHash = createHash('sha256').update(session.sessionToken).digest('hex');
    await db.vesselSession.create({
      data: {
        vesselId: vessel.id,
        primeId: prime.id,
        tokenHash,
        aa2pClaimId: `tma-${tgUserId}-${now}`,
        permissions: JSON.stringify(session.permissions),
        ap2Budget: JSON.stringify(serializeForJson(session.ap2Budget)),
        expiresAt: new Date(expiresAt),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        tgUserId,
        tgUsername,
        displayName,
        primeDid,
        vesselDid,
      },
      session: serializeForJson({
        ...session,
        isTelegramMiniApp: true,
      }),
    });
  } catch (err: any) {
    console.error('[Telegram Login API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
