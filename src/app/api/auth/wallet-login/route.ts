// ════════════════════════════════════════════════════════════════
// src/app/api/auth/wallet-login/route.ts
// Web3 钱包登录 — 链上签名绑定，创建完整权限的 Prime + Vessel 容器
// 与容器登录并列的两种主权登录方式之一（完整权限，非 Observer 只读）
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getVesselTokenSecret } from '@/lib/web5/token-secret';
import { db } from '@/lib/db';
import { createHash, randomBytes } from 'crypto';
import { getDefaultBudget } from '@/lib/web5/vessel-verifier';
import { serializeForJson, RFC_CONSTANTS } from '@/lib/web5/types';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, vesselAddress, signature, message } = await req.json();
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }
    if (!signature || !message) {
      return NextResponse.json({ error: 'Wallet signature required' }, { status: 401 });
    }

    const addr = walletAddress.toLowerCase();
    const vesselAddr = (vesselAddress && vesselAddress.startsWith('0x') ? vesselAddress : addr).toLowerCase();
    const walletMatch = /Wallet: (0x[0-9a-fA-F]{40})/.exec(message);
    const vesselMatch = /Vessel: (0x[0-9a-fA-F]{40})/.exec(message);
    const tsMatch = /Timestamp: (\d+)/.exec(message);
    if (
      !message.startsWith('Web5.blog Sovereign Login') ||
      !walletMatch || walletMatch[1].toLowerCase() !== addr ||
      !vesselMatch || vesselMatch[1].toLowerCase() !== vesselAddr ||
      !tsMatch || Math.abs(Date.now() - Number(tsMatch[1])) > 5 * 60 * 1000
    ) {
      return NextResponse.json({ error: 'Login signature expired or mismatched' }, { status: 401 });
    }

    try {
      const { verifyMessage } = await import('viem');
      const valid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      if (!valid) {
        return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 });
    }

    // 网站专用钱包地址（Vessel 容器），与主钱包地址区分开
    const primeDid = `did:plvtvs:${addr}`;
    const vesselDid = `did:vessel:${vesselAddr}`;
    const eidolonDid = `did:eidolon:${vesselAddr.slice(-16)}`;

    // ━━ 1. 创建/查找 Prime（本体身份） ━━
    const prime = await db.prime.upsert({
      where: { walletAddress: addr },
      update: { lastActiveAt: new Date() },
      create: {
        did: primeDid,
        walletAddress: addr,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // ━━ 2. 创建/查找 Eidolon（数字分身） ━━
    const eidolon = await db.eidolon.upsert({
      where: { did: eidolonDid },
      update: { lastActiveAt: new Date(), status: 'ACTIVE' },
      create: {
        did: eidolonDid,
        name: `Eidolon-${addr.slice(-6)}`,
        primeId: prime.id,
        status: 'ACTIVE',
      },
    });

    // ━━ 3. 创建/查找 Vessel（容器） ━━
    const vessel = await db.vessel.upsert({
      where: { did: vesselDid },
      update: { status: 'ACTIVE', lastActiveAt: new Date() },
      create: {
        did: vesselDid,
        eidolonId: eidolon.id,
        primeId: prime.id,
        smartAccountAddress: vesselAddr,
        sessionKeyConfig: JSON.stringify({ walletAddress: addr, vesselAddress: vesselAddr, signature: signature || null }),
        status: 'ACTIVE',
      },
    });

    // ━━ 4. 签发完整权限 Session Token ━━
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000;
    const payload = `wallet:${prime.did}:${vesselDid}:${expiresAt}:${nonce}`;
    const secret = getVesselTokenSecret();
    const sig = createHash('sha256').update(payload + secret).digest('hex');
    const sessionToken = `${payload}.${sig}`;

    const permissions = ['read', 'comment', 'publish', 'micropay'];
    const session = serializeForJson({
      vesselDid,
      eidolonDid,
      primeDid: prime.did,
      sessionToken,
      expiresAt,
      ap2Budget: getDefaultBudget(),
      permissions,
      accessMode: 'vessel' as const,
    });

    // ━━ 5. 持久化 Session 与预算 ━━
    const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
    await db.vesselSession.create({
      data: {
        vesselId: vessel.id,
        primeId: prime.id,
        tokenHash,
        aa2pClaimId: `wallet-${nonce}`,
        permissions: JSON.stringify(permissions),
        ap2Budget: JSON.stringify(serializeForJson(getDefaultBudget())),
        expiresAt: new Date(expiresAt),
      },
    });

    const existingBudget = await db.aP2Budget.findFirst({ where: { vesselId: vessel.id } });
    if (!existingBudget) {
      await db.aP2Budget.create({
        data: {
          vesselId: vessel.id,
          primeId: prime.id,
          dailyLimit: getDefaultBudget().dailyLimit,
          perTxLimit: getDefaultBudget().perTxLimit,
          rateLimitPerMin: getDefaultBudget().rateLimitPerMin,
          whitelist: JSON.stringify(getDefaultBudget().whitelist),
          categoryLimit: JSON.stringify(serializeForJson(getDefaultBudget().categoryLimit)),
        },
      });
    }

    return NextResponse.json({
      success: true,
      session,
      vessel: { vesselDid, eidolonDid, primeDid: prime.did },
    });
  } catch (err) {
    console.error('[wallet-login] Error:', err);
    return NextResponse.json({ error: 'Wallet login failed' }, { status: 500 });
  }
}
