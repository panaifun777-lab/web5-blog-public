// ════════════════════════════════════════════════════════════════
// src/lib/web5/x402/voucher-engine.ts
// EIP-712 离线签名凭单与状态通道延迟聚合结算引擎
// 解决高频微支付链上网络延迟痛点，实现服务端 5ms 验签 + 毫秒级内容平滑展开
// 已接受的 nonce 持久化于 AuthNonce (purpose = 'VOUCHER')，进程重启后依旧防重放
// ════════════════════════════════════════════════════════════════

import { verifyTypedData } from 'viem';
import { db } from '@/lib/db';
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

const VOUCHER_PURPOSE = 'VOUCHER';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE_RE = /^0x[0-9a-fA-F]{130}$/;
const AMOUNT_RE = /^(0|[1-9]\d*)(\.\d{1,18})?$/;

/** 将 USDC 十进制字符串精确转换为 18 位原子单位，避免浮点误差 */
export function decimalToAtomicUsdc(value: string): bigint | null {
  if (typeof value !== 'string' || !AMOUNT_RE.test(value)) return null;
  const [whole, frac = ''] = value.split('.');
  return BigInt(whole) * 10n ** 18n + BigInt((frac + '0'.repeat(18)).slice(0, 18));
}

// 离线状态通道网关：nonce 账本以数据库 AuthNonce 为准 (延迟聚合至 Arc Mainnet)
class VoucherChannelPool {
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

    // 3. 防重放校验 (查数据库持久化账本，重启后仍有效)
    const signer = voucher.signerAddress.toLowerCase();
    try {
      const consumed = await db.authNonce.findFirst({
        where: {
          OR: [
            { address: signer, purpose: VOUCHER_PURPOSE, nonce: BigInt(voucher.nonce) },
            { signature: voucher.signature },
          ],
        },
        select: { id: true },
      });
      if (consumed) {
        return { ok: false, reason: 'Replay detected: nonce already used' };
      }
    } catch (err: any) {
      // 账本不可用时失败关闭
      console.warn('[VoucherEngine] Nonce lookup failed:', err?.message);
      return { ok: false, reason: 'Voucher ledger unavailable' };
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
   * 持久化消费 nonce；返回 false 表示唯一约束冲突 (重放)
   */
  async commit(voucher: SessionVoucher): Promise<boolean> {
    const signer = voucher.signerAddress.toLowerCase();
    try {
      await db.authNonce.create({
        data: {
          address: signer,
          purpose: VOUCHER_PURPOSE,
          nonce: BigInt(voucher.nonce),
          signature: voucher.signature,
          deadline: BigInt(Math.floor((voucher.timestamp + VOUCHER_TTL_MS) / 1000)),
        },
      });
      return true;
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
      // 结算层已先行写入同一签名 (purpose=X402_VOUCHER)，归一为本网关已接受
      const existing = await db.authNonce.findUnique({
        where: { signature: voucher.signature },
        select: { id: true, address: true, nonce: true, purpose: true },
      });
      if (existing && existing.address === signer && existing.nonce === BigInt(voucher.nonce)) {
        if (existing.purpose !== VOUCHER_PURPOSE) {
          await db.authNonce.update({ where: { id: existing.id }, data: { purpose: VOUCHER_PURPOSE } });
        }
        return true;
      }
      return false;
    }
  }

  /**
   * 验签 + 消费（无余额结算场景的兼容入口）
   */
  async verifyAndAccept(voucher: SessionVoucher): Promise<{ ok: boolean; reason?: string }> {
    const verified = await this.verify(voucher);
    if (!verified.ok) return verified;
    const committed = await this.commit(voucher);
    if (!committed) return { ok: false, reason: 'Replay detected: nonce already used' };
    return { ok: true };
  }

  /**
   * 统计当前通道状态（全部取自数据库实时计数）
   */
  async getChannelStats() {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const [total, today] = await Promise.all([
      db.authNonce.count({ where: { purpose: VOUCHER_PURPOSE } }),
      db.authNonce.count({ where: { purpose: VOUCHER_PURPOSE, consumedAt: { gte: midnight } } }),
    ]);

    return {
      totalVouchersAccepted: total,
      acceptedToday: today,
      activeNoncesCount: total,
      contractEscrow: ARC_MAINNET.addresses.BudgetFence,
      settlementToken: '$WBOG / Native USDC',
    };
  }
}

export const voucherGateway = new VoucherChannelPool();
