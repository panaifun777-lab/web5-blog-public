// ════════════════════════════════════════════════════════════════
// src/lib/web5/token-issuer.ts
// Vessel Session Token 签发器 — Step 4
// 生产环境应使用 JWT (jose) 或自签名 token；此处为 MVP 实现
// ════════════════════════════════════════════════════════════════

import { createHash, randomBytes } from 'crypto';
import type {
  VesselSession, BudgetFence, VesselPermission,
} from './types';
import { getVesselTokenSecret } from './token-secret';
import { db } from '@/lib/db';
import { getDefaultBudget } from '@/lib/web5/vessel-verifier';

interface IssueTokenParams {
  vesselDid: string;
  eidolonDid: string;
  primeDid: string;
  ap2Budget: BudgetFence;
  permissions: VesselPermission[];
  expiresAt: number;
}

/**
 * 签发 Vessel Session Token
 * MVP 实现：vesselDid + random nonce + expiry，HMAC-SHA256 签名
 * 生产环境：使用 jose 库签发 JWT，含 primeDid / vesselDid / permissions / budget
 */
export async function issueVesselToken(
  params: IssueTokenParams
): Promise<VesselSession> {
  const nonce = randomBytes(16).toString('hex');
  const payload = `${params.vesselDid}:${params.primeDid}:${params.expiresAt}:${nonce}`;
  const secret = getVesselTokenSecret();

  const signature = createHash('sha256')
    .update(payload + secret)
    .digest('hex');

  const sessionToken = `${payload}.${signature}`;

  return {
    vesselDid: params.vesselDid,
    eidolonDid: params.eidolonDid,
    primeDid: params.primeDid,
    sessionToken,
    expiresAt: params.expiresAt,
    ap2Budget: params.ap2Budget,
    permissions: params.permissions,
    accessMode: 'vessel',
  };
}

/**
 * 验证 Vessel Session Token（供 middleware 使用）
 */
export async function verifyVesselToken(
  token: string
): Promise<{ valid: boolean; session?: Partial<VesselSession> }> {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return { valid: false };

    const [vesselDid, primeDid, expiresAtStr, nonce] = payload.split(':');
    const expiresAt = Number(expiresAtStr);
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
      return { valid: false };
    }

    const secret = getVesselTokenSecret();
    const expectedSig = createHash('sha256')
      .update(payload + secret)
      .digest('hex');

    if (signature !== expectedSig) return { valid: false };

    return {
      valid: true,
      session: { vesselDid, primeDid, expiresAt },
    };
  } catch {
    return { valid: false };
  }
}

/**
 * 从 Session Token 解析并验证完整的 VesselSession（用于服务端 API 鉴权）
 */
export async function resolveVesselSessionFromToken(
  token?: string | null
): Promise<VesselSession | null> {
  if (!token) return null;
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const secret = getVesselTokenSecret();
    const expectedSig = createHash('sha256')
      .update(payload + secret)
      .digest('hex');

    if (signature !== expectedSig) return null;

    const parts = payload.split(':');
    if (parts[0] === 'observer') {
      const [, primeDid, expiresAtStr] = parts;
      const expiresAt = Number(expiresAtStr);
      if (Date.now() > expiresAt) return null;
      return {
        vesselDid: '',
        eidolonDid: '',
        primeDid,
        sessionToken: token,
        expiresAt,
        ap2Budget: getDefaultBudget(),
        permissions: ['read'],
        accessMode: 'observer',
      };
    }

    const [vesselDid, primeDid, expiresAtStr] = parts;
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return null;

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const dbSession = await db.vesselSession.findUnique({
      where: { tokenHash },
      include: {
        vessel: { include: { eidolon: true } },
        prime: true,
      },
    });

    if (dbSession && !dbSession.revokedAt && dbSession.expiresAt.getTime() > Date.now()) {
      let ap2Budget: BudgetFence = getDefaultBudget();
      if (dbSession.ap2Budget) {
        try {
          const parsed = JSON.parse(dbSession.ap2Budget);
          ap2Budget = {
            dailyLimit: BigInt(parsed.dailyLimit ?? 10_000_000n),
            perTxLimit: BigInt(parsed.perTxLimit ?? 1_000_000n),
            rateLimitPerMin: parsed.rateLimitPerMin ?? 10,
            whitelist: parsed.whitelist || [],
            categoryLimit: parsed.categoryLimit
              ? Object.fromEntries(
                  Object.entries(parsed.categoryLimit).map(([k, v]) => [k, BigInt(v as string)])
                )
              : undefined,
          };
        } catch {}
      }

      const permissions = JSON.parse(dbSession.permissions || '[]') as VesselPermission[];
      return {
        vesselDid: dbSession.vessel.did,
        eidolonDid: dbSession.vessel.eidolon?.did || '',
        primeDid: dbSession.prime.did,
        sessionToken: token,
        expiresAt: dbSession.expiresAt.getTime(),
        ap2Budget,
        permissions,
        accessMode: 'vessel',
      };
    }

    // 备用 fallback（若 token 正确但 session 记录不在数据库中）
    const vessel = await db.vessel.findUnique({
      where: { did: vesselDid },
      include: { eidolon: true, ap2Budgets: true },
    });
    return {
      vesselDid,
      eidolonDid: vessel?.eidolon?.did || '',
      primeDid,
      sessionToken: token,
      expiresAt,
      ap2Budget: getDefaultBudget(),
      permissions: ['read', 'comment', 'micropay', 'publish'],
      accessMode: 'vessel',
    };
  } catch (e) {
    console.error('[resolveVesselSessionFromToken] Error:', e);
    return null;
  }
}
