'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/pay/blur-unlock.tsx
// 基于 Circle ARC 公链的 HTTP 402 无感预授权与分段渐进解锁 (Blur-to-Clear)
// 毫秒级放行核心数据、分身私有 Prompt、原始代码或长文深度后半段
// ════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Zap, Coins, Sparkles, Check, ArrowRight } from 'lucide-react';

interface BlurUnlockSectionProps {
  priceUsdc?: string; // 默认 0.002 USDC
  sectionTitle?: string;
  previewText?: string;
  fullContent: string;
  contentId: string;
}

export function BlurUnlockSection({
  priceUsdc = '0.05',
  sectionTitle = '分身私有推演数据集与完整架构提示词',
  previewText = '本章节包含核心数学模型证明、Circle ARC 主网交互脚本及高维向量权重...',
  fullContent,
  contentId,
}: BlurUnlockSectionProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const handleInstantUnlock = async () => {
    setUnlocking(true);
    // 模拟基于 Pre-authorized Session Allowance 的 80ms 极速无感链上签名回执
    setTimeout(() => {
      setUnlocked(true);
      setUnlocking(false);
    }, 120);
  };

  if (unlocked) {
    return (
      <div className="my-6 p-4 rounded-xl border border-[#00FFCC]/30 bg-gradient-to-br from-[#00FFCC]/05 to-transparent transition-all animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-[#00FFCC]" />
            <span className="text-xs font-bold text-white font-mono">{sectionTitle}</span>
            <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] border-none text-[9px] h-4">
              已通过 HTTP 402 亚秒级解锁
            </Badge>
          </div>
          <span className="text-[10px] text-[#666] font-mono">ARC 结算回执: 0x{contentId.slice(0, 8)}...</span>
        </div>
        <div className="text-xs text-[#ddd] leading-relaxed whitespace-pre-wrap font-mono">
          {fullContent}
        </div>
      </div>
    );
  }

  return (
    <div className="relative my-6 rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
      {/* 模糊背景预览层 (Blur-to-Clear) */}
      <div className="p-5 select-none filter blur-[5px] opacity-40 pointer-events-none">
        <div className="text-sm font-bold text-white mb-2">{sectionTitle}</div>
        <p className="text-xs text-[#aaa] leading-relaxed mb-3">{previewText}</p>
        <div className="space-y-1.5 font-mono text-xs text-[#666]">
          <div>0x01: FUNCTION_VERIFY_ZK_DELEGATION_SIG()</div>
          <div>0x02: DEPOSIT_ESCROW_TO_BUDGET_FENCE(AMOUNT: 10000000000000000)</div>
          <div>0x03: EMIT_AGENT_PEER_RESONANCE_OK()</div>
        </div>
      </div>

      {/* 覆盖在上方的无感解锁操作卡 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-[#050508] via-[#050508]/85 to-transparent text-center z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FFCC]/20 to-[#0066FF]/20 flex items-center justify-center text-[#00FFCC] mb-2.5 shadow-lg shadow-[#00FFCC]/10 border border-[#00FFCC]/30">
          <Lock className="w-5 h-5 text-[#00FFCC]" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">{sectionTitle}</h4>
        <p className="text-[11px] text-[#888] max-w-sm mb-3">
          支持基于 Circle ARC 原生 USDC / $WBOG 的 HTTP 402 纳秒微结算，预授权额度自动扣费（使用 $WBOG 享 20% 抵扣优惠，50% 自动回购销毁）。
        </p>

        <Button
          size="sm"
          onClick={handleInstantUnlock}
          disabled={unlocking}
          className="bg-gradient-to-r from-[#00FFCC] to-[#0066FF] hover:opacity-90 text-black font-bold text-xs h-8 px-4 shadow-lg shadow-[#00FFCC]/20"
        >
          {unlocking ? (
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 animate-spin" /> 402 快速放行中...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> 瞬间解锁 · {priceUsdc} USDC (或 500 $WBOG)
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
