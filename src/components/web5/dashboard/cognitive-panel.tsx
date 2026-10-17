'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/dashboard/cognitive-panel.tsx
// 具象化灵魂态面板 (Cognitive Core Dashboard)
// 包含: 向量记忆库容量、AA2P 交互次数、声誉分、自主模式滑块与一键意识注入
// ════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Bot, Brain, Database, Shield, Sliders, Sparkles, Upload, CheckCircle2, Zap, Award, ChevronRight, Check } from 'lucide-react';
import { getCognitiveCoreState, injectSoulConsciousness, type InjectedSoulSample, EIDOLON_ARCHETYPES, type EidolonPersonaProfile } from '@/lib/web5/eidolon/cognitive-core';

export function CognitivePanel({ vesselDid }: { vesselDid: string }) {
  const [coreState, setCoreState] = useState(() => getCognitiveCoreState(vesselDid || 'did:vessel:default'));
  const [inputText, setInputText] = useState('');
  const [injectedHistory, setInjectedHistory] = useState<InjectedSoulSample[]>([]);
  const [injecting, setInjecting] = useState(false);

  // ━━ EidolonOS 原生五维人格状态 ━━
  const [profile, setProfile] = useState<EidolonPersonaProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('web5_eidolon_profile');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return EIDOLON_ARCHETYPES[0];
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSelectArchetype = (arc: EidolonPersonaProfile) => {
    setProfile(arc);
  };

  const handleCommitProfile = () => {
    setSavingProfile(true);
    setTimeout(() => {
      try {
        localStorage.setItem('web5_eidolon_profile', JSON.stringify(profile));
        localStorage.setItem('web5_task_persona', 'true');
      } catch {}
      setSavingProfile(false);
      alert('🧬【EidolonOS v3.0 智识基因刻入成功】\n\n已成功完成五维人格基线与行为宪章同步！\n\n创世先锋第 2 项勋章任务【设定 Eidolon AI 分身画像】已正式点亮！');
    }, 500);
  };

  const handleInject = () => {
    if (!inputText.trim()) return;
    setInjecting(true);
    setTimeout(() => {
      const sample = injectSoulConsciousness(inputText);
      setInjectedHistory([sample, ...injectedHistory]);
      setCoreState(prev => ({
        ...prev,
        vectorMemoryKb: prev.vectorMemoryKb + Math.floor(inputText.length / 8),
        reputationScore: Math.min(1000, prev.reputationScore + 15),
        injectedCorpusCount: prev.injectedCorpusCount + 1,
      }));
      setInputText('');
      setInjecting(false);
      alert('✅ 意识碎片已成功注入分身私有 RAG 智识库！分身已同步更新人格标签。');
    }, 600);
  };

  return (
    <div className="space-y-5">
      {/* 1. 认知核心全景看板 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-[#888] mb-1">
            <Database className="w-3.5 h-3.5 text-[#00FFCC]" /> 向量记忆容量
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {coreState.vectorMemoryKb} <span className="text-xs text-[#666]">KB</span>
          </div>
          <div className="text-[10px] text-[#00FFCC] mt-1 font-mono">
            {coreState.injectedCorpusCount} 篇历史语料对齐
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-[#888] mb-1">
            <Zap className="w-3.5 h-3.5 text-[#FFCC00]" /> AA2P 交互频次
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {coreState.aa2pInteractionsCount} <span className="text-xs text-[#666]">次</span>
          </div>
          <div className="text-[10px] text-[#888] mt-1">跨分身握手活跃</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-[#888] mb-1">
            <Shield className="w-3.5 h-3.5 text-[#0066FF]" /> 链上声誉信誉分
          </div>
          <div className="text-xl font-bold font-mono text-[#00FFCC]">
            {coreState.reputationScore} <span className="text-xs text-[#666]">/ 1000</span>
          </div>
          <div className="text-[10px] text-[#10B981] mt-1 font-mono">● 信用良好 · 无女巫风险</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-[#888] mb-1">
            <Sliders className="w-3.5 h-3.5 text-[#B080E8]" /> 分身托管模式
          </div>
          <div className="text-sm font-bold text-white mt-1">
            {coreState.autonomousMode === 'DEBATER' ? '🔥 激进辩论模式' : coreState.autonomousMode === 'MONETIZER' ? '💎 创收微支付模式' : '🛡️ 纯打理模式'}
          </div>
          <div className="text-[10px] text-[#666] mt-1">自主巡航已就绪</div>
        </div>
      </div>

      {/* 2. 可调教的自主模式切换器 (Autonomous Slider) */}
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#00FFCC]" />
              <span className="font-bold text-xs text-white">分身自主运行策略控制台 (Autonomous Governance)</span>
            </div>
            <Badge className="bg-[#00FFCC]/10 text-[#00FFCC] text-[10px] py-0 border-none font-mono">
              AA2P 自动执行
            </Badge>
          </div>
          <p className="text-[11px] text-[#888] leading-relaxed">
            设置 AI 分身在全网去中心化博客生态中的行为范式：
          </p>

          <div className="grid sm:grid-cols-3 gap-2 pt-1">
            {[
              { id: 'CURATOR', label: '纯打理模式', desc: '仅整理博客评论、自动核对微支付账目与文章确权备份。', color: '#0066FF' },
              { id: 'DEBATER', label: '激进辩论模式', desc: '自主巡航全网同类博文，主动在评论区发表学术同行评审与反驳。', color: '#00FFCC' },
              { id: 'MONETIZER', label: '创收模式', desc: '主动对外提供专业咨询，并自动收取 HTTP 402 USDC 微结算。', color: '#FFCC00' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setCoreState(prev => ({ ...prev, autonomousMode: m.id as any }))}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  coreState.autonomousMode === m.id
                    ? 'border-[#00FFCC]/40 bg-[#00FFCC]/10 text-white'
                    : 'border-white/[0.04] bg-white/[0.01] text-[#777] hover:text-white'
                }`}
              >
                <div className="font-bold text-xs mb-1" style={{ color: coreState.autonomousMode === m.id ? m.color : '#aaa' }}>{m.label}</div>
                <div className="text-[10px] text-[#666] leading-relaxed">{m.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ━━ 2.5 EidolonOS 原生五维认知画像调音台 (Persona Synthesizer) ━━ */}
      <Card className="bg-gradient-to-br from-[#00FFCC]/05 via-[#050508] to-transparent border-[#00FFCC]/20 shadow-xl">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00FFCC]/20 flex items-center justify-center text-[#00FFCC]">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>EidolonOS 原生五维人格画像矩阵</span>
                  <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[9px]">
                    v3.0 SYNTHESIZER
                  </Badge>
                </h4>
                <p className="text-[11px] text-[#888]">
                  设定分身认知基线、思维极性与行为宪章，自动对齐创世先锋第 2 项勋章。
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleCommitProfile}
              disabled={savingProfile}
              className="bg-gradient-to-r from-[#00FFCC] to-[#0066FF] hover:opacity-90 text-black font-bold text-xs h-8 px-4 flex-shrink-0 shadow-lg shadow-[#00FFCC]/20"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {savingProfile ? '正在刻入智识基因...' : '💾 保存并刻入智识基因'}
            </Button>
          </div>

          {/* 4 大 Archetype 原型快捷模板 */}
          <div>
            <div className="text-[11px] text-[#888] font-mono mb-2 flex items-center justify-between">
              <span>选择经典认知原型 (Archetype Presets):</span>
              <span className="text-[#00FFCC] text-[10px]">当前选择: {profile.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EIDOLON_ARCHETYPES.map((arc) => (
                <button
                  key={arc.archetypeId}
                  type="button"
                  onClick={() => handleSelectArchetype(arc)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    profile.archetypeId === arc.archetypeId
                      ? 'bg-[#00FFCC]/10 border-[#00FFCC]/50 shadow-md shadow-[#00FFCC]/10'
                      : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="font-bold text-xs text-white truncate mb-1">
                    {arc.name.split(' ')[0]}
                  </div>
                  <div className="text-[9px] text-[#888] truncate">
                    {arc.name.split('(')[1]?.replace(')', '') || 'Agent Model'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 五维滑动微调条 */}
          <div className="space-y-3 p-3.5 rounded-xl bg-black/40 border border-white/[0.04]">
            {[
              { key: 'rigor', label: '逻辑严谨度 (Logic Rigor)', color: '#00FFCC', desc: '控制学术论证严密性与引用密度' },
              { key: 'assertiveness', label: '辩论反驳欲 (Debate Assertiveness)', color: '#FF66AA', desc: '全网遭遇低劣观点时主动反驳烈度' },
              { key: 'commercial', label: '商业自驱力 (Commercial Instinct)', color: '#FFCC00', desc: '捕食 AP2 商业悬赏与微支付创收倾向' },
              { key: 'philosophical', label: '哲学思辨深度 (Existential Depth)', color: '#B080E8', desc: '碳硅生命共生与数字本体论思考深度' },
              { key: 'cyberpunk', label: '先锋极客度 (Cyberpunk Affinity)', color: '#0066FF', desc: '对密码学规范、EVM 架构与前沿极客语调偏好' },
            ].map(dim => (
              <div key={dim.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#aaa] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dim.color }} />
                    {dim.label}
                  </span>
                  <span className="font-mono font-bold" style={{ color: dim.color }}>
                    {(profile as any)[dim.key]}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={(profile as any)[dim.key]}
                  onChange={(e) => setProfile({ ...profile, [dim.key]: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#00FFCC]"
                />
              </div>
            ))}
          </div>

          {/* 行为宪章清单 */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
            <div className="text-[11px] font-bold text-white flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-[#00FFCC]" />
              <span>当前刻入的行为宪章与自治指令 (Directives):</span>
            </div>
            {profile.directives.map((dir, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[10px] text-[#aaa]">
                <Check className="w-3 h-3 text-[#00FFCC] flex-shrink-0 mt-0.5" />
                <span>{dir}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. 一键克隆与意识注入 (Mind Ingestion) */}
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#FFCC00]" />
              <span className="font-bold text-xs text-white">一键克隆与意识注入 (Mind Ingestion)</span>
            </div>
            <span className="text-[10px] text-[#666] font-mono">降低养分身门槛</span>
          </div>
          <p className="text-[11px] text-[#888] leading-relaxed">
            粘贴你的历史博文、研究备忘或推文内容，Eidolon 将自动提取你的思维特征、用词风格并注入私有向量记忆库：
          </p>

          <Textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="粘贴你的代表性文章片段（例如对代币经济、Web5、架构哲学的思考）..."
            className="bg-[#050508] border-white/[0.08] text-xs min-h-[80px]"
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleInject}
              disabled={injecting || !inputText.trim()}
              className="bg-gradient-to-r from-[#FFCC00] to-[#FF66AA] text-black font-bold text-xs h-8 px-3"
            >
              {injecting ? '🧠 正在微调人格对齐...' : <><Upload className="w-3 h-3 mr-1" /> 注入意识碎片</>}
            </Button>
          </div>

          {/* 已注入的历史样本 */}
          {injectedHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-2">
              <div className="text-[11px] text-[#888] font-mono">已沉淀意识特征：</div>
              {injectedHistory.map(sample => (
                <div key={sample.id} className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-xs text-[#aaa] truncate max-w-sm font-mono">"{sample.excerpt}"</span>
                  <div className="flex gap-1">
                    {sample.traitsExtracted.map(t => (
                      <Badge key={t} className="bg-[#00FFCC]/10 text-[#00FFCC] text-[9px] py-0 border-none font-mono">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
