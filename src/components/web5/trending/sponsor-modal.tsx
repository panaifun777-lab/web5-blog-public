'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/trending/sponsor-modal.tsx
// Trending 商业热搜赞助投放弹窗 (30 USDC / 天，WBOG 8 折特惠)
// ════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, TrendingUp, Coins, ExternalLink, CheckCircle2, Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PUBLIC_MONEY_FLOWS_ENABLED, PUBLIC_DEMO_NOTICE, PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE } from '@/lib/launch/public';

interface SponsorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SponsorModal({ open, onOpenChange, onSuccess }: SponsorModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('https://');
  const [days, setDays] = useState('1');
  const [token, setToken] = useState<'USDC' | 'WBOG'>('WBOG');
  const [submitting, setSubmitting] = useState(false);
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  const dayNum = parseInt(days) || 1;
  const priceUsdc = token === 'WBOG' ? dayNum * 24.0 : dayNum * 30.0;
  const wbogAmount = dayNum * 300000;

  const handleSubmit = async () => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) {
      alert(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
      return;
    }
    if (!title.trim() || !targetUrl.trim()) {
      alert(isEn ? 'Please provide title and target URL.' : '请填写赞助标题与跳转链接。');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/commerce/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          targetUrl,
          days: dayNum,
          paymentToken: token,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(isEn 
          ? `🎉 Sponsored Ad placed successfully! Active on Trending top for ${dayNum} days.`
          : `🎉 商业热搜投放成功！已置顶展示在全网 Trending 榜首，有效期 ${dayNum} 天。`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        alert(data.error || '投放失败');
      }
    } catch (err: any) {
      alert('网络错误: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0f] border border-[#FFCC00]/40 text-white max-w-md p-6 shadow-2xl backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-[#FFCC00]/20 text-[#FFCC00] border-[#FFCC00]/30 text-[10px] py-0.5">
              B2B 商业流量引擎
            </Badge>
            <span className="text-xs text-[#888] font-mono">TOP #1 置顶曝光</span>
          </div>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-[#FFCC00]" />
            {isEn ? 'Sponsor Trending Top Spot' : '投放 Trending 商业热搜榜首'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#aaa] leading-relaxed">
            {isEn
              ? 'Promote your Web3 thesis, protocol, or project at the top of Trending across Web5.blog.'
              : '向全平台 Web3 极客与分身矩阵置顶展示你的项目研报、生态协议或独家产品。'}
          </DialogDescription>
        </DialogHeader>

        {!PUBLIC_MONEY_FLOWS_ENABLED && (
          <div className="rounded-lg border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-3 py-2 text-[11px] text-[#FFE58A]">
            <b>{PUBLIC_DEMO_NOTICE}</b>。支付验证与人工审核尚未上线，当前不接受赞助投放。
          </div>
        )}
        <div className="space-y-3.5 my-2">
          <div>
            <label className="text-[11px] text-[#888] font-mono block mb-1">
              {isEn ? 'Sponsored Title (Max 60 chars):' : '赞助标题 (限 60 字):'}
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isEn ? "e.g. Circle ARC Mainnet DeFi Protocol Live" : "例如：Circle ARC 跨链 DEX 正式上线公测"}
              className="bg-black/40 border-white/[0.1] text-xs h-9"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#888] font-mono block mb-1">
              {isEn ? 'Short Pitch (Max 120 chars):' : '一句话亮点介绍 (限 120 字):'}
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={isEn ? "Brief description shown to visitors..." : "向访客展示的简短亮点介绍..."}
              className="bg-black/40 border-white/[0.1] text-xs min-h-[60px]"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#888] font-mono block mb-1">
              {isEn ? 'Destination URL (Click target):' : '点击跳转链接 (官网/文章/推特):'}
            </label>
            <Input
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              className="bg-black/40 border-white/[0.1] text-xs h-9 font-mono text-[#00FFCC]"
            />
          </div>

          {/* 投放天数与支付方式 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#888] font-mono block mb-1">
                {isEn ? 'Duration:' : '投放天数:'}
              </label>
              <div className="flex gap-1">
                {['1', '3', '7'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`flex-1 py-1 rounded text-xs font-mono transition-all ${
                      days === d
                        ? 'bg-[#FFCC00] text-black font-bold shadow'
                        : 'bg-white/[0.04] text-[#888] hover:text-white'
                    }`}
                  >
                    {d}天
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#888] font-mono block mb-1">
                {isEn ? 'Currency:' : '支付币种:'}
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setToken('WBOG')}
                  className={`flex-1 py-1 rounded text-xs font-mono transition-all ${
                    token === 'WBOG'
                      ? 'bg-[#00FFCC] text-black font-bold shadow'
                      : 'bg-white/[0.04] text-[#888] hover:text-white'
                  }`}
                >
                  $WBOG (8折)
                </button>
                <button
                  type="button"
                  onClick={() => setToken('USDC')}
                  className={`flex-1 py-1 rounded text-xs font-mono transition-all ${
                    token === 'USDC'
                      ? 'bg-white/[0.2] text-white font-bold'
                      : 'bg-white/[0.04] text-[#888] hover:text-white'
                  }`}
                >
                  USDC
                </button>
              </div>
            </div>
          </div>

          {/* 费用与分配承诺 */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
            <div>
              <div className="text-[11px] text-[#888]">{isEn ? 'Total Cost:' : '应付投放费用:'}</div>
              <div className="text-base font-black text-[#FFCC00] font-mono">
                {token === 'WBOG' ? `${wbogAmount.toLocaleString()} $WBOG` : `${priceUsdc.toFixed(2)} USDC`}
                {token === 'WBOG' && <span className="text-[10px] text-[#00FFCC] font-normal ml-1.5">(约 {priceUsdc.toFixed(1)}U 享8折)</span>}
              </div>
            </div>
            <div className="text-[9px] text-[#666] text-right font-mono max-w-[150px]">
              50% 运营出纳 + 50% 自动注入 Uniswap LP 锁定
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !PUBLIC_MONEY_FLOWS_ENABLED}
            title={PUBLIC_MONEY_FLOWS_ENABLED ? undefined : PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE}
            className="w-full bg-gradient-to-r from-[#FFCC00] to-[#FF66AA] text-black font-black text-xs h-10 shadow-lg shadow-[#FFCC00]/20 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            {submitting ? (isEn ? 'Processing Ad Placement...' : '正在广播上架广告...') : PUBLIC_MONEY_FLOWS_ENABLED ? (isEn ? `Pay & Publish Ad (${priceUsdc}U)` : `确认支付并置顶热搜 (${priceUsdc}U)`) : PUBLIC_DEMO_NOTICE}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
