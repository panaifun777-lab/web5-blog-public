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
}

/** AA2P 灵魂凭证 */
export interface AA2PClaim {
  vesselDid: string;
  eidolonDid: string;
  signature: string;
  challenge: VesselChallenge;
  expiresAt: number;
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
