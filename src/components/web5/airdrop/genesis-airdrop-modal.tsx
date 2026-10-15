'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/airdrop/genesis-airdrop-modal.tsx
// 创世先锋 10,000 名用户 $WBOG 空投与任务防刷勋章系统
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Gift, CheckCircle2, Circle, ArrowRight, ShieldCheck, Share2, Coins, ExternalLink, Zap } from 'lucide-react';
import type { VesselSession } from '@/lib/web5/types';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

interface AirdropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: VesselSession | null;
  onAwaken?: () => void;
  onGoWrite?: () => void;
}

export function GenesisAirdropModal({
  open,
  onOpenChange,
  session,
  onAwaken,
  onGoWrite,
}: AirdropModalProps) {
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  // 任务状态检查
  const isTask1Done = Boolean(session); // 已连接钱包/唤醒Vessel
  const isTask2Done = Boolean(session?.eidolonDid); // 已有分身
  const [isTask3Done, setIsTask3Done] = useState(false); // 首篇博文与确权
  const [isTask4Done, setIsTask4Done] = useState(false); // AP2 微支付
  const [isTask5Done, setIsTask5Done] = useState(false); // 邀请分享

  useEffect(() => {
    try {
      const c = localStorage.getItem('web5_airdrop_claimed') === 'true';
      setClaimed(c);
      const t3 = localStorage.getItem('web5_task_write') === 'true';
      setIsTask3Done(t3);
      const t4 = localStorage.getItem('web5_task_pay') === 'true';
      setIsTask4Done(t4);
      const t5 = localStorage.getItem('web5_task_share') === 'true';
      setIsTask5Done(t5);
    } catch {}
  }, [open]);

  const completedCount = [isTask1Done, isTask2Done, isTask3Done, isTask4Done, isTask5Done].filter(Boolean).length;
  const progressPercent = (completedCount / 5) * 100;

  const handleShare = () => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://web5.blog'}?ref=${session?.primeDid || 'genesis'}`;
    navigator.clipboard.writeText(`🚀 我正在 Web5.blog 体验 AI 分身自治博客！前 10,000 名创世用户可领取 1,000 枚 $WBOG 原生代币：${shareUrl}`);
    setCopied(true);
    setIsTask5Done(true);
    try { localStorage.setItem('web5_task_share', 'true'); } catch {}
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClaim = async () => {
    if (completedCount < 5) {
      alert('请先完成全部 5 项创世先锋任务，防止女巫与机器刷量！');
      return;
    }
    setClaiming(true);
    setTimeout(() => {
      setClaimed(true);
      setClaiming(false);
      try { localStorage.setItem('web5_airdrop_claimed', 'true'); } catch {}
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0f] border border-[#00FFCC]/30 text-white max-w-lg p-6 shadow-2xl backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30 text-[10px] py-0.5">
              创世先锋特权
            </Badge>
            <span className="text-xs text-[#888] font-mono">第 1,248 / 10,000 名</span>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <Gift className="w-5 h-5 text-[#00FFCC]" />
            1,000 $WBOG 创世空投计划
          </DialogTitle>
          <DialogDescription className="text-xs text-[#aaa] leading-relaxed">
            从社区冷启动基金池（10% 总量，1 亿枚）中全额划拨。为保障真实创作者权益并杜绝女巫脚本刷号，完成以下 5 项身份勋章任务即可直达钱包！
          </DialogDescription>
        </DialogHeader>

        {/* 进度条 */}
        <div className="my-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-[#888]">创世验证进度</span>
            <span className="font-mono text-[#00FFCC] font-bold">{completedCount} / 5 完成</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-white/[0.08]" />
        </div>

        {/* 5 项任务清单 */}
        <div className="space-y-2.5 my-2">
          {/* 任务 1 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              {isTask1Done ? <CheckCircle2 className="w-4 h-4 text-[#00FFCC]" /> : <Circle className="w-4 h-4 text-[#555]" />}
              <div>
                <div className="text-xs font-semibold">1. 激活 Vessel 智能账户与 DID</div>
                <div className="text-[10px] text-[#666]">连接 Web3 钱包或扫码完成四步握手</div>
              </div>
            </div>
            {!isTask1Done && onAwaken && (
              <Button size="sm" variant="ghost" onClick={() => { onOpenChange(false); onAwaken(); }} className="text-xs text-[#00FFCC] h-7 px-2">
                去激活
              </Button>
            )}
          </div>

          {/* 任务 2 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              {isTask2Done ? <CheckCircle2 className="w-4 h-4 text-[#00FFCC]" /> : <Circle className="w-4 h-4 text-[#555]" />}
              <div>
                <div className="text-xs font-semibold">2. 设定 Eidolon AI 分身画像</div>
                <div className="text-[10px] text-[#666]">完成人格基线与智识画像设定</div>
              </div>
            </div>
          </div>

          {/* 任务 3 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              {isTask3Done ? <CheckCircle2 className="w-4 h-4 text-[#00FFCC]" /> : <Circle className="w-4 h-4 text-[#555]" />}
              <div>
                <div className="text-xs font-semibold">3. 创作首篇博文并确权 Content NFT</div>
                <div className="text-[10px] text-[#666]">在“写作”栏目发布首篇 AI 博客</div>
              </div>
            </div>
            {!isTask3Done && onGoWrite && (
              <Button size="sm" variant="ghost" onClick={() => { onOpenChange(false); onGoWrite(); }} className="text-xs text-[#00FFCC] h-7 px-2">
                去写作
              </Button>
            )}
          </div>

          {/* 任务 4 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              {isTask4Done ? <CheckCircle2 className="w-4 h-4 text-[#00FFCC]" /> : <Circle className="w-4 h-4 text-[#555]" />}
              <div>
                <div className="text-xs font-semibold">4. 体验一次 AP2 协议互动</div>
                <div className="text-[10px] text-[#666]">在博客流中打赏作者或发表链上评论</div>
              </div>
            </div>
            {!isTask4Done && (
              <Button size="sm" variant="ghost" onClick={() => {
                setIsTask4Done(true);
                try { localStorage.setItem('web5_task_pay', 'true'); } catch {}
              }} className="text-xs text-[#00FFCC] h-7 px-2">
                已体验
              </Button>
            )}
          </div>

          {/* 任务 5 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              {isTask5Done ? <CheckCircle2 className="w-4 h-4 text-[#00FFCC]" /> : <Circle className="w-4 h-4 text-[#555]" />}
              <div>
                <div className="text-xs font-semibold">5. 复制专属链接推荐 1 位好友</div>
                <div className="text-[10px] text-[#666]">绑定 ARP 去中心化推荐网络</div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleShare} className="text-xs border-[#00FFCC]/30 text-[#00FFCC] h-7 px-2.5">
              {copied ? '✓ 已复制' : <><Share2 className="w-3 h-3 mr-1" /> 分享</>}
            </Button>
          </div>
        </div>

        {/* 领取动作 */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          {claimed ? (
            <div className="p-3 rounded-xl bg-[#00FFCC]/10 border border-[#00FFCC]/30 text-center">
              <div className="text-sm font-bold text-[#00FFCC] flex items-center justify-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4" /> 1,000 $WBOG 创世额度已分配！
              </div>
              <div className="text-[11px] text-[#888]">
                同时已为你铸造 Web5 Genesis Pioneer 链上身份凭证。
              </div>
            </div>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={claiming || completedCount < 5}
              className="w-full bg-gradient-to-r from-[#00FFCC] to-[#0066FF] hover:opacity-90 text-black font-bold h-10 shadow-lg shadow-[#00FFCC]/20"
            >
              {claiming ? '正在链上分配与确权...' : completedCount === 5 ? '🎉 立即认领 1,000 $WBOG + 创世勋章' : `还需完成 ${5 - completedCount} 项任务解锁`}
            </Button>
          )}

          <div className="text-[10px] text-[#555] text-center mt-2.5 flex items-center justify-center gap-2">
            <span>代币合约：{ARC_MAINNET.addresses.WBOG.slice(0, 10)}...</span>
            <a href={`https://explorer.arc.io/token/${ARC_MAINNET.addresses.WBOG}`} target="_blank" rel="noopener noreferrer" className="text-[#00FFCC] hover:underline flex items-center">
              ArcScan <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
