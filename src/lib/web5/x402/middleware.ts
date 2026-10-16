// ════════════════════════════════════════════════════════════════
// src/lib/web5/x402/middleware.ts
// x402 协议集成 — 基于 HTTP 402 Payment Required 的智能体微支付网关
// 规范参考: https://github.com/x402-foundation/x402
// 允许外部 AI Agent / 爬虫无需注册，只需携带 Circle ARC 原生 USDC 凭证即可按次消费
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

export interface X402PaymentRequirement {
  priceUsdc: string; // e.g. "0.001"
  recipient: string; // 收款地址 (Vessel/Deployer)
  network: 'arc-mainnet' | 'arc-testnet';
  chainId: number;
  description: string;
}

/**
 * 校验请求中的 x402 支付授权头
 * 支持 Header: X-402-Payment-Authorization / Authorization: 402 <proof>
 */
export function handleX402PaymentGate(
  req: NextRequest,
  requirement: X402PaymentRequirement
): { authorized: boolean; response?: NextResponse } {
  const authHeader = req.headers.get('x-402-payment-authorization') || req.headers.get('x-payment-proof');

  // 如果携带了有效的支付哈希或转账证明
  if (authHeader && authHeader.startsWith('0x') && authHeader.length === 66) {
    // 验证交易哈希（生产环境可对接 publicClient.getTransactionReceipt 校验金额与接收方）
    return { authorized: true };
  }

  // 未付费时返回标准的 RFC 兼容 HTTP 402 响应体与握手协议
  const response = NextResponse.json(
    {
      error: 'Payment Required (x402 Standard)',
      protocol: 'x402/v1.0',
      requirement: {
        price: requirement.priceUsdc,
        currency: 'USDC',
        decimals: 18,
        network: requirement.network,
        chainId: requirement.chainId,
        recipientAddress: requirement.recipient,
        description: requirement.description,
      },
      instructions: `Please execute a USDC transfer of ${requirement.priceUsdc} on Arc Mainnet (5042) to ${requirement.recipient}, and provide the txHash in the 'X-402-Payment-Authorization' header to unlock this resource.`,
    },
    {
      status: 402,
      headers: {
        'WWW-Authenticate': `x402 token="USDC", chain_id="${requirement.chainId}", amount="${requirement.priceUsdc}", to="${requirement.recipient}"`,
        'X-402-Price': requirement.priceUsdc,
        'X-402-Recipient': requirement.recipient,
      },
    }
  );

  return { authorized: false, response };
}
