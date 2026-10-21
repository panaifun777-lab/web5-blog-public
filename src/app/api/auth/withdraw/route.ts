// ════════════════════════════════════════════════════════════════
// src/app/api/auth/withdraw/route.ts
// 站内备用轻钱包资产提现结算 (EIP-712 WithdrawSettlement 签名校验与扣减)
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  processWithdrawSettlement,
  type WithdrawSettlementMessage,
} from '@/lib/web5/auth/eip712-types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 格式 1：规范 EIP-712 请求体 { message: WithdrawSettlementMessage, signature: "0x...", txHash?: string }
    if (body.message && body.signature) {
      const result = await processWithdrawSettlement({
        message: body.message,
        signature: body.signature,
        txHash: body.txHash,
      });
      return NextResponse.json(result);
    }

    // 格式 2：扁平请求体
    const {
      masterWalletAddress,
      backupWalletAddress,
      asset = 'USDC',
      amountAtomic,
      nonce,
      deadline,
      signature,
      txHash,
    } = body;

    if (!masterWalletAddress || !backupWalletAddress || !amountAtomic || !signature || nonce === undefined || deadline === undefined) {
      return NextResponse.json(
        { error: '缺少提现必要参数: masterWalletAddress, backupWalletAddress, amountAtomic, nonce, deadline, signature' },
        { status: 400 }
      );
    }

    const message: WithdrawSettlementMessage = {
      masterWalletAddress,
      backupWalletAddress,
      asset,
      amountAtomic,
      nonce,
      deadline,
    };

    const result = await processWithdrawSettlement({
      message,
      signature,
      txHash,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[withdraw] Error:', err);
    return NextResponse.json({ error: err.message || '提现结算处理失败' }, { status: 400 });
  }
}
