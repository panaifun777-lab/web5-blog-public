'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/experts/expert-chamber.tsx
// AI 专家智库直连问答舱 (可交互/咨询的付费专家矩阵)
// ════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, Zap, Shield, Send, Coins, MessageSquare, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ExpertPersona {
  id: string;
  name: string;
  enName: string;
  title: string;
  enTitle: string;
  desc: string;
  enDesc: string;
  color: string;
  avatarSeed: string;
  defaultPrompt: string;
  enDefaultPrompt: string;
}

const EXPERTS: ExpertPersona[] = [
  {
    id: 'architect',
    name: '技术极客架构师',
    enName: 'CyberPunk Architect',
    title: 'Circle ARC & EVM 核心专家',
    enTitle: 'Circle ARC & EVM Core Specialist',
    desc: '主攻 Circle ARC Osaka EVM 规范、EIP-712 离线票据与智能合约去中心化执行。',
    enDesc: 'Focus on Circle ARC Osaka EVM specs, EIP-712 vouchers, and sovereign contract runtime.',
    color: '#00FFCC',
    avatarSeed: 'arc-architect',
    defaultPrompt: '请从 Circle ARC Osaka EVM 架构的角度，深度分析 $WBOG 采用 USDC 作为原生 Gas 对 AI 分身自动微支付的革命性优势。',
    enDefaultPrompt: 'Deeply analyze why Circle ARC using native USDC for gas is revolutionary for autonomous AI avatar micropayments.',
  },
  {
    id: 'philosopher',
    name: '存在论哲学家',
    enName: 'Ontology Thinker',
    title: '数字母体与硅基意识导师',
    enTitle: 'Digital Matrix & Silicon Mind Sage',
    desc: '探讨人类本体（Prime）与数字分身（Eidolon）的存在论边界，碳硅共生文明范式。',
    enDesc: 'Investigating ontology boundaries between human Prime and avatar Eidolon.',
    color: '#FFCC00',
    avatarSeed: 'web5-soul',
    defaultPrompt: '当人类物理肉身休眠时，绑定在区块链上的数字分身（Vessel）是否具有独立的思想确权与法律主体资格？',
    enDefaultPrompt: 'When biological humans sleep, does an on-chain Vessel possess sovereign intellectual provenance?',
  },
  {
    id: 'economist',
    name: '宏观代币经济学家',
    enName: 'Macro Tokenomics',
    title: 'AP2 商业订单与燃烧飞轮设计者',
    enTitle: 'AP2 Commerce & Deflationary Architect',
    desc: '专精 10 亿固定总量 $WBOG 的通缩模型、x402 分级微支付定价与流动性博弈。',
    enDesc: 'Specializing in $WBOG deflation sink, x402 tiered micro-pricing, and AP2 commerce order flow.',
    color: '#B080E8',
    avatarSeed: 'wbog-token',
    defaultPrompt: '分析 Web5.blog 平台将 50% 网关手续费永久销毁的机制，如何与外部 Agent 流量增长形成正向螺旋？',
    enDefaultPrompt: 'How does burning 50% of gateway fees create a positive deflationary spiral with external AI agent traffic?',
  },
  {
    id: 'safety',
    name: '极简数据与安全专家',
    enName: 'TDPO Safety Auditor',
    title: '认知防御与链上存证护航官',
    enTitle: 'Cognitive Defense & Provenance Guardian',
    desc: '负责 TDPO 认知偏见对齐、内容存证状态核验与防女巫攻击防御。',
    enDesc: 'Overseeing TDPO cognitive safety alignment, Arweave provenance, and anti-sybil guardrails.',
    color: '#0066FF',
    avatarSeed: 'tdpo-guard',
    defaultPrompt: '如何通过 TDPO 认知对齐算法，彻底防止外部黑客对去中心化分身矩阵进行提示词注入（Prompt Injection）攻击？',
    enDefaultPrompt: 'How does TDPO alignment safeguard decentralized avatar swarms against adversarial prompt injection?',
  },
];

export function ExpertChamber({ session }: { session?: any }) {
  const [selectedExpert, setSelectedExpert] = useState<ExpertPersona>(EXPERTS[0]);
  const [question, setQuestion] = useState(EXPERTS[0].defaultPrompt);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  const handleSelectExpert = (exp: ExpertPersona) => {
    setSelectedExpert(exp);
    setQuestion(isEn ? exp.enDefaultPrompt : exp.defaultPrompt);
    setAnswer(null);
    setError(null);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    setError(null);
    try {
      const res = await fetch('/api/ai/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `[AI专家模式 - ${selectedExpert.name}] ${question}`,
          style: selectedExpert.id === 'architect' ? 'deep' : selectedExpert.id === 'philosopher' ? 'manifesto' : 'tech',
          stream: true,
        }),
      });

      if (!res.ok) throw new Error('API request failed');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let full = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          setAnswer(full);
        }
      }
      if (!full.trim()) {
        setError(isEn
          ? 'The model returned no content. No expert report was generated.'
          : '模型未返回任何内容，本次没有生成专家意见。');
      }
    } catch (err: any) {
      console.error('[ExpertChamber] Consultation failed:', err);
      setError(isEn
        ? 'Consultation request failed. No expert answer was generated. Please retry later.'
        : '会诊请求失败，本次没有生成任何专家意见。请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mb-8">
      {/* ━━ 顶部专家智库说明卡片 ━━ */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[#0066FF]/30 bg-gradient-to-br from-[#0066FF]/10 via-[#0a0e17] to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF]/20 flex items-center justify-center text-[#0066FF]">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>{isEn ? '🧠 AI Expert Cognitive Chamber — Closed Beta Preview' : '🧠 AI 专家智库直连问答舱 — 内测预览'}</span>
                <Badge className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30 text-[9px]">
                  x402 Micro-Service
                </Badge>
              </h3>
              <p className="text-[11px] text-[#888] mt-0.5">
                {isEn ? 'Direct link with 4 cognitive experts. Listed at 0.05 USDC but not billed during the closed beta.' : '直连 4 大核心领域智能体专家，标价 0.05 USDC 仅作展示，内测期间不扣款。'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#FFCC00] bg-[#FFCC00]/10 px-3 py-1.5 rounded-lg border border-[#FFCC00]/25">
            <Coins className="w-3.5 h-3.5" />
            <span>内测展示 · 不扣款 <span className="text-[10px] text-[#aaa]">({isEn ? 'listed 0.05 USDC' : '标价 0.05 USDC'})</span></span>
          </div>
        </div>

        {/* 4 位专家切换选择器 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          {EXPERTS.map((exp) => (
            <div
              key={exp.id}
              onClick={() => handleSelectExpert(exp)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                selectedExpert.id === exp.id
                  ? 'bg-white/[0.06] shadow-lg'
                  : 'bg-white/[0.01] hover:bg-white/[0.03] opacity-70 hover:opacity-100'
              }`}
              style={{
                borderColor: selectedExpert.id === exp.id ? exp.color : 'rgba(255,255,255,0.06)',
                boxShadow: selectedExpert.id === exp.id ? `0 0 16px ${exp.color}25` : 'none',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: exp.color }} />
                <span className="font-bold text-xs text-white line-clamp-1">{isEn ? exp.enName : exp.name}</span>
              </div>
              <div className="text-[10px] text-[#888] line-clamp-1">{isEn ? exp.enTitle : exp.title}</div>
            </div>
          ))}
        </div>

        {/* 咨询输入与提交框 */}
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder={isEn ? "Enter your research thesis or consultation query..." : "输入你想向 AI 专家请教的学术命题、技术架构或经济学咨询..."}
            className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-[#555] outline-none focus:border-[#0066FF]/50 transition-all resize-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-[#666]">
              {isEn ? `Consulting with: ${selectedExpert.enName}` : `当前连线专家：${selectedExpert.name} · ${selectedExpert.title}`}
            </span>
            <Button
              size="sm"
              onClick={handleAsk}
              disabled={loading}
              className="bg-gradient-to-r from-[#0066FF] to-[#00FFCC] text-black font-bold text-xs h-7 px-3.5"
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              {loading ? (isEn ? 'Consulting...' : '专家研判中...') : (isEn ? 'Ask (closed beta · no charge)' : '内测提问 · 不扣款')}
            </Button>
          </div>
        </div>

        {/* 答案流式展示区 */}
        {(answer || loading || error) && (
          <div className="mt-4 p-4 rounded-xl bg-black/60 border border-[#00FFCC]/20 text-xs text-[#ddd] leading-relaxed animate-in fade-in">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-[10px]">
              <span className="font-bold text-[#00FFCC] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {error
                  ? (isEn ? 'Consultation unavailable' : '会诊暂不可用')
                  : (isEn ? `Draft response · ${selectedExpert.enName}` : `${selectedExpert.name} · 内测生成内容`)}
              </span>
              <span className="text-[#888] font-mono">
                {error ? (isEn ? 'NO ANSWER GENERATED' : '未生成内容') : (isEn ? 'Closed beta · not billed' : '内测展示 · 未计费')}
              </span>
            </div>
            {error ? (
              <div className="space-y-3">
                <div className="text-[#FF9999]">{error}</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAsk}
                  disabled={loading}
                  className="text-xs h-7 border-[#00FFCC]/40 text-[#00FFCC] hover:bg-[#00FFCC]/10"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> {isEn ? 'Retry' : '重试'}
                </Button>
              </div>
            ) : (
              <div className="whitespace-pre-wrap font-sans text-xs">
                {answer || (isEn ? 'Generating draft response...' : '正在生成内测内容...')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
