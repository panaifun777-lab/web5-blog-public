// ════════════════════════════════════════════════════════════════
// src/lib/web5/vessel-verifier.ts
// AA2P 签名验证 + Prime Delegation 查询
//
// 设计原则（fail-closed，从 beta 走向真实资金的硬门槛）：
//   - 任何身份断言默认视为“模拟”，只有在真正完成密码学验签 +
//     真实预言机授权后才标记为 real=true。
//   - 真实模式（REAL_VESSEL_IDENTITY=true）下，缺少 TEE 公钥或预言机
//     配置即拒绝签发，绝不退化为信任模拟身份。
//   - 客户端模拟桩（did:vessel:node-* / :sim-）在真实模式下一律拒绝。
// ════════════════════════════════════════════════════════════════

import { verifyMessage } from 'viem';
import type { AA2PClaim, PrimeDelegation, BudgetFence, VesselPermission } from './types';
import {
  RFC_CONSTANTS,
  toTokenUnits,
  isMockDid,
  didToAddress,
  BLOG_DID_FROM_ENV,
} from './types';
import { db } from '@/lib/db';
import { REAL_VESSEL_IDENTITY } from '@/lib/launch/flags';

export interface SignatureVerificationResult {
  /** 结构校验是否通过（决定是否签发会话）。 */
  verified: boolean;
  /** true 仅当签名经过真实密码学验签（TEE 公钥 + verifyMessage）。 */
  real: boolean;
  reason?: string;
}

/**
 * 验证 AA2P 灵魂凭证签名。
 *
 * 无论 beta 还是真实模式都先执行一组“不可伪造”的结构校验（DID 形态、
 * eidolon 关联、challenge 一致性、过期、签名格式）。真实模式下再追加
 * viem verifyMessage 对 TEE 公钥的验签。任何失败都返回 verified:false，
 * 绝不会因“格式像 0x 就放行”。
 */
export async function verifyAA2PSignature(
  aa2pClaim: AA2PClaim,
  vesselDid: string
): Promise<SignatureVerificationResult> {
  if (!aa2pClaim || !aa2pClaim.signature) {
    return { verified: false, real: false, reason: 'MISSING_SIGNATURE' };
  }
  if (aa2pClaim.vesselDid !== vesselDid) {
    return { verified: false, real: false, reason: 'VESSEL_DID_MISMATCH' };
  }

  // 客户端模拟桩：did:vessel:node-* 由 simulateVesselSignature 伪造。
  // 真实模式下必须拒绝；beta 模式下结构合法但永远不会是 real。
  const mockClaim =
    isMockDid(aa2pClaim.vesselDid) ||
    isMockDid(aa2pClaim.eidolonDid) ||
    aa2pClaim.simulated === true;
  if (mockClaim) {
    if (REAL_VESSEL_IDENTITY) {
      return { verified: false, real: false, reason: 'MOCK_IDENTITY_IN_REAL_MODE' };
    }
    // beta：允许模拟登录，但明确标记为非真实。
    return { verified: true, real: false };
  }

  if (!aa2pClaim.eidolonDid || !aa2pClaim.eidolonDid.startsWith('did:eidolon:')) {
    return { verified: false, real: false, reason: 'MISSING_EIDOLON' };
  }

  const challenge = aa2pClaim.challenge;
  if (!challenge || challenge.blogDid !== BLOG_DID_FROM_ENV) {
    return { verified: false, real: false, reason: 'CHALLENGE_BLOG_MISMATCH' };
  }
  if (!challenge.nonce) {
    return { verified: false, real: false, reason: 'CHALLENGE_NONCE_MISSING' };
  }
  if (Date.now() > aa2pClaim.expiresAt) {
    return { verified: false, real: false, reason: 'EXPIRED' };
  }
  if (!/^0x[0-9a-fA-F]{130}$/.test(aa2pClaim.signature)) {
    return { verified: false, real: false, reason: 'SIGNATURE_FORMAT' };
  }

  // beta 模式：结构校验通过，身份为模拟（未做密码学验签）。
  if (!REAL_VESSEL_IDENTITY) {
    return { verified: true, real: false };
  }

  // 真实模式：必须能取出 TEE 公钥并完成 verifyMessage 验签，否则 fail-closed。
  return verifyRealAa2pSignature(aa2pClaim);
}

/** 真实模式下的密码学验签：必须有 TEE 公布的 AA2P 公钥，否则拒绝。 */
async function verifyRealAa2pSignature(
  aa2pClaim: AA2PClaim
): Promise<SignatureVerificationResult> {
  const address =
    didToAddress(aa2pClaim.aa2pPublicKey) || didToAddress(aa2pClaim.vesselDid);
  if (!address) {
    // 没有真实公钥材料 → fail-closed：拒绝，而不是信任。
    return { verified: false, real: false, reason: 'AA2P_KEY_UNCONFIGURED' };
  }

  const message = canonicalAa2pMessage(aa2pClaim);
  try {
    const ok = await verifyMessage({
      address,
      message,
      signature: aa2pClaim.signature as `0x${string}`,
    });
    return ok
      ? { verified: true, real: true }
      : { verified: false, real: false, reason: 'SIGNATURE_INVALID' };
  } catch (err) {
    console.error('[verifyRealAa2pSignature] Error:', err);
    return { verified: false, real: false, reason: 'SIGNATURE_INVALID' };
  }
}

/**
 * 与 TEE（plvtvs.one）约定的被签名消息：对 challenge 做确定性序列化。
 * 真实模式下 TEE 必须按完全相同的方式签名；格式未达成前验签会失败，
 * 这是预期内的 fail-closed 行为。
 */
export function canonicalAa2pMessage(aa2pClaim: AA2PClaim): string {
  const c = aa2pClaim.challenge;
  return JSON.stringify({
    blogDid: c.blogDid,
    permissions: [...(c.permissions || [])].sort(),
    timestamp: c.timestamp,
    nonce: c.nonce,
  });
}

/**
 * 查询 Prime Delegation 授权状态。
 *
 * - 已落库的真实 Vessel：从数据库恢复，real 取决于其 Prime 是否模拟。
 * - 新 Vessel + 真实模式：调用 eidolonos.xyz 预言机；任何未配置/失败
 *   都返回 authorized:false（fail-closed），绝不为新身份伪造授权。
 * - 新 Vessel + beta 模式：签发模拟授权（real:false），供内测使用。
 */
export async function queryPrimeDelegation(
  vesselDid: string,
  eidolonDid: string
): Promise<PrimeDelegation> {
  try {
    const existingVessel = await db.vessel.findUnique({
      where: { did: vesselDid },
      include: { prime: true, eidolon: true },
    });

    if (existingVessel && existingVessel.prime) {
      const real = !existingVessel.prime.did.includes(':sim-');
      const budget = await getBudgetForVessel(existingVessel.id);
      const permissions = await getPermissionsForVessel(existingVessel.id);
      return {
        authorized: existingVessel.status === 'ACTIVE',
        primeDid: existingVessel.prime.did,
        real,
        sessionKey: {
          budget,
          permissions,
          expiresAt: Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000,
        },
      };
    }

    if (REAL_VESSEL_IDENTITY) {
      // 真实模式：必须经由预言机授权，缺失即拒绝。
      const delegation = await queryEidolonOracle(vesselDid, eidolonDid);
      if (!delegation) {
        return {
          authorized: false,
          primeDid: '',
          real: false,
          sessionKey: getDefaultSessionKey(),
        };
      }
      return delegation;
    }

    // beta：为全新 Vessel 签发模拟 Prime 授权（real:false）。
    const simulatedPrimeDid = `did:plvtvs:sim-${eidolonDid.slice(-16)}`;
    return {
      authorized: true,
      primeDid: simulatedPrimeDid,
      real: false,
      sessionKey: {
        budget: getDefaultBudget(),
        permissions: ['read', 'comment', 'micropay'],
        expiresAt: Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000,
      },
    };
  } catch (err) {
    console.error('[queryPrimeDelegation] Error:', err);
    return {
      authorized: false,
      primeDid: '',
      real: false,
      sessionKey: getDefaultSessionKey(),
    };
  }
}

/**
 * 调用 eidolonos.xyz 预言机查询 Session Key 授权。
 * 缺省任何必需配置（URL / Token）即返回 null，由调用方 fail-closed。
 */
async function queryEidolonOracle(
  vesselDid: string,
  eidolonDid: string
): Promise<PrimeDelegation | null> {
  const oracleUrl = (process.env.EIDOLON_ORACLE_URL || '').trim();
  const oracleToken = (process.env.EIDOLON_ORACLE_TOKEN || '').trim();
  if (!oracleUrl || !oracleToken) {
    console.warn('[queryEidolonOracle] EIDOLON_ORACLE_URL/TOKEN 未配置，新 Vessel 授权 fail-closed');
    return null;
  }
  try {
    const res = await fetch(`${oracleUrl.replace(/\/$/, '')}/v1/delegation`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${oracleToken}`,
      },
      body: JSON.stringify({ vesselDid, eidolonDid }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[queryEidolonOracle] oracle returned HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json().catch(() => null)) as {
      authorized?: boolean;
      primeDid?: string;
      permissions?: VesselPermission[];
      expiresAt?: number;
      budget?: Partial<BudgetFence>;
    } | null;
    if (!data || !data.authorized || !data.primeDid) return null;
    return {
      authorized: true,
      primeDid: data.primeDid,
      real: true,
      sessionKey: {
        budget: data.budget ? coerceBudget(data.budget) : getDefaultBudget(),
        permissions:
          data.permissions && data.permissions.length > 0
            ? data.permissions
            : ['read', 'comment', 'micropay'],
        expiresAt:
          data.expiresAt || Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000,
      },
    };
  } catch (err) {
    console.error('[queryEidolonOracle] Error:', err);
    return null;
  }
}

function coerceBudget(input: Partial<BudgetFence>): BudgetFence {
  const base = getDefaultBudget();
  return {
    dailyLimit: input.dailyLimit ?? base.dailyLimit,
    perTxLimit: input.perTxLimit ?? base.perTxLimit,
    rateLimitPerMin: input.rateLimitPerMin ?? base.rateLimitPerMin,
    whitelist: Array.isArray(input.whitelist) ? input.whitelist : base.whitelist,
    categoryLimit: input.categoryLimit ?? base.categoryLimit,
  };
}

/** 获取 Vessel 的 BudgetFence 配置 */
async function getBudgetForVessel(vesselId: string): Promise<BudgetFence> {
  const budget = await db.aP2Budget.findFirst({ where: { vesselId } });
  if (budget) {
    return {
      dailyLimit: budget.dailyLimit,
      perTxLimit: budget.perTxLimit,
      rateLimitPerMin: budget.rateLimitPerMin,
      whitelist: JSON.parse(budget.whitelist || '[]'),
      categoryLimit: budget.categoryLimit ? JSON.parse(budget.categoryLimit) : undefined,
    };
  }
  return getDefaultBudget();
}

/** 获取 Vessel 的权限列表 */
async function getPermissionsForVessel(_vesselId: string): Promise<VesselPermission[]> {
  return ['read', 'comment', 'micropay'];
}

/** 默认 BudgetFence（保守的初始预算） */
export function getDefaultBudget(): BudgetFence {
  return {
    dailyLimit: toTokenUnits('10'), // 10 USDC/day
    perTxLimit: toTokenUnits('1'), // 1 USDC/tx
    rateLimitPerMin: RFC_CONSTANTS.DEFAULT_RATE_LIMIT_PER_MIN,
    whitelist: [], // 空白名单表示允许所有（生产环境应限制）
    categoryLimit: {
      read: toTokenUnits('5'),
      tip: toTokenUnits('3'),
      subscribe: toTokenUnits('2'),
      royalty: toTokenUnits('0'),
      harvest: toTokenUnits('0'),
    },
  };
}

function getDefaultSessionKey(): PrimeDelegation['sessionKey'] {
  return {
    budget: getDefaultBudget(),
    permissions: ['read'],
    expiresAt: 0,
  };
}
