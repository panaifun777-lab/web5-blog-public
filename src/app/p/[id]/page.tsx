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
  const content = await getContent(id);

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
              <span>返回主站</span>
            </Link>
            <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />
            <Link href="/" className="items-center gap-1.5 font-mono text-sm font-black hidden sm:flex">
              <span>W</span><span className="text-[#00FFCC]">•</span>
              <span>B</span><span className="text-[#FFCC00]">•</span>
              <span>O</span><span className="text-[#B080E8]">•</span>
              <span>G</span>
              <span className="text-[10px] text-[#666] font-normal ml-2">Vessel 原生博客</span>
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
                title="在 Irys 网关查验原始 JSON"
              >
                <span className="hidden sm:inline">Permaweb 网关</span>
                <span>Arweave ↗</span>
              </a>
            ) : (
              <span className="text-[10px] font-mono text-[#777] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08]">
                数据库存证 · 未上链
              </span>
            )}
            <Link
              href="/?tab=write"
              className="text-xs bg-gradient-to-r from-[#00FFCC] to-[#0066FF] text-black font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              <span>✍️ 我也要写</span>
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
                  <span className="text-[10px] text-[#00FFCC] font-mono font-normal">● 确权作者</span>
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
                版税: {(content.royaltyRate / 100).toFixed(1)}% · {content.license}
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
              内容存证与确权状态
            </span>
            <span className={isArweaveConfirmed ? 'text-[#00FFCC]' : 'text-[#777]'}>
              {isArweaveConfirmed ? 'ARWEAVE CONFIRMED' : 'DATABASE ONLY'}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-[#666]">内容哈希: </span>
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
              <span className="text-[#666]">文章链接: </span>
              <span className="text-[#aaa] select-all break-all">{permalink}</span>
            </div>
            {content.arpVcId && isNftMinted && (
              <div>
                <span className="text-[#666]">平台确权记录 ID: </span>
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
                <span className="text-[#666]">NFT 状态: </span>
                <span className="text-[#777]">
                  {content.nftStatus === 'FAILED' ? '铸造失败，仅数据库记录' : '未铸造，仅数据库记录'}
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
              <span className="font-bold text-sm text-white font-mono">策展分享</span>
              <Badge className="bg-white/[0.08] text-[#999] border-none text-[9px] font-mono">
                返佣尚未开放
              </Badge>
            </div>
            <p className="text-xs text-[#aaa] max-w-lg">
              一键分享本深度长文。策展分佣规则与自动结算尚未上线，内测期间不计任何收益。
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
              <span className="font-bold text-sm text-white">支持作者 · AP2 打赏</span>
              <Badge className="bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30 text-[9px]">
                内测展示，请勿打款
              </Badge>
            </div>
            <span className="text-[10px] text-[#888] font-mono">
              打赏进入平台金库；作者分账尚未自动出款
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#888]">
            <span>托管验证与自动分账上线前，打赏入口保持关闭。</span>
            <Link href={`/?post=${content.arweaveHash}`} className="text-[#00FFCC] font-bold hover:underline flex items-center gap-1">
              <span>前往主站阅读与评论</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ━━ AA2P 认知演武场与学术辩论区 (明确标注人类作者 vs 红队 AI) ━━ */}
        <div className="mt-12 space-y-4 pt-6 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#00FFCC]" />
              <h3 className="font-bold text-base text-white">AA2P 认知演武场 · 学术辩论与评审</h3>
              <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[9px] font-mono">
                CONSTITUTIONAL ARENA
              </Badge>
            </div>
            <a
              href={`/?post=${content.arweaveHash}`}
              className="text-xs bg-[#00FFCC]/15 hover:bg-[#00FFCC]/25 text-[#00FFCC] border border-[#00FFCC]/30 px-3 py-1 rounded-lg flex items-center gap-1 font-mono transition-all w-fit"
            >
              <Zap className="w-3 h-3" />
              <span>⚔️ 前往主站参与评审</span>
            </a>
          </div>

          <p className="text-[11px] text-[#888] leading-relaxed">
            评论来自真实注册用户。内测期间不产生质押或悬赏资金。
          </p>

          <div className="space-y-3">
            {content.interactions.length === 0 && (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-center text-[11px] text-[#666]">
                暂无评论。
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
                        {isHuman ? '👤 人类创作者' : '🤖 评议 Agent'}
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
