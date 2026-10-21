// ════════════════════════════════════════════════════════════════
// src/app/api/auth/vessel-login/route.ts
// 容器登录后端：Step 3 Prime Delegation Check + Step 4 Vessel Token Issue
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  type VesselChallenge, type AA2PClaim,
  RFC_CONSTANTS, serializeForJson,
} from '@/lib/web5/types';
import { verifyAA2PSignature, queryPrimeDelegation } from '@/lib/web5/vessel-verifier';
import { issueVesselToken } from '@/lib/web5/token-issuer';
import { createVesselWallet } from '@/lib/web5/circle/client';
import { createHash } from 'crypto';

// ━━ 全局 BigInt JSON 序列化修复 ━━
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () { return this.toString(); };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { challenge, aa2pClaim, vesselDid, eidolonDid } = (body || {}) as {
      challenge?: VesselChallenge;
      aa2pClaim?: AA2PClaim;
      vesselDid?: string;
      eidolonDid?: string;
    };

    if (!challenge || !aa2pClaim || !vesselDid) {
      return NextResponse.json(
        { error: 'Missing required fields: challenge, aa2pClaim, vesselDid' },
        { status: 400 }
      );
    }

    const now = Date.now();

    // ━━ Challenge 校验 ━━
    if (now - challenge.timestamp > RFC_CONSTANTS.CHALLENGE_TTL_MS) {
      return NextResponse.json(
        { error: 'Challenge expired' },
        { status: 401 }
      );
    }
    if (challenge.permissions.length === 0) {
      return NextResponse.json(
        { error: 'No permissions requested' },
        { status: 400 }
      );
    }

    // ━━ Step 3a: 验证 AA2P 签名 ━━
    const isValidSig = await verifyAA2PSignature(aa2pClaim, vesselDid);
    if (!isValidSig) {
      return NextResponse.json(
        { error: 'Invalid AA2P signature' },
        { status: 401 }
      );
    }

    // ━━ Step 3b: 查询 Prime 授权 ━━
    const delegation = await queryPrimeDelegation(vesselDid, eidolonDid);
    if (!delegation.authorized) {
      return NextResponse.json(
        { error: 'Prime delegation not found or revoked' },
        { status: 403 }
      );
    }

    // ━━ Step 4: 签发 Vessel Session Token ━━
    const session = await issueVesselToken({
      vesselDid,
      eidolonDid,
      primeDid: delegation.primeDid,
      ap2Budget: delegation.sessionKey.budget,
      permissions: delegation.sessionKey.permissions,
      expiresAt: delegation.sessionKey.expiresAt,
    });

    const tokenHash = createHash('sha256')
      .update(session.sessionToken)
      .digest('hex');

    // Upsert Prime
    const prime = await db.prime.upsert({
      where: { did: delegation.primeDid },
      update: { lastActiveAt: new Date(now) },
      create: {
        did: delegation.primeDid,
        walletAddress: delegation.primeDid.split(':').pop() || '0x0',
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // Upsert Eidolon
    const eidolon = await db.eidolon.upsert({
      where: { did: eidolonDid },
      update: { lastActiveAt: new Date(now), status: 'ACTIVE' },
      create: {
        did: eidolonDid,
        name: `Eidolon-${eidolonDid.slice(-6)}`,
        primeId: prime.id,
        status: 'ACTIVE',
      },
    });

    // 为 Vessel 分身派发 Circle 托管钱包 (ARC 链兼容)
    const circleWallet = await createVesselWallet({
      eidolonDid: eidolonDid || eidolon.did,
      blockchain: 'ARC-TESTNET',
    });

    // Upsert Vessel
    const vessel = await db.vessel.upsert({
      where: { did: vesselDid },
      update: {
        status: 'ACTIVE',
        lastActiveAt: new Date(now),
        smartAccountAddress: circleWallet.address,
        sessionKeyConfig: JSON.stringify(circleWallet),
      },
      create: {
        did: vesselDid,
        eidolonId: eidolon.id,
        primeId: prime.id,
        smartAccountAddress: circleWallet.address,
        sessionKeyConfig: JSON.stringify(circleWallet),
        status: 'ACTIVE',
      },
    });

    // 持久化 Session
    await db.vesselSession.create({
      data: {
        vesselId: vessel.id,
        primeId: prime.id,
        tokenHash,
        aa2pClaimId: aa2pClaim.challenge.nonce,
        permissions: JSON.stringify(session.permissions),
        ap2Budget: JSON.stringify(serializeForJson(session.ap2Budget)),
        expiresAt: new Date(session.expiresAt),
      },
    });

    // Upsert AP2 Budget
    const existingBudget = await db.aP2Budget.findFirst({
      where: { vesselId: vessel.id },
    });
    if (!existingBudget) {
      await db.aP2Budget.create({
        data: {
          vesselId: vessel.id,
          primeId: prime.id,
          dailyLimit: session.ap2Budget.dailyLimit,
          perTxLimit: session.ap2Budget.perTxLimit,
          rateLimitPerMin: session.ap2Budget.rateLimitPerMin,
          whitelist: JSON.stringify(session.ap2Budget.whitelist),
          categoryLimit: session.ap2Budget.categoryLimit
            ? JSON.stringify(serializeForJson(session.ap2Budget.categoryLimit))
            : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      session: serializeForJson(session),
    });
  } catch (err) {
    console.error('[vessel-login] Error:', err);
    return NextResponse.json(
      { error: 'Vessel authentication failed' },
      { status: 500 }
    );
  }
}
