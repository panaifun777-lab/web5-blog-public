'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/auth/wallet-guide-modal.tsx
// Web3 数字钱包连接引导与移动端唤醒弹窗 (Wallet Guide Modal)
// 解决无痕模式、手机浏览器或未安装钱包插件时的无反应/报错痛点
// ════════════════════════════════════════════════════════════════

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Sparkles, ExternalLink, ArrowRight, Smartphone, ShieldCheck, Laptop } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface WalletGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseVessel: () => void;
}

export function WalletGuideModal({
  open,
  onOpenChange,
  onUseVessel,
}: WalletGuideModalProps) {
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  const currentDappUrl = typeof window !== 'undefined' ? window.location.href : 'https://web5.blog';
  const metamaskDeepLink = `https://metamask.app.link/dapp/${currentDappUrl.replace(/^https?:\/\//, '')}`;
  const okxDeepLink = `okx://wallet/dapp/details?dappUrl=${encodeURIComponent(currentDappUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0e17] border border-[#00FFCC]/30 text-white shadow-2xl shadow-[#00FFCC]/10 p-6 rounded-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00FFCC]/20 flex items-center justify-center text-[#00FFCC]">
                <Wallet className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-1.5 font-mono">
                <span>{isEn ? 'Web3 Wallet Connect' : '连接 Web3 数字钱包'}</span>
              </DialogTitle>
            </div>
            <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[9px] font-mono">
              Arc Mainnet 5042
            </Badge>
          </div>
          <DialogDescription className="text-xs text-[#aaa] leading-relaxed">
            {isEn
              ? 'No injected Web3 wallet detected in your current browser session (e.g. Incognito mode or mobile browser).'
              : '当前浏览器环境（如无痕模式、手机默认浏览器或未安装扩展）未检测到注入式 Web3 钱包。请选择以下方式无缝连接：'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {/* 方案 A：一键免装插件容器登录 (首推) */}
          <div
            onClick={() => {
              onOpenChange(false);
              onUseVessel();
            }}
            className="p-3.5 rounded-xl border border-[#00FFCC]/40 bg-gradient-to-r from-[#00FFCC]/15 via-[#B080E8]/05 to-transparent cursor-pointer hover:border-[#00FFCC]/80 transition-all group shadow-lg shadow-[#00FFCC]/05"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00FFCC] animate-pulse" />
                <span>{isEn ? 'Recommended: Vessel Container Awakening' : '首推：免装插件 · Vessel 容器觉醒'}</span>
              </span>
              <Badge className="bg-[#00FFCC] text-black font-black text-[8px] py-0 h-4">
                FAST PASS
              </Badge>
            </div>
            <p className="text-[11px] text-[#aaa] leading-relaxed">
              {isEn
                ? 'No wallet extension required. 4-step cryptographic handshake generates your sovereign digital twin instantly.'
                : '无需安装任何插件！四步密码学握手即刻唤醒专属数字分身，秒级进入系统。'}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-[#00FFCC] font-bold mt-2 group-hover:translate-x-1 transition-transform">
              <span>{isEn ? 'Awaken Container Now' : '立即免密唤醒分身'}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* 方案 B：在手机端钱包 App 中打开 (DeepLink) */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
            <div className="text-[11px] text-[#888] font-mono flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#FFCC00]" />
              <span>{isEn ? 'Mobile Wallet App Jump:' : '手机端钱包 App 直连跳转：'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={metamaskDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-[#FFCC00]/10 border border-white/[0.08] hover:border-[#FFCC00]/40 text-center transition-all flex items-center justify-center gap-1.5 text-xs text-white"
              >
                <span>🦊 MetaMask</span>
                <ExternalLink className="w-3 h-3 text-[#888]" />
              </a>
              <a
                href={okxDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-[#0066FF]/10 border border-white/[0.08] hover:border-[#0066FF]/40 text-center transition-all flex items-center justify-center gap-1.5 text-xs text-white"
              >
                <span>⚡ OKX 钱包</span>
                <ExternalLink className="w-3 h-3 text-[#888]" />
              </a>
            </div>
          </div>

          {/* 方案 C：PC 浏览器安装扩展 */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-[#888]">
              <Laptop className="w-3.5 h-3.5 text-[#B080E8]" />
              <span>{isEn ? 'PC Browser Extension:' : '电脑端安装钱包插件：'}</span>
            </div>
            <a
              href="https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00FFCC] hover:underline flex items-center gap-1 text-[10px] font-mono"
            >
              <span>Chrome 扩展商店 ↗</span>
            </a>
          </div>
        </div>

        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#666]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#10B981]" />
            {isEn ? 'Circle ARC Verified Rails' : 'Circle ARC 5042 原生通道'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-6 text-[11px] text-[#888] hover:text-white"
          >
            {isEn ? 'Close' : '关闭'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
