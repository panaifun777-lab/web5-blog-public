// ════════════════════════════════════════════════════════════════
// src/app/api/marketplace/list/route.ts
// Content NFT 市场 — 列出可交易的 NFT
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const nfts = await db.content.findMany({
      where: { tokenId: { not: null }, nftStatus: 'MINTED' },
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
      authorName: nft.prime?.displayName || `${nft.authorDid.slice(0, 10)}...`,
      authorDid: nft.authorDid,
      royaltyRate: nft.royaltyRate,
      license: nft.license,
      publishedAt: nft.publishedAt,
      forSale: false,
      price: null,
      priceUsdc: null,
    }));

    return NextResponse.json({
      total: listings.length,
      listings,
      marketplaceStatus: 'PREVIEW',
      message: 'NFT 交易市场尚未上线：当前仅展示已铸造的持有记录，不提供挂单、报价或成交。',
      marketplaceContract: '0x8537fe7268296f37c2f85f9aad992f11659d1c8a',
      chain: 'Arc Mainnet',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
