// ════════════════════════════════════════════════════════════════
// src/app/api/auth/bind-wallet/route.ts
// 绑定主钱包 — 支持 EIP-712 结构化签名与标准 personal_sign 个人签名双重验证
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  processBindMasterWallet,
  type BindMasterWalletMessage,
} from '@/lib/web5/auth/eip712-types';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/web5/api/errors';
import { verifyMessage, getAddress, isAddress } from 'viem';
import { db } from '@/lib/db';
import { AccountStage } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`bind-wallet:${clientIp(req)}`, 20, 60_000);
  if (!limited.ok) {
    return apiError('RATE_LIMITED', {
      request: req,
      headers: { 'Retry-After': String(limited.retryAfter) },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const signature = typeof body?.signature === 'string' ? body.signature : '';

    if (!signature || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      return apiError('SIGNATURE_REQUIRED', { request: req, status: 400 });
    }

    // 1. 如果请求带有 message 字符串（即 personal_sign 模式）
    if (typeof body?.messageString === 'string' && typeof body?.walletAddress === 'string') {
      const messageString = body.messageString;
      const walletAddress = body.walletAddress;

      if (!isAddress(walletAddress)) {
        return apiError('INVALID_WALLET_ADDRESS', { request: req, status: 400 });
      }

      const normalizedMaster = getAddress(walletAddress).toLowerCase();
      
      // 验证 personal_sign 签名
      const isValid = await verifyMessage({
        address: normalizedMaster as `0x${string}`,
        message: messageString,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        return apiError('SIGNATURE_INVALID', { request: req, status: 400 });
      }

      const realPrimeDid = `did:plvtvs:${normalizedMaster}`;
      const containerId = body.containerId || '';

      // 数据库事务更新
      const result = await db.$transaction(async (tx) => {
        const prime = await tx.prime.upsert({
          where: { walletAddress: normalizedMaster },
          update: {
            lastActiveAt: new Date(),
            accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
          },
          create: {
            did: realPrimeDid,
            walletAddress: normalizedMaster,
            role: 'USER',
            status: 'ACTIVE',
            accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
          },
        });

        if (containerId) {
          const vessel = await tx.vessel.findFirst({
            where: { OR: [{ id: containerId }, { did: containerId }] },
          });
          if (vessel) {
            await tx.vessel.update({
              where: { id: vessel.id },
              data: {
                primeId: prime.id,
                accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
                lastActiveAt: new Date(),
              },
            });
          }
        }

        return {
          success: true,
          accountStage: AccountStage.STAGE_2_MASTER_VERIFIED,
          primeDid: prime.did,
          masterWalletAddress: normalizedMaster,
          containerId,
          onchainDid: prime.did,
        };
      });

      return NextResponse.json(result);
    }

    // 2. 默认 EIP-712 模式
    const message = body?.message as BindMasterWalletMessage | undefined;
    if (!message) {
      return apiError('SIGNATURE_REQUIRED', { request: req, status: 400 });
    }

    const result = await processBindMasterWallet({
      message,
      signature: signature as `0x${string}`,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[bind-wallet] Error:', err);
    return apiError('BIND_WALLET_FAILED', {
      request: req,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
