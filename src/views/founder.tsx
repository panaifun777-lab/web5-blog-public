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
import { localizePath } from '@/lib/i18n/routing';

export default function FounderPage() {
  const { locale, t } = useI18n();

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,204,0.015),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Back & Language */}
        <div className="flex items-center justify-between mb-8">
          <Link href={localizePath('/', locale)} className="inline-flex items-center gap-2 text-[#555] hover:text-[#00FFCC] text-sm transition-colors font-mono">
            <ArrowLeft className="w-4 h-4" /> {t('founderX.backToWbog')}
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
                {t('founder.title')}
              </div>
              <div className="text-sm text-[#666] mt-1 font-mono">
                {t('founderX.subtitle')}
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
              {t('founderX.closingQuote')}
            </p>
            <div className="text-[#FFCC00] text-xs mt-3 text-right font-mono">— 飘叔 / PIAO SHU</div>
          </div>

          {/* Manifesto Text */}
          <div className="space-y-4 text-[#ccc] leading-relaxed">
            <p>
              {t('founderX.manifestoHist')}
            </p>
            <p>
              {t('founderX.manifestoWeb')}
            </p>
            <p className="text-[#00FFCC] font-medium">
              {t('founderX.manifestoWeb5')}
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
            {t('founderX.internetEvoTitle')}
          </h2>

          <div className="space-y-3">
            {[
              ['Web1', t('founderX.internetEvoName1'), t('founderX.internetEvoConnect1'), t('founderX.internetEvoValue1'), '#0066FF'],
              ['Web2', t('founderX.internetEvoName2'), t('founderX.internetEvoConnect2'), t('founderX.internetEvoValue2'), '#FFCC00'],
              ['Web3', t('founderX.internetEvoName3'), t('founderX.internetEvoConnect3'), t('founderX.internetEvoValue3'), '#B080E8'],
              ['Web4', t('founderX.internetEvoName4'), t('founderX.internetEvoConnect4'), t('founderX.internetEvoValue4'), '#00FFCC'],
              ['Web5', t('founderX.internetEvoName5'), t('founderX.internetEvoConnect5'), t('founderX.internetEvoValue5'), '#FF66AA'],
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
                  <span>{t('founderX.compareProposition')}</span><span>{t('founderX.compareProductivityRelease')}</span>
                </div>
                <div className="flex justify-between border-b border-[#00FFCC]/10 pb-1">
                  <span>{t('founderX.compareEntity')}</span><span>{t('founderX.compareHumanAi')}</span>
                </div>
                <div className="flex justify-between border-b border-[#00FFCC]/10 pb-1">
                  <span>{t('founderX.compareGranularity')}</span><span className="text-[#00FFCC]">{t('founderX.compareSecondsMinutes')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('founderX.compareValueCapture')}</span><span>{t('founderX.compareTaskDriven')}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#FF66AA]/20 bg-[#FF66AA]/[0.03]">
              <h4 className="font-bold text-[#FF66AA] mb-3">⚡ Web5 · web5.blog</h4>
              <div className="space-y-2 text-sm text-[#888]">
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>{t('founderX.compareProposition')}</span><span className="text-white">{t('founderX.compareProdRelations')}</span>
                </div>
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>{t('founderX.compareEntity')}</span><span className="text-white">{t('founderX.compareAvatarIntention')}</span>
                </div>
                <div className="flex justify-between border-b border-[#FF66AA]/10 pb-1">
                  <span>{t('founderX.compareGranularity')}</span><span className="text-[#FF66AA] font-bold">{t('founderX.compareMilliseconds')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('founderX.compareValueCapture')}</span><span className="text-white">{t('founderX.compareCognitiveRent')}</span>
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
            {t('founderX.trinityTitle')}
          </h2>

          <div className="space-y-4">
            {[
              { name: 'PRIME', title: t('founderX.trinityCardTitle1'), role: t('founderX.trinityCardRole1'), desc: t('founderX.trinityCardDesc1'), color: '#FFCC00' },
              { name: 'EIDOLON', title: t('founderX.trinityCardTitle2'), role: t('founderX.trinityCardRole2'), desc: t('founderX.trinityCardDesc2'), color: '#00FFCC' },
              { name: 'VESSEL', title: t('founderX.trinityCardTitle3'), role: t('founderX.trinityCardRole3'), desc: t('founderX.trinityCardDesc3'), color: '#B080E8' },
            ].map(({ name, title, role, desc, color }) => (
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
                {t('founderX.declarationTitle')}
              </h3>
              <p className="text-xs text-[#FF66AA] font-mono">// THE_DECLARATION_OF_WEB_5</p>
            </div>

            <div className="space-y-3">
              {[
                ['01', t('founderX.declItemTitle1'), t('founderX.declItemText1'), '#00FFCC'],
                ['02', t('founderX.declItemTitle2'), t('founderX.declItemText2'), '#FF66AA'],
                ['03', t('founderX.declItemTitle3'), t('founderX.declItemText3'), '#FFCC00'],
                ['04', t('founderX.declItemTitle4'), t('founderX.declItemText4'), '#B4FF39'],
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
              <p className="text-sm font-medium text-white">
                {t('founderX.declarationClosing')}
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
                  {t('founderX.whitepaperTitle')}
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
                <span>{t('founderX.tokenListSpec')}</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>

            <div className="grid sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-[#666] font-mono mb-1">{t('founderX.settlementChain')}</div>
                <div className="text-sm font-bold text-[#00FFCC]">Circle ARC Mainnet</div>
                <div className="text-[10px] text-[#888] mt-0.5">Chain ID: 5042 · USDC Gas</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-[#666] font-mono mb-1">{t('founderX.ecosystemToken')}</div>
                <div className="text-sm font-bold text-[#FFCC00]">$WBOG Token</div>
                <div className="text-[10px] text-[#888] mt-0.5">{t('founderX.tokenCap')}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-[#666] font-mono mb-1">{t('founderX.verificationLatency')}</div>
                <div className="text-sm font-bold text-[#FF66AA]">&lt; 3ms EIP-712</div>
                <div className="text-[10px] text-[#888] mt-0.5">Blur-to-Clear Instant</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-[#666] font-mono mb-1">{t('founderX.curatorRoyalties')}</div>
                <div className="text-sm font-bold text-[#10B981]">Curate-to-Earn</div>
                <div className="text-[10px] text-[#888] mt-0.5">{t('founderX.curatorShare')}</div>
              </div>
            </div>

            <p className="text-xs text-[#bbb] leading-relaxed">
              {t('founderX.whitepaperDesc')}
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
            {t('founderX.closingQuote2')}
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
