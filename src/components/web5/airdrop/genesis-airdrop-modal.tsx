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
import { PUBLIC_AIRDROP_ENABLED, PUBLIC_DEMO_NOTICE } from '@/lib/launch/public';

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
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 任务状态检查
  const isTask1Done = Boolean(session); // 已连接钱包/唤醒Vessel
  const [isTask2Done, setIsTask2Done] = useState(false); // 设定 Eidolon AI 分身画像
  const [isTask3Done, setIsTask3Done] = useState(false); // 首篇博文与确权
  const [isTask4Done, setIsTask4Done] = useState(false); // AP2 微支付
  const [isTask5Done, setIsTask5Done] = useState(false); // 邀请分享

  useEffect(() => {
    try {
      const c = localStorage.getItem('web5_airdrop_claimed') === 'true';
      setClaimed(c);
      const savedTx = localStorage.getItem('web5_airdrop_txhash');
      if (savedTx) setClaimTxHash(savedTx);
      const t2 = localStorage.getItem('web5_task_persona') === 'true' || Boolean(session?.eidolonDid);
      setIsTask2Done(t2);
      const t3 = localStorage.getItem('web5_task_write') === 'true';
      setIsTask3Done(t3);
      const t4 = localStorage.getItem('web5_task_pay') === 'true';
      setIsTask4Done(t4);
      const t5 = localStorage.getItem('web5_task_share') === 'true';
      setIsTask5Done(t5);
    } catch {}
  }, [open, session]);

  const completedCount = [isTask1Done, isTask2Done, isTask3Done, isTask4Done, isTask5Done].filter(Boolean).length;
  const progressPercent = (completedCount / 5) * 100;

  const handleShare = () => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://web5.blog'}?ref=${session?.primeDid || 'genesis'}`;
    navigator.clipboard.writeText(`🚀 Web5.blog 创世空投方案预告，领取尚未开放；额度与名额以官方公告为准。欢迎一起体验 AI 分身自治博客：${shareUrl}`);
    setCopied(true);
    setIsTask5Done(true);
    try { localStorage.setItem('web5_task_share', 'true'); } catch {}
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClaim = async () => {
    if (!PUBLIC_AIRDROP_ENABLED) {
      alert('空投尚未开放：领取与链上划拨流程未上线，请勿提供钱包或转账。');
      return;
    }
    if (completedCount < 5) {
      alert('请先完成全部 5 项创世先锋任务，防止女巫与机器刷量！');
      return;
    }
    setClaiming(true);
    try {
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: session?.primeDid?.replace('did:plvtvs:', ''),
          primeDid: session?.primeDid,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimed(true);
        if (data.txHash) {
          setClaimTxHash(data.txHash);
          try { localStorage.setItem('web5_airdrop_txhash', data.txHash); } catch {}
        }
        try { localStorage.setItem('web5_airdrop_claimed', 'true'); } catch {}
      } else {
        alert(data.error || '认领失败，请重试');
      }
    } catch (err: any) {
      alert('网络请求异常: ' + err.message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0f] border border-[#00FFCC]/30 text-white max-w-lg p-6 shadow-2xl backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30 text-[10px] py-0.5">
              创世先锋特权
            </Badge>
            <span className="text-xs text-[#888] font-mono">名额与资格以实际登记为准</span>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <Gift className="w-5 h-5 text-[#00FFCC]" />
            创世空投计划 · 方案预告
          </DialogTitle>
          <DialogDescription className="text-xs text-[#aaa] leading-relaxed">
            拟从社区冷启动基金池（10% 总量）中划拨 $WBOG 用于创世回馈。方案仍处预告阶段，领取与链上划拨尚未开放；完成以下 5 项身份勋章任务仅作流程演示，不代表已获得代币。
          </DialogDescription>
        </DialogHeader>

        {!PUBLIC_AIRDROP_ENABLED && (
          <div className="rounded-lg border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-3 py-2 text-[11px] text-[#FFE58A]">
            <b>{PUBLIC_DEMO_NOTICE}</b>。空投领取与链上划拨尚未上线，任务清单仅作流程展示。
          </div>
        )}

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
                <div className="text-[10px] text-[#666]">完成五维认知基线与行为宪章设定</div>
              </div>
            </div>
            {!isTask2Done && (
              <Button size="sm" variant="ghost" onClick={() => { onOpenChange(false); window.location.href = '/?tab=vessels'; }} className="text-xs text-[#00FFCC] h-7 px-2">
                去设定
              </Button>
            )}
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
            <div className="p-4 rounded-xl bg-[#00FFCC]/10 border border-[#00FFCC]/30 text-center space-y-2">
              <div className="text-sm font-bold text-[#00FFCC] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-5 h-5" /> {PUBLIC_AIRDROP_ENABLED ? '1,000 $WBOG 空投已到账' : '空投尚未开放'}
              </div>
              <div className="text-[11px] text-[#aaa]">
                {PUBLIC_AIRDROP_ENABLED
                  ? `代币已从创世金库划拨至你的钱包 (${session?.primeDid?.slice(0, 20)}...)`
                  : '本机记录的“已领取”状态不代表真实到账，请以链上交易为准。'}
              </div>
              {claimTxHash && (
                <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-center gap-1 text-[11px] font-mono">
                  <span className="text-[#888]">链上交易: </span>
                  <a
                    href={`https://explorer.arc.io/tx/${claimTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00FFCC] underline font-bold flex items-center gap-0.5"
                  >
                    <span>{claimTxHash.slice(0, 10)}...{claimTxHash.slice(-8)} (ArcScan 查验 ↗)</span>
                  </a>
                </div>
              )}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (typeof window !== 'undefined' && (window as any).ethereum) {
                      try {
                        await (window as any).ethereum.request({
                          method: 'wallet_watchAsset',
                          params: {
                            type: 'ERC20',
                            options: {
                              address: ARC_MAINNET.addresses.WBOG,
                              symbol: 'WBOG',
                              decimals: 18,
                              image: 'https://web5.blog/tokens/wbog.png',
                            },
                          },
                        });
                      } catch (err: any) {
                        alert('添加代币取消或失败: ' + err?.message);
                      }
                    } else {
                      alert('请先连接 MetaMask 钱包插件以查看代币余额。');
                    }
                  }}
                  className="w-full sm:w-auto text-xs bg-[#00FFCC]/20 text-[#00FFCC] border border-[#00FFCC]/40 hover:bg-[#00FFCC]/30 h-8 px-3"
                >
                  🦊 一键添加到 MetaMask 钱包
                </Button>
                <a
                  href={`https://app.uniswap.org/swap?chain=arc&inputCurrency=NATIVE&outputCurrency=${ARC_MAINNET.addresses.WBOG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-xs bg-white/[0.04] text-white border border-white/[0.1] hover:bg-white/[0.08] h-8 px-3 rounded-lg flex items-center justify-center gap-1"
                >
                  🦄 前往 Uniswap 查看市值 ↗
                </a>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={claiming || completedCount < 5 || !PUBLIC_AIRDROP_ENABLED}
              className="w-full bg-gradient-to-r from-[#00FFCC] to-[#0066FF] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold h-10 shadow-lg shadow-[#00FFCC]/20"
            >
              {!PUBLIC_AIRDROP_ENABLED
                ? PUBLIC_DEMO_NOTICE
                : claiming ? '正在 Circle ARC 链上划拨 1,000 $WBOG...' : completedCount === 5 ? '🎉 立即认领 1,000 $WBOG' : `还需完成 ${5 - completedCount} 项任务解锁`}
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
