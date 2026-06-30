// ════════════════════════════════════════════════════════════════
// src/app/api/content/detail/route.ts — 内容详情 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
