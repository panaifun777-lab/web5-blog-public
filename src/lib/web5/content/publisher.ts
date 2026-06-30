// ════════════════════════════════════════════════════════════════
// src/lib/web5/content/publisher.ts
// 内容发布与确权 — Arweave 永久存储 + Content NFT 铸造 + ARP VC
// MVP：模拟实现；生产环境对接 Irys SDK + viem 合约调用
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import { getCurrentVesselSession } from '@/lib/web5/vessel-auth';
import type { ContentLicense } from '@prisma/client';
import { createHash } from 'crypto';

export interface PublishParams {
  title: string;
  bodyMd: string;
  excerpt?: string;
  coverImageHash?: string;
  license?: ContentLicense;
  royaltyRate?: number;
  splits?: { recipient: string; share: number }[];
}

export interface PublishResult {
  arweaveHash: string;
  tokenId: bigint | null;
  arpVcId: string;
  contentId: string;
}

async function uploadToArweave(content: {
  title: string;
  bodyMd: string;
  authorDid: string;
  timestamp: number;
}): Promise<string> {
  return createHash('sha256')
    .update(JSON.stringify(content))
    .digest('base64url')
    .slice(0, 43);
}

async function mintContentNFT(
  _arweaveHash: string,
  _royaltyRate: number
): Promise<bigint> {
  return BigInt(Math.floor(Math.random() * 1_000_000_000) + 1);
}

async function createArpVc(params: {
  contentHash: string;
  tokenId: bigint | null;
  authorDid: string;
  license: ContentLicense;
  royaltyRate: number;
  splits?: { recipient: string; share: number }[];
}): Promise<string> {
  return `vc:arp:${createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 16)}`;
}

export async function publishContent(params: PublishParams): Promise<PublishResult> {
  const session = getCurrentVesselSession();
  if (!session) {
    throw new Error('Vessel session not found. Please awaken vessel first.');
  }
  if (!session.permissions.includes('publish')) {
    throw new Error('Vessel lacks publish permission');
  }
  if (session.accessMode === 'observer') {
    throw new Error('Observer Mode cannot publish. Awaken vessel to unlock.');
  }

  const license = params.license || 'CC_BY';
  const royaltyRate = params.royaltyRate || 100;

  const arweaveHash = await uploadToArweave({
    title: params.title,
    bodyMd: params.bodyMd,
    authorDid: session.primeDid,
    timestamp: Date.now(),
  });

  const tokenId = await mintContentNFT(arweaveHash, royaltyRate);

  const arpVcId = await createArpVc({
    contentHash: arweaveHash,
    tokenId,
    authorDid: session.primeDid,
    license,
    royaltyRate,
    splits: params.splits,
  });

  const prime = await db.prime.findUnique({ where: { did: session.primeDid } });
  if (!prime) throw new Error('Prime not found');

  const content = await db.content.create({
    data: {
      arweaveHash,
      tokenId,
      authorDid: session.primeDid,
      primeId: prime.id,
      title: params.title,
      bodyMd: params.bodyMd,
      excerpt: params.excerpt || params.bodyMd.slice(0, 200),
      coverImageHash: params.coverImageHash || null,
      license,
      royaltyRate,
      splits: params.splits ? JSON.stringify(params.splits) : null,
      arpVcId,
      publishedAt: new Date(),
    },
  });

  return { arweaveHash, tokenId, arpVcId, contentId: content.id };
}

export async function listContents(opts: { limit?: number; offset?: number } = {}) {
  const { limit = 20, offset = 0 } = opts;
  return db.content.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit,
    skip: offset,
    include: { prime: { select: { displayName: true, did: true, avatarSeed: true } } },
  });
}

export async function getContentByHash(arweaveHash: string) {
  return db.content.findUnique({
    where: { arweaveHash },
    include: {
      prime: { select: { displayName: true, did: true, avatarSeed: true } },
      interactions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
}
