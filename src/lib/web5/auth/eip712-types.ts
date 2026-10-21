// ════════════════════════════════════════════════════════════════
// src/lib/web5/auth/eip712-types.ts
// EIP-712 规范引擎与两段式账户生命周期治理 (Circle ARC Mainnet)
// ════════════════════════════════════════════════════════════════

import { verifyTypedData, isAddress, getAddress, type Address, type Hex } from 'viem';
import { db } from '@/lib/db';
import { AccountStage } from '@prisma/client';
import { sendNativeUsdc } from '@/lib/web5/payments/arc';

/** Circle ARC Mainnet Chain ID */
export const ARC_MAINNET_CHAIN_ID = 5042;

/** 原生代币精度（18 位） */
export const ARC_USDC_DECIMALS = 18;
export const ARC_USDC_SCALE = 10n ** 18n;

/** EIP-712 规范 Domain 配置 */
export const ARC_EIP712_DOMAIN = {
  name: 'Web5.blog',
  version: '1',
  chainId: ARC_MAINNET_CHAIN_ID,
} as const;

/** EIP-712 结构化类型定义 */
export const ARC_EIP712_TYPES = {
  BindMasterWallet: [
    { name: 'masterWalletAddress', type: 'address' },
    { name: 'containerId', type: 'string' },
    { name: 'onchainDid', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  WithdrawSettlement: [
    { name: 'masterWalletAddress', type: 'address' },
    { name: 'backupWalletAddress', type: 'address' },
    { name: 'asset', type: 'string' },
    { name: 'amountAtomic', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

// ━━ TypeScript 接口类型定义 ━━

export interface BindMasterWalletMessage {
  masterWalletAddress: `0x${string}`;
  containerId: string;
  onchainDid: string;
  nonce: bigint | number | string;
  deadline: bigint | number | string;
}

export interface WithdrawSettlementMessage {
  masterWalletAddress: `0x${string}`;
  backupWalletAddress: `0x${string}`;
  asset: string;
  amountAtomic: bigint | number | string;
  nonce: bigint | number | string;
  deadline: bigint | number | string;
}

export interface EIP712VerificationResult {
  valid: boolean;
  error?: string;
  code?: 'EXPIRED' | 'REPLAY' | 'INVALID_SIG' | 'INVALID_PARAMS' | 'INSUFFICIENT_BALANCE';
}

// ━━ USDC 18 位精度转换工具 ━━

/**
 * 将 18 位原子数 (Wei / atomic string) 转换为展示用 USDC 字符串
 * 精确无溢出处理，末尾去除多余的零
 */
export function formatArcUsdc(atomicAmount: bigint | string | number): string {
  const atomic = BigInt(atomicAmount.toString());
  const isNegative = atomic < 0n;
  const absAtomic = isNegative ? -atomic : atomic;

  const integerPart = absAtomic / ARC_USDC_SCALE;
  const fractionPart = absAtomic % ARC_USDC_SCALE;

  let fractionStr = fractionPart.toString().padStart(ARC_USDC_DECIMALS, '0');
  // 去除尾部多余的0
  fractionStr = fractionStr.replace(/0+$/, '');

  const result = fractionStr.length > 0 ? `${integerPart}.${fractionStr}` : `${integerPart}.0`;
  return isNegative ? `-${result}` : result;
}

/**
 * 将展示用 USDC 数量转换为 18 位原子单位 (BigInt Wei)
 */
export function parseArcUsdc(usdcAmount: string | number): bigint {
  const str = usdcAmount.toString().trim();
  if (!str) return 0n;

  const parts = str.split('.');
  if (parts.length > 2) throw new Error(`Invalid USDC amount format: ${str}`);

  const whole = parts[0] || '0';
  let fraction = parts[1] || '';

  if (fraction.length > ARC_USDC_DECIMALS) {
    fraction = fraction.slice(0, ARC_USDC_DECIMALS);
  } else {
    fraction = fraction.padEnd(ARC_USDC_DECIMALS, '0');
  }

  const combined = BigInt(whole) * ARC_USDC_SCALE + BigInt(fraction);
  return combined;
}

// ━━ EIP-712 TypedData 构造辅助函数 ━━

export function createBindMasterWalletTypedData(message: BindMasterWalletMessage) {
  return {
    domain: ARC_EIP712_DOMAIN,
    types: ARC_EIP712_TYPES,
    primaryType: 'BindMasterWallet' as const,
    message: {
      masterWalletAddress: getAddress(message.masterWalletAddress),
      containerId: message.containerId,
      onchainDid: message.onchainDid,
      nonce: BigInt(message.nonce),
      deadline: BigInt(message.deadline),
    },
  };
}

export function createWithdrawSettlementTypedData(message: WithdrawSettlementMessage) {
  return {
    domain: ARC_EIP712_DOMAIN,
    types: ARC_EIP712_TYPES,
    primaryType: 'WithdrawSettlement' as const,
    message: {
      masterWalletAddress: getAddress(message.masterWalletAddress),
      backupWalletAddress: getAddress(message.backupWalletAddress),
      asset: message.asset,
      amountAtomic: BigInt(message.amountAtomic),
      nonce: BigInt(message.nonce),
      deadline: BigInt(message.deadline),
    },
  };
}

// ━━ 核心验签引擎与超期防重放 ━━

/**
 * 校验 BindMasterWallet 的 EIP-712 签名，实施严格的超期与防重放校验
 */
export async function verifyBindMasterWalletSignature(
  message: BindMasterWalletMessage,
  signature: `0x${string}`,
  options: { checkDbReplay?: boolean } = { checkDbReplay: true }
): Promise<EIP712VerificationResult> {
  try {
    // 1. 地址合法性校验
    if (!message.masterWalletAddress || !isAddress(message.masterWalletAddress)) {
      return { valid: false, error: 'Invalid masterWalletAddress format', code: 'INVALID_PARAMS' };
    }
    const normalizedAddress = getAddress(message.masterWalletAddress);

    // 2. 超期校验 (Unix Timestamp, 秒)
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    const deadline = BigInt(message.deadline);
    if (nowSeconds > deadline) {
      return {
        valid: false,
        error: `Signature expired: current time (${nowSeconds}) > deadline (${deadline})`,
        code: 'EXPIRED',
      };
    }

    // 3. 严格防重放校验 (查重库中的签名与 Address+Purpose+Nonce)
    const nonceBig = BigInt(message.nonce);
    if (options.checkDbReplay) {
      const existingSig = await db.authNonce.findUnique({
        where: { signature },
      });
      if (existingSig) {
        return { valid: false, error: 'Replay attack detected: signature already consumed', code: 'REPLAY' };
      }

      const existingNonce = await db.authNonce.findUnique({
        where: {
          address_purpose_nonce: {
            address: normalizedAddress.toLowerCase(),
            purpose: 'BIND_MASTER_WALLET',
            nonce: nonceBig,
          },
        },
      });
      if (existingNonce) {
        return {
          valid: false,
          error: `Replay attack detected: nonce ${nonceBig} already used for this address`,
          code: 'REPLAY',
        };
      }
    }

    // 4. viem verifyTypedData 密码学验签
    const isValid = await verifyTypedData({
      address: normalizedAddress,
      domain: ARC_EIP712_DOMAIN,
      types: ARC_EIP712_TYPES,
      primaryType: 'BindMasterWallet',
      message: {
        masterWalletAddress: normalizedAddress,
        containerId: message.containerId,
        onchainDid: message.onchainDid,
        nonce: nonceBig,
        deadline: deadline,
      },
      signature,
    });

    if (!isValid) {
      return { valid: false, error: 'Invalid EIP-712 cryptographic signature', code: 'INVALID_SIG' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Signature verification failed', code: 'INVALID_SIG' };
  }
}

/**
 * 校验 WithdrawSettlement 的 EIP-712 签名，实施严格的超期、防重放与余额校验
 */
export async function verifyWithdrawSettlementSignature(
  message: WithdrawSettlementMessage,
  signature: `0x${string}`,
  options: { checkDbReplay?: boolean; verifyBalance?: boolean } = { checkDbReplay: true, verifyBalance: true }
): Promise<EIP712VerificationResult> {
  try {
    // 1. 地址合法性校验
    if (!message.masterWalletAddress || !isAddress(message.masterWalletAddress)) {
      return { valid: false, error: 'Invalid masterWalletAddress format', code: 'INVALID_PARAMS' };
    }
    if (!message.backupWalletAddress || !isAddress(message.backupWalletAddress)) {
      return { valid: false, error: 'Invalid backupWalletAddress format', code: 'INVALID_PARAMS' };
    }
    const masterAddress = getAddress(message.masterWalletAddress);
    const backupAddress = getAddress(message.backupWalletAddress);

    // 2. 金额有效性
    const amountAtomic = BigInt(message.amountAtomic);
    if (amountAtomic <= 0n) {
      return { valid: false, error: 'amountAtomic must be greater than zero', code: 'INVALID_PARAMS' };
    }

    // 3. 超期校验
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    const deadline = BigInt(message.deadline);
    if (nowSeconds > deadline) {
      return {
        valid: false,
        error: `Signature expired: current time (${nowSeconds}) > deadline (${deadline})`,
        code: 'EXPIRED',
      };
    }

    // 4. 防重放校验
    const nonceBig = BigInt(message.nonce);
    if (options.checkDbReplay) {
      const existingSig = await db.authNonce.findUnique({
        where: { signature },
      });
      if (existingSig) {
        return { valid: false, error: 'Replay attack detected: signature already consumed', code: 'REPLAY' };
      }

      const existingNonce = await db.authNonce.findUnique({
        where: {
          address_purpose_nonce: {
            address: masterAddress.toLowerCase(),
            purpose: 'WITHDRAW_SETTLEMENT',
            nonce: nonceBig,
          },
        },
      });
      if (existingNonce) {
        return {
          valid: false,
          error: `Replay attack detected: nonce ${nonceBig} already used for this address`,
          code: 'REPLAY',
        };
      }
    }

    // 5. 余额充足性校验
    if (options.verifyBalance) {
      const backupWallet = await db.backupWallet.findUnique({
        where: { address: backupAddress.toLowerCase() },
      });
      if (!backupWallet) {
        return { valid: false, error: 'Backup wallet not found on platform', code: 'INVALID_PARAMS' };
      }
      const currentBalance = BigInt(backupWallet.balanceWei || '0');
      if (currentBalance < amountAtomic) {
        return {
          valid: false,
          error: `Insufficient balance in backup wallet. Available: ${formatArcUsdc(currentBalance)} USDC, Requested: ${formatArcUsdc(amountAtomic)} USDC`,
          code: 'INSUFFICIENT_BALANCE',
        };
      }
    }

    // 6. viem verifyTypedData 验签
    const isValid = await verifyTypedData({
      address: masterAddress,
      domain: ARC_EIP712_DOMAIN,
      types: ARC_EIP712_TYPES,
      primaryType: 'WithdrawSettlement',
      message: {
        masterWalletAddress: masterAddress,
        backupWalletAddress: backupAddress,
        asset: message.asset,
        amountAtomic: amountAtomic,
        nonce: nonceBig,
        deadline: deadline,
      },
      signature,
    });

    if (!isValid) {
      return { valid: false, error: 'Invalid EIP-712 cryptographic signature', code: 'INVALID_SIG' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Signature verification failed', code: 'INVALID_SIG' };
  }
}

// ━━ 规范业务处理：绑定主钱包生命周期流转 ━━

export interface BindMasterWalletResult {
  success: boolean;
  accountStage: AccountStage;
  primeDid: string;
  masterWalletAddress: string;
  containerId: string;
  onchainDid: string;
  backupWalletAddress?: string;
  message?: string;
}

export async function processBindMasterWallet(params: {
  message: BindMasterWalletMessage;
  signature: `0x${string}`;
}): Promise<BindMasterWalletResult> {
  const { message, signature } = params;

  // 1. 严格验签与防重放
  const verifyRes = await verifyBindMasterWalletSignature(message, signature, { checkDbReplay: true });
  if (!verifyRes.valid) {
    throw new Error(`[BindMasterWallet] 验签失败: ${verifyRes.error} (${verifyRes.code})`);
  }

  const masterAddr = getAddress(message.masterWalletAddress).toLowerCase();
  // DID 由签名地址派生，禁止用任意字符串伪造链上身份
  const realPrimeDid = `did:plvtvs:${masterAddr}`;

  // 2. 数据库事务：消费防重放 Nonce + 账户生命周期跃迁至 STAGE_2_MASTER_VERIFIED
  return await db.$transaction(async (tx) => {
    // 记录 Nonce 防重放
    await tx.authNonce.create({
      data: {
        address: masterAddr,
        purpose: 'BIND_MASTER_WALLET',
        nonce: BigInt(message.nonce),
        signature: signature,
        deadline: BigInt(message.deadline),
      },
    });

    // 跃迁 Prime 账户阶段为 STAGE_2_MASTER_VERIFIED
    const prime = await tx.prime.upsert({
      where: { walletAddress: masterAddr },
      update: {
        lastActiveAt: new Date(),
        accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
      },
      create: {
        did: realPrimeDid,
        walletAddress: masterAddr,
        role: 'USER',
        status: 'ACTIVE',
        accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
      },
    });

    // 查找并关联容器 Vessel（支持 containerId 匹配 id 或 did）
    const vessel = await tx.vessel.findFirst({
      where: {
        OR: [{ id: message.containerId }, { did: message.containerId }],
      },
      include: { prime: { select: { walletAddress: true } } },
    });

    if (vessel) {
      const owner = vessel.prime?.walletAddress?.toLowerCase();
      if (owner && owner !== masterAddr) {
        throw new Error('该 Vessel 已绑定其他主钱包，无法重复绑定');
      }
      await tx.vessel.update({
        where: { id: vessel.id },
        data: {
          primeId: prime.id,
          accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
          lastActiveAt: new Date(),
        },
      });

      if (vessel.eidolonId) {
        await tx.eidolon.update({
          where: { id: vessel.eidolonId },
          data: { primeId: prime.id },
        });
      }
    }

    // 检查并确保站内备用轻钱包 BackupWallet 初始化关联
    let backupWallet = await tx.backupWallet.findFirst({
      where: {
        OR: [
          { primeId: prime.id },
          vessel ? { vesselId: vessel.id } : { id: 'non-existing' },
        ],
      },
    });

    if (!backupWallet) {
      // 若尚未创建备用钱包，以 Vessel 智能账户地址或衍生地址初始化
      const fallbackBackupAddr = vessel?.smartAccountAddress || `0x${masterAddr.slice(2).padStart(40, '0')}`;
      backupWallet = await tx.backupWallet.create({
        data: {
          address: fallbackBackupAddr.toLowerCase(),
          primeId: prime.id,
          vesselId: vessel?.id,
          balanceWei: '0',
          asset: 'USDC',
        },
      });
    } else if (!backupWallet.primeId) {
      backupWallet = await tx.backupWallet.update({
        where: { id: backupWallet.id },
        data: { primeId: prime.id },
      });
    }

    return {
      success: true,
      accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
      primeDid: prime.did,
      masterWalletAddress: masterAddr,
      containerId: message.containerId,
      onchainDid: realPrimeDid,
      backupWalletAddress: backupWallet.address,
      message: `✅ 已成功将主体主钱包绑定确权！账户生命周期跃迁为 STAGE_2_MASTER_VERIFIED`,
    };
  });
}

// ━━ 规范业务处理：提现结算流水与余额扣减 ━━

export interface WithdrawSettlementResult {
  success: boolean;
  masterWalletAddress: string;
  backupWalletAddress: string;
  amountAtomic: string;
  amountFormatted: string;
  balanceRemainingWei: string;
  balanceRemainingFormatted: string;
  txRecordId: string;
  message: string;
}

export async function processWithdrawSettlement(params: {
  message: WithdrawSettlementMessage;
  signature: `0x${string}`;
}): Promise<WithdrawSettlementResult & { txHash: string }> {
  const { message, signature } = params;

  // 1. 严格验签、超期校验、防重放与余额校验
  const verifyRes = await verifyWithdrawSettlementSignature(message, signature, {
    checkDbReplay: true,
    verifyBalance: true,
  });

  if (!verifyRes.valid) {
    throw new Error(`[WithdrawSettlement] 提现验签失败: ${verifyRes.error} (${verifyRes.code})`);
  }

  if (message.asset !== 'USDC') {
    throw new Error('Only USDC withdrawals are supported');
  }

  const masterAddr = getAddress(message.masterWalletAddress).toLowerCase();
  const backupAddr = getAddress(message.backupWalletAddress).toLowerCase();
  const amountAtomic = BigInt(message.amountAtomic);

  // 2. 归属校验：签名主钱包必须拥有该备用钱包，防止替他人签名提现
  const backupWallet = await db.backupWallet.findUnique({
    where: { address: backupAddr },
    include: {
      prime: { select: { walletAddress: true } },
      vessel: { select: { prime: { select: { walletAddress: true } } } },
    },
  });
  if (!backupWallet) {
    throw new Error(`备用轻钱包不存在: ${backupAddr}`);
  }

  const ownerAddresses = [
    backupWallet.prime?.walletAddress,
    backupWallet.vessel?.prime?.walletAddress,
    backupAddr,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (!ownerAddresses.includes(masterAddr)) {
    throw new Error('Master wallet does not own this backup wallet');
  }

  const currentBalance = BigInt(backupWallet.balanceWei || '0');
  if (currentBalance < amountAtomic) {
    throw new Error(
      `备用钱包余额不足，当前余额: ${formatArcUsdc(currentBalance)} USDC`
    );
  }
  const newBalance = currentBalance - amountAtomic;

  // 3. 先原子扣减并生成 PENDING 流水，防止并发双花
  const txRecord = await db.$transaction(async (tx) => {
    const consumed = await tx.authNonce.create({
      data: {
        address: masterAddr,
        purpose: 'WITHDRAW_SETTLEMENT',
        nonce: BigInt(message.nonce),
        signature,
        deadline: BigInt(message.deadline),
      },
    });

    const updated = await tx.backupWallet.updateMany({
      where: { id: backupWallet.id, balanceWei: backupWallet.balanceWei },
      data: {
        balanceWei: newBalance.toString(),
        nonce: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new Error('Concurrent balance change detected; please retry');
    }

    return tx.backupWalletTx.create({
      data: {
        backupWalletId: backupWallet.id,
        type: 'WITHDRAW_SETTLEMENT',
        amountWei: amountAtomic.toString(),
        balanceAfterWei: newBalance.toString(),
        targetAddress: masterAddr,
        status: 'PENDING',
        signature,
        metadata: JSON.stringify({
          asset: message.asset,
          amountFormatted: formatArcUsdc(amountAtomic),
          deadline: message.deadline.toString(),
          authNonceId: consumed.id,
          timestamp: Date.now(),
        }),
      },
    });
  });

  // 4. 真实链上出款；失败则退回站内余额并标记失败
  const payout = await sendNativeUsdc({ to: masterAddr, amountWei: amountAtomic });
  if (!payout.ok) {
    await db.$transaction(async (tx) => {
      const wallet = await tx.backupWallet.findUnique({
        where: { id: backupWallet.id },
      });
      if (wallet) {
        await tx.backupWallet.update({
          where: { id: wallet.id },
          data: {
            balanceWei: (BigInt(wallet.balanceWei || '0') + amountAtomic).toString(),
          },
        });
      }
      await tx.backupWalletTx.update({
        where: { id: txRecord.id },
        data: {
          status: 'FAILED',
          metadata: JSON.stringify({
            asset: message.asset,
            error: payout.reason,
            timestamp: Date.now(),
          }),
        },
      });
    });
    throw new Error(`On-chain payout failed: ${payout.reason}`);
  }

  await db.backupWalletTx.update({
    where: { id: txRecord.id },
    data: {
      status: 'SUCCESS',
      txHash: payout.txHash,
    },
  });

  return {
    success: true,
    masterWalletAddress: masterAddr,
    backupWalletAddress: backupAddr,
    amountAtomic: amountAtomic.toString(),
    amountFormatted: formatArcUsdc(amountAtomic),
    balanceRemainingWei: newBalance.toString(),
    balanceRemainingFormatted: formatArcUsdc(newBalance),
    txRecordId: txRecord.id,
    txHash: payout.txHash,
    message: `✅ 提现已链上出款：${formatArcUsdc(amountAtomic)} USDC → ${masterAddr}`,
  };
}
