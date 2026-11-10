// ════════════════════════════════════════════════════════════════
// src/lib/web5/types.ts — Web5.blog 核心类型定义
// 复用 AP2-Protocol-Explorer 的 BigInt 6-decimal USDC 模式
// ════════════════════════════════════════════════════════════════

/** DID 方法前缀 */
export const DID_METHODS = {
  PRIME: 'did:plvtvs',
  EIDOLON: 'did:eidolon',
  VESSEL: 'did:vessel',
} as const;

/** 当前博客（博客 DID / 挑战方）。服务端校验 challenge.blogDid 时使用。 */
export const BLOG_DID_FROM_ENV =
  process.env.NEXT_PUBLIC_WEB5_BLOG_DID || 'did:web5blog:default';

/**
 * 客户端模拟桩（simulateVesselSignature）生成的 DID 形如 did:vessel:node-<hex> /
 * did:eidolon:node-<hex>；也可用 :sim- 前缀的模拟 Prime。这些身份永远不能被视为真实身份。
 */
export function isMockDid(did: string | undefined | null): boolean {
  if (!did) return false;
  return /:node-[0-9a-f]+$/i.test(did) || did.includes(':sim-');
}

/** 从 DID 中取出内嵌的 0x 地址（支持 did:plvtvs:0x… / did:vessel:0x… / did:eidolon:0x…）。 */
export function didToAddress(did: string | undefined | null): `0x${string}` | null {
  if (!did) return null;
  const raw = did.includes(':') ? did.slice(did.lastIndexOf(':') + 1) : did;
  return /^0x[0-9a-fA-F]{40}$/.test(raw) ? (raw as `0x${string}`) : null;
}

/** Vessel 权限类型 */
export type VesselPermission = 'read' | 'comment' | 'publish' | 'micropay' | 'harvest';

/** AP2 微支付类别 */
export type AP2Category = 'read' | 'tip' | 'subscribe' | 'royalty' | 'harvest';

/** BudgetFence 预算配置 */
export interface BudgetFence {
  dailyLimit: bigint;
  perTxLimit: bigint;
  rateLimitPerMin: number;
  whitelist: string[];
  categoryLimit?: Record<AP2Category, bigint>;
}

/** Vessel Session Token — 容器登录会话 */
export interface VesselSession {
  vesselDid: string;
  eidolonDid: string;
  primeDid: string;
  sessionToken: string;
  expiresAt: number;
  ap2Budget: BudgetFence;
  permissions: VesselPermission[];
  accessMode: 'vessel' | 'observer';
  /**
   * 标识该会话的身份是否经过真实加密验签（AA2P 验签 + eidolonos.xyz 预言机授权）。
   * false = beta 模拟身份（由 simulateVesselSignature 或模拟预言机产生），绝不可用于结算真实资金。
   */
  identityReal?: boolean;
}

/** AA2P 灵魂凭证 */
export interface AA2PClaim {
  vesselDid: string;
  eidolonDid: string;
  signature: string;
  /** 真实模式下由 TEE（plvtvs.one）随凭证公布的 AA2P 公钥地址（0x… 或 did:vessel:0x…）。缺省视为模拟身份。 */
  aa2pPublicKey?: string;
  challenge: VesselChallenge;
  expiresAt: number;
  /** 显式标记此凭证来自客户端模拟桩（simulateVesselSignature）。真实凭证绝不应带此字段。 */
  simulated?: boolean;
}

/** Vessel Challenge（四步握手 Step 1） */
export interface VesselChallenge {
  blogDid: string;
  permissions: VesselPermission[];
  timestamp: number;
  nonce: string;
}

/** Prime Delegation（四步握手 Step 3） */
export interface PrimeDelegation {
  authorized: boolean;
  primeDid: string;
  /**
   * true 仅当授权来自真实预言机（eidolonos.xyz）或已落库的真实身份；
   * false 表示模拟授权（beta），不得用于结算真实资金。
   */
  real: boolean;
  sessionKey: {
    budget: BudgetFence;
    permissions: VesselPermission[];
    expiresAt: number;
  };
}

/** Micropayment Intent — AP2 微支付意图 */
export interface MicropaymentIntent {
  from: string;
  to: string;
  amount: bigint;
  category: AP2Category;
  ref: string;
  timestamp: number;
}

// ════════════════════════════════════════════════════════════════
// BigInt 6-decimal USDC 序列化（移植自 AP2-Protocol-Explorer）
// ════════════════════════════════════════════════════════════════

export const USDC_DECIMALS = 6;

export function toTokenUnits(humanAmount: string | number): bigint {
  const str = typeof humanAmount === 'number' ? humanAmount.toString() : humanAmount;
  const [whole, frac = ''] = str.split('.');
  const fracPadded = (frac + '0'.repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  return BigInt(whole) * BigInt(10 ** USDC_DECIMALS) + BigInt(fracPadded || '0');
}

export function fromTokenUnits(units: bigint): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / BigInt(10 ** USDC_DECIMALS);
  const frac = abs % BigInt(10 ** USDC_DECIMALS);
  const fracStr = frac.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  const result = fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  return negative ? `-${result}` : result;
}

export function formatToken(units: bigint, symbol = 'USDC'): string {
  return `${fromTokenUnits(units)} ${symbol}`;
}

export function serializeForJson(value: unknown): unknown {
  if (typeof value === 'bigint') return { __bigint: value.toString() };
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = serializeForJson(v);
    return out;
  }
  return value;
}

export function parseFromJson(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (obj.__bigint !== undefined) return BigInt(obj.__bigint as string);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = parseFromJson(v);
    return out;
  }
  if (Array.isArray(value)) return value.map(parseFromJson);
  return value;
}

export const RFC_CONSTANTS = {
  MAX_DAILY_LIMIT_USDC: 100,
  MAX_PER_TX_LIMIT_USDC: 10,
  DEFAULT_RATE_LIMIT_PER_MIN: 5,
  SESSION_TTL_HOURS: 24,
  CHALLENGE_TTL_MS: 60_000,
  SETTLEMENT_BATCH_THRESHOLD: 5_000_000n,
  SETTLEMENT_BATCH_TTL_HOURS: 24,
} as const;
