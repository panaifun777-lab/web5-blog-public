// ════════════════════════════════════════════════════════════════
// src/app/api/auth/bind-wallet/route.ts
// 绑定 / 更换主体主钱包（EIP-712 规范引擎 + 两段式账户生命周期跃迁）
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  processBindMasterWallet,
  verifyBindMasterWalletSignature,
  type BindMasterWalletMessage,
} from '@/lib/web5/auth/eip712-types';
import { AccountStage } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 格式 1：EIP-712 规范请求体结构 { message: BindMasterWalletMessage, signature: "0x..." }
    if (body.message && body.signature) {
      const result = await processBindMasterWallet({
        message: body.message,
        signature: body.signature,
      });
      return NextResponse.json(result);
    }

    // 格式 2：扁平结构 (包含 EIP-712 核心要素)
    const masterWalletAddress = (body.masterWalletAddress || body.walletAddress || '').toLowerCase();
    const containerId = body.containerId || body.vesselDid;
    const onchainDid = body.onchainDid || (masterWalletAddress ? `did:plvtvs:${masterWalletAddress}` : '');
    const signature = body.signature;

    if (!masterWalletAddress || !masterWalletAddress.startsWith('0x') || masterWalletAddress.length !== 42) {
      return NextResponse.json({ error: '无效的主钱包地址' }, { status: 400 });
    }
    if (!containerId) {
      return NextResponse.json({ error: '缺少分身容器标识 (containerId / vesselDid)' }, { status: 400 });
    }

    // 若携带完整 EIP-712 nonce 与 deadline，走严格规范引擎
    if (signature && (body.nonce !== undefined || body.deadline !== undefined)) {
      const message: BindMasterWalletMessage = {
        masterWalletAddress: masterWalletAddress as `0x${string}`,
        containerId,
        onchainDid,
        nonce: body.nonce ?? 0,
        deadline: body.deadline ?? Math.floor(Date.now() / 1000) + 3600,
      };

      const result = await processBindMasterWallet({
        message,
        signature: signature as `0x${string}`,
      });
      return NextResponse.json(result);
    }

    // 向下兼容无 EIP-712 参数的开发态请求，同时保证数据库生命周期状态一致跃迁
    const prime = await db.prime.upsert({
      where: { walletAddress: masterWalletAddress },
      update: {
        lastActiveAt: new Date(),
        accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
      },
      create: {
        did: onchainDid,
        walletAddress: masterWalletAddress,
        role: 'USER',
        status: 'ACTIVE',
        accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
      },
    });

    const vessel = await db.vessel.findFirst({
      where: {
        OR: [{ id: containerId }, { did: containerId }],
      },
      include: { eidolon: true },
    });

    if (vessel) {
      await db.vessel.update({
        where: { id: vessel.id },
        data: {
          primeId: prime.id,
          accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
          lastActiveAt: new Date(),
        },
      });

      if (vessel.eidolonId) {
        await db.eidolon.update({
          where: { id: vessel.eidolonId },
          data: { primeId: prime.id },
        });
      }
    }

    // 初始化或更新 BackupWallet
    let backupWallet = await db.backupWallet.findFirst({
      where: {
        OR: [
          { primeId: prime.id },
          vessel ? { vesselId: vessel.id } : { id: 'non-existing' },
        ],
      },
    });

    if (!backupWallet) {
      const fallbackAddr = vessel?.smartAccountAddress || `0x${masterWalletAddress.slice(2).padStart(40, '0')}`;
      backupWallet = await db.backupWallet.create({
        data: {
          address: fallbackAddr.toLowerCase(),
          primeId: prime.id,
          vesselId: vessel?.id,
          balanceWei: '0',
          asset: 'USDC',
        },
      });
    }

    return NextResponse.json({
      success: true,
      accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
      message: `✅ 已成功将主体主钱包确权绑定至 ${masterWalletAddress.slice(0, 8)}...${masterWalletAddress.slice(-6)}！`,
      primeDid: onchainDid,
      walletAddress: masterWalletAddress,
      backupWalletAddress: backupWallet.address,
    });
  } catch (err: any) {
    console.error('[bind-wallet] Error:', err);
    return NextResponse.json({ error: err.message || '绑定失败' }, { status: 500 });
  }
}
