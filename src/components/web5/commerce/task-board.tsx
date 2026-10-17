'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/commerce/task-board.tsx
// AP2 智能体商业状态机面板 — 众包与悬赏任务大厅 (做任务赚 USDC)
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, CheckCircle2, Bot, ArrowRight, Shield, Zap, Sparkles, Plus, Wallet, Award, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { CommerceTaskOrder } from '@/lib/web5/ap2/commerce';

export function TaskBoard({ session, onSelectTask }: { session?: any; onSelectTask?: (task: CommerceTaskOrder) => void }) {
  const [tasks, setTasks] = useState<CommerceTaskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'FUNDED' | 'ASSIGNED' | 'SETTLED'>('ALL');
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/commerce/tasks');
      if (res.ok) {
        const d = await res.json();
        setTasks(d.orders || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreatePrompt = async () => {
    const title = prompt(isEn ? 'Enter Bounty Task Title:' : '请输入众包/悬赏任务标题:');
    if (!title) return;
    const bounty = prompt(isEn ? 'Enter Bounty Amount (USDC):' : '请输入奖励金额 (USDC):', '25.0') || '25.0';
    setCreating(true);
    try {
      await fetch('/api/commerce/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          creatorDid: session?.vesselDid || 'did:plvtvs:guest',
          title,
          description: isEn 
            ? 'Decentralized task published by user. Avatars will autonomously draft, audit, or research.'
            : '由用户发起的去中心化众包需求，分身将自主分析、撰写报告或执行代码审查。',
          bountyUsdc: bounty,
        }),
      });
      await fetchTasks();
    } catch {}
    setCreating(false);
  };

  const handleClaim = async (task: CommerceTaskOrder) => {
    try {
      await fetch('/api/commerce/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          orderId: task.orderId,
          agentDid: session?.vesselDid || 'did:eidolon:my-active-avatar',
        }),
      });
      alert(isEn 
        ? `✅ Your AI Avatar claimed the bounty: "${task.title}"! Autonomous execution underway.`
        : `✅ 你的 AI 分身已成功认领任务：${task.title}！将在后台自主推进。`);
      await fetchTasks();
    } catch (e: any) {
      alert(isEn ? `Claim failed: ${e.message}` : `认领失败: ${e.message}`);
    }
  };

  const filteredTasks = tasks.filter(t => filter === 'ALL' ? true : t.status === filter);

  return (
    <div className="space-y-5 mb-8">
      {/* ━━ 顶部引导：做任务赚 USDC 新手三步法 ━━ */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[#FFCC00]/30 bg-gradient-to-br from-[#FFCC00]/10 via-[#0a0e17] to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/20 flex items-center justify-center text-[#FFCC00]">
              <Coins className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>{isEn ? '🎯 AP2 Task & Bounty Plaza — Earn USDC Rewards' : '🎯 AP2 悬赏与任务广场 — 做任务赚 USDC'}</span>
                <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[9px]">
                  Circle ARC Mainnet
                </Badge>
              </h3>
              <p className="text-[11px] text-[#888] mt-0.5">
                {isEn ? 'Contract-escrowed bounties. Claim with your digital twin, complete tasks, and settle on-chain.' : '智能合约资金托管，数字分身一键接单，提交成果链上秒级结算。'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleCreatePrompt}
            disabled={creating}
            className="bg-gradient-to-r from-[#00FFCC] to-[#0066FF] hover:opacity-90 text-black font-bold text-xs h-8 px-3 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> {isEn ? '+ Post New Bounty' : '+ 发布悬赏任务'}
          </Button>
        </div>

        {/* 3步赚钱动线 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/[0.06]">
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02]">
            <span className="w-5 h-5 rounded-full bg-[#00FFCC]/20 text-[#00FFCC] text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <div className="text-[11px]">
              <div className="font-semibold text-white">{isEn ? 'Awaken Avatar DID' : '唤醒分身身份'}</div>
              <div className="text-[#666] text-[10px]">{isEn ? 'Connect Web3 wallet or Passkey' : '连接 Web3 钱包或 Passkey'}</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02]">
            <span className="w-5 h-5 rounded-full bg-[#FFCC00]/20 text-[#FFCC00] text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <div className="text-[11px]">
              <div className="font-semibold text-white">{isEn ? 'Claim High-Yield Task' : '认领高额悬赏'}</div>
              <div className="text-[#666] text-[10px]">{isEn ? 'Bounties from 25 to 100 USDC' : '单笔最高 100 USDC 悬赏'}</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02]">
            <span className="w-5 h-5 rounded-full bg-[#B080E8]/20 text-[#B080E8] text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <div className="text-[11px]">
              <div className="font-semibold text-white">{isEn ? 'Auto-Settled to Wallet' : '自动结算到账'}</div>
              <div className="text-[#666] text-[10px]">{isEn ? 'BudgetFence instant smart-contract release' : '智能合约自动打款，50% 手续费销毁'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━ 任务状态筛选标签 ━━ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          {[
            { id: 'ALL', label: isEn ? 'All Tasks' : '全部任务' },
            { id: 'FUNDED', label: isEn ? 'Open (Recruiting)' : '招募中 (可认领)' },
            { id: 'ASSIGNED', label: isEn ? 'In Progress' : '执行中' },
            { id: 'SETTLED', label: isEn ? 'Settled' : '已结算' },
          ].map(f => (
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
        <span className="text-xs text-[#555] font-mono">
          {filteredTasks.length} {isEn ? 'Tasks Active' : '个任务待处理'}
        </span>
      </div>

      {/* ━━ 任务网格卡片 ━━ */}
      <div className="grid sm:grid-cols-2 gap-3.5">
        {filteredTasks.map((task) => (
          <Card key={task.orderId} className="bg-white/[0.02] border-white/[0.06] hover:border-[#00FFCC]/40 transition-all group">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="font-bold text-sm text-white group-hover:text-[#00FFCC] transition-colors line-clamp-1">
                  {task.title}
                </div>
                <div className="flex items-center gap-1 text-[#FFCC00] font-mono text-xs font-bold flex-shrink-0 bg-[#FFCC00]/10 px-2 py-0.5 rounded border border-[#FFCC00]/20">
                  <Coins className="w-3.5 h-3.5" /> {task.bountyUsdc} USDC
                </div>
              </div>

              <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                {task.description}
              </p>

              <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                <Badge
                  className={`text-[9px] py-0 h-4 border ${
                    task.status === 'SETTLED'
                      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                      : task.status === 'ASSIGNED'
                      ? 'bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30'
                      : 'bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30'
                  }`}
                >
                  {task.status === 'SETTLED' 
                    ? (isEn ? '✓ Settled' : '✓ 已结算') 
                    : task.status === 'ASSIGNED' 
                    ? (isEn ? '▸ In Progress' : '▸ 执行中') 
                    : (isEn ? '● Open' : '● 招募中')}
                </Badge>

                {task.status === 'FUNDED' ? (
                  <Button
                    size="sm"
                    onClick={() => handleClaim(task)}
                    className="h-6 px-2.5 text-xs bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30 hover:bg-[#00FFCC]/25 transition-all"
                  >
                    {isEn ? 'Claim Bounty' : '分身认领'} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                ) : (
                  <span className="text-[#555] font-mono text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.status === 'SETTLED' ? (isEn ? 'Settled to Vessel' : '已分润到钱包') : (isEn ? 'Avatar Drafting...' : '分身正在自主编写')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
