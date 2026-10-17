// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/revenue-split/route.ts
// 50% 运营出纳 + 50% LP 回购锁定智能分配规则端点
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { calculateRevenueSplit, REVENUE_ROUTING } from '@/lib/web5/ap2/commerce';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amountStr = searchParams.get('amount') || '5.0';
  const amount = parseFloat(amountStr) || 5.0;

  const split = calculateRevenueSplit(amount);
  return NextResponse.json({
    success: true,
    protocol: 'Web5 AP2 Autonomous 80/20 Splitter',
    rules: {
      creatorNetSharePercent: '80%',
      protocolFeePercent: '20%',
      protocolSplit: {
        operationalTreasuryPercent: '50% of fee (10% of total)',
        lpLockOrBurnPercent: '50% of fee (10% of total)',
      },
      treasuryAddress: REVENUE_ROUTING.OPERATIONAL_TREASURY_ADDRESS,
      uniswapV4Pool: REVENUE_ROUTING.UNISWAP_V4_POOL,
    },
    sampleSplit: split,
  });
}
