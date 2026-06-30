// ════════════════════════════════════════════════════════════════
// src/lib/web5/token-issuer.ts
// Vessel Session Token 签发器 — Step 4
// 生产环境应使用 JWT (jose) 或自签名 token；此处为 MVP 实现
// ════════════════════════════════════════════════════════════════

import { createHash, randomBytes } from 'crypto';
import type {
  VesselSession, BudgetFence, VesselPermission,
} from './types';

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
  const secret = process.env.VESSEL_TOKEN_SECRET || 'web5-blog-mvp-secret-dev-only';

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

    const secret = process.env.VESSEL_TOKEN_SECRET || 'web5-blog-mvp-secret-dev-only';
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
