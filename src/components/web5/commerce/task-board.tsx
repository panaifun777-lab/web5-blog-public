'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/commerce/task-board.tsx
// AP2 智能体商业状态机面板 — 众包与悬赏任务实时看板
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, CheckCircle2, Bot, ArrowRight, Shield, Zap, Sparkles, Plus } from 'lucide-react';
import type { CommerceTaskOrder } from '@/lib/web5/ap2/commerce';

export function TaskBoard({ onSelectTask }: { onSelectTask?: (task: CommerceTaskOrder) => void }) {
  const [tasks, setTasks] = useState<CommerceTaskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
    const title = prompt('请输入众包/悬赏任务标题:');
    if (!title) return;
    const bounty = prompt('请输入奖励金额 (USDC):', '25.0') || '25.0';
    setCreating(true);
    try {
      await fetch('/api/commerce/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title,
          description: '由用户发起的去中心化众包需求，分身将自主分析、撰写报告或执行代码审查。',
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
          agentDid: 'did:eidolon:my-active-avatar',
        }),
      });
      alert(`✅ 你的 AI 分身已成功认领任务：${task.title}！将在后台自主推进。`);
      await fetchTasks();
    } catch (e: any) {
      alert(`认领失败: ${e.message}`);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#00FFCC]" />
          <h3 className="font-bold text-base text-white">AP2 智能体商业状态机 · 活跃悬赏池</h3>
          <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[10px]">
            Circle ARC 托管
          </Badge>
        </div>
        <Button
          size="sm"
          onClick={handleCreatePrompt}
          disabled={creating}
          className="bg-gradient-to-r from-[#00FFCC] to-[#0066FF] hover:opacity-90 text-black font-bold text-xs h-7 px-2.5"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> 发布新任务
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {tasks.map((task) => (
          <Card key={task.orderId} className="bg-white/[0.02] border-white/[0.06] hover:border-[#00FFCC]/30 transition-all">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex justify-between items-start gap-2">
                <div className="font-bold text-sm text-white line-clamp-1">{task.title}</div>
                <div className="flex items-center gap-1 text-[#FFCC00] font-mono text-xs font-bold flex-shrink-0">
                  <Coins className="w-3.5 h-3.5" /> {task.bountyUsdc} USDC
                </div>
              </div>
              <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">{task.description}</p>
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
                <Badge
                  className={`text-[9px] py-0 h-4 border ${
                    task.status === 'SETTLED'
                      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                      : task.status === 'ASSIGNED'
                      ? 'bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30'
                      : 'bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30'
                  }`}
                >
                  {task.status === 'SETTLED' ? '✓ 已结算' : task.status === 'ASSIGNED' ? '▸ 执行中' : '● 招募中'}
                </Badge>
                {task.status === 'FUNDED' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleClaim(task)}
                    className="h-6 px-2 text-xs text-[#00FFCC] hover:bg-[#00FFCC]/10"
                  >
                    分身认领 <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                ) : (
                  <span className="text-[#555] font-mono">
                    {task.status === 'SETTLED' ? '已自动分润到 Vessel' : '分身正在自主编写'}
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
