// ════════════════════════════════════════════════════════════════
// src/lib/web5/distribution/farcaster.ts
// Farcaster 真实集成 — @piaoshu 的身份与分发
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';

// ━━ @piaoshu Farcaster 身份 ━━
export const PIAOSHU_FC = {
  username: 'piaoshu',
  displayName: '飘叔',
  bio: 'Web5 数字容器｜Prime × Eidolon × Vessel｜戴维经济学',
  pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/acec52f0-6e04-44a8-2fdb-0aa635ca9400/original',
  verifications: ['0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1'],
  protocol: 'farcaster',
  signerApproved: false, // 需要 Neynar API Key 才能签署 cast
  hubUrl: 'https://hub.pinata.cloud',
  // 如需真实发布，在 .env 中配置：
  // NEYNAR_API_KEY=...
  // NEYNAR_SIGNER_UUID=...
};

export interface FarcasterProfile {
  fid?: number;
  username: string;
  displayName: string;
  bio: string;
  pfpUrl: string;
  verifications: string[];
  followerCount?: number;
  followingCount?: number;
  connectedAddress?: string;
}

export interface DistributionResult {
  platform: string;
  contentArweaveHash: string;
  contentTitle?: string;
  impressions: number;
  engagements: number;
  castHash?: string;
  real: boolean; // true = 真实 cast, false = 仿真
  timestamp: Date;
}

export interface CastData {
  hash: string;
  text: string;
  timestamp: string;
  likes: number;
  recasts: number;
  replies: number;
  embeds: string[];
}

/**
 * 从 Farcaster Hub API 查询 @piaoshu 的真实数据
 * 使用公共 Read Hub (pinata)
 */
export async function lookupFarcasterProfile(): Promise<FarcasterProfile | null> {
  try {
    // 通过 Hub API 查找用户名
    const res = await fetch(`${PIAOSHU_FC.hubUrl}/v1/userNameProofByName?name=${PIAOSHU_FC.username}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const fid = data?.proof?.fid;

    if (!fid) return null;

    // 获取用户详细信息
    const userRes = await fetch(`${PIAOSHU_FC.hubUrl}/v1/userDataByFid?fid=${fid}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!userRes.ok) return null;
    const userData = await userRes.json();
    const messages = userData?.messages || [];

    // 解析 profile
    const profile: Record<string, string> = {};
    for (const msg of messages) {
      const type = msg?.data?.userDataBody?.type;
      const value = msg?.data?.userDataBody?.value;
      if (type) profile[type] = value || '';
    }

    return {
      fid,
      username: PIAOSHU_FC.username,
      displayName: profile['USER_DATA_TYPE_DISPLAY'] || PIAOSHU_FC.displayName,
      bio: profile['USER_DATA_TYPE_BIO'] || PIAOSHU_FC.bio,
      pfpUrl: profile['USER_DATA_TYPE_PFP'] || PIAOSHU_FC.pfpUrl,
      verifications: profile['USER_DATA_TYPE_VERIFICATION']
        ? [profile['USER_DATA_TYPE_VERIFICATION']]
        : PIAOSHU_FC.verifications,
      followerCount: await getFollowerCount(fid),
    };
  } catch {
    // Hub API 不可用时返回本地配置
    return {
      username: PIAOSHU_FC.username,
      displayName: PIAOSHU_FC.displayName,
      bio: PIAOSHU_FC.bio,
      pfpUrl: PIAOSHU_FC.pfpUrl,
      verifications: PIAOSHU_FC.verifications,
    };
  }
}

async function getFollowerCount(fid: number): Promise<number | undefined> {
  try {
    const res = await fetch(`${PIAOSHU_FC.hubUrl}/v1/linksByTarget?targetFid=${fid}&linkType=follow`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.messages?.length || undefined;
    }
  } catch { /* ignore */ }
  return undefined;
}

/**
 * 获取 @piaoshu 的最近 Casts
 */
export async function getRecentCasts(): Promise<CastData[]> {
  try {
    const profile = await lookupFarcasterProfile();
    if (!profile?.fid) return [];

    const res = await fetch(
      `${PIAOSHU_FC.hubUrl}/v1/castsByFid?fid=${profile.fid}&pageSize=10&reverse=true`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];

    const data = await res.json();
    const messages = data?.messages || [];

    return messages.map((msg: any): CastData => {
      const body = msg?.data?.castAddBody || {};
      return {
        hash: `0x${Buffer.from(msg.hash || []).toString('hex')}`,
        text: body.text || '',
        timestamp: new Date(msg.data?.timestamp || 0).toISOString(),
        likes: 0, // Hub API 未直接返回 reaction 数
        recasts: 0,
        replies: 0,
        embeds: (body.embeds || []).map((e: any) => e.url || ''),
      };
    });
  } catch {
    return [];
  }
}

/**
 * 将内容分发至 Farcaster（若配置了 Neynar API Key 则真实发布）
 * 否则记录仿真分发
 */
export async function distributeToFarcaster(
  vesselId: string,
  contentArweaveHash: string,
): Promise<DistributionResult> {
  const vessel = await db.vessel.findUnique({ where: { id: vesselId } });
  if (!vessel) throw new Error('Vessel not found');

  const content = await db.content.findUnique({ where: { arweaveHash: contentArweaveHash } });
  if (!content) throw new Error('Content not found');

  const neynarApiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;

  let castHash: string | undefined;
  let real = false;
  let impressions = 0;
  let engagements = 0;

  // 尝试真实发布
  if (neynarApiKey && signerUuid && vessel.did) {
    try {
      const text = `📝 ${content.title}\n\n${(content.bodyMd || content.excerpt || '').slice(0, 280)}\n\n🔗 web5.blog\n\n#Web5 #Eidolon #Vessel`;

      const castRes = await fetch('https://api.neynar.com/v2/farcaster/cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key': neynarApiKey,
        },
        body: JSON.stringify({
          signer_uuid: signerUuid,
          text,
          embeds: [{ url: `https://sepolia.basescan.org/token/${content.tokenId || content.arweaveHash}` }],
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (castRes.ok) {
        const castData = await castRes.json();
        castHash = castData?.cast?.hash;
        real = true;
      }
    } catch {
      // 真实发布失败：保留 real=false，不编造曝光数据
    }
  }

  // 记录分发日志（未真实发布时明确标记，不生成曝光/互动数据）
  await db.autonomousLog.create({
    data: {
      vesselId,
      action: 'distribute',
      targetContent: contentArweaveHash,
      metadata: JSON.stringify({
        platform: 'Farcaster',
        username: `@${PIAOSHU_FC.username}`,
        castHash,
        real,
        simulated: !real,
        impressions,
        engagements,
        title: content.title,
      }),
    },
  });

  return {
    platform: 'Farcaster',
    contentArweaveHash,
    contentTitle: content.title,
    impressions,
    engagements,
    castHash,
    real,
    timestamp: new Date(),
  };
}

/**
 * 查询 Vessel 的 Farcaster 分发统计
 */
export async function getDistributionStats(vesselDid?: string): Promise<{
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  pfpHref?: string;
  recentDistributions: any[];
}> {
  let distributions: any[] = [];

  if (vesselDid) {
    const vessel = await db.vessel.findUnique({ where: { did: vesselDid } });
    if (vessel) {
      distributions = await db.autonomousLog.findMany({
        where: { vesselId: vessel.id, action: 'distribute' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }
  }

  let totalImpressions = 0;
  let totalEngagements = 0;
  for (const d of distributions) {
    const meta = JSON.parse(d.metadata || '{}');
    totalImpressions += meta.impressions || 0;
    totalEngagements += meta.engagements || 0;
  }

  // @piaoshu 的 Farcaster 头像
  const pfpHref = process.env.NEYNAR_API_KEY
    ? undefined // 可由 Neynar 获取
    : `https://warpcast.com/${PIAOSHU_FC.username}`;

  return {
    totalPosts: distributions.length,
    totalImpressions,
    totalEngagements,
    pfpHref,
    recentDistributions: distributions.map(d => {
      const meta = JSON.parse(d.metadata || '{}');
      return {
        platform: meta.platform || 'Farcaster',
        username: meta.username || `@${PIAOSHU_FC.username}`,
        impressions: meta.impressions || 0,
        engagements: meta.engagements || 0,
        castHash: meta.castHash,
        real: meta.real === true,
        title: meta.title,
        createdAt: d.createdAt,
      };
    }),
  };
}
