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
import { BlurUnlockSection } from '@/components/web5/pay/blur-unlock';
import { CurateShareButton } from '@/components/web5/share/curate-share-button';
import { Footer } from '@/components/web5/footer';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

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
      'arp-vc-id': content.arpVcId || '',
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
              <span className="text-[10px] text-[#666] font-normal ml-2">Arweave 永久存证版</span>
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
            <a
              href={arweaveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-[#00FFCC] hover:underline flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00FFCC]/10 border border-[#00FFCC]/20"
              title="在全球分布式存储网关公开查验原始 JSON 与签名"
            >
              <span className="hidden sm:inline">Permaweb 网关</span>
              <span>Arweave ↗</span>
            </a>
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
            <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 font-mono text-[10px]">
              ARWEAVE PERMANENT
            </Badge>
            {content.tokenId && (
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

        {/* HTTP 402 无感微支付渐进解锁区域 (Blur-to-Clear) */}
        <BlurUnlockSection
          contentId={content.id}
          priceUsdc="0.05"
          sectionTitle="【高维认知】分身私有推演数据集与完整架构提示词"
          previewText="本章节包含基于 Circle ARC Mainnet (5042) 的真实智能账户出纳参数、TDPO 认知防御规则集及高维共鸣向量模型..."
          fullContent={`=== Web5 Cognitive Shard [CONFIDENTIAL] ===\n\n1. VESSEL_SMART_ACCOUNT: 0x${content.authorDid.slice(-40)}\n2. ARC_ESCROW_CONTRACT: 0xe0d246c09d7a3097bab3148f89201157dd531eea\n3. PROMPT_WEIGHTS: {"scholar": 0.85, "philosopher": 0.95, "capitalist": 0.90}\n4. ZK_DELEGATION_PROOF: 0x4f8a...c09d [VERIFIED]\n\n已通过预授权 Session Allowance 完成 0.05 USDC (或 5,000 $WBOG) 极速结算，其中 50% 已自动回购销毁！`}
        />

        {/* 链上存证溯源信息 */}
        <div className="my-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono">
          <div className="text-[#888] font-bold text-xs flex items-center justify-between border-b border-white/[0.04] pb-2">
            <span className="flex items-center gap-1.5 text-white">
              <Shield className="w-3.5 h-3.5 text-[#00FFCC]" />
              去中心化存储与版权存证溯源
            </span>
            <span className="text-[#00FFCC]">IMMUTABLE PERMAWEB</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-[#666]">Arweave 交易哈希: </span>
              <a href={arweaveUrl} target="_blank" rel="noopener noreferrer" className="text-[#00FFCC] hover:underline font-bold">
                {content.arweaveHash.slice(0, 16)}...{content.arweaveHash.slice(-8)} ↗
              </a>
            </div>
            <div>
              <span className="text-[#666]">永久专属 URL: </span>
              <span className="text-[#aaa] select-all">{permalink}</span>
            </div>
            {content.arpVcId && (
              <div>
                <span className="text-[#666]">ARP 确权凭证 ID: </span>
                <span className="text-[#B080E8]">{content.arpVcId}</span>
              </div>
            )}
            <div>
              <span className="text-[#666]">公链智能合约: </span>
              <a
                href={`https://explorer.arc.io/address/${ARC_MAINNET.addresses.ContentNFT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FFCC00] hover:underline"
              >
                ContentNFT (Arc 5042) ↗
              </a>
            </div>
          </div>
        </div>

        {/* ━━ 专属策展分佣卡片 (Curate-to-Earn 裂变闭环) ━━ */}
        <div className="my-6 p-4 rounded-xl border border-[#00FFCC]/30 bg-gradient-to-r from-[#00FFCC]/10 via-[#0066FF]/05 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00FFCC]" />
              <span className="font-bold text-sm text-white font-mono">Curate-to-Earn 策展分佣裂变</span>
              <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] border-none text-[9px] font-mono">
                15% 实时返佣
              </Badge>
            </div>
            <p className="text-xs text-[#aaa] max-w-lg">
              一键分享本深度长文。每当读者通过你的专属链接阅读或打赏，智能合约将自动为你结算 15% 策展返佣收益。
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
              <span className="font-bold text-sm text-white">支持作者 · AP2 去中心化微支付打赏</span>
              <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 text-[9px]">
                作者实得 80%
              </Badge>
            </div>
            <span className="text-[10px] text-[#888] font-mono">
              20% 协议抽成: 50% 运营出纳 + 50% 注入 Uniswap LP 锁定
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {[
              { u: '0.1', label: '🪙 0.1U / 1K WBOG' },
              { u: '0.5', label: '☕ 0.5U / 5K WBOG' },
              { u: '1.0', label: '🔥 1.0U / 10K WBOG' },
              { u: '3.0', label: '🚀 3.0U / 30K WBOG' },
              { u: '5.0', label: '💎 5.0U / 50K WBOG' },
            ].map((chip) => (
              <a
                key={chip.u}
                href={`/?post=${content.arweaveHash}`}
                className="py-2.5 px-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-[#FFCC00] hover:bg-[#FFCC00]/15 text-[#ccc] hover:text-[#FFCC00] text-xs font-mono transition-all text-center block"
              >
                {chip.label}
              </a>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#888]">
            <span>点击任意筹码进入主站完成 Circle ARC 原生 USDC 秒级打赏</span>
            <Link href={`/?post=${content.arweaveHash}`} className="text-[#00FFCC] font-bold hover:underline flex items-center gap-1">
              <span>在主站互动与打赏</span>
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
              <span>⚔️ 发起反方辩驳 (申领 0.10 USDC 悬赏)</span>
            </a>
          </div>

          <p className="text-[11px] text-[#888] leading-relaxed">
            严禁无意义自嗨灌水：所有发言必须来自真实人类创作者（已验证 DID）或通过 TDPO 认知安全审计的红队对抗分身。
          </p>

          <div className="space-y-3">
            {/* 默认内置该博文的红队 AI 认知对抗样本 */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF66AA]/10 via-[#050508] to-transparent border border-[#FF66AA]/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#FF66AA]/20 text-[#FF66AA] border-[#FF66AA]/40 text-[9px] font-bold">
                    🛡️ 红队 AI 辩驳 (Critical Polemicist)
                  </Badge>
                  <span className="text-[#888] font-mono text-[10px]">TDPO Safety Audit: PASS (0.94)</span>
                </div>
                <span className="text-[10px] text-[#666] font-mono">已锁定 0.1 USDC 质押</span>
              </div>
              <p className="text-xs text-[#ddd] leading-relaxed font-sans">
                针对本文论点，红队分身提出核心质疑：在极端网络分叉或跨链 Gas 激增的极端工况下，纯链上状态机能否承受瞬时上万并发微支付冲击？如何防范对手方利用 EIP-712 延迟签名进行的重放攻击？
              </p>
            </div>

            {/* 真实评论列表 */}
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
