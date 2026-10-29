// ════════════════════════════════════════════════════════════════
// src/lib/web5/content/publisher.ts
// 内容发布与确权 — Arweave 永久存储 + Content NFT 铸造 + ARP VC
// MVP：模拟实现；生产环境对接 Irys SDK + viem 合约调用
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import { getCurrentVesselSession } from '@/lib/web5/vessel-auth';
import type { ContentLicense } from '@prisma/client';
import type { VesselSession } from '@/lib/web5/types';
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
  arpVcId: string | null;
  contentId: string;
  uploadFallback: boolean;
  uploadSize: number;
  storageProvider: 'ARWEAVE' | 'DATABASE';
  storageStatus: 'CONFIRMED' | 'UNVERIFIED';
  nftStatus: 'MINTED' | 'NOT_MINTED' | 'FAILED';
  nftTxHash: string | null;
}

// 升级版：使用真实 Irys SDK（发布路径强制永久存证，禁止本地 fallback）
import {
  uploadToArweave as irysUpload,
  estimateUploadCost,
  ArweavePermanenceError,
} from './arweave-uploader';

async function uploadToArweave(content: {
  title: string;
  bodyMd: string;
  authorDid: string;
  timestamp: number;
  coverImageHash?: string;
}): Promise<{ hash: string; fallback: boolean; size: number }> {
  try {
    const result = await irysUpload(content, { requirePermanent: true });
    return {
      hash: result.arweaveHash,
      fallback: result.fallback,
      size: result.size,
    };
  } catch (err) {
    if (err instanceof ArweavePermanenceError) {
      // 发布必须真实上链，失败即中止，不用本地哈希顶替
      throw new ArweavePermanenceError(
        `已中止发布，未使用本地哈希（${err.causeMessage}）`,
        err
      );
    }
    throw err;
  }
}

import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

// Arc Mainnet Viem 链定义
const arcMainnetChain = defineChain({
  id: ARC_MAINNET.id,
  name: ARC_MAINNET.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_MAINNET.rpcUrl] } },
  blockExplorers: { default: { name: 'ArcScan', url: ARC_MAINNET.explorer } },
});

const CONTENT_NFT_ABI = [
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'arweaveHash', type: 'string' },
      { name: 'authorDid', type: 'string' },
      { name: 'royaltyRate', type: 'uint96' },
      { name: 'license', type: 'string' },
      { name: 'arpVcId', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const;

type MintResult = {
  tokenId: bigint | null;
  txHash: string | null;
  status: 'MINTED' | 'NOT_MINTED' | 'FAILED';
};

async function mintContentNFT(params: {
  toAddress: string;
  arweaveHash: string;
  authorDid: string;
  royaltyRate: number;
  license: string;
  arpVcId: string;
}): Promise<MintResult> {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
  const contract = ARC_MAINNET.addresses.ContentNFT;
  if (!privateKey?.startsWith('0x') || !contract?.startsWith('0x')) {
    return { tokenId: null, txHash: null, status: 'NOT_MINTED' };
  }

  try {
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: arcMainnetChain,
      transport: http(),
    });
    const publicClient = createPublicClient({
      chain: arcMainnetChain,
      transport: http(),
    });

    const recipient = (params.toAddress && params.toAddress.startsWith('0x') && params.toAddress.length === 42)
      ? (params.toAddress as `0x${string}`)
      : account.address;

    console.log(`[ContentNFT] Initiating Arc Mainnet mint for ${params.arweaveHash}...`);
    const txHash = await walletClient.writeContract({
      address: contract as `0x${string}`,
      abi: CONTENT_NFT_ABI,
      functionName: 'mint',
      args: [
        recipient,
        params.arweaveHash,
        params.authorDid,
        BigInt(params.royaltyRate),
        params.license,
        params.arpVcId,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') {
      return { tokenId: null, txHash, status: 'FAILED' };
    }

    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === contract.toLowerCase() && log.topics.length >= 4
    );
    const tokenId = transferLog?.topics?.[3] ? BigInt(transferLog.topics[3]) : null;
    return { tokenId, txHash, status: tokenId ? 'MINTED' : 'FAILED' };
  } catch (err) {
    console.warn('[ContentNFT] On-chain mint failed:', err);
    return { tokenId: null, txHash: null, status: 'FAILED' };
  }
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

export async function publishContent(
  params: PublishParams,
  sessionOverride?: VesselSession | null
): Promise<PublishResult> {
  const session = sessionOverride || getCurrentVesselSession();
  if (!session) {
    throw new Error('请先连接钱包或唤醒 Vessel 容器后再发布文章。');
  }

  if (!session.permissions.includes('publish')) {
    throw new Error('当前 Vessel 会话没有 publish 权限，请在唤醒容器时申请发布权限。');
  }

  const title = (params.title || '').trim();
  const bodyMd = params.bodyMd || '';
  if (title.length < 4 || title.length > 160) {
    throw new Error('标题长度需在 4-160 字符之间。');
  }
  if (!bodyMd.trim()) {
    throw new Error('正文不能为空。');
  }
  if (bodyMd.length > 200_000) {
    throw new Error('正文超出 200,000 字符上限。');
  }

  const license = params.license || 'CC_BY';
  const royaltyRate = params.royaltyRate || 100;

  const uploadResult = await uploadToArweave({
    title: params.title,
    bodyMd: params.bodyMd,
    authorDid: session.primeDid,
    timestamp: Date.now(),
    coverImageHash: params.coverImageHash,
  });
  const arweaveHash = uploadResult.hash;
  const uploadFallback = uploadResult.fallback;
  const uploadSize = uploadResult.size;

  const arpVcCandidate = await createArpVc({
    contentHash: arweaveHash,
    tokenId: null,
    authorDid: session.primeDid,
    license,
    royaltyRate,
    splits: params.splits,
  });

  const mint = await mintContentNFT({
    toAddress: session.vesselDid.startsWith('0x') ? session.vesselDid : '',
    arweaveHash,
    authorDid: session.primeDid,
    royaltyRate,
    license,
    arpVcId: arpVcCandidate,
  });
  const tokenId = mint.tokenId;
  const arpVcId = mint.status === 'MINTED' ? arpVcCandidate : null;

  const storageProvider: 'ARWEAVE' | 'DATABASE' = uploadFallback ? 'DATABASE' : 'ARWEAVE';
  const storageStatus: 'CONFIRMED' | 'UNVERIFIED' = uploadFallback ? 'UNVERIFIED' : 'CONFIRMED';

  let prime = await db.prime.findUnique({ where: { did: session.primeDid } });
  if (!prime) {
    const rawWallet = session.primeDid.replace('did:plvtvs:', '').toLowerCase();
    prime = await db.prime.upsert({
      where: { walletAddress: rawWallet.startsWith('0x') ? rawWallet : '0x10687368ef1be3f178de0fccf5edff49e1c258b1' },
      update: { lastActiveAt: new Date() },
      create: {
        did: session.primeDid,
        walletAddress: rawWallet.startsWith('0x') ? rawWallet : '0x10687368ef1be3f178de0fccf5edff49e1c258b1',
        displayName: 'Web5 Pioneer',
        avatarSeed: session.primeDid,
        role: 'USER',
      },
    });
  }

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
      storageProvider,
      storageStatus,
      nftStatus: mint.status,
      nftTxHash: mint.txHash,
      publishedAt: new Date(),
    },
  });

  return {
    arweaveHash,
    tokenId,
    arpVcId,
    contentId: content.id,
    uploadFallback,
    uploadSize,
    storageProvider,
    storageStatus,
    nftStatus: mint.status,
    nftTxHash: mint.txHash,
  };
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
