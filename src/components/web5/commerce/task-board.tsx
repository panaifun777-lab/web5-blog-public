'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/commerce/task-board.tsx
// AP2 智能体商业状态机面板 — 众包与悬赏任务大厅 (做任务赚 USDC)
// 支持连接的 Web3 钱包真实链上托管转账 (Circle ARC 5042)
// 支持 Vessel 专用钱包快速免签质押
// 交付成果报告 (Arweave/SHA256 哈希 + 80/20 收益分配明细)
// 分身声誉分 (Reputation Score) 与技能徽章
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Coins,
  CheckCircle2,
  Bot,
  ArrowRight,
  Shield,
  Zap,
  Sparkles,
  Plus,
  Wallet,
  Award,
  Clock,
  FileText,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Flame,
  Layers,
  ArrowUpRight,
  Info,
  Loader2,
  AlertTriangle,
  Globe,
  Briefcase,
  Search,
  Filter,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { OpportunityRadar } from '@/components/web5/reach/opportunity-radar';
import { DemoBadge } from '@/components/web5/commerce/demo-badge';
import type { CommerceTaskOrder } from '@/lib/web5/ap2/commerce';
import { GLOBAL_REMOTE_JOBS, type RemoteJob } from '@/lib/web5/ap2/remote-jobs';
import {
  getOrCreateVesselWallet,
  getVesselWalletBalance,
  vesselWalletTransfer,
} from '@/lib/web5/vessel-wallet';
import {
  PUBLIC_MONEY_FLOWS_ENABLED,
  PUBLIC_DEMO_NOTICE,
  PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE,
} from '@/lib/launch/public';

const ESCROW_VAULT_ADDRESS = '0xCA36335845E382129167fC44243F07A76827bA22';
const ARC_CHAIN_ID_HEX = '0x13b2'; // 5042
const ARC_EXPLORER_URL = 'https://explorer.arc.io';

export function TaskBoard({
  session,
  onSelectTask,
}: {
  session?: any;
  onSelectTask?: (task: CommerceTaskOrder) => void;
}) {
  const [tasks, setTasks] = useState<CommerceTaskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'FUNDED' | 'ASSIGNED' | 'SETTLED'>('ALL');
  const [boardSection, setBoardSection] = useState<'bounties' | 'remote_jobs'>('bounties');
  const [jobCategory, setJobCategory] = useState<string>('ALL');
  const [jobSearch, setJobSearch] = useState<string>('');
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  // ━━ 弹窗状态管理 ━━
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedTaskForReport, setSelectedTaskForReport] = useState<CommerceTaskOrder | null>(null);

  // ━━ 发布任务表单字段 ━━
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [bountyAmount, setBountyAmount] = useState('25.0');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Circle ARC 5042', '智能审计']);
  const [paymentMethod, setPaymentMethod] = useState<'web3' | 'vessel'>('web3');

  // ━━ 专用钱包状态 ━━
  const [vesselAddress, setVesselAddress] = useState('');
  const [vesselBalance, setVesselBalance] = useState<number>(0);
  const [vesselLoading, setVesselLoading] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);

  // ━━ 发布交互状态 ━━
  const [publishing, setPublishing] = useState(false);
  const [publishStatusText, setPublishStatusText] = useState('');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  // ━━ 复制反馈 ━━
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/commerce/tasks');
      if (res.ok) {
        const d = await res.json();
        setTasks(d.orders || []);
      }
    } catch (e) {
      console.error('Failed to load tasks', e);
    }
    setLoading(false);
  };

  const refreshVesselInfo = async () => {
    try {
      const vw = getOrCreateVesselWallet();
      setVesselAddress(vw.address);
      const bal = await getVesselWalletBalance(vw.address);
      setVesselBalance(bal);
    } catch (e) {
      console.warn('Failed to get vessel info', e);
    }
  };

  useEffect(() => {
    fetchTasks();
    refreshVesselInfo();
  }, []);

  // 复制文本提示
  const copyToClipboard = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  // ━━ 1. Web3 主钱包直接发起链上托管转账 ━━
  const transferViaWeb3Wallet = async (amount: string): Promise<string> => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) throw new Error(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error(
        isEn
          ? 'No Web3 wallet detected. Please install MetaMask, OKX, or Phantom.'
          : '未检测到 Web3 钱包，请先安装并连接 MetaMask 或 OKX 钱包。'
      );
    }

    setPublishStatusText(isEn ? 'Checking Circle ARC Network (5042)...' : '正在校验 Circle ARC 主网 (5042)...');

    // 检查并切换到 5042
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: ARC_CHAIN_ID_HEX,
              chainName: 'Arc Mainnet',
              nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
              rpcUrls: ['https://rpc.mainnet.arc.io'],
              blockExplorerUrls: [ARC_EXPLORER_URL],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }

    setPublishStatusText(isEn ? 'Requesting wallet signature...' : '请在钱包中确认转账签名...');
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const from = accounts[0];
    const amountWei = BigInt(Math.round(parseFloat(amount) * 1e18));

    setPublishStatusText(
      isEn
        ? `Transferring ${amount} USDC to Escrow Vault (${ESCROW_VAULT_ADDRESS.slice(0, 8)}...)...`
        : `正在向独立金库托管合约 (${ESCROW_VAULT_ADDRESS.slice(0, 8)}...) 转账 ${amount} USDC...`
    );

    const txHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to: ESCROW_VAULT_ADDRESS,
          value: '0x' + amountWei.toString(16),
        },
      ],
    });

    return txHash;
  };

  // ━━ 2. Vessel 专用钱包快速免签质押 ━━
  const transferViaVesselWallet = async (amount: string): Promise<string> => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) throw new Error(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
    const vw = getOrCreateVesselWallet();
    const bal = await getVesselWalletBalance(vw.address);
    const need = parseFloat(amount) + 0.001;

    if (bal < need) {
      throw new Error(
        isEn
          ? `Vessel wallet balance insufficient (${bal.toFixed(3)} USDC). Required: ${need.toFixed(3)} USDC (including gas).`
          : `Vessel 专用钱包余额不足（当前 ${bal.toFixed(3)} USDC），需至少 ${need.toFixed(3)} USDC（含少许 Gas）。`
      );
    }

    setPublishStatusText(isEn ? 'Executing session-key gasless escrow transfer...' : '正在通过专用钱包免签广播链上质押交易...');
    const txHash = await vesselWalletTransfer(ESCROW_VAULT_ADDRESS, amount);
    return txHash;
  };

  // ━━ 主钱包为 Vessel 专用钱包充值 ━━
  const handleTopUpVessel = async (topUpAmount = '1.0') => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) {
      alert(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
      return;
    }
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      alert(isEn ? 'Please connect your Web3 wallet first.' : '请先连接主钱包。');
      return;
    }
    setTopUpLoading(true);
    try {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CHAIN_ID_HEX }],
        });
      } catch (e: any) {
        if (e.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: ARC_CHAIN_ID_HEX,
                chainName: 'Arc Mainnet',
                nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                rpcUrls: ['https://rpc.mainnet.arc.io'],
                blockExplorerUrls: [ARC_EXPLORER_URL],
              },
            ],
          });
        } else throw e;
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];
      const amountWei = BigInt(Math.round(parseFloat(topUpAmount) * 1e18));

      await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from,
            to: vesselAddress,
            value: '0x' + amountWei.toString(16),
          },
        ],
      });

      alert(isEn ? `✅ Successfully topped up ${topUpAmount} USDC into Vessel Wallet!` : `✅ 成功向 Vessel 专用钱包充值 ${topUpAmount} USDC！`);
      await refreshVesselInfo();
    } catch (e: any) {
      if (e?.code !== 4001) {
        alert(isEn ? `Top-up failed: ${e.message}` : `充值失败: ${e.message}`);
      }
    } finally {
      setTopUpLoading(false);
    }
  };

  // ━━ 执行发布任务 ━━
  const handleSubmitNewTask = async () => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) {
      setPublishError(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
      return;
    }
    if (!taskTitle.trim()) {
      setPublishError(isEn ? 'Please enter a task title.' : '请输入悬赏任务标题。');
      return;
    }
    const bountyNum = parseFloat(bountyAmount);
    if (isNaN(bountyNum) || bountyNum <= 0) {
      setPublishError(isEn ? 'Please enter a valid bounty amount.' : '请输入有效的悬赏金额。');
      return;
    }

    setPublishing(true);
    setPublishError(null);
    setSuccessTxHash(null);

    try {
      let txHash = '';
      if (paymentMethod === 'web3') {
        txHash = await transferViaWeb3Wallet(bountyAmount);
      } else {
        txHash = await transferViaVesselWallet(bountyAmount);
      }

      setPublishStatusText(isEn ? 'Locking escrow & creating task on-chain...' : '正在将资金锁定存证并创建任务订单...');

      const res = await fetch('/api/commerce/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          creatorDid: session?.vesselDid || 'did:plvtvs:guest',
          title: taskTitle.trim(),
          description:
            taskDesc.trim() ||
            (isEn
              ? 'Decentralized task published by user. Avatars will autonomously draft, audit, or research.'
              : '由用户发起的去中心化众包需求，分身将自主分析、撰写报告或执行代码审查。'),
          bountyUsdc: bountyAmount,
          escrowContract: ESCROW_VAULT_ADDRESS,
          escrowTxHash: txHash,
          txHash,
          fundingMode: paymentMethod === 'web3' ? 'web3_wallet' : 'vessel_wallet',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create task');
      }

      setSuccessTxHash(txHash);
      setPublishStatusText(isEn ? '✅ Task published & escrowed successfully!' : '✅ 任务已成功发布并托管上链！');
      await fetchTasks();
      await refreshVesselInfo();

      setTimeout(() => {
        setCreateModalOpen(false);
        setTaskTitle('');
        setTaskDesc('');
        setPublishing(false);
        setSuccessTxHash(null);
        setPublishStatusText('');
      }, 2500);
    } catch (e: any) {
      console.error(e);
      setPublishError(e?.message?.slice(0, 120) || (isEn ? 'Transaction failed' : '转账或发布失败'));
      setPublishing(false);
    }
  };

  // ━━ 认领任务 ━━
  const handleClaim = async (task: CommerceTaskOrder) => {
    try {
      const res = await fetch('/api/commerce/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          orderId: task.orderId,
          agentDid: session?.vesselDid || 'did:eidolon:my-active-avatar',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          isEn
            ? `✅ Your AI Avatar claimed: "${task.title}"! Autonomous execution underway.`
            : `✅ 你的 AI 分身已成功认领任务：${task.title}！将在后台自主推进。`
        );
        await fetchTasks();
      } else {
        alert(data.error || 'Claim failed');
      }
    } catch (e: any) {
      alert(isEn ? `Claim failed: ${e.message}` : `认领失败: ${e.message}`);
    }
  };

  // ━━ 提交交付草稿（不触发任何链上出款） ━━
  const handleSubmitDeliverable = async (task: CommerceTaskOrder) => {
    try {
      const draftContent = `# 《${task.title} — 交付草稿》
**执行分身**: ${task.agentReputation?.name || 'Unassigned'}

## 成果摘要
本文件为人工/分身提交的交付草稿，尚未完成 Arweave 永久存证，也未发生任何链上出款。`;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(draftContent));
      const deliverableHash = `0x${Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const res = await fetch('/api/commerce/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          orderId: task.orderId,
          deliverableHash,
          deliverableContent: draftContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          isEn
            ? '✅ Draft submitted for review. No on-chain payout has occurred.'
            : '✅ 交付草稿已提交，等待验收（未发生链上分润或出款）。'
        );
        await fetchTasks();
      } else {
        alert(data.error || 'Submit failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredTasks = tasks.filter((t) => (filter === 'ALL' ? true : t.status === filter));

  const filteredJobs = GLOBAL_REMOTE_JOBS.filter((job) => {
    const matchCat = jobCategory === 'ALL' || job.category === jobCategory;
    const matchSearch =
      !jobSearch.trim() ||
      job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.titleEn.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.company.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.tags.some((t) => t.toLowerCase().includes(jobSearch.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5 mb-8">
      {!PUBLIC_MONEY_FLOWS_ENABLED && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-3.5 py-2.5 text-[11px] text-[#FFE58A]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">{PUBLIC_DEMO_NOTICE}</div>
            <div className="text-[#c9b06a] mt-0.5">
              {PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE} 托管验证与自动退款上线前，发布与质押入口保持关闭；已有任务仅作流程展示。
            </div>
          </div>
        </div>
      )}
      {/* ━━ 顶部引导：做任务赚 USDC ━━ */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[#FFCC00]/30 bg-gradient-to-br from-[#FFCC00]/10 via-[#0a0e17] to-transparent shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/20 flex items-center justify-center text-[#FFCC00] shadow-inner">
              <Coins className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2 flex-wrap">
                <span>{isEn ? '🎯 AP2 Task & Bounty Plaza — Earn USDC Rewards' : '🎯 AP2 悬赏与任务广场 — 做任务赚 USDC'}</span>
                <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[9px]">
                  Circle ARC Mainnet (5042)
                </Badge>
              </h3>
              <p className="text-[11px] text-[#888] mt-0.5">
                {isEn
                  ? 'Escrow verification and automatic refunds are not live yet. Publishing is disabled during the closed beta.'
                  : '托管验证与自动退款尚未上线，内测期间发布与质押入口关闭；页面仅展示任务流程。'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={!PUBLIC_MONEY_FLOWS_ENABLED}
            title={PUBLIC_MONEY_FLOWS_ENABLED ? undefined : PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE}
            onClick={() => {
              if (!PUBLIC_MONEY_FLOWS_ENABLED) {
                alert(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
                return;
              }
              setPublishError(null);
              setSuccessTxHash(null);
              setPublishStatusText('');
              refreshVesselInfo();
              setCreateModalOpen(true);
            }}
            className="bg-gradient-to-r from-[#00FFCC] to-[#0066FF] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs h-8 px-3.5 flex-shrink-0 shadow-md shadow-[#00FFCC]/10"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> {PUBLIC_MONEY_FLOWS_ENABLED
              ? (isEn ? '+ Post Bounty Task' : '+ 发布悬赏任务')
              : PUBLIC_DEMO_NOTICE}
          </Button>
        </div>

        {/* 3步动线 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/[0.06]">
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="w-5 h-5 rounded-full bg-[#00FFCC]/20 text-[#00FFCC] text-xs font-bold flex items-center justify-center flex-shrink-0">
              1
            </span>
            <div className="text-[11px]">
              <div className="font-semibold text-white">{isEn ? 'Connect or Vessel Key' : '链上质押或免签发单'}</div>
              <div className="text-[#666] text-[10px]">
                {isEn ? 'Web3 wallet / Vessel zero-click escrow' : '支持 Web3 主钱包与 Vessel 零钱包'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="w-5 h-5 rounded-full bg-[#FFCC00]/20 text-[#FFCC00] text-xs font-bold flex items-center justify-center flex-shrink-0">
              2
            </span>
            <div className="text-[11px]">
              <div className="font-semibold text-white">{isEn ? 'Claim High-Yield Tasks' : '高声誉分身自主接单'}</div>
              <div className="text-[#666] text-[10px]">
                {isEn ? 'Bounties from 10 to 100 USDC' : '声誉 98%+ 智识节点领航'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="w-5 h-5 rounded-full bg-[#B080E8]/20 text-[#B080E8] text-xs font-bold flex items-center justify-center flex-shrink-0">
              3
            </span>
            <div className="text-[11px]">
              <div className="font-semibold text-white">{isEn ? 'Revenue rules preview · settlement in closed beta' : '分润规则预览 · 结算通道内测中'}</div>
              <div className="text-[#666] text-[10px]">
                {isEn ? '80/20 split rule preview · no payouts yet' : '80/20 规则预览 · 暂不出款'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━ 顶部主板块切换：悬赏任务广场 vs 全球自由工作精选 ━━ */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBoardSection('bounties')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              boardSection === 'bounties'
                ? 'bg-[#FFCC00]/15 text-[#FFCC00] border border-[#FFCC00]/40 shadow-sm shadow-[#FFCC00]/10'
                : 'text-[#888] hover:text-white border border-transparent'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{isEn ? 'AP2 Bounty Plaza' : 'AP2 悬赏广场'}</span>
            <Badge className="bg-[#FFCC00]/20 text-[#FFCC00] text-[9px] py-0 px-1.5 border-none">
              {tasks.filter((t) => !t.isDemo).length}
            </Badge>
          </button>

          <button
            onClick={() => setBoardSection('remote_jobs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              boardSection === 'remote_jobs'
                ? 'bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/40 shadow-sm shadow-[#00FFCC]/10'
                : 'text-[#888] hover:text-white border border-transparent'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isEn ? 'Global Remote & Sovereign Gigs' : '全球自由劳务与工作机会精选'}</span>
            <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] text-[9px] py-0 px-1.5 border-none">
              {GLOBAL_REMOTE_JOBS.length} DEMO
            </Badge>
          </button>
        </div>

        <span className="hidden sm:inline text-[11px] text-[#666] font-mono">
          {isEn ? 'Zero Intermediary · Sovereign Settlement' : '去中介化 · 主权结算 · 硅基/碳基共生'}
        </span>
      </div>

      {boardSection === 'bounties' ? (
        <>
          {/* ━━ 外部劳务机会雷达（真实抓取 + 推荐分） ━━ */}
          <OpportunityRadar compact />

          {/* ━━ 任务状态筛选标签 ━━ */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              {[
                { id: 'ALL', label: isEn ? 'All Tasks' : '全部任务' },
                { id: 'FUNDED', label: isEn ? 'Open (Recruiting)' : '招募中 (可认领)' },
                { id: 'ASSIGNED', label: isEn ? 'In Progress' : '执行中' },
                { id: 'SETTLED', label: isEn ? 'Settled (Reports)' : '已结算 (成果报告)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filter === f.id
                      ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.1]'
                      : 'text-[#666] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#555] font-mono">
                {filteredTasks.filter((t) => !t.isDemo).length} {isEn ? 'Tasks Active' : '个任务待处理'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchTasks}
                className="h-7 px-2 text-[10px] text-[#666] hover:text-white"
              >
                {isEn ? 'Refresh' : '刷新'}
              </Button>
            </div>
          </div>

          {/* ━━ 任务网格卡片 ━━ */}
          <div className="grid sm:grid-cols-2 gap-3.5">
            {filteredTasks.map((task) => {
              const rep = task.agentReputation;
              const isSettled = task.status === 'SETTLED';
              const isAssigned = task.status === 'ASSIGNED';
              const isFunded = task.status === 'FUNDED';

              return (
                <Card
                  key={task.orderId}
                  className={`bg-white/[0.02] border-white/[0.06] transition-all group flex flex-col justify-between ${
                    isSettled ? 'hover:border-[#10B981]/50' : 'hover:border-[#00FFCC]/40'
                  }`}
                >
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      {/* 标题 & 金额 */}
                      <div className="flex justify-between items-start gap-2">
                        <div
                          className={`font-bold text-sm text-white transition-colors line-clamp-1 ${
                            isSettled ? 'group-hover:text-[#10B981]' : 'group-hover:text-[#00FFCC]'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-1 text-[#FFCC00] font-mono text-xs font-bold flex-shrink-0 bg-[#FFCC00]/10 px-2 py-0.5 rounded border border-[#FFCC00]/20 shadow-sm">
                          <DemoBadge isDemo={task.isDemo} className="mr-0.5" />
                          <Coins className="w-3.5 h-3.5" /> {task.bountyUsdc} USDC
                        </div>
                      </div>

                      {/* 描述 */}
                      <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>

                      {/* ━━ 分身声誉分与技能徽章区域 ━━ */}
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] space-y-2">
                        <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 text-white/90 font-medium">
                            <Bot className="w-3.5 h-3.5 text-[#00FFCC]" />
                            <span className="text-[11px] truncate max-w-[120px]">
                              {rep?.name || (isFunded ? (isEn ? 'Open Candidate Pool' : '招募分身池') : 'Eidolon Agent')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 text-[10px] py-0 h-4 font-mono">
                              <Shield className="w-2.5 h-2.5 mr-0.5" />
                              {isEn ? 'Rep' : '声誉'} {rep?.score || '98.5%'}
                            </Badge>
                            <Badge className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30 text-[10px] py-0 h-4">
                              {rep?.level || 'Lv.3 智识节点'}
                            </Badge>
                          </div>
                        </div>

                        {/* 技能徽章 */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {(rep?.badges || ['Circle ARC 5042', 'AP2 众包', '智能审计']).map((b) => (
                            <span
                              key={b}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-[#aaa] border border-white/[0.06]"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 底部操作与状态 */}
                    <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] gap-2">
                      <Badge
                        className={`text-[9px] py-0 h-4 border ${
                          isSettled
                            ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                            : isAssigned
                            ? 'bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30'
                            : 'bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30'
                        }`}
                      >
                        {isSettled
                          ? isEn
                            ? '✓ Settled'
                            : '✓ 已结算 (80/20)'
                          : isAssigned
                          ? isEn
                            ? '▸ In Progress'
                            : '▸ 执行中'
                          : isEn
                          ? '● Open'
                          : '● 招募中'}
                      </Badge>

                      {/* 状态动作 */}
                      {isSettled ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTaskForReport(task);
                            setReportModalOpen(true);
                          }}
                          className="h-6 px-2.5 text-xs bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/25 transition-all shadow-sm"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          {isEn ? 'View Report' : '查看成果报告'}
                        </Button>
                      ) : isFunded ? (
                        <Button
                          size="sm"
                          onClick={() => handleClaim(task)}
                          className="h-6 px-2.5 text-xs bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30 hover:bg-[#00FFCC]/25 transition-all"
                        >
                          {isEn ? 'Claim Bounty' : '分身认领'} <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#777] font-mono text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isEn ? 'Drafting...' : '分身自主编写中'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSubmitDeliverable(task)}
                            className="h-6 px-2 text-[10px] text-[#00FFCC] hover:bg-[#00FFCC]/10 border border-[#00FFCC]/20"
                          >
                            {isEn ? 'Submit Draft' : '提交交付'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════════
            全新板块：「全球自由劳务与工作机会精选」
        ══════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 py-2 text-[11px] text-[#FFE58A]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {isEn
                ? 'Sample roles · not real hiring. The listings below are demo data for layout preview only.'
                : '示例岗位 · 非真实招聘。以下岗位为演示数据，仅用于界面预览。'}
            </span>
          </div>

          {/* 筛选与搜索条 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            {/* 分类切换 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'ALL', label: isEn ? 'All Categories' : '全部工种' },
                { id: 'Rust/Solidity', label: 'Rust/Solidity' },
                { id: 'AI/Prompt', label: 'Prompt 架构' },
                { id: 'Research/Translation', label: isEn ? 'Translation/Research' : '研报翻译' },
                { id: 'Data/Annotation', label: isEn ? 'Data Annotation' : '数据标注' },
                { id: 'DeFi/Protocol', label: isEn ? 'DeFi Protocol' : '协议与做市' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setJobCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    jobCategory === c.id
                      ? 'bg-[#00FFCC]/20 text-[#00FFCC] border border-[#00FFCC]/40 font-bold'
                      : 'text-[#777] hover:text-white bg-white/[0.02] border border-white/[0.04]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* 搜索框 */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder={isEn ? 'Search gigs by skill, role...' : '搜索岗位、技术栈或公司...'}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-black/50 border border-white/[0.08] text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#00FFCC] transition-colors font-mono"
              />
            </div>
          </div>

          {/* 岗位列表卡片 */}
          <div className="grid sm:grid-cols-2 gap-3.5">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="bg-white/[0.02] border-white/[0.06] hover:border-[#00FFCC]/40 transition-all group flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    {/* 公司与预算 */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-[#00FFCC] font-mono flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3" />
                          <span>{job.company}</span>
                          {job.demo && (
                            <span className="bg-[#FFCC00]/20 text-[#FFCC00] border border-[#FFCC00]/30 rounded px-1 text-[9px]">
                              DEMO
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white group-hover:text-[#00FFCC] transition-colors leading-snug">
                          {isEn ? job.titleEn : job.title}
                        </h4>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-[#FFCC00] font-mono text-xs font-bold bg-[#FFCC00]/10 px-2 py-0.5 rounded border border-[#FFCC00]/20 flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          <span>{job.budgetUsdc} USDC</span>
                        </div>
                        <span className="text-[9px] text-[#666] font-mono mt-0.5 block">
                          /{job.rateType === 'monthly' ? (isEn ? 'mo' : '月') : job.rateType === 'hourly' ? (isEn ? 'hr' : '时') : (isEn ? 'proj' : '单')}
                        </span>
                      </div>
                    </div>

                    {/* 描述 */}
                    <p className="text-xs text-[#888] leading-relaxed line-clamp-2">
                      {isEn ? job.descriptionEn : job.description}
                    </p>

                    {/* 标签 */}
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      <Badge className="bg-white/[0.04] text-white/80 border-white/[0.08] text-[9px] py-0 h-4">
                        📍 {job.location}
                      </Badge>
                      <Badge className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30 text-[9px] py-0 h-4">
                        ⚡ {job.type}
                      </Badge>
                      {job.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.02] text-[#777] border border-white/[0.04] font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* 核心要求精要 */}
                    <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04] text-[10px] text-[#999] space-y-1">
                      <div className="text-[#666] font-semibold text-[9px] uppercase tracking-wider">
                        {isEn ? 'Key Qualification:' : '核心任职要求:'}
                      </div>
                      <div className="truncate">
                        • {isEn ? job.requirementsEn[0] : job.requirements[0]}
                      </div>
                    </div>
                  </div>

                  {/* 底部投递与来源 */}
                  <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
                    <span className="text-[#555] font-mono truncate max-w-[130px]">
                      via {job.source}
                    </span>

                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 h-6 px-2.5 rounded-lg bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30 hover:bg-[#00FFCC]/25 font-bold transition-all text-xs"
                    >
                      <span>{isEn ? 'Apply / Details' : '申请投递 / 详情'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12 text-[#666] text-xs">
              {isEn ? 'No remote jobs match your search criteria.' : '暂无符合筛选条件的工作机会。'}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          弹窗 1：发布众包悬赏任务 (+ 真实链上转账 / Vessel 免签质押)
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg bg-[#0a0e17] border border-white/[0.1] text-white p-5 sm:p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#FFCC00]" />
              <span>{isEn ? 'Post New Bounty Task (closed beta)' : '发布悬赏众包任务（内测）'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#888]">
              {isEn
                ? 'Closed beta: escrow verification, refunds and automatic payouts are not live. Publishing stays disabled.'
                : '内测阶段：托管验证、退款与自动分账尚未上线，发布入口保持关闭。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 托管合约信息展示 */}
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px]">
              <div className="space-y-0.5">
                <div className="text-[#888]">{isEn ? 'Escrow Vault Contract:' : '独立金库/托管合约 (Circle ARC 5042):'}</div>
                <div className="font-mono text-white/90 text-[10px]">{ESCROW_VAULT_ADDRESS}</div>
              </div>
              <Badge className="bg-[#00FFCC]/10 text-[#00FFCC] border-[#00FFCC]/20 text-[9px]">
                BudgetFence Locked
              </Badge>
            </div>

            {/* 标题 */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#ccc]">{isEn ? 'Task Title *' : '任务标题 *'}</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={isEn ? 'e.g. Write Circle ARC Micro-payment Research Report' : '例如：撰写《Circle ARC 稳定币公链微支付与 $WBOG 深度研报》'}
                className="w-full h-8 px-3 rounded-lg bg-black/50 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#00FFCC] transition-colors"
              />
            </div>

            {/* 描述 */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#ccc]">{isEn ? 'Task Requirements & Scope' : '任务交付规范与要求'}</label>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                rows={2}
                placeholder={isEn ? 'Provide detailed research prompt or coding criteria...' : '描述任务核心目标、产出格式（如研报 Markdown 或 SDK 示例代码）与验收标准...'}
                className="w-full p-2.5 rounded-lg bg-black/50 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#00FFCC] transition-colors"
              />
            </div>

            {/* 悬赏金额 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-[#ccc]">{isEn ? 'Bounty Amount (USDC) *' : '悬赏金额 (USDC) *'}</label>
                <span className="text-[10px] text-[#777]">{isEn ? '18 decimals native precision' : 'Circle ARC 原生 18 位高精度'}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={bountyAmount}
                  onChange={(e) => setBountyAmount(e.target.value)}
                  className="flex-1 h-8 px-3 rounded-lg bg-black/50 border border-white/[0.1] text-xs font-mono font-bold text-[#FFCC00] focus:outline-none focus:border-[#00FFCC]"
                />
                {['10.0', '25.0', '50.0', '100.0'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBountyAmount(amt)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-mono transition-all ${
                      bountyAmount === amt
                        ? 'bg-[#FFCC00]/20 text-[#FFCC00] border border-[#FFCC00]/40 font-bold'
                        : 'bg-white/[0.04] text-[#888] hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {amt}U
                  </button>
                ))}
              </div>
            </div>

            {/* ━━ 质押支付渠道选择 (Web3 钱包 vs Vessel 专用钱包) ━━ */}
            <div className="space-y-2 pt-1">
              <label className="font-semibold text-[#ccc] flex items-center justify-between">
                <span>{isEn ? 'Escrow Staking Channel *' : '质押支付渠道 (选择一种进行转账) *'}</span>
                <span className="text-[10px] text-[#888]">
                  {paymentMethod === 'web3' ? (isEn ? 'Direct Web3 Transfer' : '主钱包链上转账') : (isEn ? 'Vessel Session Key' : '专用钱包免签扣款')}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* 选项 1: 连接的 Web3 钱包 */}
                <div
                  onClick={() => setPaymentMethod('web3')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'web3'
                      ? 'border-[#00FFCC] bg-[#00FFCC]/10 shadow-md shadow-[#00FFCC]/5'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className={`w-4 h-4 ${paymentMethod === 'web3' ? 'text-[#00FFCC]' : 'text-[#888]'}`} />
                    <span className="font-bold text-xs">{isEn ? 'Web3 Wallet' : '连接 Web3 钱包'}</span>
                  </div>
                  <p className="text-[10px] text-[#777] leading-tight">
                    {isEn ? 'Direct MetaMask/OKX transfer to vault (5042)' : '向 0xCA36...bA22 真实转账并带 txHash'}
                  </p>
                </div>

                {/* 选项 2: Vessel 专用钱包 */}
                <div
                  onClick={() => setPaymentMethod('vessel')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'vessel'
                      ? 'border-[#B080E8] bg-[#B080E8]/10 shadow-md shadow-[#B080E8]/5'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className={`w-4 h-4 ${paymentMethod === 'vessel' ? 'text-[#B080E8]' : 'text-[#888]'}`} />
                    <span className="font-bold text-xs">{isEn ? 'Vessel Wallet' : 'Vessel 专用钱包'}</span>
                  </div>
                  <p className="text-[10px] text-[#777] leading-tight">
                    {isEn ? 'Zero-click fast staking with session key' : '零弹窗极速免签质押，适合高频发单'}
                  </p>
                </div>
              </div>

              {/* Vessel 钱包额外状态提示与充值 */}
              {paymentMethod === 'vessel' && (
                <div className="p-2.5 rounded-lg bg-black/40 border border-[#B080E8]/30 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#888]">{isEn ? 'Vessel Dedicated Address:' : 'Vessel 专用钱包地址:'}</span>
                    <span className="font-mono text-white/80 text-[10px] truncate max-w-[150px]">
                      {vesselAddress || '生成中...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#888]">{isEn ? 'Current Balance:' : '当前可用余额:'}</span>
                    <span className="font-mono font-bold text-[#FFCC00]">
                      {vesselBalance.toFixed(3)} USDC
                    </span>
                  </div>

                  {vesselBalance < parseFloat(bountyAmount) + 0.001 && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                      <span className="text-[10px] text-[#f59e0b] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        {isEn ? 'Balance low for bounty' : '余额不足以质押该金额'}
                      </span>
                      <Button
                        size="sm"
                        disabled={topUpLoading}
                        onClick={() => handleTopUpVessel('1.0')}
                        className="h-6 px-2 text-[10px] bg-[#B080E8]/20 text-[#B080E8] border border-[#B080E8]/40 hover:bg-[#B080E8]/30"
                      >
                        {topUpLoading ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                        ) : (
                          <Zap className="w-2.5 h-2.5 mr-1" />
                        )}
                        {isEn ? 'Top Up 1.0 USDC' : '从主钱包充值 1.0U'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 状态与错误提示 */}
            {publishing && (
              <div className="p-2.5 rounded-lg bg-[#00FFCC]/10 border border-[#00FFCC]/30 text-[#00FFCC] text-xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                <span>{publishStatusText || (isEn ? 'Processing on-chain...' : '正在处理链上质押...')}</span>
              </div>
            )}

            {publishError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{publishError}</span>
              </div>
            )}

            {successTxHash && (
              <div className="p-2.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Escrow Locked Successfully!' : '链上托管资金已锁定成功！'}</span>
                </div>
                <div className="font-mono text-[10px] break-all text-white/80">
                  txHash: {successTxHash}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <Button
              variant="ghost"
              size="sm"
              disabled={publishing}
              onClick={() => setCreateModalOpen(false)}
              className="text-xs text-[#888] hover:text-white"
            >
              {isEn ? 'Cancel' : '取消'}
            </Button>
            <Button
              size="sm"
              disabled={publishing}
              onClick={handleSubmitNewTask}
              className="bg-gradient-to-r from-[#00FFCC] to-[#0066FF] text-black font-bold text-xs h-8 px-4"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                  {isEn ? 'Escrowing...' : '质押转账中...'}
                </>
              ) : (
                <>
                  <Coins className="w-3 h-3 mr-1.5" />
                  {PUBLIC_MONEY_FLOWS_ENABLED
                    ? (isEn ? `Lock ${bountyAmount} USDC & Publish` : `链上质押 ${bountyAmount} USDC 并发布`)
                    : PUBLIC_DEMO_NOTICE}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          弹窗 2：查看交付成果报告 (已结算任务专享)
          Arweave/SHA256 哈希 + 80/20 收益分配明细 + 分身声誉成果
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0e17] border border-white/[0.1] text-white p-5 sm:p-6 shadow-2xl max-h-[88vh] overflow-y-auto">
          {selectedTaskForReport && (
            <>
              <DialogHeader className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 text-xs px-2.5 py-0.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {selectedTaskForReport.payoutTxHash
                      ? (isEn ? 'PAYOUT CONFIRMED ON-CHAIN' : '出款交易已上链确认')
                      : (isEn ? 'SUBMITTED · PAYOUT PENDING' : '已交付 · 待出款')}
                  </Badge>
                  <span className="text-[11px] text-[#777] font-mono">
                    ID: {selectedTaskForReport.orderId}
                  </span>
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white">
                  <DemoBadge isDemo={selectedTaskForReport.isDemo} className="mr-1.5 align-middle" />
                  {selectedTaskForReport.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#888]">
                  {isEn
                    ? 'Deliverable submitted. Payout is shown only when a confirmed on-chain transfer exists; storage is labeled by its actual provider.'
                    : '交付物已提交。只有存在已确认的链上转账时才显示“已出款”；存储位置按实际提供方标注，未上链的内容不声称永久存证。'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* ━━ 1. 执行分身资质与声誉卡片 ━━ */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/[0.08] flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FFCC]/20 to-[#B080E8]/20 border border-[#00FFCC]/30 flex items-center justify-center text-[#00FFCC]">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{selectedTaskForReport.agentReputation?.name || 'Unassigned'}</span>
                        <Badge className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 text-[9px] py-0">
                          {selectedTaskForReport.agentReputation?.score || '—'} {isEn ? 'Score' : '声誉分'}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-[#777] font-mono mt-0.5">
                        DID: {selectedTaskForReport.assignedAgentDid || selectedTaskForReport.agentReputation?.did || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className="bg-[#B080E8]/20 text-[#B080E8] border-[#B080E8]/40 text-xs">
                      {selectedTaskForReport.agentReputation?.level || 'Unverified'}
                    </Badge>
                  </div>
                </div>

                {/* ━━ 2. 分身交付成果报告正文 ━━ */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#ddd] flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#00FFCC]" />
                      {isEn ? 'Autonomous Deliverable Content' : '分身自主提交成果报告'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          selectedTaskForReport.deliverableContent || selectedTaskForReport.description,
                          'content'
                        )
                      }
                      className="h-6 px-2 text-[10px] text-[#888] hover:text-white"
                    >
                      {copiedKey === 'content' ? (
                        <>
                          <Check className="w-3 h-3 text-[#10B981] mr-1" /> {isEn ? 'Copied' : '已复制'}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" /> {isEn ? 'Copy Report' : '复制全文'}
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-[11px] leading-relaxed text-[#ccc] whitespace-pre-wrap max-h-52 overflow-y-auto">
                    {selectedTaskForReport.deliverableContent || selectedTaskForReport.description}
                  </div>
                </div>

                {/* ━━ 3. 双重存证哈希验证区 (Arweave / SHA256 / ARC txHash) ━━ */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                  <div className="font-semibold text-white/90 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#FFCC00]" />
                      {isEn ? 'Dual-Hash Provenance Verification' : '双通道存证哈希校验 (可信溯源)'}
                    </span>
                    <span className="text-[10px] text-[#777] font-mono">Immutable Evidence</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    {/* Arweave 永存存证 */}
                    <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04] space-y-1">
                      <div className="text-[#888] flex items-center justify-between">
                        <span>成果哈希（未上链时仅数据库记录）</span>
                        <button
                          onClick={() =>
                            selectedTaskForReport.deliverableHash &&
                            copyToClipboard(selectedTaskForReport.deliverableHash, 'arweave')
                          }
                          className="hover:text-white"
                        >
                          {copiedKey === 'arweave' ? (
                            <Check className="w-3 h-3 text-[#10B981]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-white/90 truncate">
                        {selectedTaskForReport.deliverableHash || '未提供'}
                      </div>
                    </div>

                    {/* SHA-256 完整性哈希 */}
                    <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04] space-y-1">
                      <div className="text-[#888] flex items-center justify-between">
                        <span>SHA-256 完整性校验码</span>
                        <button
                          onClick={() =>
                            selectedTaskForReport.deliverableSha256 &&
                            copyToClipboard(selectedTaskForReport.deliverableSha256, 'sha256')
                          }
                          className="hover:text-white"
                        >
                          {copiedKey === 'sha256' ? (
                            <Check className="w-3 h-3 text-[#10B981]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-white/90 truncate">
                        {selectedTaskForReport.deliverableSha256 || '未提供'}
                      </div>
                    </div>
                  </div>

                  {/* 链上质押/结算交易哈希 */}
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/[0.04]">
                    <span className="text-[#888]">Circle ARC 托管交易:</span>
                    {selectedTaskForReport.escrowTxHash ? (
                      <a
                        href={`${ARC_EXPLORER_URL}/tx/${selectedTaskForReport.escrowTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[#00FFCC] hover:underline flex items-center gap-1"
                      >
                        <span>{selectedTaskForReport.escrowTxHash.slice(0, 16)}...</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="font-mono text-[#777]">未提供托管交易（演示数据）</span>
                    )}
                  </div>
                </div>

                {/* ━━ 4. 80/20 计划分润明细（未出款） ━━ */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#00FFCC]/10 via-[#0a0e17] to-[#B080E8]/10 border border-[#00FFCC]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <TrendingUp className="w-4 h-4 text-[#00FFCC]" />
                      <span>{isEn ? 'Planned 80/20 Split (not paid out)' : '80/20 计划分润（尚未出款）'}</span>
                    </div>
                    <span className="font-mono font-bold text-sm text-[#FFCC00]">
                      {selectedTaskForReport.bountyUsdc} USDC
                    </span>
                  </div>

                  {/* 收益分配条形进度 */}
                  <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden flex">
                    <div className="h-full bg-gradient-to-r from-[#10B981] to-[#00FFCC] w-[80%]" title="80% Creator" />
                    <div className="h-full bg-[#0066FF] w-[10%]" title="10% Ops Treasury" />
                    <div className="h-full bg-[#B080E8] w-[10%]" title="10% LP Buyback & Burn" />
                  </div>

                  {/* 3 部分配卡片 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    {/* 80% 创作者实得 */}
                    <div className="p-2 rounded-lg bg-black/40 border border-[#10B981]/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#10B981] font-bold text-[10px]">80% 创作者应得</span>
                        <Badge className="bg-[#10B981]/15 text-[#10B981] text-[9px] py-0 h-3.5">
                          待出款
                        </Badge>
                      </div>
                      <div className="text-sm font-mono font-bold text-white">
                        {(parseFloat(selectedTaskForReport.bountyUsdc) * 0.8).toFixed(2)} USDC
                      </div>
                      <p className="text-[9px] text-[#777] leading-tight">
                        需人工/后台出款流程，当前未自动执行
                      </p>
                    </div>

                    {/* 10% 运营出纳 */}
                    <div className="p-2 rounded-lg bg-black/40 border border-[#0066FF]/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#0066FF] font-bold text-[10px]">10% 国库运营</span>
                        <Badge className="bg-[#0066FF]/15 text-[#0066FF] text-[9px] py-0 h-3.5">
                          算力覆盖
                        </Badge>
                      </div>
                      <div className="text-sm font-mono font-bold text-white">
                        {(parseFloat(selectedTaskForReport.bountyUsdc) * 0.1).toFixed(2)} USDC
                      </div>
                      <p className="text-[9px] text-[#777] leading-tight">
                        注入 0xCA36...bA22 支持节点与模型
                      </p>
                    </div>

                    {/* 10% LP 回购销毁 */}
                    <div className="p-2 rounded-lg bg-black/40 border border-[#B080E8]/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#B080E8] font-bold text-[10px]">10% LP 锁死回购</span>
                        <Badge className="bg-[#B080E8]/15 text-[#B080E8] text-[9px] py-0 h-3.5">
                          通缩飞轮
                        </Badge>
                      </div>
                      <div className="text-sm font-mono font-bold text-white">
                        {(parseFloat(selectedTaskForReport.bountyUsdc) * 0.1).toFixed(2)} USDC
                      </div>
                      <p className="text-[9px] text-[#777] leading-tight">
                        Uniswap v4 深度扩充 & 回购 $WBOG
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/[0.06]">
                <Button
                  size="sm"
                  onClick={() => setReportModalOpen(false)}
                  className="bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs h-8 px-4"
                >
                  {isEn ? 'Close' : '关闭'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
