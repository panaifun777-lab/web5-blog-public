// ════════════════════════════════════════════════════════════════
// src/lib/web5/x402/voucher-engine.ts
// EIP-712 离线签名凭单与状态通道延迟聚合结算引擎
// 解决高频微支付链上网络延迟痛点，实现服务端 5ms 验签 + 毫秒级内容平滑展开
// ════════════════════════════════════════════════════════════════

import { verifyTypedData } from 'viem';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

// EIP-712 结构化数据类型定义
export const EIP712_VOUCHER_TYPES = {
  Web5SessionVoucher: [
    { name: 'contentId', type: 'string' },
    { name: 'authorDid', type: 'string' },
    { name: 'amountUsdc', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' },
  ],
} as const;

export const EIP712_VOUCHER_DOMAIN = {
  name: 'Web5.blog AP2 Voucher Gateway',
  version: '1.0',
  chainId: ARC_MAINNET.id,
  verifyingContract: ARC_MAINNET.addresses.BudgetFence as `0x${string}`,
} as const;

export interface SessionVoucher {
  contentId: string;
  authorDid: string;
  amountUsdc: string;
  nonce: number;
  timestamp: number;
  signerAddress: string;
  signature: `0x${string}`;
}

export interface SettlementBatchItem {
  reader: string;
  author: string;
  totalUsdc: string;
  vouchersCount: number;
  lastTimestamp: number;
}

export const VOUCHER_TTL_MS = 2 * 60 * 60 * 1000;
export const VOUCHER_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
export const VOUCHER_MAX_USDC = 10;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE_RE = /^0x[0-9a-fA-F]{130}$/;
const AMOUNT_RE = /^(0|[1-9]\d*)(\.\d{1,18})?$/;

/** 将 USDC 十进制字符串精确转换为 18 位原子单位，避免浮点误差 */
export function decimalToAtomicUsdc(value: string): bigint | null {
  if (typeof value !== 'string' || !AMOUNT_RE.test(value)) return null;
  const [whole, frac = ''] = value.split('.');
  return BigInt(whole) * 10n ** 18n + BigInt((frac + '0'.repeat(18)).slice(0, 18));
}

// 内存离线状态通道账本 (延迟聚合至 Arc Mainnet)
class VoucherChannelPool {
  private vouchers: SessionVoucher[] = [];
  private nonces: Set<string> = new Set();

  /**
   * 验签与规则校验（不消费 nonce），供结算层先检查余额
   */
  async verify(voucher: SessionVoucher): Promise<{ ok: boolean; reason?: string }> {
    // 1. 结构校验
    if (
      !voucher ||
      typeof voucher.contentId !== 'string' || voucher.contentId.length === 0 || voucher.contentId.length > 256 ||
      typeof voucher.authorDid !== 'string' || voucher.authorDid.length === 0 || voucher.authorDid.length > 256 ||
      typeof voucher.signature !== 'string' || !SIGNATURE_RE.test(voucher.signature) ||
      typeof voucher.signerAddress !== 'string' || !ADDRESS_RE.test(voucher.signerAddress) ||
      !Number.isSafeInteger(voucher.nonce) || voucher.nonce <= 0 ||
      !Number.isSafeInteger(voucher.timestamp) || voucher.timestamp <= 0
    ) {
      return { ok: false, reason: 'Malformed voucher' };
    }

    // 2. 金额校验 (必须为正数且不超过单笔上限)
    const atomic = decimalToAtomicUsdc(voucher.amountUsdc);
    if (atomic === null || atomic <= 0n || atomic > decimalToAtomicUsdc(String(VOUCHER_MAX_USDC))!) {
      return { ok: false, reason: 'Invalid voucher amount' };
    }

    // 3. 防重放校验 (进程内快速路径；跨重启由数据库 AuthNonce 兜底)
    const nonceKey = `${voucher.signerAddress.toLowerCase()}:${voucher.nonce}`;
    if (this.nonces.has(nonceKey)) {
      return { ok: false, reason: 'Replay detected: nonce already used' };
    }

    // 4. 有效期校验 (2 小时，容忍 5 分钟时钟漂移)
    const age = Date.now() - voucher.timestamp;
    if (age > VOUCHER_TTL_MS) {
      return { ok: false, reason: 'Voucher expired' };
    }
    if (age < -VOUCHER_MAX_FUTURE_SKEW_MS) {
      return { ok: false, reason: 'Voucher timestamp is in the future' };
    }

    // 5. EIP-712 离线签名数学还原与校验 (失败即拒绝，无放行分支)
    try {
      const valid = await verifyTypedData({
        address: voucher.signerAddress as `0x${string}`,
        domain: EIP712_VOUCHER_DOMAIN,
        types: EIP712_VOUCHER_TYPES,
        primaryType: 'Web5SessionVoucher',
        message: {
          contentId: voucher.contentId,
          authorDid: voucher.authorDid,
          amountUsdc: voucher.amountUsdc,
          nonce: BigInt(voucher.nonce),
          timestamp: BigInt(voucher.timestamp),
        },
        signature: voucher.signature,
      });

      if (!valid) {
        return { ok: false, reason: 'Invalid EIP-712 cryptographic signature' };
      }
    } catch (err: any) {
      console.warn('[VoucherEngine] Signature verify failed:', err?.message);
      return { ok: false, reason: 'Signature verification failed' };
    }

    return { ok: true };
  }

  /**
   * 结算成功后消费 nonce
   */
  commit(voucher: SessionVoucher): void {
    this.nonces.add(`${voucher.signerAddress.toLowerCase()}:${voucher.nonce}`);
    this.vouchers.push(voucher);
  }

  /**
   * 验签 + 消费（无余额结算场景的兼容入口）
   */
  async verifyAndAccept(voucher: SessionVoucher): Promise<{ ok: boolean; reason?: string }> {
    const verified = await this.verify(voucher);
    if (!verified.ok) return verified;
    this.commit(voucher);
    return { ok: true };
  }

  /**
   * 获取累积未结算的聚合差额账本
   */
  getPendingAggregation(): Record<string, number> {
    const agg: Record<string, number> = {};
    for (const v of this.vouchers) {
      const pair = `${v.signerAddress}->${v.authorDid}`;
      agg[pair] = (agg[pair] || 0) + parseFloat(v.amountUsdc);
    }
    return agg;
  }

  /**
   * 统计当前通道状态
   */
  getChannelStats() {
    return {
      totalVouchersAccepted: this.vouchers.length,
      activeNoncesCount: this.nonces.size,
      contractEscrow: ARC_MAINNET.addresses.BudgetFence,
      settlementToken: '$WBOG / Native USDC',
    };
  }
}

export const voucherGateway = new VoucherChannelPool();
