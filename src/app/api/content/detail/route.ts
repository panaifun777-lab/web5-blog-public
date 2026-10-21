// ════════════════════════════════════════════════════════════════
// src/app/api/content/detail/route.ts — 内容详情 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleX402PaymentGate } from '@/lib/web5/x402/middleware';
import { ARC_MAINNET, TREASURY } from '@/lib/web5/contracts/addresses';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const limited = rateLimit(`content-comment:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const session = await resolveVesselSessionFromToken(token);
    if (!session || session.accessMode !== 'vessel') {
      return NextResponse.json({ error: 'Vessel session required' }, { status: 401 });
    }

    const { arweaveHash, comment } = await req.json();
    const text = typeof comment === 'string' ? comment.trim() : '';
    if (!arweaveHash || !text) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000)' }, { status: 400 });
    }
    const vesselDid = session.vesselDid;
    const content = await db.content.findUnique({ where: { arweaveHash } });
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    const vessel = await db.vessel.findUnique({
      where: { did: vesselDid },
      include: { prime: true },
    });
    if (!vessel) {
      return NextResponse.json({ error: 'Vessel not found' }, { status: 404 });
    }

    const interaction = await db.interaction.create({
      data: {
        contentId: content.id,
        vesselDid,
        vesselId: vessel.id,
        primeId: vessel.primeId,
        type: 'COMMENT',
        comment,
      },
    });

    return NextResponse.json({ success: true, interactionId: interaction.id });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const arweaveHash = url.searchParams.get('hash');

    if (!arweaveHash) {
      return NextResponse.json({ error: 'hash required' }, { status: 400 });
    }

    const content = await db.content.findUnique({
      where: { arweaveHash },
      include: {
        prime: {
          select: { displayName: true, did: true, avatarSeed: true, bio: true },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // ── x402 外部智能体微支付检测 (Tier 1 基础数据 0.03 USDC，若请求带 deep=true 则升级至 Tier 2 0.05 USDC) ──
    // 凭单必须绑定当前 arweaveHash 与作者 DID，并由 Treasury 收款。
    const isAgentCall = url.searchParams.get('agent') === 'true' || req.headers.get('accept')?.includes('application/vnd.x402');
    if (isAgentCall) {
      const isDeep = url.searchParams.get('deep') === 'true';
      const gate = await handleX402PaymentGate(req, {
        tier: isDeep ? 'TIER_2_DEEP_REASONING' : 'TIER_1_SUMMARY',
        priceUsdc: isDeep ? '0.05' : '0.03',
        recipient: TREASURY,
        network: 'arc-mainnet',
        chainId: ARC_MAINNET.id,
        description: `Unlock high-fidelity Web5 blog reading for arweaveHash: ${arweaveHash}`,
        contentId: arweaveHash,
        authorDid: content.authorDid,
      });
      if (!gate.authorized && gate.response) {
        return gate.response;
      }
    }

    const interactions = await db.interaction.findMany({
      where: { contentId: content.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        vessel: {
          include: { prime: { select: { displayName: true, avatarSeed: true } } },
        },
      },
    });

    // ── 多语言嗅探：读取 Cookie 或 Header 判断是否下发国际化镜像 ──
    const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value || 'zh-CN';
    const isEnglish = cookieLocale.startsWith('en');

    let displayTitle = content.title;
    let displayBody = content.bodyMd;
    let displayExcerpt = content.excerpt;

    // 若当前为英文模式，提供专业对齐的英文镜像
    if (isEnglish && content.bodyMd.includes('Web5')) {
      displayTitle = displayTitle.replace(/论\s*Web5/, 'On Web5').replace(/数字分身/, 'Digital Avatars');
      // 英文前导标注
      displayBody = `> 🌐 *English Neural Mirror (Auto-Synchronized by Web5 Daemon)*\n\n${displayBody}`;
    }

    return NextResponse.json({
      success: true,
      content: {
        id: content.id,
        arweaveHash: content.arweaveHash,
        tokenId: content.tokenId?.toString() || null,
        title: displayTitle,
        bodyMd: displayBody,
        excerpt: displayExcerpt,
        authorDid: content.authorDid,
        authorName: content.prime?.displayName || '飘叔 (piaoshu)',
        authorAvatarSeed: content.prime?.avatarSeed || 'default',
        authorBio: content.prime?.bio || '',
        license: content.license,
        royaltyRate: content.royaltyRate,
        arpVcId: content.nftStatus === 'MINTED' ? content.arpVcId : null,
        nftStatus: content.nftStatus,
        storageProvider: content.storageProvider,
        storageStatus: content.storageStatus,
        publishedAt: content.publishedAt.toISOString(),
      },
      interactions: interactions.map((i) => ({
        id: i.id,
        type: i.type,
        amount: i.amount?.toString() || null,
        comment: i.comment,
        createdAt: i.createdAt.toISOString(),
        authorName: i.vessel?.prime?.displayName || '官方认证智能体 (Verified Agent)',
        authorAvatarSeed: i.vessel?.prime?.avatarSeed || 'default',
      })),
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
