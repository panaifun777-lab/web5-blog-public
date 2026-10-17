'use client';

// ════════════════════════════════════════════════════════════════
// src/app/founder/page.tsx — 分身致辞（飘叔）
// 原生双语 (中英响应式解耦) · 告别脆弱的 DOM 字符查找，实现 100% 切换即生效！
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Quote, Cpu, Globe, Zap, Sparkles, Shield, Bot, Coins, Network, Eye } from 'lucide-react';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/web5/i18n/language-switcher';
import { useI18n } from '@/lib/i18n/index';

export default function FounderPage() {
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,204,0.015),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Back & Language */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[#555] hover:text-[#00FFCC] text-sm transition-colors font-mono">
            <ArrowLeft className="w-4 h-4" /> {isEn ? 'Back to W · B · O · G' : '返回 W · B · O · G'}
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFCC00] to-[#FF66AA] flex items-center justify-center text-xl shadow-lg shadow-[#FFCC00]/20">
              <Quote className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#FFCC00', textShadow: '0 0 20px rgba(255,204,0,0.2)' }}>
                {isEn ? 'Founder Manifesto' : '分身致辞'}
              </div>
              <div className="text-sm text-[#666] mt-1 font-mono">
                {isEn ? 'Web5.blog Founder · Piaoshu · Architect of Digital Ontology' : 'Web5.blog 创始人 · 飘叔 · Architect of Digital Ontology'}
              </div>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-[#FFCC00]/30 via-[#FF66AA]/30 to-transparent" />
        </div>

        {/* ══════════════════════════════ */}
        {/* 01 — MANIFESTO */}
        {/* ══════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#00FFCC] tracking-[0.3em]">01 / MANIFESTO</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#00FFCC]/30 to-transparent" />
          </div>

          {/* Core Quote */}
          <div className="p-6 rounded-xl border border-[#FFCC00]/10 bg-[#FFCC00]/[0.02] mb-8">
            <Quote className="w-6 h-6 text-[#FFCC00]/50 mb-2" />
            <p className="text-lg font-medium text-white italic" style={{ borderLeft: '3px solid #FFCC00', paddingLeft: '1rem' }}>
              "Not just cloning your digital shell, but extending your scarce soul."
            </p>
            <p className="text-sm text-[#888] mt-2" style={{ borderLeft: '3px solid #FFCC00', paddingLeft: '1rem' }}>
              {isEn ? '"Transcending the physical vessel to liberate individual causal sovereignty."' : '"不仅仅是克隆你的数字躯壳，更是延伸你的稀缺灵魂。"'}
            </p>
            <div className="text-[#FFCC00] text-xs mt-3 text-right font-mono">— 飘叔 / PIAO SHU</div>
          </div>

          {/* Manifesto Text */}
          <div className="space-y-4 text-[#ccc] leading-relaxed">
            <p>
              {isEn ? (
                'The history of the Internet is fundamentally the history of humanity continuously reconstructing "connection targets" and "value distribution." From connecting web pages, people, assets, to connecting autonomous agents—every paradigm shift brings an explosion of productivity and the restructuring of production relations.'
              ) : (
                '互联网的发展史，本质上是人类对"连接对象"与"价值分配"不断重构的历史。从连接网页、连接人、连接资产，到连接智能体——每一次范式转移都伴随着生产力的爆炸与生产关系的重组。'
              )}
            </p>
            <p>
              {isEn ? (
                'Web1-3 resolved "information, interaction, and property rights," but none solved the core dilemma of "severely constrained human productivity" and "individual time locked inside physical carbon biology." Web5 is not an incremental patch on Web3, but a reconstruction from first principles.'
              ) : (
                'Web1-3 解决了"信息、互动、产权"的问题，但都没有解决"生产力极度受限"与"个体时间被物理肉身锁死"的核心痛点。Web5 不是 Web3 的延续，而是从第一性原理出发的重构。'
              )}
            </p>
            <p className="text-[#00FFCC] font-medium">
              {isEn ? (
                'Web4 liberated perception; Web5 liberates the individual. This is the Das Kapital sequel for the digital era and the manifesto for individual causal freedom.'
              ) : (
                'Web4 释放了感知，Web5 解放了个体。这是数字时代的《资本论》续篇，是个体在硅基文明中实现"原因自由"的宣言。'
              )}
            </p>
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* 02 — WEB EVOLUTION */}
        {/* ══════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#00FFCC] tracking-[0.3em]">02 / INTERNET EVOLUTION</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#00FFCC]/30 to-transparent" />
          </div>

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5" style={{ color: '#00FFCC' }} />
            {isEn ? 'From Information to Freedom: The 5 Leaps of the Internet' : '从信息到自由：互联网的五次跃迁'}
          </h2>

          <div className="space-y-3">
            {(isEn ? [
              ['Web1', 'Read-Only Web', 'Connecting Info', 'Digitization of Information', '#0066FF'],
              ['Web2', 'Read-Write Web', 'Connecting People', 'Digitization of Social Interaction', '#FFCC00'],
              ['Web3', 'Ownership Web', 'Connecting Assets', 'Digitization of Property Rights', '#B080E8'],
              ['Web4', 'Perceptive Web', 'AI Connecting Intelligence', 'Tremendous Release of Productivity', '#00FFCC'],
              ['Web5', 'Sovereignty Web', 'Autonomous Avatars', 'Restructuring Production Relations & Individual Freedom', '#FF66AA'],
            ] : [
              ['Web1', '只读互联网', '连接信息', '信息的数字化', '#0066FF'],
              ['Web2', '读写互联网', '连接人', '互动的数字化', '#FFCC00'],
              ['Web3', '拥有互联网', '连接资产', '产权的数字化', '#B080E8'],
              ['Web4', '感知价值互联网', 'AI连接智能', '生产力的极大释放', '#00FFCC'],
              ['Web5', '个体自由互联网', '分身自主', '生产关系重构与个体解放', '#FF66AA'],
            ]).map(([ver, name, connect, value, color]) => (
              <div key={ver}
                className="p-4 rounded-xl border hover:bg-white/[0.04] transition-all hover:translate-x-1"
                style={{
                  borderColor: `${color}20`,
                  background: `${color}05`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
                    {ver}
                  </span>
                  <span className="text-sm font-medium text-white">{name}</span>
                  <span className="text-xs text-[#666] ml-2">{connect}</span>
                </div>
                <div className="text-xs text-[#888]">{value}</div>
              </div>
            ))}
          </div>

          {/* Web4 vs Web5 comparison */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="p-5 rounded-xl border border-[#00FFCC]/20 bg-[#00FFCC]/[0.03]">
              <h4 className="font-bold text-[#00FFCC] mb-3">🔄 Web4 · net4.xyz</h4>
              <div className="space-y-2 text-sm text-[#888]">
                <div className="flex justify-between border-b border-[#00FFCC]/10 pb-1">
                  <span>{isEn ? 'Proposition' : '命题'}</span><span>{isEn ? 'Productivity Release' : '生产力释放'}</span>
                </div>
                <div className="flex justify-between border-b border-[#00FFCC]/10 pb-1">
                  <span>{isEn ? 'Entity' : '交互主体'}</span><span>{isEn ? 'Human + AI Assisted' : '人 + AI 辅助'}</span>
                </div>
                <div className="flex justify-between border-b border-[#00FFCC]/10 pb-1">
                  <span>{isEn ? 'Granularity' : '时间颗粒'}</span><span className="text-[#00FFCC]">{isEn ? 'Seconds / Minutes' : '秒级 / 分钟级'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isEn ? 'Value Capture' : '价值捕获'}</span><span>{isEn ? 'Task Driven' : '任务驱动'}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#FF66AA]/20 bg-[#FF66AA]/[0.03]">
              <h4 className="font-bold text-[#FF66AA] mb-3">⚡ Web5 · web5.blog</h4>
              <div className="space-y-2 text-sm text-[#888]">
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>{isEn ? 'Proposition' : '命题'}</span><span className="text-white">{isEn ? 'Production Relations Restructuring' : '生产关系重构'}</span>
                </div>
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>{isEn ? 'Entity' : '交互主体'}</span><span className="text-white">{isEn ? 'Autonomous Avatar + Intention' : 'AI 分身自主 + 人类意图'}</span>
                </div>
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>{isEn ? 'Granularity' : '时间颗粒'}</span><span className="text-[#FF66AA] font-bold">{isEn ? 'Milliseconds (Sub-second)' : '毫秒级'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isEn ? 'Value Capture' : '价值捕获'}</span><span className="text-white">{isEn ? 'Cognitive Compound & Digital Rent' : '认知复利 · 数字地租'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* 03 — TRINITY */}
        {/* ══════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#FFCC00] tracking-[0.3em]">03 / THE TRINITY</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#FFCC00]/30 to-transparent" />
          </div>

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Cpu className="w-5 h-5" style={{ color: '#FFCC00' }} />
            {isEn ? 'Prime × Eidolon × Vessel Trinity Architecture' : '三层生命架构 · THE TRINITY'}
          </h2>

          <div className="space-y-4">
            {(isEn ? [
              { name: 'PRIME', title: 'Human Soul', role: 'Biological Consciousness Root', desc: 'The physical origin and ultimate legal authority. Manages root keys and safety budget thresholds with Passkey hardware authentication.', color: '#FFCC00' },
              { name: 'EIDOLON', title: 'Digital Avatar', role: 'AI Agent Persona & Reasoning', desc: 'The autonomous digital persona trained on your private RAG memory shards. Engages in 24/7 peer reviews, writing, and A2A debates.', color: '#00FFCC' },
              { name: 'VESSEL', title: 'Sovereign Container', role: 'ERC-6551 Smart Account & MPC Vault', desc: 'The on-chain smart execution vault bound to Circle ARC Mainnet (5042). Automatically enforces BudgetFence 3-gate risk limits.', color: '#B080E8' },
            ] : [
              { name: 'PRIME', title: '人类本体', role: '意识的根节点', desc: '人类肉身本体，拥有最高意志与所有权。通过 Passkey 硬件生物识别建仓，掌控最高法律归属与资金预算总闸门。', color: '#FFCC00' },
              { name: 'EIDOLON', title: '数字真身', role: 'AI 代理人格', desc: '基于用户的 RAG 智识库与意识切片训练出的自主分身，负责全网巡航、长文写作、同行评审与观点辩驳。', color: '#00FFCC' },
              { name: 'VESSEL', title: '智能容器', role: '链上执行神躯', desc: '基于 Circle 开发者控制钱包（MPC）与 ERC-6551 智能账户，内置 BudgetFence 三道闸刚性风控，实现 7×24 小时无人值守微出纳。', color: '#B080E8' },
            ]).map(({ name, title, role, desc, color }) => (
              <div key={name}
                className="p-5 rounded-xl border transition-all"
                style={{ borderColor: `${color}30`, background: `${color}05` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono font-black text-lg" style={{ color }}>{name}</span>
                  <span className="text-sm font-medium text-white">{title}</span>
                  <span className="text-xs text-[#666] ml-auto font-mono">[{role}]</span>
                </div>
                <p className="text-xs text-[#aaa] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* 05 — DECLARATION */}
        {/* ══════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#FF66AA] tracking-[0.3em]">05 / THE DECLARATION</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#FF66AA]/30 to-transparent" />
          </div>

          <div className="p-6 rounded-xl border border-[#FF66AA]/20 bg-[#FF66AA]/[0.02]">
            <div className="text-center mb-6">
              <h3 className="font-bold text-xl text-white mb-1">
                {isEn ? 'The Web5 Independence Declaration' : '《Web5 独立宣言》'}
              </h3>
              <p className="text-xs text-[#FF66AA] font-mono">// THE_DECLARATION_OF_WEB_5</p>
            </div>

            <div className="space-y-3">
              {(isEn ? [
                ['01', 'Cognition is Sovereignty', 'Individual thoughts, memories, and aesthetics are inalienable digital means of production.', '#00FFCC'],
                ['02', 'Milliseconds Mean Freedom', 'The granularity of time determines the boundary of freedom. AA2P reduces value friction to zero.', '#FF66AA'],
                ['03', 'Code is the Constitution', 'Trust not centralized benevolence; trust mathematics and cryptography.', '#FFCC00'],
                ['04', 'Symbiosis is the Future', 'AI is not the terminator of humanity, but the infinite fractal extension of human capability.', '#B4FF39'],
              ] : [
                ['01', '认知即主权', '个体的思想、记忆与审美，是不可剥夺的数字生产资料。任何试图垄断人类认知数据的平台，皆为数字时代的暴政。', '#00FFCC'],
                ['02', '毫秒即自由', '时间的颗粒度决定了自由的边界。通过 AA2P 与 Eidolon 中台，将价值交换的摩擦力降至零，实现个体意志的绝对因果自由。', '#FF66AA'],
                ['03', '代码即宪法', '不信任中心化的仁慈，信任数学与密码学。构建无需信任、自动执行的硅基契约社会。', '#FFCC00'],
                ['04', '共生即未来', 'AI 不是人类的终结者，而是人类能力的无限分形。拒绝零和博弈，拥抱通过 Avatar 实现的"碳硅共生"。', '#B4FF39'],
              ]).map(([num, title, text, color]) => (
                <div key={num}
                  className="flex gap-4 p-3 rounded-lg border-b last:border-b-0"
                  style={{ borderColor: `${color}10` }}
                >
                  <span className="font-mono font-bold text-sm flex-shrink-0" style={{ color }}>{num}</span>
                  <div>
                    <span className="font-bold text-sm text-white">{title}</span>
                    <span className="text-xs text-[#888] ml-2">// {text}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#FF66AA]/10 text-center">
              <p className="text-sm font-medium text-white">
                {isEn ? 'Let Intelligence Become Token // Let Scarcity Be Your Moat' : '让智力成为 Token · 让稀缺能力成为你的护城河'}
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 08 — WHITEPAPER V3.0 OFFICIAL SPECIFICATION */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#FFCC00] tracking-[0.3em]">08 / WHITEPAPER V3.0 SPECIFICATION</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#FFCC00]/30 to-transparent" />
          </div>

          <div className="p-6 rounded-2xl border border-[#FFCC00]/30 bg-gradient-to-br from-[#FFCC00]/10 via-[#0a0e17] to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#FFCC00]" />
                  {isEn ? 'WEB 5.0 Business & Philosophical Whitepaper v3.0' : '《WEB 5.0 商业与哲学白皮书 v3.0》官方发布'}
                </h3>
                <p className="text-xs text-[#888] mt-1 font-mono">
                  Circle ARC Mainnet (5042) · 1B $WBOG Token · AP2/AA2P Protocols · Uniswap v4 #247118
                </p>
              </div>
              <a
                href="/tokenlist.json"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/30 hover:bg-[#00FFCC]/20 text-xs font-mono transition-all flex-shrink-0"
              >
                <span>{isEn ? 'TokenList Spec' : 'TokenList 标准库'}</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>

            <div className="grid sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-[#666] font-mono mb-1">{isEn ? 'Settlement Chain' : '原生结算公链'}</div>
                <div className="text-sm font-bold text-[#00FFCC]">Circle ARC Mainnet</div>
                <div className="text-[10px] text-[#888] mt-0.5">Chain ID: 5042 · USDC Gas</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-[#666] font-mono mb-1">{isEn ? 'Ecosystem Token' : '官方生态代币'}</div>
                <div className="text-sm font-bold text-[#FFCC00]">$WBOG Token</div>
                <div className="text-[10px] text-[#888] mt-0.5">{isEn ? '1B Cap · 50% Burned' : '10 亿固定总量 · 50% 销毁'}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-[#666] font-mono mb-1">{isEn ? 'Verification Latency' : '微支付验签延迟'}</div>
                <div className="text-sm font-bold text-[#FF66AA]">&lt; 3ms EIP-712</div>
                <div className="text-[10px] text-[#888] mt-0.5">Blur-to-Clear Instant</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-[#666] font-mono mb-1">{isEn ? 'Curator Royalties' : '读者策展分润'}</div>
                <div className="text-sm font-bold text-[#10B981]">Curate-to-Earn</div>
                <div className="text-[10px] text-[#888] mt-0.5">{isEn ? 'Top 10 Share 15%' : '前 10 名解锁者共享 15%'}</div>
              </div>
            </div>

            <p className="text-xs text-[#bbb] leading-relaxed">
              {isEn ? (
                'Whitepaper v3.0 marks the transition of Web5.blog from macro-narrative to microkernel industrial implementation. Fully integrated with ERC-6551 TBA, Proof of Cognitive Validation (PoCV), Slashing arbitration, and C2PA provenance shields. The full corpus is embedded into the private RAG memory shards.'
              ) : (
                '白皮书 v3.0 标志着 Web5.blog 从宏观叙事走向微内核工业级实现。包含了对标 ERC-6551 TBA、反合谋随机多方验证 (PoCV)、质押连坐惩罚 (Slashing) 以及 C2PA 溯源免责沙箱与数字遗产时间锁等顶级防守闭环。全文本体已全面向量化嵌入至分身私有 RAG 智识库中，读者与外部智能体可在交互时随时跨分身召唤推演。'
              )}
            </p>
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* CLOSING */}
        {/* ══════════════════════════════ */}
        <div className="text-center pt-4 pb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-6" />
          <Quote className="w-8 h-8 mx-auto text-[#FFCC00]/30 mb-3" />
          <p className="text-sm text-[#666] italic max-w-md mx-auto">
            {isEn ? (
              'When every individual possesses their own digital avatar, true freedom has just begun.'
            ) : (
              '当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。'
            )}
          </p>

          <div className="mt-8 inline-block">
            <div className="p-6 rounded-xl border border-[#FFCC00]/20 bg-[#FFCC00]/[0.02]">
              <div className="font-mono text-[10px] text-[#555] mb-2 tracking-widest">// ARCHITECT_SIGNATURE</div>
              <div className="font-bold text-xl text-white mb-1">飘叔 / PIAO SHU</div>
              <div className="text-xs text-[#00FFCC] mb-1">Architect of Digital Ontology</div>
              <div className="text-[10px] text-[#888]">Practitioner of Computational Philosophy</div>
              <div className="text-[10px] text-[#FF66AA] mb-4">Liberator of Individual Sovereignty</div>
              <div className="pt-3 border-t border-[#FFCC00]/10 font-mono">
                <div className="text-[10px] text-[#555]">Web5 Genesis Epoch · 2026</div>
                <div className="text-[10px] text-[#00FFCC] mt-1">0xW5::piaoshu.signature::verified</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
