// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/revenue-split/route.ts
// 50% 运营出纳 + 50% LP 回购锁定智能分配规则端点
// 扩充：支持读取 ref 策展推荐人参数并计算 15% 策展返佣
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { calculateRevenueSplit, REVENUE_ROUTING } from '@/lib/web5/ap2/commerce';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amountStr = searchParams.get('amount') || '5.0';
  const amount = parseFloat(amountStr) || 5.0;
  const ref = searchParams.get('ref') || undefined;

  const split = calculateRevenueSplit(amount, ref);
  return NextResponse.json({
    success: true,
    protocol: 'Web5 AP2 Autonomous 80/20 & Curate-to-Earn Splitter',
    rules: {
      creatorNetSharePercent: '80%',
      protocolFeePercent: '20%',
      curatorRebatePercent: '15% of payment (when ref provided)',
      protocolSplit: {
        operationalTreasuryPercent: ref ? '50% of net protocol fee' : '50% of fee (10% of total)',
        lpLockOrBurnPercent: ref ? '50% of net protocol fee' : '50% of fee (10% of total)',
      },
      treasuryAddress: REVENUE_ROUTING.OPERATIONAL_TREASURY_ADDRESS,
      uniswapV4Pool: REVENUE_ROUTING.UNISWAP_V4_POOL,
    },
    sampleSplit: split,
    curator: ref ? { ref, rebatePercent: '15%' } : null,
    demo: true,
    settled: false,
    message: '分账规则预览，不产生真实转账；结算通道开放前不会执行分账。',
  });
}

