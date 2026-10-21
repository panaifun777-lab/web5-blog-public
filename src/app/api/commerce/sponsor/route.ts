// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/sponsor/route.ts
// Trending 商业赞助位。支付验证与审核流程上线前保持关闭。
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { featureDisabled } from '@/lib/launch/flags';

export async function GET() {
  return NextResponse.json({
    success: true,
    sponsored: null,
    all: [],
    enabled: false,
    pricing: {
      dailyPriceUsdc: 30.0,
      dailyPriceWbog: 300000,
      rules: '赞助投放尚未开放，不接收任何付款。',
    },
  });
}

export async function POST() {
  return featureDisabled(
    'SPONSORSHIPS_DISABLED',
    '商业赞助尚未开放：支付验证、审核与退款流程未上线，请勿付款。'
  );
}
