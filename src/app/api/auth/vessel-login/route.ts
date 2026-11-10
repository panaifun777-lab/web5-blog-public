// ════════════════════════════════════════════════════════════════
// src/app/api/auth/vessel-login/route.ts
// 容器登录后端：Step 3 Prime Delegation Check + Step 4 Vessel Token Issue
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizePrimeWalletAddress } from '@/lib/web5/prime';
import {
  type VesselChallenge, type AA2PClaim,
  RFC_CONSTANTS, serializeForJson,
} from '@/lib/web5/types';
import { verifyAA2PSignature, queryPrimeDelegation } from '@/lib/web5/vessel-verifier';
import { issueVesselToken } from '@/lib/web5/token-issuer';
import { createVesselWallet } from '@/lib/web5/circle/client';
import { createHash } from 'crypto';
import { apiError } from '@/lib/web5/api/errors';

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

    if (!challenge || !aa2pClaim || !vesselDid || !eidolonDid) {
      return apiError('MISSING_VESSEL_LOGIN_FIELDS', { request: req });
    }

    const now = Date.now();

    // ━━ Challenge 校验 ━━
    if (now - challenge.timestamp > RFC_CONSTANTS.CHALLENGE_TTL_MS) {
      return apiError('CHALLENGE_EXPIRED', { request: req });
    }
    if (challenge.permissions.length === 0) {
      return apiError('NO_PERMISSIONS_REQUESTED', { request: req });
    }

    // ━━ Step 3a: 验证 AA2P 签名 ━━
    const sigResult = await verifyAA2PSignature(aa2pClaim, vesselDid);
    if (!sigResult.verified) {
      return apiError('AA2P_SIGNATURE_INVALID', { request: req });
    }

    // ━━ Step 3b: 查询 Prime 授权 ━━
    const delegation = await queryPrimeDelegation(vesselDid, eidolonDid);
    if (!delegation.authorized) {
      return apiError('PRIME_DELEGATION_MISSING', { request: req });
    }

    // 身份是否“真实”：签名经过密码学验签 + 预言机授权 + 非模拟 Prime。
    // 任何一环不成立都视为模拟身份（beta），不可用于结算真实资金。
    const identityReal =
      sigResult.real &&
      delegation.real &&
      !delegation.primeDid.includes(':sim-');

    // ━━ Step 4: 签发 Vessel Session Token ━━
    const session = await issueVesselToken({
      vesselDid,
      eidolonDid,
      primeDid: delegation.primeDid,
      ap2Budget: delegation.sessionKey.budget,
      permissions: delegation.sessionKey.permissions,
      expiresAt: delegation.sessionKey.expiresAt,
      identityReal,
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
        walletAddress: normalizePrimeWalletAddress(undefined, delegation.primeDid),
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
    return apiError('VESSEL_AUTH_FAILED', { request: req });
  }
}
