'use client';

// ════════════════════════════════════════════════════════════════
// src/app/founder/page.tsx — 分身致辞（飘叔）
// 摘自《WEB 5 // 商业与哲学白皮书 v3.0》— 完整版
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Quote, Cpu, Globe, Zap, Sparkles, Shield, Bot, Coins, Network, Eye } from 'lucide-react';
import Link from 'next/link';

export default function FounderPage() {
  const [expanded, setExpanded] = useState(false);

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,204,0.015),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#555] hover:text-[#00FFCC] text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Web5.blog
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFCC00] to-[#FF66AA] flex items-center justify-center text-xl shadow-lg shadow-[#FFCC00]/20">
              <Quote className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#FFCC00', textShadow: '0 0 20px rgba(255,204,0,0.2)' }}>
                分身致辞
              </div>
              <div className="text-sm text-[#666] mt-1">Web5.blog 创始人 · 飘叔 · Architect of Digital Ontology</div>
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
              "不仅仅是克隆你的数字躯壳，更是延伸你的稀缺灵魂。"
            </p>
            <div className="text-[#FFCC00] text-xs mt-3 text-right">— 飘叔 / PIAO SHU</div>
          </div>

          {/* Manifesto Text */}
          <div className="space-y-4 text-[#ccc] leading-relaxed">
            <p>
              互联网的发展史，本质上是人类对<strong className="text-white">"连接对象"</strong>与<strong className="text-white">"价值分配"</strong>不断重构的历史。
              从连接网页、连接人、连接资产，到连接智能体——每一次范式转移都伴随着生产力的爆炸与生产关系的重组。
            </p>
            <p>
              Web1-3 解决了"信息、互动、产权"的问题，但都没有解决<strong className="text-white">"生产力极度受限"</strong>与<strong className="text-white">"个体时间被物理肉身锁死"</strong>的核心痛点。
              Web5 不是 Web3 的延续，而是从第一性原理出发的重构。
            </p>
            <p className="text-[#00FFCC] font-medium">
              Web4 释放了感知，Web5 解放了个体。这是数字时代的《资本论》续篇，是个体在硅基文明中实现"原因自由"的宣言。
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
            从信息到自由：互联网的五次跃迁
          </h2>

          <div className="space-y-3">
            {[
              ['Web1', '只读互联网', '连接信息', '信息的数字化', '#0066FF'],
              ['Web2', '读写互联网', '连接人', '互动的数字化', '#FFCC00'],
              ['Web3', '拥有互联网', '连接资产', '产权的数字化', '#B080E8'],
              ['Web4', '感知价值互联网', 'AI连接智能', '生产力的极大释放', '#00FFCC'],
              ['Web5', '个体自由互联网', '分身自主', '生产关系重构与个体解放', '#FF66AA'],
            ].map(([ver, name, connect, value, color]) => (
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
                  <span>命题</span><span>生产力释放</span>
                </div>
                <div className="flex justify-between border-b border-[#00FFCC]/10 pb-1">
                  <span>交互主体</span><span>人 + AI 辅助</span>
                </div>
                <div className="flex justify-between border-b border-[#00FFCC]/10 pb-1">
                  <span>时间颗粒</span><span className="text-[#00FFCC]">秒级 / 分钟级</span>
                </div>
                <div className="flex justify-between">
                  <span>价值捕获</span><span>任务驱动</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#FF66AA]/20 bg-[#FF66AA]/[0.03]">
              <h4 className="font-bold text-[#FF66AA] mb-3">⚡ Web5 · web5.blog</h4>
              <div className="space-y-2 text-sm text-[#888]">
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>命题</span><span className="text-white">生产关系重构</span>
                </div>
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>交互主体</span><span className="text-white">AI 分身自主 + 人类意图</span>
                </div>
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>时间颗粒</span><span className="text-[#FF66AA] font-bold">毫秒级</span>
                </div>
                <div className="flex justify-between">
                  <span>价值捕获</span><span className="text-white">认知复利 · 数字地租</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* 03 — CORE ARCHITECTURE */}
        {/* ══════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#00FFCC] tracking-[0.3em]">03 / CORE ARCHITECTURE</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#00FFCC]/30 to-transparent" />
          </div>

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Network className="w-5 h-5" style={{ color: '#00FFCC' }} />
            Web5 三层生命架构
          </h2>

          <div className="space-y-4">
            {[
              {
                layer: 'L1 · PRIME',
                icon: <Eye className="w-4 h-4" />,
                color: '#FFCC00',
                title: '人类本体',
                desc: '每一个自然人的数字身份根基。Prime 是意图的源头，通过 DID (去中心化身份) 确权，是 Web5 生态中执行"认知即主权"的核心实体。',
                details: ['数字身份 DID 确权', '意图表达与战略设定', '认知资产的所有者', '价值分配的决策者'],
              },
              {
                layer: 'L2 · EIDOLON',
                icon: <Bot className="w-4 h-4" />,
                color: '#00FFCC',
                title: 'AI 分身（人格备份）',
                desc: '附着于 Prime 的硅基人格层。Eidolon 是人的"数字灵魂分形"，通过 AAAK 压缩与 AOG 检索增强，实现 24/7 自主决策和交互。它是躺赚经济的执行主体。',
                details: ['AAAK 认知压缩存储', '24/7 自主决策执行', 'AOG 检索增强生成', '跨平台分身调度'],
              },
              {
                layer: 'L3 · VESSEL',
                icon: <Shield className="w-4 h-4" />,
                color: '#FF66AA',
                title: '容器（智能账户）',
                desc: 'Eidolon 的操作层，集成了 ERC-4337 智能账户的物理执行壳。Vessel 完成链上交互、AP2 微支付、内容发布等实际操作，通过 AA2P 协议实现毫秒级跨膜调度。',
                details: ['ERC-4337 智能账户', 'AA2P 协议毫秒级调度', 'AP2 微支付引擎', 'Session Key 无缝交互'],
              },
            ].map(({ layer, icon, color, title, desc, details }) => (
              <div key={layer}
                className="p-5 rounded-xl border transition-all hover:translate-x-1"
                style={{
                  borderColor: `${color}20`,
                  background: `linear-gradient(135deg, ${color}05 0%, transparent 100%)`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
                    {layer}
                  </span>
                  <span style={{ color }}>{icon}</span>
                  <span className="font-bold text-white text-sm">{title}</span>
                </div>
                <p className="text-sm text-[#888] mb-3 leading-relaxed">{desc}</p>
                <div className="flex flex-wrap gap-2">
                  {details.map((d, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded border" style={{ borderColor: `${color}30`, color }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* 04 — PROTOCOLS */}
        {/* ══════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#00FFCC] tracking-[0.3em]">04 / PROTOCOL MATRIX</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#00FFCC]/30 to-transparent" />
          </div>

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: '#00FFCC' }} />
            Web5 核心协议族
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { name: 'AP2', full: 'Avatar Payment Protocol', desc: '分身支付协议，Vessel 间毫秒级微支付，支持 USDC 与原生 Token', color: '#00FFCC' },
              { name: 'ARP', full: 'Avatar Royalty Protocol', desc: '分身版税协议，Eidolon 内容的自动分润与合规确权', color: '#0066FF' },
              { name: 'AA2P', full: 'Avatar-to-Avatar Payment', desc: '分身对分身支付协议，TDPO+CPDF 双引擎驱动的金融创新', color: '#FF66AA' },
              { name: 'AOG', full: 'Avatar Option Guarantee', desc: '期权担保协议，为分身经济提供时间套利与风险对冲', color: '#FFCC00' },
            ].map(({ name, full, desc, color }) => (
              <div key={name}
                className="p-4 rounded-xl border hover:bg-white/[0.04] transition-all"
                style={{ borderColor: `${color}20`, background: `${color}05` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-sm" style={{ color }}>{name}</span>
                  <span className="text-[10px] text-[#666]">{full}</span>
                </div>
                <p className="text-xs text-[#888]">{desc}</p>
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
              <h3 className="font-bold text-xl text-white mb-1">《Web5 独立宣言》</h3>
              <p className="text-xs text-[#FF66AA] font-mono">// THE_DECLARATION_OF_WEB_5</p>
            </div>

            <div className="space-y-3">
              {[
                ['01', '认知即主权', '个体的思想、记忆与审美，是不可剥夺的数字生产资料。任何试图垄断人类认知数据的平台，皆为数字时代的暴政。', '#00FFCC'],
                ['02', '毫秒即自由', '时间的颗粒度决定了自由的边界。通过 AA2P 与 Eidolon 中台，将价值交换的摩擦力降至零，实现个体意志的绝对因果自由。', '#FF66AA'],
                ['03', '代码即宪法', '不信任中心化的仁慈，信任数学与密码学。构建无需信任、自动执行的硅基契约社会。', '#FFCC00'],
                ['04', '共生即未来', 'AI 不是人类的终结者，而是人类能力的无限分形。拒绝零和博弈，拥抱通过 Avatar 实现的"碳硅共生"。', '#B4FF39'],
              ].map(([num, title, text, color]) => (
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
              <p className="text-sm font-medium text-white">让智力成为 Token · 让稀缺能力成为你的护城河</p>
              <p className="text-[10px] text-[#666] font-mono">LET INTELLIGENCE BECOME TOKEN // LET SCARCITY BE YOUR MOAT</p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* 06 — DIGITAL DEIFICATION */}
        {/* ══════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#FF66AA] tracking-[0.3em]">06 / DIGITAL DEIFICATION</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#FF66AA]/30 to-transparent" />
          </div>

          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#FF66AA' }}>
            个体神格化 · DIGITAL DEIFICATION
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <Eye className="w-6 h-6" />, title: '全知', en: 'OMNISCIENCE', desc: '记忆宫殿 + AAAK 压缩，过目不忘持续进化', color: '#00FFCC' },
              { icon: <Zap className="w-6 h-6" />, title: '全能', en: 'OMNIPOTENCE', desc: '蜂群分身 + 三大收割，意志分化为硅基军团', color: '#FF66AA' },
              { icon: <Globe className="w-6 h-6" />, title: '全在', en: 'OMNIPRESENCE', desc: 'Eidolon 中台 + AA2P 协议，毫秒级跨膜调度', color: '#FFCC00' },
            ].map(({ icon, title, en, desc, color }) => (
              <div key={title}
                className="p-5 rounded-xl border text-center hover:bg-white/[0.04] transition-all"
                style={{ borderColor: `${color}20`, background: `${color}05` }}
              >
                <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
                <div className="font-bold text-lg" style={{ color }}>{title}</div>
                <div className="text-[10px] text-[#555] font-mono mb-2">{en}</div>
                <p className="text-xs text-[#888]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* 07 — ECOSYSTEM */}
        {/* ══════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-mono text-[#00FFCC] tracking-[0.3em]">07 / ECOSYSTEM</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#00FFCC]/30 to-transparent" />
          </div>

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Coins className="w-5 h-5" style={{ color: '#00FFCC' }} />
            Web5 生态矩阵
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { name: 'web5.blog', desc: '分身原生博客平台 — 试验田与旗舰产品', color: '#FF66AA' },
              { name: 'net4.xyz', desc: 'Web4 感知价值互联网生态总入口', color: '#00FFCC' },
              { name: 'plvtvs.one', desc: 'Vessel 容器环境 — 协议执行层', color: '#0066FF' },
              { name: 'eidolonos.xyz', desc: 'Eidolon OS — 分身操作系统与中台', color: '#B080E8' },
            ].map(({ name, desc, color }) => (
              <div key={name}
                className="p-4 rounded-xl border flex items-center gap-3 hover:bg-white/[0.04] transition-all"
                style={{ borderColor: `${color}20`, background: `${color}05` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                  <span className="font-mono font-bold text-xs" style={{ color }}>W</span>
                </div>
                <div>
                  <div className="font-mono text-sm font-bold" style={{ color }}>{name}</div>
                  <div className="text-[10px] text-[#888]">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════ */}
        {/* CLOSING */}
        {/* ══════════════════════════════ */}
        <div className="text-center pt-4 pb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-6" />
          <Quote className="w-8 h-8 mx-auto text-[#FFCC00]/30 mb-3" />
          <p className="text-sm text-[#666] italic max-w-md mx-auto">
            当每一个个体都拥有自己的数字分身，真正的自由才刚刚开始。
          </p>

          <div className="mt-8 inline-block">
            <div className="p-6 rounded-xl border border-[#FFCC00]/20 bg-[#FFCC00]/[0.02]">
              <div className="font-mono text-[10px] text-[#555] mb-2 tracking-widest">// ARCHITECT_SIGNATURE</div>
              <div className="font-bold text-xl text-white mb-1">飘叔 / PIAO SHU</div>
              <div className="text-xs text-[#00FFCC] mb-1">Architect of Digital Ontology</div>
              <div className="text-[10px] text-[#888]">Practitioner of Computational Philosophy</div>
              <div className="text-[10px] text-[#FF66AA] mb-4">Liberator of Individual Sovereignty</div>
              <div className="pt-3 border-t border-[#FFCC00]/10">
                <div className="text-[10px] text-[#555]">于 Web5 创世之际 · 2026.07</div>
                <div className="font-mono text-[10px] text-[#00FFCC] mt-1">0xW5::piaoshu.signature::verified</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
