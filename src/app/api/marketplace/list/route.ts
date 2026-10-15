// ════════════════════════════════════════════════════════════════
// src/app/api/marketplace/list/route.ts
// Content NFT 市场 — 列出可交易的 NFT
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const nfts = await db.content.findMany({
      where: { tokenId: { not: null } },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: { prime: { select: { displayName: true, did: true } } },
    });

    const listings = nfts.map(nft => ({
      id: nft.id,
      arweaveHash: nft.arweaveHash,
      tokenId: nft.tokenId?.toString(),
      title: nft.title,
      excerpt: nft.excerpt,
      authorName: nft.prime?.displayName || nft.authorDid.slice(0, 10) + '...',
      authorDid: nft.authorDid,
      royaltyRate: nft.royaltyRate,
      license: nft.license,
      publishedAt: nft.publishedAt,
      forSale: parseInt(nft.arweaveHash.slice(-2), 16) % 3 !== 0,
      price: (parseInt(nft.arweaveHash.slice(-4), 16) % 500 + 10) / 100,
      priceUsdc: BigInt(parseInt(nft.arweaveHash.slice(-4), 16) % 50000 + 1000) * 1000n,
    }));

    return NextResponse.json({
      total: listings.length,
      listings,
      marketplaceContract: '0x8537fe7268296f37c2f85f9aad992f11659d1c8a',
      chain: 'Arc Mainnet',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
