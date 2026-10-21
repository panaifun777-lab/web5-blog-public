// ════════════════════════════════════════════════════════════════
// src/lib/web5/vessel-verifier.ts
// AA2P 签名验证 + Prime Delegation 查询（模拟实现，生产环境对接 eidolonos.xyz）
// ════════════════════════════════════════════════════════════════

import type { AA2PClaim, PrimeDelegation, BudgetFence, VesselPermission } from './types';
import { RFC_CONSTANTS, toTokenUnits } from './types';
import { db } from '@/lib/db';

/**
 * 验证 AA2P 灵魂凭证签名
 * 生产环境：验证 vesselDid 对应的 AA2P 公钥对 aa2pClaim.signature 的签名
 * 模拟环境：检查签名格式 + challenge 一致性
 */
export async function verifyAA2PSignature(
  aa2pClaim: AA2PClaim,
  vesselDid: string
): Promise<boolean> {
  try {
    // 模拟验证：签名非空 + challenge 匹配 + 未过期
    if (!aa2pClaim.signature || !aa2pClaim.signature.startsWith('0x')) {
      return false;
    }
    if (aa2pClaim.vesselDid !== vesselDid) {
      return false;
    }
    if (Date.now() > aa2pClaim.expiresAt) {
      return false;
    }
    // 生产环境应使用 viem verifyMessage / secp256k1 verify
    return true;
  } catch (err) {
    console.error('[verifyAA2PSignature] Error:', err);
    return false;
  }
}

/**
 * 查询 Prime Delegation 授权状态
 * 生产环境：调用 eidolonos.xyz 预言机合约查询 Session Key
 * 模拟环境：从数据库查询 Vessel 的 Prime 关联，若无则创建默认授权
 */
export async function queryPrimeDelegation(
  vesselDid: string,
  eidolonDid: string
): Promise<PrimeDelegation> {
  try {
    // 尝试从数据库查询已存在的 Vessel
    const existingVessel = await db.vessel.findUnique({
      where: { did: vesselDid },
      include: { prime: true, eidolon: true },
    });

    if (existingVessel && existingVessel.prime) {
      // 已存在的 Vessel：从数据库恢复授权
      const budget = await getBudgetForVessel(existingVessel.id);
      const permissions = await getPermissionsForVessel(existingVessel.id);
      return {
        authorized: existingVessel.status === 'ACTIVE',
        primeDid: existingVessel.prime.did,
        sessionKey: {
          budget,
          permissions,
          expiresAt: Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000,
        },
      };
    }

    // 新 Vessel：模拟 Prime 授权（生产环境应由 eidolonos.xyz 签发）
    const simulatedPrimeDid = `did:plvtvs:sim-${eidolonDid.slice(-16)}`;
    const budget = getDefaultBudget();
    const permissions: VesselPermission[] = ['read', 'comment', 'micropay'];

    return {
      authorized: true,
      primeDid: simulatedPrimeDid,
      sessionKey: {
        budget,
        permissions,
        expiresAt: Date.now() + RFC_CONSTANTS.SESSION_TTL_HOURS * 3600 * 1000,
      },
    };
  } catch (err) {
    console.error('[queryPrimeDelegation] Error:', err);
    return { authorized: false, primeDid: '', sessionKey: getDefaultSessionKey() };
  }
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
      categoryLimit: budget.categoryLimit
        ? JSON.parse(budget.categoryLimit)
        : undefined,
    };
  }
  return getDefaultBudget();
}

/** 获取 Vessel 的权限列表 */
async function getPermissionsForVessel(_vesselId: string): Promise<VesselPermission[]> {
  // 默认权限；生产环境从 sessionKey 配置读取
  return ['read', 'comment', 'micropay'];
}

/** 默认 BudgetFence（保守的初始预算） */
export function getDefaultBudget(): BudgetFence {
  return {
    dailyLimit: toTokenUnits('10'),       // 10 USDC/day
    perTxLimit: toTokenUnits('1'),        // 1 USDC/tx
    rateLimitPerMin: RFC_CONSTANTS.DEFAULT_RATE_LIMIT_PER_MIN,
    whitelist: [],                        // 空白名单表示允许所有（生产环境应限制）
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
