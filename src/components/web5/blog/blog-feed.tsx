'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/blog/blog-feed.tsx
// 博客流组件 — 阅读 / 互动 / 评论 / 微支付
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Eye, MessageCircle, Coins, ExternalLink,
  FileText, Shield, Sparkles, Globe,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { fromTokenUnits } from '@/lib/web5/types';
import type { VesselSession } from '@/lib/web5/types';
import {
  extractFaqs, generateFaqSchema, generateArticleSchema,
  injectJsonLd, clearJsonLd,
  setPageMeta, restorePageMeta,
} from '@/lib/web5/seo';
import { TaskBoard } from '@/components/web5/commerce/task-board';
import { CrowdfundingPanel } from '@/components/web5/crowdfunding/crowdfunding-panel';
import { calculateResonanceScore } from '@/lib/web5/resonance/bb-engine';
import { CognitiveThread } from '@/components/web5/blog/cognitive-thread';
import { BlurUnlockSection } from '@/components/web5/pay/blur-unlock';
import { CurateShareButton } from '@/components/web5/share/curate-share-button';
import { getCognitiveCoreState } from '@/lib/web5/eidolon/cognitive-core';
import { Zap, Activity, Users, Bot } from 'lucide-react';
import { vesselWalletTransfer, getOrCreateVesselWallet, getVesselWalletBalance } from '@/lib/web5/vessel-wallet';

interface BlogPost {
  id: string;
  arweaveHash: string;
  tokenId: string | null;
  title: string;
  excerpt: string;
  authorDid: string;
  authorName: string;
  authorAvatarSeed: string;
  authorBio: string;
  license: string;
  royaltyRate: number;
  arpVcId: string;
  publishedAt: string;
  stats: {
    reads: number;
    comments: number;
    tips: number;
    tipsAmount: string;
  };
}

interface BlogDetail extends BlogPost {
  bodyMd: string;
}

interface Interaction {
  id: string;
  type: string;
  amount: string | null;
  comment: string | null;
  createdAt: string;
  authorName: string;
  authorAvatarSeed: string;
}

export function BlogFeed({
  session,
  module: mod,
  searchQuery = '',
  targetHash,
  onClearTargetHash,
}: {
  session: VesselSession | null;
  module?: string;
  searchQuery?: string;
  targetHash?: string | null;
  onClearTargetHash?: () => void;
}) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{
    detail: BlogDetail;
    interactions: Interaction[];
  } | null>(null);
  const [comment, setComment] = useState('');
  const [tipAmount, setTipAmount] = useState('0.5');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';
  const [langFilter, setLangFilter] = useState<'ALL' | 'ZH' | 'EN'>('ALL');

  // 监听并持久化 URL 上的 ?ref= 策展人推荐参数
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref');
      if (urlRef) {
        sessionStorage.setItem('web5_curator_ref', urlRef);
      }
    }
  }, []);

  useEffect(() => {
    if (locale !== 'zh-CN') {
      setLangFilter('EN');
    } else {
      setLangFilter('ALL');
    }
  }, [locale]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/content/list?limit=20');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.contents || []);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  }, [mod]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // ── SEO: 动态 meta + 结构化数据 ──
  useEffect(() => {
    if (!selected) {
      clearJsonLd();
      restorePageMeta();
      return;
    }

    const { detail } = selected;

    // Article JSON-LD
    const articleJson = generateArticleSchema({
      headline: detail.title,
      description: detail.excerpt,
      authorName: detail.authorName,
      datePublished: detail.publishedAt,
    });
    injectJsonLd(articleJson);

    // FAQPage JSON-LD (if content has Q&A)
    const faqs = extractFaqs(detail.bodyMd);
    if (faqs.length > 0) {
      const faqJson = generateFaqSchema(faqs);
      if (faqJson) injectJsonLd(faqJson);
    }

    // Dynamic page meta
    setPageMeta({
      title: `${detail.title} | Web5.blog`,
      description: detail.excerpt,
      ogTitle: detail.title,
      ogDescription: detail.excerpt,
      ogUrl: typeof window !== 'undefined' ? window.location.href : 'https://web5.blog',
    });
  }, [selected]);

  // 客户端过滤：搜索词匹配 + 模块哈希归属
  const filteredPosts = posts.filter((p) => {
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchExcerpt = p.excerpt?.toLowerCase().includes(q);
      const matchAuthor = p.authorName?.toLowerCase().includes(q);
      if (!matchTitle && !matchExcerpt && !matchAuthor) return false;
    }

    if (mod && mod !== 'tech') {
      const sum = p.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const modules = ['tech', 'humanities', 'experts', 'bounties', 'crowdfunding'];
      const normalizedMod = mod === 'humanity' ? 'humanities' : (mod === 'piaoshu' || mod === 'experts') ? 'experts' : (mod === 'crowdsourcing' || mod === 'bounties' || mod === 'bounty') ? 'bounties' : (mod === 'crowd' || mod === 'crowdfunding') ? 'crowdfunding' : mod;
      const idx = sum % modules.length;
      if (modules[idx] !== normalizedMod) return false;
    }

    // 语言过滤
    if (langFilter === 'ZH') {
      const isZh = /[\u4e00-\u9fff]/.test(p.title);
      if (!isZh) return false;
    } else if (langFilter === 'EN') {
      const isZh = /[\u4e00-\u9fff]/.test(p.title);
      if (isZh) return false;
    }

    return true;
  });

  const openPostByHash = useCallback(async (hash: string) => {
    try {
      const res = await fetch(`/api/content/detail?hash=${hash}`);
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          const detail = {
            id: data.content.id,
            arweaveHash: data.content.arweaveHash,
            tokenId: data.content.tokenId,
            title: data.content.title,
            excerpt: data.content.excerpt,
            bodyMd: data.content.bodyMd,
            authorDid: data.content.authorDid,
            authorName: data.content.authorName,
            authorAvatarSeed: data.content.authorAvatarSeed,
            authorBio: data.content.authorBio,
            license: data.content.license,
            royaltyRate: data.content.royaltyRate,
            arpVcId: data.content.arpVcId,
            publishedAt: data.content.publishedAt,
            stats: { reads: 0, comments: 0, tips: 0, tipsAmount: '0' },
          };
          setSelected({
            detail,
            interactions: data.interactions || [],
          });
        }
      }
    } catch (err) {
      console.error('Failed to load post by hash:', err);
    }
  }, []);

  // 支持 URL 参数 ?post=... 或 prop targetHash 自动打开文章，以及浏览器前进/后退 popstate
  useEffect(() => {
    if (targetHash) {
      openPostByHash(targetHash);
    } else if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('post');
      const path = window.location.pathname;
      if (p) {
        openPostByHash(p);
      } else if (path.startsWith('/p/')) {
        const hash = path.replace('/p/', '').trim();
        if (hash) openPostByHash(hash);
      }
    }

    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      const p = new URLSearchParams(window.location.search).get('post');
      if (p) {
        openPostByHash(p);
      } else if (path.startsWith('/p/')) {
        const hash = path.replace('/p/', '').trim();
        if (hash) openPostByHash(hash);
      } else {
        setSelected(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [targetHash, openPostByHash]);

  const openPost = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/content/detail?hash=${post.arweaveHash}`);
      if (res.ok) {
        const data = await res.json();
        setSelected({
          detail: { ...post, bodyMd: data.content.bodyMd },
          interactions: data.interactions || [],
        });

        // ━━ SPA 独立路由更新：使浏览器地址栏对齐独立永久 URL (保留 ref 参数) ━━
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const currentRef = urlParams.get('ref') || sessionStorage.getItem('web5_curator_ref');
          const targetUrl = currentRef ? `/p/${post.arweaveHash}?ref=${encodeURIComponent(currentRef)}` : `/p/${post.arweaveHash}`;
          window.history.pushState({ postHash: post.arweaveHash }, '', targetUrl);
        }

        // 记录 READ 交互
        if (session?.permissions.includes('read')) {
          fetch('/api/ap2/pay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.sessionToken ? { Authorization: `Bearer ${session.sessionToken}` } : {}),
            },
            body: JSON.stringify({
              to: post.authorDid,
              amount: '0',
              category: 'read',
              ref: post.arweaveHash,
            }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to load detail:', err);
    }
  };

  const submitTip = async (post: BlogPost) => {
    if (!session) {
      setMessage('请先唤醒容器');
      return;
    }
    if (session.accessMode === 'observer') {
      setMessage('Observer Mode 无法微支付。请唤醒容器以解锁。');
      return;
    }
    setSubmitting(true);
    try {
      // ━━ 用网站专用钱包（Vessel 零钱包）签名转账，免主钱包弹窗 ━━
      const treasury = '0xCA36335845E382129167fC44243F07A76827bA22';
      const vessel = getOrCreateVesselWallet();

      // 检查专用钱包余额是否足够（含 gas）
      const balance = await getVesselWalletBalance(vessel.address);
      const need = parseFloat(tipAmount) + 0.001;
      if (balance < need) {
        setMessage(`⚠️ 专用钱包余额不足（${balance.toFixed(3)} USDC），请先充值后再打赏`);
        setTimeout(() => setMessage(null), 5000);
        setSubmitting(false);
        return;
      }

      const txHash = await vesselWalletTransfer(treasury, tipAmount);

      // ━━ 提取策展推荐人 ref (优先 URL 参数，其次 sessionStorage) ━━
      let curatorRef: string | null = null;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        curatorRef = urlParams.get('ref') || sessionStorage.getItem('web5_curator_ref') || null;
      }

      // ━━ 后端验证链上交易并 80/20 分润记账（支持 15% 策展返佣） ━━
      const res = await fetch('/api/ap2/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.sessionToken ? { Authorization: `Bearer ${session.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          txHash,
          toDid: post.authorDid,
          amountUsdc: tipAmount,
          fromAddress: vessel.address,
          ref: curatorRef,
          contentHash: post.arweaveHash,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const rebateMsg = data.split?.curatorAmountUsdc
          ? ` · 策展返佣 ${data.split.curatorAmountUsdc} USDC (15%)`
          : '';
        setMessage(`✅ 专用钱包已打赏 ${tipAmount} USDC！作者实得 ${data.split?.authorAmountUsdc} USDC · 平台抽成 ${data.split?.protocolFeeUsdc} USDC${rebateMsg}`);
        setTimeout(() => setMessage(null), 6000);
      } else {
        setMessage(`✗ ${data.error || '结算验证失败'}`);
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (err: any) {
      console.error('[Tip] Vessel wallet transfer failed:', err);
      setMessage('打赏失败：' + (err?.message?.slice(0, 80) || '请先给专用钱包充值 USDC'));
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!selected || !comment.trim()) return;
    if (!session || session.accessMode === 'observer') {
      setMessage('请先唤醒容器以评论');
      return;
    }
    setSubmitting(true);
    try {
      // 通过 AP2 提交评论（amount=0）
      const res = await fetch('/api/ap2/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.sessionToken ? { Authorization: `Bearer ${session.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          to: selected.detail.authorDid,
          amount: '0',
          category: 'tip',
          ref: selected.detail.arweaveHash,
        }),
      });
      // 直接写入 interaction
      const dbRes = await fetch('/api/content/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arweaveHash: selected.detail.arweaveHash,
          comment,
          vesselDid: session.vesselDid,
        }),
      });
      if (dbRes.ok) {
        setComment('');
        setMessage('✓ 评论已发布');
        setTimeout(() => setMessage(null), 3000);
        // 重新加载互动
        openPost(selected.detail);
      }
    } catch (err) {
      setMessage('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ━━ 详情视图 ━━
  if (selected) {
    const { detail, interactions } = selected;
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            setSelected(null);
            onClearTargetHash?.();
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/?tab=feed');
            }
          }}
          className="cyber-mono text-[#00FFCC] hover:text-[#00FFCC]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> {isEn ? 'BACK TO FEED' : '返回博文列表'}
        </Button>

        <Card className="cyber-panel">
          <CardContent className="p-6">
            {/* 作者信息 */}
            <div className="flex items-center gap-4 mb-6">
              <ParticleAvatar size={56} seed={detail.authorAvatarSeed} phase="dashboard" />
              <div className="flex-1">
                <div className="font-bold text-lg">{detail.authorName}</div>
                <div className="text-xs text-[#999] cyber-mono">{detail.authorDid.slice(0, 30)}...</div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="cyber-border-cyan text-[#00FFCC] cyber-mono">
                  {detail.license}
                </Badge>
                <div className="text-xs text-[#666] mt-1">
                  {(detail.royaltyRate / 100).toFixed(2)}% 版税
                </div>
              </div>
            </div>

            {/* 标题 */}
            <h1 className="text-3xl font-bold mb-2 cyber-text-glow-cyan">
              {detail.title}
            </h1>

            {/* 实时生命体状态指示器 (Presence Indicators) */}
            {(() => {
              const core = getCognitiveCoreState(detail.authorDid);
              return (
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#888] mb-3 pb-2 border-b border-white/[0.04]">
                  <span className="flex items-center gap-1.5 text-[#00FFCC]">
                    <span className="w-2 h-2 rounded-full bg-[#00FFCC] animate-ping" />
                    <span className="font-bold">实时生命体在线</span>
                  </span>
                  <span className="text-[#555]">·</span>
                  <span className="flex items-center gap-1 text-white">
                    <Users className="w-3.5 h-3.5 text-[#FFCC00]" /> {core.presenceHumans} 位人类访客
                  </span>
                  <span className="text-[#555]">·</span>
                  <span className="flex items-center gap-1 text-[#00FFCC]">
                    <Bot className="w-3.5 h-3.5 text-[#00FFCC]" /> {core.presenceAgents} 个数字分身正在协同解析
                  </span>
                </div>
              );
            })()}

            {/* BB-Protocol 认知共鸣指示器 (RFC 001) */}
            {(() => {
              const res = calculateResonanceScore(detail.id, detail.authorDid, detail.bodyMd.length);
              return (
                <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#00FFCC]/10 via-[#0066FF]/10 to-transparent border border-[#00FFCC]/20 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00FFCC]/20 flex items-center justify-center text-[#00FFCC]">
                      <Activity className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>BB-Protocol 认知共鸣度</span>
                        <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] text-[10px] h-4 py-0 border-none">
                          {res.score} / 100 ({res.label})
                        </Badge>
                      </div>
                      <div className="text-[10px] text-[#888] font-mono mt-0.5">
                        谐波频率: {res.harmonicFreq} · $WBOG 打赏权重加成 +{res.weightBoostPercent}%
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {res.semanticTags.map(tag => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] text-[#aaa] font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="cyber-mono text-xs text-[#666] mb-6">
              {new Date(detail.publishedAt).toLocaleString('zh-CN')} · Arweave: {detail.arweaveHash.slice(0, 16)}... · NFT #{detail.tokenId} · ARP: {detail.arpVcId?.slice(0, 20)}...
            </div>

            {/* 正文 */}
            <article className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-[#ddd] bg-transparent border-none p-0">
                {detail.bodyMd}
              </pre>
            </article>

            {/* HTTP 402 无感微支付渐进解锁区域 (Blur-to-Clear) */}
            <BlurUnlockSection
              contentId={detail.id}
              priceUsdc="0.05"
              sectionTitle="【高维认知】分身私有推演数据集与完整架构提示词"
              previewText="本章节包含基于 Circle ARC Mainnet (5042) 的真实智能账户出纳参数、TDPO 认知防御规则集及高维共鸣向量模型..."
              fullContent={`=== Web5 Cognitive Shard [CONFIDENTIAL] ===\n\n1. VESSEL_SMART_ACCOUNT: 0x${detail.authorDid.slice(-40)}\n2. ARC_ESCROW_CONTRACT: 0xe0d246c09d7a3097bab3148f89201157dd531eea\n3. PROMPT_WEIGHTS: {"scholar": 0.85, "philosopher": 0.95, "capitalist": 0.90}\n4. ZK_DELEGATION_PROOF: 0x4f8a...c09d [VERIFIED]\n\n已通过预授权 Session Allowance 完成 0.05 USDC (或 500 $WBOG) 极速结算，其中 50% 已自动回购销毁！`}
            />

            {/* 互动栏 */}
            <div className="mt-8 pt-6 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-[#999]">
                  <Eye className="w-4 h-4" /> {detail.stats.reads}
                </div>
                <div className="flex items-center gap-2 text-[#999]">
                  <MessageCircle className="w-4 h-4" /> {detail.stats.comments}
                </div>
                <div className="flex items-center gap-2 text-[#FFCC00]">
                  <Coins className="w-4 h-4" /> {fromTokenUnits(BigInt(detail.stats.tipsAmount))} USDC
                </div>
                <a
                  href={`https://gateway.irys.xyz/${detail.arweaveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto cyber-mono text-xs text-[#00FFCC] hover:underline flex items-center gap-1 font-bold"
                  title="在全球分布式存储网关公开查验原始 JSON 与签名"
                >
                  VIEW ON ARWEAVE / IRYS <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* ━━ 微支付打赏区域 (80% 归创作者，20% 协议分润: 50% 运营出纳 + 50% LP 锁定) ━━ */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#FFCC00]" />
                    <span className="text-xs font-bold text-white">AP2 去中心化创作者打赏 (Tip Author)</span>
                    <Badge className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 text-[9px]">
                      作者实得 80%
                    </Badge>
                  </div>
                  <span className="text-[10px] text-[#888] font-mono">
                    20% 协议分润: 50% 运营出纳 + 50% 自动注入 Uniswap LP
                  </span>
                </div>

                {/* 5 档快捷筹码按钮组 */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { u: '0.1', label: '🪙 0.1U / 1K WBOG' },
                    { u: '0.5', label: '☕ 0.5U / 5K WBOG', recommend: true },
                    { u: '1.0', label: '🔥 1.0U / 10K WBOG' },
                    { u: '3.0', label: '🚀 3.0U / 30K WBOG' },
                    { u: '5.0', label: '💎 5.0U / 50K WBOG' },
                  ].map((chip) => (
                    <button
                      key={chip.u}
                      type="button"
                      onClick={() => setTipAmount(chip.u)}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition-all text-center relative ${
                        tipAmount === chip.u
                          ? 'border-[#FFCC00] bg-[#FFCC00]/15 text-[#FFCC00] font-bold shadow-md shadow-[#FFCC00]/10'
                          : 'border-white/[0.06] bg-white/[0.01] text-[#888] hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      {chip.recommend && (
                        <span className="absolute -top-1.5 -right-1 bg-[#FFCC00] text-black text-[8px] font-bold px-1 rounded-full uppercase">
                          TOP
                        </span>
                      )}
                      <div>{chip.label}</div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 items-center pt-1">
                  <div className="relative flex-1 min-w-[140px] max-w-[180px]">
                    <Input
                      type="number"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      className="cyber-mono bg-[#0a0a0a] border-white/[0.1] text-xs h-9 pl-3 pr-12 text-[#FFCC00] font-bold"
                      step="0.1"
                      min="0.1"
                      max="100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#666]">
                      USDC
                    </span>
                  </div>
                  <Button
                    onClick={() => submitTip(detail)}
                    disabled={submitting}
                    className="bg-gradient-to-r from-[#FFCC00] to-[#FF66AA] text-black font-black text-xs h-9 px-4 hover:opacity-90 shadow-lg shadow-[#FFCC00]/20 flex-shrink-0"
                  >
                    <Coins className="w-4 h-4 mr-1" />
                    {submitting ? '打赏结算中...' : `立即打赏 ${tipAmount} USDC`}
                  </Button>
                  <CurateShareButton
                    arweaveHash={detail.arweaveHash}
                    title={detail.title}
                    excerpt={detail.excerpt}
                    session={session}
                    variant="outline"
                    className="flex-shrink-0"
                  />
                  <Button
                    onClick={() => {
                      const citeText = `> ${detail.title}\n> 作者: ${detail.authorName}\n> 来源: https://explorer.arc.io/token/${detail.tokenId || detail.arweaveHash}\n\n[Web5.blog — ${detail.title}](${window.location.origin}/?post=${detail.arweaveHash})`;
                      navigator.clipboard.writeText(citeText);
                      setMessage('✓ 引用链接已复制到剪贴板');
                    }}
                    variant="outline"
                    className="border-[#00FFCC]/30 text-[#00FFCC] text-xs h-9 px-3 flex-shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> CITE 引用
                  </Button>
                </div>
              </div>

              {/* 评论框 */}
              <div className="mb-4">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="发表评论..."
                  className="bg-[#0a0a0a] border-[#1a1a1a] min-h-[80px]"
                />
                <Button
                  onClick={submitComment}
                  disabled={submitting || !comment.trim()}
                  className="cyber-btn mt-2"
                >
                  <MessageCircle className="w-4 h-4 mr-1" /> COMMENT
                </Button>
              </div>

              {message && (
                <div className="cyber-panel text-sm p-3 cyber-mono">
                  {message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AA2P 认知树与分身辩论演武场 */}
        <CognitiveThread
          postTitle={detail.title}
          authorName={detail.authorName}
          authorDid={detail.authorDid}
          comments={interactions.map(i => ({
            id: i.id,
            isAgent: i.type === 'COMMENT' && i.comment?.includes('分身') || false,
            authorName: i.authorName || '访客',
            authorDid: detail.authorDid,
            roleTag: i.type === 'TIP' ? '微支付打赏者' : '认知参与者',
            content: i.comment || `进行了 ${i.type} 交互`,
            timestamp: new Date(i.createdAt).toLocaleTimeString(),
            resonanceScore: 92,
          }))}
        />
      </div>
    );
  }

  // ━━ 列表视图 ━━
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold cyber-text-glow-cyan">
            {isEn ? 'Permaweb Blog Stream' : '博客流'}
          </h2>
          <p className="text-xs text-[#888] mt-0.5">
            {isEn ? 'Decentralized essays permanently anchored to Arweave & Circle ARC.' : '去中心化思想母体，Arweave 永久存证与 Circle ARC 原生结算。'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 语言过滤筛选胶囊 */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Globe className="w-3.5 h-3.5 text-[#00FFCC] ml-1.5 mr-0.5" />
            {[
              { id: 'ALL', label: isEn ? 'All' : '全部' },
              { id: 'ZH', label: '🇨🇳 中文' },
              { id: 'EN', label: '🇬🇧 EN' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setLangFilter(item.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  langFilter === item.id
                    ? 'bg-white/[0.12] text-white font-bold border border-white/[0.15] shadow-sm'
                    : 'text-[#666] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button onClick={loadPosts} variant="ghost" size="sm" className="cyber-mono text-xs border border-white/[0.06] bg-white/[0.02]">
            {isEn ? 'Refresh' : '刷新'}
          </Button>
        </div>
      </div>

      {/* 悬赏模块的 TaskBoard 由页面层统一渲染，避免重复挂载 */}
      {mod === 'crowdsourcing' && (
        <TaskBoard />
      )}
      {mod === 'crowdfunding' && (
        <CrowdfundingPanel session={session} />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cyber-loading-bar h-32 rounded" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="cyber-panel text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <div className="cyber-mono text-[#666]">{isEn ? 'No Articles in this category' : '暂无内容'}</div>
          <div className="text-xs text-[#999] mt-2">
            {isEn ? 'Click "Write" tab to publish your first Web5 blog post' : '点击"写作"标签发布你的第一篇 Web5 博客'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <Card
              key={post.id}
              className="cyber-panel hover:scale-[1.005] transition-transform cursor-pointer"
              onClick={() => openPost(post)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <ParticleAvatar size={40} seed={post.authorAvatarSeed} phase="dashboard" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{post.authorName}</span>
                      <Badge variant="outline" className="cyber-mono text-[10px] py-0 h-4 border-[#FFCC00]/30 text-[#FFCC00]">
                        {post.license}
                      </Badge>
                    </div>
                    <div className="cyber-mono text-[10px] text-[#666]">
                      {new Date(post.publishedAt).toLocaleDateString(isEn ? 'en-US' : 'zh-CN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="cyber-mono text-[10px] text-[#0066FF]">
                      NFT #{post.tokenId?.slice(0, 8)}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-2 hover:text-[#00FFCC] transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-[#999] line-clamp-2 mb-3">
                  {post.excerpt}
                </p>

                {/* BB-Protocol 列表级共鸣胶囊 */}
                <div className="mb-3 flex items-center gap-2 text-[10px] font-mono">
                  {(() => {
                    const r = calculateResonanceScore(post.id, post.authorDid, post.excerpt?.length || 100);
                    return (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/20">
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>{isEn ? 'Resonance' : '共鸣'} {r.score}% ({r.label.split(' ')[0]})</span>
                      </span>
                    );
                  })()}
                  <span className="text-[#555]">·</span>
                  <span className="text-[#888]">{isEn ? 'AA2P Verified' : 'AA2P 验证通过'}</span>
                </div>

                <div className="flex items-center justify-between text-xs cyber-mono text-[#666]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {post.stats.reads}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.stats.comments}
                    </span>
                    <span className="flex items-center gap-1 text-[#FFCC00]">
                      <Coins className="w-3 h-3" /> {fromTokenUnits(BigInt(post.stats.tipsAmount))} USDC
                    </span>
                  </div>
                  <CurateShareButton
                    arweaveHash={post.arweaveHash}
                    title={post.title}
                    excerpt={post.excerpt}
                    session={session}
                    size="sm"
                    variant="ghost"
                    className="text-[11px] h-7 px-2 border border-white/[0.06] hover:border-[#00FFCC]/40"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
