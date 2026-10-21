'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/vault/genesis-curve-modal.tsx
// GenesisCurveVault 创世联合曲线天使认购弹窗 (3000U 毕业永久锁死 LP)
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rocket, ShieldCheck, Coins, Sparkles, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PUBLIC_MONEY_FLOWS_ENABLED, PUBLIC_DEMO_NOTICE, PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE } from '@/lib/launch/public';

interface GenesisCurveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: any;
  onSuccess?: () => void;
}

export function GenesisCurveModal({ open, onOpenChange, session, onSuccess }: GenesisCurveModalProps) {
  const [vault, setVault] = useState<any>({
    currentReserveUsdc: 0,
    graduationCapUsdc: 3000,
    progressPercent: 0,
    currentPriceUsdc: 0.00008,
    maxPerTxUsdc: 20,
    isGraduated: false,
  });
  const [selectedAmount, setSelectedAmount] = useState('20');
  const [submitting, setSubmitting] = useState(false);
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  const fetchVault = async () => {
    try {
      const res = await fetch('/api/curve/vault');
      if (res.ok) {
        const d = await res.json();
        if (d.vault) setVault(d.vault);
      }
    } catch {}
  };

  useEffect(() => {
    fetchVault();
  }, [open]);

  const amountNum = parseFloat(selectedAmount) || 20;
  const currentPrice = vault?.currentPriceUsdc || 0.00008152;
  const estimatedWbog = Math.floor(amountNum / currentPrice);

  const handleContribute = async () => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) {
      alert(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/curve/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerDid: session?.primeDid || 'did:plvtvs:angel',
          usdcAmount: amountNum,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(isEn
          ? `🎉 Angel Inception Contribution Successful!\n\nPledged: ${amountNum} USDC\nReceived: ${estimatedWbog.toLocaleString()} $WBOG\n\nAll funds are locked in the graduation vault toward the 3,000 USDC threshold!`
          : `🎉 创世天使认购成功！\n\n注资额度: ${amountNum} USDC\n获得代币: ${estimatedWbog.toLocaleString()} $WBOG\n\n资金已全额进入金库，共同冲刺 3,000 USDC 永久锁池毕业门槛！`);
        fetchVault();
        onSuccess?.();
      } else {
        alert(data.error || '认购失败');
      }
    } catch (e: any) {
      alert('认购请求失败: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = vault?.progressPercent || 12.7;
  const currentReserve = vault?.currentReserveUsdc || 380;
  const cap = vault?.graduationCapUsdc || 3000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0f] border border-[#FFCC00]/40 text-white max-w-lg p-6 shadow-2xl backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-[#FFCC00]/20 text-[#FFCC00] border-[#FFCC00]/40 text-[10px] py-0.5">
              创世天使储备金库
            </Badge>
            <span className="text-xs text-[#00FFCC] font-mono">3,000 USDC 自动毕业</span>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <Rocket className="w-5 h-5 text-[#FFCC00] animate-bounce" />
            {isEn ? 'Genesis Curve Angel Inception Vault' : 'GenesisCurve 创世联合曲线天使认购'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#aaa] leading-relaxed">
            {isEn
              ? 'Community-backed inception curve. 100% of accumulated funds migrate to Uniswap v4 with LP permanently burned and contract ownership renounced at 3,000 USDC.'
              : '社区驱动的创世蓄水池。累积达到 3,000 USDC 时自动毕业，全部资金 100% 打入 Uniswap v4 底池并永久打入黑洞销毁 LP，团队彻底放弃权限！'}
          </DialogDescription>
        </DialogHeader>

        {!PUBLIC_MONEY_FLOWS_ENABLED && (
          <div className="rounded-lg border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-3 py-2 text-[11px] text-[#FFE58A]">
            <b>{PUBLIC_DEMO_NOTICE}</b>。认购、代币发放与毕业机制尚未上线，本弹窗不接收任何资金。
          </div>
        )}

        {/* 蓄水进度条 */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#FFCC00]/10 via-[#050508] to-transparent border border-[#FFCC00]/30 space-y-2.5 my-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#888] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#FFCC00]" />
              {isEn ? 'Graduation Liquidity Progress:' : '创世底池蓄水冲刺进度:'}
            </span>
            <span className="font-mono text-[#FFCC00] font-black text-sm">
              {currentReserve.toFixed(1)} / {cap} USDC ({progress}%)
            </span>
          </div>
          <Progress value={progress} className="h-2.5 bg-white/[0.08]" />
          <div className="flex items-center justify-between text-[10px] text-[#666] font-mono">
            <span>起始单价: $0.000080</span>
            <span className="text-[#00FFCC]">当前即时单价: ${currentPrice.toFixed(8)}</span>
          </div>
        </div>

        {/* 认购筹码选择 */}
        <div className="space-y-3 my-2">
          <div className="flex items-center justify-between text-xs text-[#aaa]">
            <span>{isEn ? 'Select Contribution Tier:' : '选择天使注资筹码 (单笔防鲸限额 20U):'}</span>
            <span className="text-[#FFCC00] font-mono text-[11px]">
              预计获得 ≈ <b className="text-white text-xs">{estimatedWbog.toLocaleString()}</b> $WBOG
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { u: '5', label: '5 USDC', wbog: '≈ 6.1万 WBOG' },
              { u: '10', label: '10 USDC', wbog: '≈ 12.2万 WBOG' },
              { u: '20', label: '20 USDC (顶格)', wbog: '≈ 24.5万 WBOG', highlight: true },
            ].map((chip) => (
              <button
                key={chip.u}
                type="button"
                onClick={() => setSelectedAmount(chip.u)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedAmount === chip.u
                    ? 'border-[#FFCC00] bg-[#FFCC00]/15 text-white shadow-lg shadow-[#FFCC00]/10'
                    : 'border-white/[0.06] bg-white/[0.02] text-[#888] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="text-xs font-bold font-mono text-[#FFCC00]">{chip.label}</div>
                <div className="text-[10px] text-[#aaa] mt-0.5">{chip.wbog}</div>
              </button>
            ))}
          </div>

          {/* 规则三道铁律 */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1.5 text-[10px] text-[#aaa]">
            <div className="flex items-center gap-1.5 text-[#00FFCC] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>GenesisCurveVault 创世三道安全铁律：</span>
            </div>
            <div className="flex items-start gap-1">
              <span>•</span>
              <span><b>100% 资金归入底池</b>：募集的全部 3,000 USDC 自动划转至 DEX 组建流动性。</span>
            </div>
            <div className="flex items-start gap-1">
              <span>•</span>
              <span><b>永久丢弃权限 (Renounce)</b>：毕业达成后，合约所有权移交 0x0 黑洞，彻底消除任何后门。</span>
            </div>
            <div className="flex items-start gap-1">
              <span>•</span>
              <span><b>单笔 20U 防巨鲸硬顶</b>：坚决拒绝投机巨鲸砸盘，打造最纯粹的万人分散持币池。</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleContribute}
            disabled={submitting || !PUBLIC_MONEY_FLOWS_ENABLED}
            title={PUBLIC_MONEY_FLOWS_ENABLED ? undefined : PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE}
            className="w-full bg-gradient-to-r from-[#FFCC00] via-[#00FFCC] to-[#0066FF] text-black font-black text-xs h-10 shadow-xl shadow-[#FFCC00]/25 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Rocket className="w-4 h-4 mr-1.5" />
            {submitting ? '正在注资并派发天使代币...' : PUBLIC_MONEY_FLOWS_ENABLED ? `⚡ 立即注资 ${amountNum} USDC 认购 $WBOG` : PUBLIC_DEMO_NOTICE}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
