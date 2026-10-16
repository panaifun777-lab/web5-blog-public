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
  FileText, Shield, Sparkles,
} from 'lucide-react';
import { fromTokenUnits } from '@/lib/web5/types';
import type { VesselSession } from '@/lib/web5/types';
import {
  extractFaqs, generateFaqSchema, generateArticleSchema,
  injectJsonLd, clearJsonLd,
  setPageMeta, restorePageMeta,
} from '@/lib/web5/seo';
import { TaskBoard } from '@/components/web5/commerce/task-board';

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
}: {
  session: VesselSession | null;
  module?: string;
  searchQuery?: string;
}) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{
    detail: BlogDetail;
    interactions: Interaction[];
  } | null>(null);
  const [comment, setComment] = useState('');
  const [tipAmount, setTipAmount] = useState('0.001');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      const modules = ['tech', 'humanities', 'crowdfunding', 'crowdsourcing', 'bounties', 'experts'];
      const normalizedMod = mod === 'humanity' ? 'humanities' : mod === 'piaoshu' ? 'experts' : mod;
      const idx = sum % modules.length;
      return modules[idx] === normalizedMod;
    }
    return true;
  });

  const openPost = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/content/detail?hash=${post.arweaveHash}`);
      if (res.ok) {
        const data = await res.json();
        setSelected({
          detail: { ...post, bodyMd: data.content.bodyMd },
          interactions: data.interactions || [],
        });
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
      const res = await fetch('/api/ap2/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.sessionToken ? { Authorization: `Bearer ${session.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          to: post.authorDid,
          amount: tipAmount,
          category: 'tip',
          ref: post.arweaveHash,
        }),
      });
      const data = await res.json();
      if (data.accepted) {
        setMessage(`✓ 微支付 ${tipAmount} USDC 已发送`);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`✗ BudgetFence 拦截：${data.reason}`);
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (err) {
      setMessage('微支付失败');
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
          onClick={() => setSelected(null)}
          className="cyber-mono text-[#00FFCC] hover:text-[#00FFCC]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> BACK TO FEED
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
            <div className="cyber-mono text-xs text-[#666] mb-6">
              {new Date(detail.publishedAt).toLocaleString('zh-CN')} · Arweave: {detail.arweaveHash.slice(0, 16)}... · NFT #{detail.tokenId} · ARP: {detail.arpVcId?.slice(0, 20)}...
            </div>

            {/* 正文 */}
            <article className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-[#ddd] bg-transparent border-none p-0">
                {detail.bodyMd}
              </pre>
            </article>

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
                  href={`https://arweave.net/${detail.arweaveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto cyber-mono text-xs text-[#0066FF] hover:underline flex items-center gap-1"
                >
                  VIEW ON ARWEAVE <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* 微支付 */}
              <div className="flex gap-2 items-center mb-4">
                <Input
                  type="number"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="cyber-mono w-32 bg-[#0a0a0a] border-[#1a1a1a]"
                  step="0.001"
                  min="0.001"
                  max="10"
                />
                <span className="cyber-mono text-sm text-[#999]">USDC</span>
                <Button
                  onClick={() => submitTip(detail)}
                  disabled={submitting}
                  className="cyber-btn-gold"
                >
                  <Coins className="w-4 h-4 mr-1" /> TIP AUTHOR
                </Button>
                {/* CITE 引用 */}
                <Button onClick={() => {
                  const citeText = `> ${detail.title}\n> 作者: ${detail.authorName}\n> 来源: https://explorer.arc.io/token/${detail.tokenId || detail.arweaveHash}\n\n[Web5.blog — ${detail.title}](${window.location.origin}/?post=${detail.arweaveHash})`;
                  navigator.clipboard.writeText(citeText);
                  setMessage('✓ 引用链接已复制到剪贴板');
                }} variant="outline" className="border-[#00FFCC]/30 text-[#00FFCC]">
                  <FileText className="w-4 h-4 mr-1" /> CITE
                </Button>
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

        {/* 互动历史 */}
        <Card className="cyber-panel">
          <CardHeader>
            <h3 className="cyber-mono cyber-text-glow-cyan flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> INTERACTIONS ({interactions.length})
            </h3>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {interactions.length === 0 ? (
              <div className="text-center text-[#666] py-8 cyber-mono text-sm">
                暂无互动记录
              </div>
            ) : (
              interactions.map((i) => (
                <div key={i.id} className="border border-[#1a1a1a] p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="cyber-mono text-xs text-[#00FFCC]">
                      [{i.type}]
                    </span>
                    <span className="cyber-mono text-xs text-[#666]">
                      {new Date(i.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  {i.comment && (
                    <div className="text-sm text-[#ddd] mt-1">{i.comment}</div>
                  )}
                  {i.amount && BigInt(i.amount) > 0n && (
                    <div className="text-xs text-[#FFCC00] mt-1">
                      +{fromTokenUnits(BigInt(i.amount))} USDC
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ━━ 列表视图 ━━
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold cyber-text-glow-cyan">博客流</h2>
        <Button onClick={loadPosts} variant="ghost" className="cyber-mono text-xs">
          刷新
        </Button>
      </div>

      {/* 专有模块快速操作卡 */}
      {(mod === 'crowdfunding' || mod === 'crowdsourcing' || mod === 'bounties') && (
        <TaskBoard />
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
          <div className="cyber-mono text-[#666]">暂无内容</div>
          <div className="text-xs text-[#999] mt-2">
            点击"写作"标签发布你的第一篇 Web5 博客
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
                      {new Date(post.publishedAt).toLocaleString('zh-CN')}
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

                <div className="flex items-center gap-4 text-xs cyber-mono text-[#666]">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
