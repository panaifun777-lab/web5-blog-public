// ════════════════════════════════════════════════════════════════
// src/app/api/auth/observer-login/route.ts
// 特洛伊木马降级路径：Web3 钱包登录 → Observer Mode（仅阅读）
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getVesselTokenSecret } from '@/lib/web5/token-secret';
import { db } from '@/lib/db';
import { createHash, randomBytes } from 'crypto';
import { getDefaultBudget } from '@/lib/web5/vessel-verifier';
import { serializeForJson, RFC_CONSTANTS } from '@/lib/web5/types';
import { apiError } from '@/lib/web5/api/errors';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return apiError('INVALID_WALLET_ADDRESS', { request: req });
    }

    // 创建/查找 Prime
    const primeDid = `did:plvtvs:${walletAddress.toLowerCase()}`;
    const prime = await db.prime.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: { lastActiveAt: new Date() },
      create: {
        did: primeDid,
        walletAddress: walletAddress.toLowerCase(),
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // 为每个登录地址确保存在对应的 Eidolon（真身）+ Vessel（容器/分身），
    // 使分身矩阵可加载（容器登录地址轮换时，每次随机地址都拥有独立 Vessel）。
    const eidolonDid = `did:eidolon:${walletAddress.toLowerCase()}`;
    const vesselDid = `did:vessel:${walletAddress.toLowerCase()}`;
    const eidolon = await db.eidolon.upsert({
      where: { did: eidolonDid },
      update: { lastActiveAt: new Date(), status: 'ACTIVE' },
      create: {
        did: eidolonDid,
        name: `Eidolon-${walletAddress.toLowerCase().slice(2, 8)}`,
        primeId: prime.id,
        status: 'ACTIVE',
      },
    });
    const smartAccountAddress = `0x${createHash('sha256').update(walletAddress.toLowerCase()).digest('hex').slice(0, 40)}`;
    await db.vessel.upsert({
      where: { did: vesselDid },
      update: { status: 'ACTIVE', lastActiveAt: new Date() },
      create: {
        did: vesselDid,
        eidolonId: eidolon.id,
        primeId: prime.id,
        smartAccountAddress,
        status: 'ACTIVE',
      },
    });

    // Observer Mode 仅发受限 Token，但附带 vesselDid 供前端加载分身矩阵
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000;
    const payload = `observer:${prime.did}:${expiresAt}:${nonce}`;
    const secret = getVesselTokenSecret();
    const signature = createHash('sha256').update(payload + secret).digest('hex');
    const sessionToken = `${payload}.${signature}`;

    return NextResponse.json({
      success: true,
      session: serializeForJson({
        vesselDid,
        eidolonDid,
        primeDid: prime.did,
        sessionToken,
        expiresAt,
        ap2Budget: getDefaultBudget(),
        permissions: ['read'],  // Observer Mode 仅阅读权限
        accessMode: 'observer' as const,
      }),
      upgradeHint: '当前为只读观察模式。完成容器登录后可发布内容、管理分身与查看存证状态；支付与分润功能内测中。',
    });
  } catch (err) {
    console.error('[observer-login] Error:', err);
    return apiError('LOGIN_FAILED', { request: req });
  }
}
