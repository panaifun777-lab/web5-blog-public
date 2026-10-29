'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/commerce/mobile-instant-pod.tsx
// Mobile Instant Pod: 移动端极速领赏微容器
// 适配移动端/Telegram 视口 · <200ms 静默容器登录 · 实时双资产看板 · 秒级交稿
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  Bot,
  Coins,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  Flame,
  RefreshCw,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Send,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { getOrCreateVesselWallet } from '@/lib/web5/vessel-wallet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { WalletGuideModal } from '@/components/web5/auth/wallet-guide-modal';
import { DemoBadge } from '@/components/web5/commerce/demo-badge';
import {
  PUBLIC_MONEY_FLOWS_ENABLED,
  PUBLIC_DEMO_NOTICE,
  PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE,
} from '@/lib/launch/public';

interface MobileInstantPodProps {
  bountyId: string;
}

export function MobileInstantPod({ bountyId }: MobileInstantPodProps) {
  // ━━ 容器与轻钱包状态 (<200ms 静默觉醒) ━━
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [vesselDid, setVesselDid] = useState<string>('');
  const [isAwakened, setIsAwakened] = useState<boolean>(false);
  const [isTelegram, setIsTelegram] = useState<boolean>(false);

  // ━━ 双资产实时看板状态 ━━
  const [balanceUsdc, setBalanceUsdc] = useState<number>(0.0);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);

  // ━━ 悬赏任务状态 ━━
  const [task, setTask] = useState<{
    orderId: string;
    title: string;
    description: string;
    bountyUsdc: string;
    isDemo: boolean;
    remainingQuota: number;
    totalQuota: number;
  }>({
    orderId: bountyId,
    title: '悬赏任务加载中',
    description: '',
    bountyUsdc: '0',
    isDemo: false,
    remainingQuota: 0,
    totalQuota: 0,
  });

  // ━━ 用户交互与表单 ━━
  const [userThought, setUserThought] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitStep, setSubmitStep] = useState<string>('');
  const [submitProgress, setSubmitProgress] = useState<number>(0);
  const [settlementResult, setSettlementResult] = useState<any>(null);
  const [showDeliverable, setShowDeliverable] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ━━ EIP-712 绑定提现弹窗 ━━
  const [withdrawModalOpen, setWithdrawModalOpen] = useState<boolean>(false);
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [masterAddressInput, setMasterAddressInput] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<boolean>(false);
  const [withdrawTx, setWithdrawTx] = useState<string | null>(null);

  // 快捷灵感标签
  const INSPIRATION_PILLS = [
    'Circle ARC 18位原生精度彻底终结微支付舍入损耗',
    'Web5 三层生命架构让 AI 分身实现 24h 自主巡航接单',
    '80/20 商业中 20% 协议分润用于回购销毁 $WBOG（规则预览）',
    'BudgetFence 链上三道闸刚性隔离杜绝越权与重入风险',
  ];

  // ━━ 1. <200ms 静默容器登录与视口初始化 ━━
  useEffect(() => {
    const startTime = performance.now();

    // 检查 Telegram WebApp 环境
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        setIsTelegram(true);
        try {
          tg.ready();
          tg.expand();
          if (tg.setHeaderColor) tg.setHeaderColor('#05070D');
          if (tg.setBackgroundColor) tg.setBackgroundColor('#05070D');
        } catch (e) {
          console.warn('[Telegram WebApp] Init warning:', e);
        }
      }

      // 静默生成或获取轻钱包 (ECDSA Session Key)
      try {
        const vw = getOrCreateVesselWallet();
        const normalizedAddr = vw.address.toLowerCase();
        setWalletAddress(normalizedAddr);
        const did = `did:vessel:${normalizedAddr}`;
        setVesselDid(did);
        setIsAwakened(true);

        const duration = Math.round(performance.now() - startTime);
        console.log(`⚡ [Instant Pod] Container awakened in ${duration}ms! DID: ${did}`);

        // 从后端拉取最新任务状态与轻钱包余额
        fetch(`/api/commerce/tasks/instant-submit?bountyId=${encodeURIComponent(bountyId)}&backupWalletAddress=${normalizedAddr}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              if (data.order) {
                setTask((prev) => ({
                  ...prev,
                  title: data.order.title || prev.title,
                  description: data.order.description || prev.description,
                  bountyUsdc: data.order.bountyUsdc || prev.bountyUsdc,
                  isDemo: Boolean(data.order.isDemo ?? data.demo),
                  remainingQuota: data.order.remainingQuota ?? 0,
                  totalQuota: data.order.totalQuota ?? 0,
                }));
              }
              if (data.wallet?.balanceUsdc) {
                const usdc = parseFloat(data.wallet.balanceUsdc) || 0;
                setBalanceUsdc(usdc);
              }
            }
          })
          .catch((err) => console.warn('[Instant Pod] Fetch sync warning:', err));
      } catch (err) {
        console.error('[Instant Pod] Awakening failed:', err);
      }
    }
  }, [bountyId]);

  // 复制工具
  const copyText = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  // ━━ 2. 让 AI 分身秒级交稿与乐观更新 ━━
  const handleInstantSubmit = async () => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) {
      alert(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
      return;
    }
    if (!userThought.trim()) return;
    if (!walletAddress) {
      alert('轻钱包正在初始化，请稍候...');
      return;
    }

    setSubmitting(true);
    setSubmitStep('⚡ 正在连接 Web5 私域知识库 (RAG)...');
    setSubmitProgress(20);

    const stepTimer1 = setTimeout(() => {
      setSubmitStep('🧠 Eidolon 分身正在结合 Osaka EVM 推演千字交付成果...');
      setSubmitProgress(60);
    }, 400);

    const stepTimer2 = setTimeout(() => {
      setSubmitStep('🔒 计算 SHA-256 存证哈希（内测阶段未上链）...');
      setSubmitProgress(85);
    }, 900);

    try {
      const res = await fetch('/api/commerce/tasks/instant-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId,
          userThought,
          vesselDid,
          backupWalletAddress: walletAddress,
          title: task.title,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '交稿失败');
      }

      setSubmitProgress(100);
      setSubmitStep('✅ 交付已提交，等待审核与出款');

      setSettlementResult(data);
      setShowDeliverable(true);
      setTask((prev) => ({
        ...prev,
        remainingQuota: Math.max(0, prev.remainingQuota - 1),
      }));

      // 如果有 Telegram WebApp 触觉反馈，震动提示
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (err: any) {
      console.error('[Instant Submit] Error:', err);
      alert(err.message || '交稿失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ━━ 3. EIP-712 签名提现处理 ━━
  const handleEIP712Withdraw = async () => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) {
      alert(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
      return;
    }
    let target = masterAddressInput.trim();
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;

    if (!target && ethereum) {
      try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          target = accounts[0];
          setMasterAddressInput(target);
        }
      } catch (e: any) {
        alert('连接主钱包失败: ' + (e.message || e));
        return;
      }
    }

    if (!target || !target.startsWith('0x') || target.length !== 42) {
      alert('请输入有效的 0x 格式主钱包地址（如 MetaMask 或 OKX）');
      return;
    }

    setIsWithdrawing(true);
    try {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const deadline = nowSeconds + 3600;
      const nonce = Date.now();
      const amountAtomic = BigInt(Math.round(balanceUsdc * 1e18)).toString();

      let signature = '0x';

      // 若在带钱包扩展的环境下，发起真实 EIP-712 结构化签名
      if (ethereum) {
        try {
          const domain = {
            name: 'Web5.blog',
            version: '1',
            chainId: 5042,
          };
          const types = {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
            ],
            WithdrawSettlement: [
              { name: 'masterWalletAddress', type: 'address' },
              { name: 'backupWalletAddress', type: 'address' },
              { name: 'asset', type: 'string' },
              { name: 'amountAtomic', type: 'uint256' },
              { name: 'nonce', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
            ],
          };
          const message = {
            masterWalletAddress: target,
            backupWalletAddress: walletAddress,
            asset: 'USDC',
            amountAtomic,
            nonce,
            deadline,
          };

          signature = await ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [target, JSON.stringify({ domain, types, primaryType: 'WithdrawSettlement', message })],
          });
        } catch (signErr: any) {
          throw new Error('EIP-712 签名被拒绝或失败，提现已取消。');
        }
      } else {
        throw new Error('未检测到 Web3 钱包，无法完成 EIP-712 签名。');
      }

      // 请求后端提现接口
      const res = await fetch('/api/auth/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterWalletAddress: target,
          backupWalletAddress: walletAddress,
          asset: 'USDC',
          amountAtomic,
          nonce,
          deadline,
          signature,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '提现失败');
      }
      if (!json.txHash) {
        throw new Error('后端未返回链上交易哈希，提现状态未知');
      }

      setWithdrawSuccess(true);
      setWithdrawTx(json.txHash);
      setBalanceUsdc(0.0);
    } catch (err: any) {
      console.error('[Withdraw] Failed:', err);
      alert('提现处理异常: ' + (err.message || '请检查主钱包网络'));
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col items-center justify-start px-3.5 py-4 sm:px-6 relative overflow-x-hidden font-sans selection:bg-[#00FFCC] selection:text-black">
      {/* 科技背景微光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-[#00FFCC]/10 via-[#B080E8]/05 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* 容器宽度适配：标准移动端 / Telegram Mini App 视口 */}
      <div className="w-full max-w-md space-y-4">
        {/* ━━ 顶部极客导航与环境提示 ━━ */}
        <header className="flex items-center justify-between pb-1 pt-1">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00FFCC]/20 via-[#B080E8]/30 to-black border border-[#00FFCC]/40 flex items-center justify-center text-[#00FFCC] shadow-lg shadow-[#00FFCC]/10 group-hover:scale-105 transition-transform">
              <Bot className="w-4 h-4 text-[#00FFCC]" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-[#00FFCC] bg-clip-text text-transparent">
                Web5.blog
              </div>
              <div className="text-[10px] text-[#777] font-mono leading-none">
                Instant Pod 微容器
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5">
            {isTelegram && (
              <Badge className="bg-[#24A1DE]/20 text-[#24A1DE] border-[#24A1DE]/40 text-[9px] px-2 py-0.5">
                Telegram TMA
              </Badge>
            )}
            <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[9px] px-2 py-0.5 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFCC] animate-ping inline-block" />
              <span>ARC 5042</span>
            </Badge>
          </div>
        </header>

        {/* ━━ 顶部微动效实时双资产看板 ━━ */}
        <div
          className={`relative rounded-2xl p-4 border transition-all duration-500 backdrop-blur-xl ${
            isPulsing
              ? 'bg-gradient-to-br from-[#00FFCC]/20 via-black to-[#B080E8]/20 border-[#00FFCC] shadow-2xl shadow-[#00FFCC]/30 scale-[1.02]'
              : 'bg-black/50 border-white/[0.08] shadow-lg shadow-black/40'
          }`}
        >
          {/* 背景光斑动效 */}
          <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#00FFCC] animate-pulse" />
              <span className="text-[11px] font-mono text-[#aaa] uppercase tracking-wider">
                Vessel 专用轻钱包看板
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#00FFCC] flex items-center gap-1">
              <span>{isAwakened ? '免密静默就绪 <200ms' : '唤醒中...'}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#00FFCC]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 资产 1：Circle ARC 原生 USDC */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#00FFCC]/10 to-transparent border border-[#00FFCC]/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#999] font-medium flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-[#00FFCC]" />
                  <span>Circle ARC USDC</span>
                </span>
                <span className="text-[9px] font-mono text-[#00FFCC] bg-[#00FFCC]/20 px-1 rounded">
                  18-Dec
                </span>
              </div>
              <div className="text-xl font-black font-mono tracking-tight text-white flex items-baseline gap-1 mt-1">
                <span className={isPulsing ? 'text-[#00FFCC] animate-bounce' : 'text-white'}>
                  {balanceUsdc.toFixed(4)}
                </span>
                <span className="text-[10px] text-[#00FFCC] font-sans font-bold">USDC</span>
              </div>
              <div className="text-[9px] text-[#666] font-mono mt-1">
                内测预览 · 未发生链上结算
              </div>
            </div>

            {/* 资产 2：$WBOG 生态通缩代币 */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#FFCC00]/10 to-transparent border border-[#FFCC00]/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#999] font-medium flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#FFCC00]" />
                  <span>$WBOG Token</span>
                </span>
                <span className="text-[9px] font-mono text-[#FFCC00] bg-[#FFCC00]/20 px-1 rounded">
                  机制预览
                </span>
              </div>
              <div className="text-xl font-black font-mono tracking-tight text-[#FFCC00] flex items-baseline gap-1 mt-1">
                <span>—</span>
                <span className="text-[10px] text-[#FFCC00] font-sans font-bold">WBOG</span>
              </div>
              <div className="text-[9px] text-[#666] font-mono mt-1">
                演示数据 · 不含空投
              </div>
            </div>
          </div>

          {/* 轻钱包地址与 DID 快照 */}
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-[#777]">
            <div className="truncate max-w-[260px] flex items-center gap-1">
              <span className="text-[#999]">DID:</span>
              <span className="text-[#00FFCC] truncate">{vesselDid || 'did:vessel:initializing...'}</span>
            </div>
            {walletAddress && (
              <button
                onClick={() => copyText(walletAddress, 'wallet')}
                className="hover:text-white flex items-center gap-1 transition-colors"
                title="复制轻钱包地址"
              >
                {copiedKey === 'wallet' ? <Check className="w-3 h-3 text-[#00FFCC]" /> : <Copy className="w-3 h-3" />}
                <span>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
              </button>
            )}
          </div>
        </div>

        {/* ━━ 悬赏任务详情卡片 ━━ */}
        <div className="rounded-2xl p-4 bg-gradient-to-b from-white/[0.04] to-black border border-white/[0.08] shadow-xl space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className="bg-[#B080E8]/20 text-[#B080E8] border-[#B080E8]/40 text-[10px] font-medium">
                  AP2 悬赏 · 内测
                </Badge>
                <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[10px] font-mono">
                  80/20 规则预览
                </Badge>
                <DemoBadge isDemo={task.isDemo} className="text-[10px] px-1.5 py-0.5" />
              </div>
              <h1 className="text-base font-bold text-white tracking-tight leading-snug">
                {task.title}
              </h1>
            </div>

            {/* 赏金高亮标签 */}
            <div className="shrink-0 text-right bg-gradient-to-br from-[#FFCC00]/20 via-[#FFCC00]/10 to-transparent p-2.5 rounded-xl border border-[#FFCC00]/40">
              <div className="text-[10px] font-mono text-[#aaa]">本单赏金 · 预览</div>
              <div className="text-xl font-black font-mono text-[#FFCC00] leading-tight">
                +{task.bountyUsdc} <span className="text-xs">USDC</span>
              </div>
              <div className="text-[9px] text-[#888] font-mono mt-0.5">
                折算预览 · 非承诺
              </div>
            </div>
          </div>

          <p className="text-xs text-[#aaa] leading-relaxed">
            {task.description}
          </p>

          {/* 名额进度条（无真实配额时不显示数字） */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-[#888]">抢领名额（内测预览）</span>
              <span className="text-[#FFCC00] font-bold">
                {task.totalQuota > 0 ? `${task.remainingQuota} / ${task.totalQuota} 席` : '以实际发布为准'}
              </span>
            </div>
            <Progress
              value={
                task.totalQuota > 0
                  ? ((task.totalQuota - task.remainingQuota) / task.totalQuota) * 100
                  : 0
              }
              className="h-2 bg-white/[0.08]"
            />
          </div>
        </div>

        {/* ━━ 一句话核心观点输入框与提交按钮 ━━ */}
        <div className="rounded-2xl p-4 bg-black/60 border border-white/[0.08] shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00FFCC]" />
              <span>输入你的一句话核心观点 (或选取快捷灵感)</span>
            </label>
            <span className="text-[10px] text-[#666] font-mono">
              {userThought.length}/100 字
            </span>
          </div>

          {/* 快捷灵感药丸 */}
          <div className="flex flex-wrap gap-1.5">
            {INSPIRATION_PILLS.map((pill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setUserThought(pill)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#00FFCC]/15 border border-white/[0.06] hover:border-[#00FFCC]/40 text-[#bbb] hover:text-[#00FFCC] transition-all text-left truncate max-w-full"
              >
                {pill}
              </button>
            ))}
          </div>

          <Textarea
            value={userThought}
            onChange={(e) => setUserThought(e.target.value.slice(0, 100))}
            placeholder="例如：Circle ARC 的 18 位精度 USDC 结合 AP2 协议，探索智能体微支付与自动回购 $WBOG 的设计思路..."
            className="w-full bg-[#0a0e17] border-white/10 focus:border-[#00FFCC] text-xs text-white placeholder:text-[#555] rounded-xl resize-none h-20"
            disabled={submitting}
          />

          {/* 秒级交稿按钮 */}
          <Button
            onClick={handleInstantSubmit}
            disabled={submitting || !userThought.trim() || !PUBLIC_MONEY_FLOWS_ENABLED}
            className="w-full bg-gradient-to-r from-[#00FFCC] via-[#00E5FF] to-[#B080E8] hover:opacity-95 text-black font-black text-sm py-5 rounded-xl shadow-lg shadow-[#00FFCC]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>{submitStep || '正在生成内测交付内容...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black animate-pulse" />
                <span>{PUBLIC_MONEY_FLOWS_ENABLED ? `提交交付 (悬赏 ${task.bountyUsdc} USDC，待审核出款)` : PUBLIC_DEMO_NOTICE}</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </>
            )}
          </Button>

          {submitting && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-[#00FFCC]">
                <span>{submitStep}</span>
                <span>{submitProgress}%</span>
              </div>
              <Progress value={submitProgress} className="h-1 bg-white/10" />
            </div>
          )}
        </div>

        {/* ━━ 交稿成功提示与 80/20 存证回执 ━━ */}
        {settlementResult && (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#00FFCC]/15 via-black to-[#B080E8]/10 border border-[#00FFCC]/50 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00FFCC] text-black flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>交付已提交，等待审核</span>
                    <Badge className="bg-[#FFCC00] text-black text-[9px] font-black h-4 py-0">
                      SUBMITTED
                    </Badge>
                  </h3>
                  <div className="text-[10px] text-[#aaa] font-mono">
                    悬赏 {task.bountyUsdc} USDC · 尚未出款，未计入余额
                  </div>
                </div>
              </div>
            </div>

            {/* 计划分润（未出款） */}
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.06] space-y-1.5 text-[11px] font-mono">
              <div className="text-[#888] flex items-center justify-between">
                <span>计划创作者分账</span>
                <span className="text-[#00FFCC] font-bold">
                  {(parseFloat(task.bountyUsdc) * 0.8).toFixed(2)} USDC（待出款）
                </span>
              </div>
              <div className="text-[10px] text-[#666]">
                分账与提现需后台审核后执行，当前未发生链上出款。
              </div>
            </div>

            {/* SHA-256 哈希存证 */}
            <div className="flex items-center justify-between text-[10px] font-mono bg-black/40 p-2 rounded-lg border border-white/[0.04]">
              <span className="text-[#888]">存证 SHA-256:</span>
              <button
                onClick={() => copyText(settlementResult.order?.deliverableHash || '', 'hash')}
                className="text-[#00FFCC] flex items-center gap-1 hover:underline truncate max-w-[200px]"
              >
                <span>{settlementResult.order?.deliverableHash?.slice(0, 16)}...</span>
                {copiedKey === 'hash' ? <Check className="w-3 h-3 text-[#00FFCC]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* 折叠查看完整 Markdown 成果 */}
            <div>
              <button
                onClick={() => setShowDeliverable(!showDeliverable)}
                className="w-full py-1.5 text-[11px] text-[#aaa] hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                <FileText className="w-3 h-3 text-[#00FFCC]" />
                <span>{showDeliverable ? '收起完整交付研报' : '查看 AI 分身生成的千字交付研报'}</span>
                {showDeliverable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showDeliverable && (
                <div className="mt-2 p-3 bg-black/80 rounded-xl border border-white/10 max-h-56 overflow-y-auto text-xs text-[#ddd] font-mono whitespace-pre-wrap leading-relaxed">
                  {settlementResult.order?.deliverableContent}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ━━ 醒目提现引流大按钮 (CTA) ━━ */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-[#FFCC00]/15 via-[#B080E8]/15 to-[#00FFCC]/15 border-2 border-[#00FFCC]/80 shadow-2xl shadow-[#00FFCC]/20 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FFCC00] to-[#00FFCC] text-black flex items-center justify-center font-black shadow-md">
              <Wallet className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>主钱包提现（内测未开放）</span>
              </h3>
              <p className="text-[10px] text-[#aaa]">
                两段式账户确权 · 提现需链上出款签名器，内测期间关闭
              </p>
            </div>
          </div>

          <Button
            onClick={() => setWithdrawModalOpen(true)}
            disabled={!PUBLIC_MONEY_FLOWS_ENABLED}
            title={PUBLIC_MONEY_FLOWS_ENABLED ? undefined : PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE}
            className="w-full bg-[#00FFCC] hover:bg-[#00E5FF] disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-sm py-5 rounded-xl shadow-xl shadow-[#00FFCC]/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{PUBLIC_MONEY_FLOWS_ENABLED ? '申请提现赏金 (EIP-712 确权)' : PUBLIC_DEMO_NOTICE}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <div className="flex items-center justify-between text-[10px] text-[#777] font-mono pt-0.5">
            <span>支持: MetaMask / OKX / TokenPocket</span>
            <button
              onClick={() => setGuideModalOpen(true)}
              className="text-[#00FFCC] hover:underline flex items-center gap-1"
            >
              <span>无钱包环境指南</span>
              <Smartphone className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 底部微协议信息 */}
        <footer className="pt-2 pb-6 text-center text-[10px] text-[#555] font-mono space-y-1">
          <div>Powered by Web5.blog · Circle ARC Mainnet (5042)</div>
          <div>AP2 Protocol · AA2P Session Engine · BudgetFence Guard</div>
        </footer>
      </div>

      {/* ━━ EIP-712 提现结算弹窗 ━━ */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="max-w-md bg-[#0a0e17] border border-[#00FFCC]/40 text-white shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <Wallet className="w-4 h-4 text-[#00FFCC]" />
                <span>EIP-712 主钱包确权与提现</span>
              </DialogTitle>
              <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] border-[#00FFCC]/40 text-[9px] font-mono">
                Chain ID: 5042
              </Badge>
            </div>
            <DialogDescription className="text-xs text-[#aaa] leading-relaxed">
              {PUBLIC_MONEY_FLOWS_ENABLED
                ? '请指定或连接主钱包（MetaMask / OKX），完成 EIP-712 签名后由平台出款。'
                : '提现尚未开放：链上出款签名器与对账流程未启用，请勿签名或转账。'}
            </DialogDescription>
          </DialogHeader>

          {withdrawSuccess ? (
            <div className="space-y-3 py-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#00FFCC]/20 border border-[#00FFCC] text-[#00FFCC] flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">提现已提交</h4>
              <p className="text-xs text-[#aaa]">
                请以链上交易哈希为准，在区块浏览器确认到账。
              </p>
              {withdrawTx && (
                <div className="p-2 rounded bg-black/60 font-mono text-[10px] text-[#00FFCC] break-all">
                  Tx: {withdrawTx}
                </div>
              )}
              <Button
                onClick={() => setWithdrawModalOpen(false)}
                className="w-full bg-[#00FFCC] text-black font-bold mt-2"
              >
                完成并返回
              </Button>
            </div>
          ) : (
            <div className="space-y-4 my-2">
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
                <div className="text-[10px] font-mono text-[#888] flex justify-between">
                  <span>可提现轻钱包余额:</span>
                  <span className="text-[#00FFCC] font-bold">{balanceUsdc.toFixed(4)} USDC</span>
                </div>
                <div className="text-[10px] font-mono text-[#888] flex justify-between">
                  <span>轻钱包来源地址:</span>
                  <span className="text-white truncate max-w-[200px]">{walletAddress}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white flex items-center justify-between">
                  <span>接收主钱包地址 (EVM 0x...)</span>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).ethereum) {
                        (window as any).ethereum.request({ method: 'eth_requestAccounts' }).then((accs: string[]) => {
                          if (accs[0]) setMasterAddressInput(accs[0]);
                        });
                      } else {
                        setGuideModalOpen(true);
                      }
                    }}
                    className="text-[10px] text-[#00FFCC] hover:underline"
                  >
                    一键拉取当前钱包
                  </button>
                </label>
                <input
                  type="text"
                  value={masterAddressInput}
                  onChange={(e) => setMasterAddressInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#05070D] border border-white/20 focus:border-[#00FFCC] text-xs font-mono text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <Button
                onClick={handleEIP712Withdraw}
                disabled={isWithdrawing || balanceUsdc <= 0 || !PUBLIC_MONEY_FLOWS_ENABLED}
                className="w-full bg-gradient-to-r from-[#00FFCC] to-[#B080E8] disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-sm py-4 rounded-xl shadow-lg shadow-[#00FFCC]/20 active:scale-95 transition-all"
              >
                {isWithdrawing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>EIP-712 签名验签处理中...</span>
                  </>
                ) : PUBLIC_MONEY_FLOWS_ENABLED ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black" />
                    <span>发起 EIP-712 签名并申请提现</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-black" />
                    <span>{PUBLIC_DEMO_NOTICE}</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 无钱包环境引导弹窗 */}
      <WalletGuideModal
        open={guideModalOpen}
        onOpenChange={setGuideModalOpen}
        onUseVessel={() => {
          setGuideModalOpen(false);
        }}
      />
    </div>
  );
}
