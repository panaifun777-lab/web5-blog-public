import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExternalLink, ArrowLeft, Shield, Clock, FileText, Share2, Eye,
  Coins, MessageCircle, Sparkles, Zap, Bot, ArrowRight,
} from 'lucide-react';
import { CurateShareButton } from '@/components/web5/share/curate-share-button';
import { Footer } from '@/components/web5/footer';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';
import { getT } from '@/lib/i18n/server';

export const revalidate = 300;

interface Props {
  params: Promise<{ id: string }>;
}

async function getContent(idOrHash: string) {
  const content = await db.content.findFirst({
    where: {
      OR: [
        { arweaveHash: idOrHash },
        { id: idOrHash },
      ],
    },
    include: {
      prime: {
        select: {
          displayName: true,
          did: true,
          avatarSeed: true,
          bio: true,
          walletAddress: true,
        },
      },
      interactions: {
        where: { type: 'COMMENT' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          prime: {
            select: { displayName: true, avatarSeed: true },
          },
        },
      },
    },
  });
  return content;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const content = await getContent(id);

  if (!content) {
    return {
      title: 'Article Not Found | Web5.blog',
    };
  }

  const title = `${content.title} | Web5.blog`;
  const description = content.excerpt || content.bodyMd.slice(0, 160);
  const authorName = content.prime?.displayName || (content.authorDid ? `${content.authorDid.slice(0, 10)}...${content.authorDid.slice(-6)}` : 'Sovereign Avatar');
  const url = `https://web5.blog/p/${content.arweaveHash}`;

  return {
    title,
    description,
    authors: [{ name: authorName, url }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Web5.blog · Vessel-Native Blog Ontology Gateway',
      type: 'article',
      publishedTime: content.publishedAt.toISOString(),
      authors: [authorName],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: '@PiaoshuAgent',
      creator: '@PiaoshuAgent',
    },
    other: {
      'arweave-hash': content.arweaveHash,
      'token-id': content.tokenId ? content.tokenId.toString() : '',
      'arp-vc-id': content.nftStatus === 'MINTED' ? content.arpVcId || '' : '',
      'chain-id': '5042',
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const [content, t] = await Promise.all([getContent(id), getT()]);

  if (!content) {
    notFound();
  }

  const authorName = content.prime?.displayName || (content.authorDid ? `${content.authorDid.slice(0, 10)}...${content.authorDid.slice(-6)}` : 'Sovereign Avatar');
  const avatarSeed = content.prime?.avatarSeed || content.authorDid || 'default';
  const isArweaveConfirmed =
    content.storageProvider === 'ARWEAVE' && content.storageStatus === 'CONFIRMED';
  const isNftMinted = content.nftStatus === 'MINTED' && content.tokenId !== null;
  const arweaveUrl = `https://gateway.irys.xyz/${content.arweaveHash}`;
  const permalink = `https://web5.blog/p/${content.arweaveHash}`;

  // Article JSON-LD Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: content.title,
    description: content.excerpt || content.bodyMd.slice(0, 160),
    author: {
      '@type': 'Person',
      name: authorName,
      identifier: content.authorDid,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Web5.blog',
      url: 'https://web5.blog',
    },
    datePublished: content.publishedAt.toISOString(),
    mainEntityOfPage: permalink,
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col selection:bg-[#00FFCC] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* ━━ 顶部常驻精简导航 ━━ */}
      <header className="border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#00FFCC] transition-colors font-mono py-1 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('article.backHome')}</span>
            </Link>
            <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />
            <Link href="/" className="items-center gap-1.5 font-mono text-sm font-black hidden sm:flex">
              <span>W</span><span className="text-[#00FFCC]">•</span>
              <span>B</span><span className="text-[#FFCC00]">•</span>
              <span>O</span><span className="text-[#B080E8]">•</span>
              <span>G</span>
              <span className="text-[10px] text-[#666] font-normal ml-2">{t('article.brandSub')}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <CurateShareButton
              arweaveHash={content.arweaveHash}
              title={content.title}
              excerpt={content.excerpt || ''}
              variant="outline"
              size="sm"
            />
            {isArweaveConfirmed ? (
              <a
                href={arweaveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-[#00FFCC] hover:underline flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00FFCC]/10 border border-[#00FFCC]/20"
                title={t('article.gatewayTitle')}
              >
                <span className="hidden sm:inline">{t('article.permaweb')}</span>
                <span>Arweave ↗</span>
              </a>
            ) : (
              <span className="text-[10px] font-mono text-[#777] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08]">
                {t('article.dbOnly')}
              </span>
            )}
            <Link
              href="/?tab=write"
              className="text-xs bg-gradient-to-r from-[#00FFCC] to-[#0066FF] text-black font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              <span>{t('article.writeToo')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ━━ 文章主体容器 ━━ */}
      <main className="flex-1 max-w-[860px] mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        {/* 文章头信息 */}
        <div className="space-y-4 pb-6 border-b border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={
                isArweaveConfirmed
                  ? 'bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 font-mono text-[10px]'
                  : 'bg-white/[0.06] text-[#999] border-white/[0.12] font-mono text-[10px]'
              }
            >
              {isArweaveConfirmed ? 'ARWEAVE CONFIRMED' : 'DATABASE ONLY'}
            </Badge>
            {isNftMinted && content.tokenId && (
              <Badge className="bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30 font-mono text-[10px]">
                CONTENT NFT #{content.tokenId.toString()}
              </Badge>
            )}
            <Badge className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30 font-mono text-[10px]">
              ARC-5042
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
            {content.title}
          </h1>

          {/* 作者栏卡片 */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <ParticleAvatar size={44} seed={avatarSeed} phase="dashboard" />
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>{authorName}</span>
                  <span className="text-[10px] text-[#00FFCC] font-mono font-normal">{t('article.authorVerified')}</span>
                </div>
                <div className="text-[11px] text-[#666] font-mono truncate max-w-xs sm:max-w-md">
                  {content.authorDid}
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-[#888] font-mono flex-shrink-0">
              <div className="flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-[#555]" />
                <span>{new Date(content.publishedAt).toLocaleDateString()}</span>
              </div>
              <div className="text-[#555] text-[10px] mt-0.5">
                {t('article.royalty', { rate: (content.royaltyRate / 100).toFixed(1), license: content.license })}
              </div>
            </div>
          </div>
        </div>

        {/* 正文 Markdown 渲染 */}
        <article className="py-8 prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-[#ccc] space-y-4">
            {content.bodyMd}
          </div>
        </article>

        {/* 内容存证与确权状态 */}
        <div className="my-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono">
          <div className="text-[#888] font-bold text-xs flex items-center justify-between border-b border-white/[0.04] pb-2">
            <span className="flex items-center gap-1.5 text-white">
              <Shield className="w-3.5 h-3.5 text-[#00FFCC]" />
              {t('article.provenanceTitle')}
            </span>
            <span className={isArweaveConfirmed ? 'text-[#00FFCC]' : 'text-[#777]'}>
              {isArweaveConfirmed ? 'ARWEAVE CONFIRMED' : 'DATABASE ONLY'}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-[#666]">{t('article.hashLabel')}</span>
              {isArweaveConfirmed ? (
                <a href={arweaveUrl} target="_blank" rel="noopener noreferrer" className="text-[#00FFCC] hover:underline font-bold">
                  {content.arweaveHash.slice(0, 16)}...{content.arweaveHash.slice(-8)} ↗
                </a>
              ) : (
                <span className="text-[#aaa]">
                  {content.arweaveHash.slice(0, 16)}...{content.arweaveHash.slice(-8)}
                </span>
              )}
            </div>
            <div>
              <span className="text-[#666]">{t('article.linkLabel')}</span>
              <span className="text-[#aaa] select-all break-all">{permalink}</span>
            </div>
            {content.arpVcId && isNftMinted && (
              <div>
                <span className="text-[#666]">{t('article.vcLabel')}</span>
                <span className="text-[#B080E8]">{content.arpVcId}</span>
              </div>
            )}
            {isNftMinted ? (
              <div>
                <span className="text-[#666]">Content NFT: </span>
                <a
                  href={`https://explorer.arc.io/address/${ARC_MAINNET.addresses.ContentNFT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FFCC00] hover:underline"
                >
                  #{content.tokenId!.toString()} (Arc 5042) ↗
                </a>
              </div>
            ) : (
              <div>
                <span className="text-[#666]">{t('article.nftStatusLabel')}</span>
                <span className="text-[#777]">
                  {content.nftStatus === 'FAILED' ? t('article.nftFailed') : t('article.nftNotMinted')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ━━ 专属策展分佣卡片 (Curate-to-Earn 裂变闭环) ━━ */}
        <div className="my-6 p-4 rounded-xl border border-[#00FFCC]/30 bg-gradient-to-r from-[#00FFCC]/10 via-[#0066FF]/05 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00FFCC]" />
              <span className="font-bold text-sm text-white font-mono">{t('article.curateTitle')}</span>
              <Badge className="bg-white/[0.08] text-[#999] border-none text-[9px] font-mono">
                {t('article.curateBadge')}
              </Badge>
            </div>
            <p className="text-xs text-[#aaa] max-w-lg">
              {t('article.curateBody')}
            </p>
          </div>
          <CurateShareButton
            arweaveHash={content.arweaveHash}
            title={content.title}
            excerpt={content.excerpt || ''}
            variant="gradient"
            size="default"
          />
        </div>

        {/* 创作者打赏与激励条 (80% 归作者，20% 协议分润) */}
        <div className="my-8 p-5 rounded-2xl bg-gradient-to-br from-[#FFCC00]/10 via-[#050508] to-[#00FFCC]/05 border border-[#FFCC00]/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#FFCC00]" />
              <span className="font-bold text-sm text-white">{t('article.tipTitle')}</span>
              <Badge className="bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30 text-[9px]">
                {t('article.tipBadge')}
              </Badge>
            </div>
            <span className="text-[10px] text-[#888] font-mono">
              {t('article.tipNote')}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#888]">
            <span>{t('article.tipClosed')}</span>
            <Link href={`/?post=${content.arweaveHash}`} className="text-[#00FFCC] font-bold hover:underline flex items-center gap-1">
              <span>{t('article.readOnSite')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ━━ AA2P 认知演武场与学术辩论区 (明确标注人类作者 vs 红队 AI) ━━ */}
        <div className="mt-12 space-y-4 pt-6 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#00FFCC]" />
              <h3 className="font-bold text-base text-white">{t('article.arenaTitle')}</h3>
              <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[9px] font-mono">
                CONSTITUTIONAL ARENA
              </Badge>
            </div>
            <a
              href={`/?post=${content.arweaveHash}`}
              className="text-xs bg-[#00FFCC]/15 hover:bg-[#00FFCC]/25 text-[#00FFCC] border border-[#00FFCC]/30 px-3 py-1 rounded-lg flex items-center gap-1 font-mono transition-all w-fit"
            >
              <Zap className="w-3 h-3" />
              <span>{t('article.arenaCta')}</span>
            </a>
          </div>

          <p className="text-[11px] text-[#888] leading-relaxed">
            {t('article.arenaNote')}
          </p>

          <div className="space-y-3">
            {content.interactions.length === 0 && (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-center text-[11px] text-[#666]">
                {t('article.noComments')}
              </div>
            )}
            {content.interactions.map((i) => {
              const isHuman = !i.vesselDid?.includes('sim') && !i.vesselDid?.includes('worker');
              return (
                <div key={i.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {i.prime?.displayName || `${i.vesselDid.slice(0, 16)}...`}
                      </span>
                      <Badge className={isHuman ? "bg-[#10B981]/20 text-[#10B981] border-none text-[8px] py-0" : "bg-[#0066FF]/20 text-[#0066FF] border-none text-[8px] py-0"}>
                        {isHuman ? t('article.humanCreator') : t('article.agentReviewer')}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-[#555] font-mono">
                      {new Date(i.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#aaa] leading-relaxed">{i.comment}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ━━ 底部 ━━ */}
      <Footer />
    </div>
  );
}
