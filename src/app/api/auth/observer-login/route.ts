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

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
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

    // Observer Mode 不创建 Vessel/Eidolon，只发受限 Token
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000;
    const payload = `observer:${prime.did}:${expiresAt}:${nonce}`;
    const secret = getVesselTokenSecret();
    const signature = createHash('sha256').update(payload + secret).digest('hex');
    const sessionToken = `${payload}.${signature}`;

    return NextResponse.json({
      success: true,
      session: serializeForJson({
        vesselDid: '',
        eidolonDid: '',
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
    return NextResponse.json(
      { error: 'Observer login failed' },
      { status: 500 }
    );
  }
}
