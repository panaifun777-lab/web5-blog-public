// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/vip/route.ts
// Vessel VIP 月度通行证 API (4.99 USDC / 2.99U WBOG 6折)
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { calculateRevenueSplit } from '@/lib/web5/ap2/commerce';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const did = searchParams.get('did') || '';

  return NextResponse.json({
    success: true,
    pricing: {
      standardUsdc: 4.99,
      wbogDiscountUsdc: 2.99, // 6折
      wbogTokensEquivalent: 35500,
      periodDays: 30,
      revenueSplit: '50% 团队运营出纳 + 50% 自动注入 Uniswap v4 LP 永久锁定',
    },
    perks: [
      '全站 x402 认知付费博文免密无限畅读 (免除 0.03~0.05U 解锁费)',
      'AI 专家智库直连问答舱无限次深度会诊 (不限次数生成万字长文研报)',
      'AI 流式写作开放 3,000 字超长篇高维推演 (普通用户 1,500 字)',
      '点亮专属金色 VIP 赛博粒子全息光环与尊贵勋章',
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vesselDid, paymentToken = 'WBOG', months = 1 } = body;

    const monthCount = Math.max(1, Math.min(12, parseInt(months) || 1));
    const pricePerMonth = paymentToken === 'WBOG' ? 2.99 : 4.99;
    const totalAmount = pricePerMonth * monthCount;

    // 触发 50% 运营出纳 + 50% LP 锁定分配
    const split = calculateRevenueSplit(totalAmount);
    const expiresAt = Date.now() + monthCount * 30 * 86400000;

    console.log(`👑 [Vessel VIP Activated] DID: ${vesselDid}, Months: ${monthCount}, Paid: ${totalAmount} USDC via ${paymentToken}`);

    return NextResponse.json({
      success: true,
      vip: {
        active: true,
        vesselDid,
        paymentToken,
        months: monthCount,
        expiresAt,
        split,
      },
      message: `🎉 恭喜！Vessel VIP 尊享通行证已激活成功！有效期至：${new Date(expiresAt).toLocaleDateString()}。`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
