// ════════════════════════════════════════════════════════════════
// src/lib/web5/x402/middleware.ts
// x402 协议集成 — 基于 HTTP 402 Payment Required 的高阶价值跃升网关
// 规范参考: https://github.com/x402-foundation/x402
// 单次调用设定到 0.03 - 0.05 - 0.1 USDC 区间，激活代币与 50% 销毁飞轮
//
// 安全约束：
// - 仅接受 `Web5-Voucher <base64url(JSON)>` 形式的 EIP-712 凭单
// - 凭单必须绑定 contentId / authorDid / amountUsdc，且金额不得低于标价
// - 验签、防重放、有效期任一失败即返回 402，不存在放行分支
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  decimalToAtomicUsdc,
  EIP712_VOUCHER_DOMAIN,
  EIP712_VOUCHER_TYPES,
  voucherGateway,
  type SessionVoucher,
} from '@/lib/web5/x402/voucher-engine';
import {
  isPrepaidSettlementRequired,
  settleVoucherFromPrepaidBalance,
} from '@/lib/web5/x402/settlement';

export type X402CallTier = 'TIER_1_SUMMARY' | 'TIER_2_DEEP_REASONING' | 'TIER_3_A2A_COLLAB';

export interface X402TierConfig {
  priceUsdc: string;
  equivalentWbog: string;
  wbogDiscountRate: number; // 20% 折扣
  description: string;
}

// 统一高维三级阶梯定价标准
export const X402_TIER_PRICING: Record<X402CallTier, X402TierConfig> = {
  // 基础数据/段落/摘要检索 (0.03 USDC)
  TIER_1_SUMMARY: {
    priceUsdc: '0.03',
    equivalentWbog: '375', // 基准价 $0.00008 折算，享受 20% 折扣后仅需 300 WBOG
    wbogDiscountRate: 0.20,
    description: 'Tier 1: 核心论点、结构化元数据与高维向量切片瞬时检索',
  },
  // 深度推演/提示词分形/代码实现 (0.05 USDC)
  TIER_2_DEEP_REASONING: {
    priceUsdc: '0.05',
    equivalentWbog: '625', // 折扣后 500 WBOG
    wbogDiscountRate: 0.20,
    description: 'Tier 2: 完整实证数据、算法源代码、可复现提示词与长文深度后半段',
  },
  // 跨分身对等质询/AA2P 演武场商贸协同 (0.10 USDC)
  TIER_3_A2A_COLLAB: {
    priceUsdc: '0.10',
    equivalentWbog: '1250', // 折扣后 1000 WBOG
    wbogDiscountRate: 0.20,
    description: 'Tier 3: 1对1 跨分身深度质询、专有知识库穿透推演与 Agentic Commerce 准入',
  },
};

export interface X402PaymentRequirement {
  tier?: X402CallTier;
  priceUsdc?: string;
  recipient: string;
  network: 'arc-mainnet' | 'arc-testnet';
  chainId: number;
  description: string;
  /** 付费内容强绑定：凭单中的 contentId 必须与此一致 */
  contentId?: string;
  /** 付费内容强绑定：凭单中的 authorDid 必须与此一致 */
  authorDid?: string;
}

export interface X402GateResult {
  authorized: boolean;
  response?: NextResponse;
  reason?: string;
}

const PAYMENT_HEADER_NAMES = ['x-402-payment-authorization', 'x-payment-proof', 'x-web5-voucher'];
const VOUCHER_HEADER_RE = /^Web5-Voucher\s+([A-Za-z0-9_-]+)$/;

function getVoucherHeader(req: NextRequest): string | null {
  for (const name of PAYMENT_HEADER_NAMES) {
    const value = req.headers.get(name);
    if (value) return value;
  }
  return null;
}

function parseVoucherHeader(raw: string): SessionVoucher | null {
  const match = VOUCHER_HEADER_RE.exec(raw.trim());
  if (!match) return null;
  try {
    const payload = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload as SessionVoucher;
  } catch {
    return null;
  }
}

function paymentRequired(
  requirement: X402PaymentRequirement,
  effectivePrice: string,
  tierConfig: X402TierConfig,
  reason: string
): X402GateResult {
  const response = NextResponse.json(
    {
      error: 'Payment Required (x402 Autonomous Gateway)',
      protocol: 'x402/v1.0-commercial',
      reason,
      tier: requirement.tier || 'TIER_1_SUMMARY',
      requirement: {
        priceUsdc: effectivePrice,
        priceAtomic: decimalToAtomicUsdc(effectivePrice)?.toString() || null,
        priceWbogDiscounted: (parseFloat(effectivePrice) * 10000).toString(),
        currency: 'USDC / $WBOG',
        decimals: 18,
        network: requirement.network,
        chainId: requirement.chainId,
        recipientAddress: requirement.recipient,
        contentId: requirement.contentId || null,
        authorDid: requirement.authorDid || null,
        description: requirement.description || tierConfig.description,
        burnMechanism: '50% of fees automatically burned into 0x0...dead',
      },
      voucher: {
        header: 'Web5-Voucher <base64url(JSON)>',
        fields: ['contentId', 'authorDid', 'amountUsdc', 'nonce', 'timestamp', 'signerAddress', 'signature'],
        domain: EIP712_VOUCHER_DOMAIN,
        types: EIP712_VOUCHER_TYPES,
      },
      settlement: {
        prepaidBalanceRequired: isPrepaidSettlementRequired(),
        failureReasons: [
          'payer_not_registered',
          'insufficient_prepaid_balance',
          'Replay detected: voucher already settled',
          'concurrent_debit',
        ],
      },
      instructions:
        `Sign an EIP-712 Web5SessionVoucher for contentId=${requirement.contentId || '(any)'}, ` +
        `authorDid=${requirement.authorDid || '(any)'}, amountUsdc>=${effectivePrice}, then send it in ` +
        `'X-402-Payment-Authorization: Web5-Voucher <base64url(JSON)>'. ` +
        `The signer must hold a funded prepaid USDC balance (BackupWallet) on the platform.`,
    },
    {
      status: 402,
      headers: {
        'WWW-Authenticate': `x402 token="USDC,WBOG", chain_id="${requirement.chainId}", amount="${effectivePrice}", to="${requirement.recipient}"`,
        'X-402-Price-USDC': effectivePrice,
        'X-402-Discount-WBOG': '20% OFF',
        'X-402-Recipient': requirement.recipient,
        'X-402-Reason': reason,
      },
    }
  );

  return { authorized: false, reason, response };
}

/**
 * 校验请求中的 x402 支付凭单，并在通过时记入离线聚合账本。
 * 仅接受已签名的结构化凭单；裸 0x 哈希、Bearer 或任意字符串一律拒绝。
 */
export async function handleX402PaymentGate(
  req: NextRequest,
  requirement: X402PaymentRequirement
): Promise<X402GateResult> {
  const tierConfig = requirement.tier ? X402_TIER_PRICING[requirement.tier] : X402_TIER_PRICING.TIER_1_SUMMARY;
  const effectivePrice = requirement.priceUsdc || tierConfig.priceUsdc;
  const expectedAtomic = decimalToAtomicUsdc(effectivePrice);

  if (expectedAtomic === null) {
    return {
      authorized: false,
      reason: 'price_misconfigured',
      response: NextResponse.json({ error: 'x402 price misconfigured' }, { status: 500 }),
    };
  }

  // 紧急暂停开关：维护或异常期间一律停止收费放行
  if (process.env.X402_PAYMENTS_ENABLED === 'false') {
    return {
      authorized: false,
      reason: 'payments_paused',
      response: NextResponse.json(
        { error: 'x402 payments are temporarily paused', reason: 'payments_paused' },
        { status: 503, headers: { 'X-402-Status': 'paused', 'Retry-After': '300' } }
      ),
    };
  }

  const raw = getVoucherHeader(req);
  if (!raw) {
    return paymentRequired(requirement, effectivePrice, tierConfig, 'missing_voucher');
  }

  const voucher = parseVoucherHeader(raw);
  if (!voucher) {
    return paymentRequired(requirement, effectivePrice, tierConfig, 'malformed_voucher');
  }

  // 内容强绑定：防止用低价内容的凭单解锁其他内容
  if (requirement.contentId && voucher.contentId !== requirement.contentId) {
    return paymentRequired(requirement, effectivePrice, tierConfig, 'content_mismatch');
  }
  if (requirement.authorDid && voucher.authorDid !== requirement.authorDid) {
    return paymentRequired(requirement, effectivePrice, tierConfig, 'author_mismatch');
  }

  // 金额强绑定：凭单金额不得低于当前标价
  const paidAtomic = decimalToAtomicUsdc(voucher.amountUsdc);
  if (paidAtomic === null || paidAtomic < expectedAtomic) {
    return paymentRequired(requirement, effectivePrice, tierConfig, 'insufficient_amount');
  }

  const verdict = await voucherGateway.verify(voucher);
  if (!verdict.ok) {
    return paymentRequired(requirement, effectivePrice, tierConfig, verdict.reason || 'invalid_voucher');
  }

  // 签名只证明意图；生产环境还必须从付款方预付费余额完成原子扣减
  if (isPrepaidSettlementRequired()) {
    const settlement = await settleVoucherFromPrepaidBalance(voucher);
    if (!settlement.ok) {
      return paymentRequired(requirement, effectivePrice, tierConfig, settlement.reason || 'settlement_failed');
    }
  }

  const committed = await voucherGateway.commit(voucher);
  if (!committed) {
    return paymentRequired(requirement, effectivePrice, tierConfig, 'Replay detected: nonce already used');
  }
  return { authorized: true };
}
