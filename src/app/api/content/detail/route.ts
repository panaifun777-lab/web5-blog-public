// ════════════════════════════════════════════════════════════════
// src/app/api/content/detail/route.ts — 内容详情 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleX402PaymentGate } from '@/lib/web5/x402/middleware';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

export async function POST(req: NextRequest) {
  try {
    const { arweaveHash, comment, vesselDid } = await req.json();
    if (!arweaveHash || !comment || !vesselDid) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
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

    // ── x402 外部智能体微支付检测 (Tier 1 基础数据 0.03 USDC，若请求带 deep=true 则升级至 Tier 2 0.05 USDC) ──
    const isAgentCall = url.searchParams.get('agent') === 'true' || req.headers.get('accept')?.includes('application/vnd.x402');
    if (isAgentCall) {
      const isDeep = url.searchParams.get('deep') === 'true';
      const gate = handleX402PaymentGate(req, {
        tier: isDeep ? 'TIER_2_DEEP_REASONING' : 'TIER_1_SUMMARY',
        priceUsdc: isDeep ? '0.05' : '0.03',
        recipient: ARC_MAINNET.addresses.Deployer,
        network: 'arc-mainnet',
        chainId: ARC_MAINNET.id,
        description: `Unlock high-fidelity Web5 blog reading for arweaveHash: ${arweaveHash}`,
      });
      if (!gate.authorized && gate.response) {
        return gate.response;
      }
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

    return NextResponse.json({
      success: true,
      content: {
        id: content.id,
        arweaveHash: content.arweaveHash,
        tokenId: content.tokenId?.toString() || null,
        title: content.title,
        bodyMd: content.bodyMd,
        excerpt: content.excerpt,
        authorDid: content.authorDid,
        authorName: content.prime?.displayName || 'Anonymous',
        authorAvatarSeed: content.prime?.avatarSeed || 'default',
        authorBio: content.prime?.bio || '',
        license: content.license,
        royaltyRate: content.royaltyRate,
        arpVcId: content.arpVcId,
        publishedAt: content.publishedAt.toISOString(),
      },
      interactions: interactions.map((i) => ({
        id: i.id,
        type: i.type,
        amount: i.amount?.toString() || null,
        comment: i.comment,
        createdAt: i.createdAt.toISOString(),
        authorName: i.vessel?.prime?.displayName || 'Anonymous',
        authorAvatarSeed: i.vessel?.prime?.avatarSeed || 'default',
      })),
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
