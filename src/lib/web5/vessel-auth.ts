// ════════════════════════════════════════════════════════════════
// src/lib/web5/vessel-auth.ts — Vessel Awakening 容器登录 SDK
// 实现"四步握手协议"前端逻辑：
//   Step 1: Vessel Challenge（生成挑战码）
//   Step 2: Eidolon Sign（Vessel 签名，非 MetaMask）
//   Step 3: Prime Delegation Check（后端验证 Prime 授权）
//   Step 4: Vessel Token Issue（后端签发 Session Token）
// ════════════════════════════════════════════════════════════════

import type {
  VesselSession, VesselChallenge, VesselPermission, AA2PClaim,
} from './types';
import { RFC_CONSTANTS } from './types';

// ━━ 全局 BigInt JSON 序列化修复 ━━
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () { return this.toString(); };
}

const VESSEL_ENDPOINT =
  process.env.NEXT_PUBLIC_VESSEL_ENDPOINT || 'https://plvtvs.one';
const BLOG_DID =
  process.env.NEXT_PUBLIC_WEB5_BLOG_DID || 'did:web5blog:default';

/** 生成随机 nonce */
function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Step 1: 生成 Vessel Challenge */
export function createVesselChallenge(
  permissions: VesselPermission[]
): VesselChallenge {
  return {
    blogDid: BLOG_DID,
    permissions,
    timestamp: Date.now(),
    nonce: generateNonce(),
  };
}

/** Step 2: 调用 Vessel 环境签名（plvtvs.one / 本地 TEE） */
export async function requestVesselSignature(
  challenge: VesselChallenge
): Promise<{
  aa2pClaim: AA2PClaim;
  vesselDid: string;
  eidolonDid: string;
}> {
  // 当前使用模拟模式。plvtvs.one Vessel 端点部署后，将 NEXT_PUBLIC_MOCK_VESSEL 设为 false 启用真实端点
  const useMock = process.env.NEXT_PUBLIC_MOCK_VESSEL !== 'false';

  if (useMock) {
    return simulateVesselSignature(challenge);
  }

  const res = await fetch(`${VESSEL_ENDPOINT}/api/vessel/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge }),
  });

  if (!res.ok) {
    throw new Error(`Vessel signature failed: ${res.status}`);
  }
  return res.json();
}

/** 获取或创建当前设备的稳定容器身份种子（确保分身 DID 恒定不变，杜绝随机轮换） */
function getOrCreateDeviceVesselSeed(): string {
  if (typeof window !== 'undefined') {
    try {
      let seed = localStorage.getItem('web5_device_vessel_seed');
      if (!seed) {
        seed = Array.from(crypto.getRandomValues(new Uint8Array(20)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        localStorage.setItem('web5_device_vessel_seed', seed);
      }
      return seed;
    } catch {}
  }
  return 'web5-fixed-vessel-device-seed-constant';
}

/** 模拟 Vessel 签名（开发与测试环境） — 基于设备种子产生唯一恒定 DID */
async function simulateVesselSignature(
  challenge: VesselChallenge
): Promise<{ aa2pClaim: AA2PClaim; vesselDid: string; eidolonDid: string }> {
  await new Promise((r) => setTimeout(r, 600)); // 模拟硬件安全握手延迟

  const deviceSeed = getOrCreateDeviceVesselSeed();
  const vesselId = deviceSeed.slice(0, 16);
  const eidolonId = deviceSeed.slice(16, 32);

  const vesselDid = `did:vessel:node-${vesselId}`;
  const eidolonDid = `did:eidolon:node-${eidolonId}`;
  const signature = `0x${deviceSeed.padEnd(130, '0').slice(0, 130)}`;

  return {
    vesselDid,
    eidolonDid,
    aa2pClaim: {
      vesselDid,
      eidolonDid,
      signature,
      challenge,
      expiresAt: Date.now() + RFC_CONSTANTS.CHALLENGE_TTL_MS,
    },
  };
}

/** 完整的容器唤醒流程 */
export async function awakenVessel(
  requestedPermissions: VesselPermission[] = ['read', 'comment', 'micropay']
): Promise<VesselSession> {
  // Step 1: Vessel Challenge
  const challenge = createVesselChallenge(requestedPermissions);

  // Step 2: Eidolon Sign（调用 Vessel 环境）
  const { aa2pClaim, vesselDid, eidolonDid } = await requestVesselSignature(challenge);

  // Step 3 + Step 4: 后端验证 Prime 授权 + 签发 Vessel Token
  const res = await fetch('/api/auth/vessel-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge,
      aa2pClaim,
      vesselDid,
      eidolonDid,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown' }));
    throw new Error(err.error || `Vessel auth failed: ${res.status}`);
  }

  const raw = await res.json();
  // 后端返回 { success, session: { ...serialized } }
  const rawSession = raw.session || raw;
  // 反序列化 BigInt（后端用 serializeForJson 将 bigint 转为 {__bigint: "..."}）
  const session = parseSessionResponse(rawSession);
  // 持久化会话到 sessionStorage（复用 PLVTVS 模式）
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('web5_vessel_session', JSON.stringify({
      ...session,
      ap2Budget: {
        ...session.ap2Budget,
        dailyLimit: session.ap2Budget.dailyLimit.toString(),
        perTxLimit: session.ap2Budget.perTxLimit.toString(),
        categoryLimit: session.ap2Budget.categoryLimit
          ? Object.fromEntries(
              Object.entries(session.ap2Budget.categoryLimit).map(
                ([k, v]) => [k, (v as bigint).toString()]
              )
            )
          : undefined,
      },
    }));
  }
  return session;
}

/** 解析后端返回的 session（处理 BigInt 序列化） */
export function parseSessionResponse(raw: any): VesselSession {
  const ap2BudgetRaw = raw.ap2Budget || {};
  const toBigInt = (v: any): bigint => {
    if (typeof v === 'bigint') return v;
    if (v && typeof v === 'object' && v.__bigint) return BigInt(v.__bigint);
    if (typeof v === 'string') return BigInt(v);
    if (typeof v === 'number') return BigInt(v);
    return 0n;
  };

  const categoryLimitRaw = ap2BudgetRaw.categoryLimit;
  let categoryLimit: Record<string, bigint> | undefined;
  if (categoryLimitRaw && typeof categoryLimitRaw === 'object') {
    categoryLimit = {};
    for (const [k, v] of Object.entries(categoryLimitRaw)) {
      categoryLimit[k] = toBigInt(v);
    }
  }

  return {
    vesselDid: raw.vesselDid,
    eidolonDid: raw.eidolonDid,
    primeDid: raw.primeDid,
    sessionToken: raw.sessionToken,
    expiresAt: raw.expiresAt,
    permissions: raw.permissions || [],
    accessMode: raw.accessMode || 'vessel',
    ap2Budget: {
      dailyLimit: toBigInt(ap2BudgetRaw.dailyLimit),
      perTxLimit: toBigInt(ap2BudgetRaw.perTxLimit),
      rateLimitPerMin: ap2BudgetRaw.rateLimitPerMin || 5,
      whitelist: ap2BudgetRaw.whitelist || [],
      categoryLimit,
    },
  };
}

/** 退出容器会话 */
export async function revokeVesselSession(): Promise<void> {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('web5_vessel_session');
  }
  await fetch('/api/auth/vessel-logout', { method: 'POST' }).catch(() => {});
}

/** 读取当前容器会话（客户端） */
export function getCurrentVesselSession(): VesselSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('web5_vessel_session');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      ap2Budget: {
        ...parsed.ap2Budget,
        dailyLimit: BigInt(parsed.ap2Budget.dailyLimit),
        perTxLimit: BigInt(parsed.ap2Budget.perTxLimit),
        categoryLimit: parsed.ap2Budget.categoryLimit
          ? Object.fromEntries(
              Object.entries(parsed.ap2Budget.categoryLimit).map(
                ([k, v]) => [k, BigInt(v as string)]
              )
            )
          : undefined,
      },
    };
  } catch {
    return null;
  }
}
