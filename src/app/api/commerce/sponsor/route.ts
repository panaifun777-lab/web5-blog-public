// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/sponsor/route.ts
// Trending 商业赞助置顶广告 API (30 USDC / 天，50% 运营出纳 + 50% LP 锁定)
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { calculateRevenueSplit } from '@/lib/web5/ap2/commerce';

interface SponsoredAd {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  sponsorDid: string;
  bountyUsdc: number;
  paymentToken: 'USDC' | 'WBOG';
  expiresAt: number;
}

// 内存与持久化广告池
let activeSponsors: SponsoredAd[] = [
  {
    id: 'sponsor-default-1',
    title: 'Circle ARC 稳定币公链生态先锋加速器已正式启动',
    description: '面向全球 AI Agent 与 Web5 创新团队，提供 10 万 USDC 原生 Gas 资助与技术扶持。',
    targetUrl: 'https://web5.blog/founder',
    sponsorDid: 'did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
    bountyUsdc: 30.0,
    paymentToken: 'USDC',
    expiresAt: Date.now() + 86400000 * 30, // 30天
  },
];

export async function GET() {
  const now = Date.now();
  const valid = activeSponsors.filter(s => s.expiresAt > now);
  return NextResponse.json({
    success: true,
    sponsored: valid[0] || null,
    all: valid,
    pricing: {
      dailyPriceUsdc: 30.0,
      dailyPriceWbog: 300000, // 8折特惠
      rules: '50% 运营出纳 + 50% 自动注入 Uniswap v4 LP 永久锁定',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, targetUrl, sponsorDid, days = 1, paymentToken = 'USDC' } = body;

    if (!title || !targetUrl) {
      return NextResponse.json({ error: '标题与跳转链接为必填项' }, { status: 400 });
    }

    const dayCount = Math.max(1, Math.min(30, parseInt(days) || 1));
    const totalAmount = paymentToken === 'WBOG' ? dayCount * 24.0 : dayCount * 30.0; // WBOG 享 8 折

    const newAd: SponsoredAd = {
      id: `sponsor-${Date.now()}`,
      title: title.slice(0, 60),
      description: (description || 'Web5 优质赞助项目').slice(0, 120),
      targetUrl,
      sponsorDid: sponsorDid || 'did:plvtvs:sponsor',
      bountyUsdc: totalAmount,
      paymentToken,
      expiresAt: Date.now() + dayCount * 86400000,
    };

    activeSponsors = [newAd, ...activeSponsors];

    // 50% 运营出纳 + 50% LP 锁定分配
    const split = calculateRevenueSplit(totalAmount);
    console.log(`💎 [Trending Sponsor Paid] New ad placed: ${title} (${totalAmount} USDC). Split: 50% to Ops, 50% to LP Lock.`);

    return NextResponse.json({
      success: true,
      sponsored: newAd,
      split,
      message: `🎉 赞助广告投放成功！已置顶展示在 Trending 榜首，展示周期：${dayCount} 天。`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
