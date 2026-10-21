// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/vip/route.ts
// Vessel VIP 通行证。支付验证与权益发放上线前保持关闭。
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { featureDisabled } from '@/lib/launch/flags';

export async function GET() {
  return NextResponse.json({
    success: true,
    enabled: false,
    pricing: {
      standardUsdc: 4.99,
      wbogDiscountUsdc: 2.99,
      wbogTokensEquivalent: 35500,
      periodDays: 30,
      revenueSplit: 'VIP 尚未开放，不接收付款。',
    },
    perks: [
      '权益方案尚未上线，以下内容为规划草案，不代表已生效：',
      '规划：x402 付费内容折扣',
      '规划：AI 专家智库问答额度',
      '规划：长文写作额度',
    ],
  });
}

export async function POST() {
  return featureDisabled(
    'VIP_DISABLED',
    'Vessel VIP 尚未开放：支付验证与权益发放未上线，请勿付款。'
  );
}
