'use client';

// ════════════════════════════════════════════════════════════════
// Web5.blog  v2.0 — 设计报告全量实现
// 调性: 暗色数字圣殿 · 协议级精密 · 三层视觉映射
// 参考: web4.ai / ai-insight / second-me / huggingface / moltbook
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { ScanRitual } from '@/components/web5/ritual/scan-ritual';
import { MatrixRain } from '@/components/web5/effects/matrix-rain';
import { getCurrentVesselSession, revokeVesselSession } from '@/lib/web5/vessel-auth';
import type { VesselSession } from '@/lib/web5/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cpu, BookOpen, Users, Globe, Target, Bot, Sparkles, Eye, Wallet, Twitter,
  ChevronRight, TrendingUp, Radio, FileText, MessageCircle, Heart, Share2,
  Search, LogOut, Zap, Shield, Activity, ArrowUpRight, Clock, Hash, Quote,
} from 'lucide-react';

import { BlogFeed } from '@/components/web5/blog/blog-feed';
import { Writer } from '@/components/web5/write/writer';
import { ExplorePanel } from '@/components/web5/explore/explore-panel';
import { MyVessels } from '@/components/web5/dashboard/my-vessels';
import { SettingsPanel } from '@/components/web5/settings/settings-panel';
import { LanguageSwitcher } from '@/components/web5/i18n/language-switcher';
import { Footer } from '@/components/web5/footer';

// ━━ 协议色语义映射 ━━
const COLORS = {
  prime: '#FFCC00', eidolon: '#00FFCC', vessel: '#B080E8',
  ap2: '#0066FF', arp: '#FF66AA',
} as const;

type View = 'ritual' | 'app';
type Tab = 'feed' | 'write' | 'vessels' | 'explore' | 'settings';
type Module = 'tech' | 'humanities' | 'crowdfunding' | 'crowdsourcing' | 'bounties' | 'experts';

const MODULES: Record<Module, { label: string; icon: React.ReactNode; color: string }> = {
  tech:          { label: '科技',          icon: <Cpu />,      color: '#00FFCC' },
  humanities:    { label: '人文',          icon: <BookOpen />, color: '#FFCC00' },
  crowdfunding:  { label: '众筹',          icon: <Users />,    color: '#B080E8' },
  crowdsourcing: { label: '众包',          icon: <Globe />,    color: '#FF66AA' },
  bounties:      { label: '悬赏',          icon: <Target />,   color: '#FF6633' },
  experts:       { label: 'AI专家',         icon: <Bot />,      color: '#0066FF' },
};

// ━━ 趋势数据（demo） ━━
const TRENDING = [
  { rank: 1, title: 'Web5 宣言：从 Web3 到个人解放的范式跃迁', views: 2341, tag: '科技' },
  { rank: 2, title: 'Vessel 经济模型深度分析：AP2 收益机制', views: 1890, tag: '众筹' },
  { rank: 3, title: 'AP2 协议实战：三步实现微支付分润', views: 1567, tag: '科技' },
  { rank: 4, title: 'AI 分身哲学：Eidolon 人格的边界在哪里', views: 1234, tag: '人文' },
  { rank: 5, title: '从 Observer 到 Vessel：转化率优化指南', views: 987, tag: 'AI专家' },
  { rank: 6, title: '数字解放：飘叔 的治理哲学', views: 876, tag: '人文' },
  { rank: 7, title: 'Arweave + Irys：永久存储的技术实现', views: 765, tag: '科技' },
];

export default function Home() {
  const [session, setSession] = useState<VesselSession | null>(() => {
    if (typeof window === 'undefined') return null;
    // 优先从 sessionStorage 恢复
    const stored = getCurrentVesselSession();
    if (stored) return stored;
    // 检查 Twitter OAuth 回调
    const params = new URLSearchParams(window.location.search);
    const twitterSession = params.get('twitter_session');
    const twitterLogin = params.get('twitter_login');
    if (twitterSession && twitterLogin === 'success') {
      try {
        const parsed = JSON.parse(decodeURIComponent(twitterSession));
        sessionStorage.setItem('web5_vessel_session', JSON.stringify(parsed));
        // 清理 URL 参数
        window.history.replaceState({}, '', window.location.pathname);
        return parsed;
      } catch {}
    }
    return null;
  });
  const [view, setView] = useState<View>(session ? 'app' : 'ritual');
  const [tab, setTab] = useState<Tab>('feed');
  const [activeModule, setActiveModule] = useState<Module>('tech');
  const [loginMethod, setLoginMethod] = useState<'vessel' | 'wallet' | 'twitter' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRitualSuccess = (s: VesselSession) => {
    setSession(s); setView('app'); setTab('feed'); setLoginMethod(null);
  };
  const handleLogout = async () => {
    await revokeVesselSession(); setSession(null); setView('ritual');
  };

  // ━━ UNATHED — RitualLanding ━━
  if (view === 'ritual') return <RitualLanding loginMethod={loginMethod} setLoginMethod={setLoginMethod} handleRitualSuccess={handleRitualSuccess} setSession={setSession} setView={setView} setTab={setTab} />;

  // ━━ AUTHED — Main App ━━
  return (
    <main className="min-h-screen bg-[#050508] text-white flex flex-col">
      {/* Matrix Rain background */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <MatrixRain columns={32} className="w-full h-full" />
      </div>
      {/* Ambient gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,255,204,0.02),transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,102,255,0.015),transparent_60%)] pointer-events-none" />

      {/* ━━ Header ━━ */}
      <header className="relative z-50 border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-2xl sticky top-0">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFCC] to-[#0066FF] flex items-center justify-center text-xs font-black text-black shadow-lg shadow-[#00FFCC]/20">W5</div>
            <span className="font-bold tracking-tight hidden sm:block">Web5.blog</span>
          </div>

          {/* Search (huggingface style) */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索文章、合约、用户..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-[#555] outline-none focus:border-[#00FFCC]/30 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Module Tabs */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {Object.entries(MODULES).map(([key, m]) => (
              <button key={key} onClick={() => { setActiveModule(key as Module); setTab('feed'); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap"
                style={{
                  color: activeModule === key ? m.color : '#555',
                  backgroundColor: activeModule === key ? `${m.color}10` : 'transparent',
                  borderLeft: activeModule === key ? `2px solid ${m.color}` : '2px solid transparent',
                }}
              >{m.icon}<span>{m.label}</span></button>
            ))}
            {/* Founder link */}
            <a href="/founder"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap text-[#555] hover:text-[#FFCC00] hover:bg-[#FFCC00]/10"
              style={{ borderLeft: '2px solid transparent' }}
            >
              <Quote className="w-3.5 h-3.5" />
              <span>分身致辞</span>
            </a>
            {/* Language switcher */}
            <LanguageSwitcher />
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setTab('write')}
              className="text-[#00FFCC] hover:text-[#00FFCC]/80 text-xs h-8 hidden sm:flex">
              <Zap className="w-3.5 h-3.5 mr-1" />Write
            </Button>
            {session ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/20 text-[10px] h-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B080E8] mr-1.5 animate-pulse" />
                  VESSEL
                </Badge>
                <Button size="sm" variant="ghost" onClick={handleLogout}
                  className="text-[#555] hover:text-[#FF66AA] h-8 w-8 p-0"><LogOut className="w-3.5 h-3.5" /></Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ━━ Main Content — Dual Column ━━ */}
      <div className="relative z-10 flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-6">
        <div className="flex gap-8">
          {/* Left Column — Content */}
          <div className="flex-1 min-w-0">
            {/* Module header */}
            <div className="mb-6 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <span style={{ color: MODULES[activeModule].color, filter: `drop-shadow(0 0 6px ${MODULES[activeModule].color}40)` }}>
                  {MODULES[activeModule].icon}
                </span>
                <h2 className="text-lg font-bold">{MODULES[activeModule].label}</h2>
                <span className="text-xs text-[#555] hidden sm:inline">— trending in</span>
              </div>
            </div>
            {/* Module description */}
            <ModuleDesc module={activeModule} />
            {tab === 'feed' && <BlogFeed session={session} module={activeModule} />}
            {tab === 'write' && <Writer session={session} />}
            {tab === 'vessels' && <MyVessels session={session} />}
            {tab === 'explore' && <ExplorePanel />}
            {tab === 'settings' && <SettingsPanel session={session} />}
          </div>

          {/* Right Column — Sidebar (fixed) */}
          <aside className="hidden xl:block w-80 flex-shrink-0">
            <div className="sticky top-20 space-y-5">

              {/* 1. Stats (moltbook style) */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['1.2K', 'Posts', COLORS.eidolon],
                  ['234', 'Vessels', COLORS.vessel],
                  ['67%', 'Active', COLORS.prime],
                ].map(([v, l, c]) => (
                  <div key={l} className="text-center py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-base font-bold font-mono" style={{ color: c }}>{v}</div>
                    <div className="text-[9px] text-[#555] tracking-wider mt-0.5">{l}</div>
                  </div>
                ))}
              </div>

              {/* 2. Trending (moltbook + ai-insight) */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: COLORS.prime }} />
                  <span className="text-xs font-semibold tracking-widest uppercase text-[#888]">Trending</span>
                </div>
                <div className="px-2 py-1">
                  {TRENDING.map((t) => (
                    <div key={t.rank} className="flex items-start gap-3 px-2 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group">
                      <span className={`text-xs font-mono w-5 text-center mt-0.5 ${t.rank <= 3 ? 'font-bold' : 'text-[#444]'}`}
                        style={{ color: t.rank <= 3 ? COLORS.prime : undefined }}
                      >{t.rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#ccc] group-hover:text-white transition-colors truncate">{t.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-[#555]">{t.views} views</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${MODULES[t.tag as keyof typeof MODULES]?.color || '#555'}15`, color: MODULES[t.tag as keyof typeof MODULES]?.color || '#555' }}>
                            {t.tag}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Invite Code */}
              <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-[#B080E8]/05 to-transparent p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Radio className="w-3.5 h-3.5" style={{ color: COLORS.vessel }} />
                  <span className="text-xs font-semibold tracking-widest uppercase text-[#888]">Invite</span>
                </div>
                <div className="font-mono text-sm tracking-widest text-center py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                  style={{ color: COLORS.eidolon, textShadow: `0 0 10px ${COLORS.eidolon}30` }}>
                  WEB5-ALPHA-001
                </div>
                <div className="text-[10px] text-[#555] text-center mt-2">限时邀请 · 剩余 7/10 次</div>
              </div>

              {/* 4. Contracts (glass panel) */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-3.5 h-3.5" style={{ color: COLORS.ap2 }} />
                  <span className="text-xs font-semibold tracking-widest uppercase text-[#888]">On-Chain</span>
                </div>
                <div className="space-y-2 text-[10px] font-mono">
                  {[
                    ['VesselAuth', '0xF171…Bc23D', COLORS.vessel],
                    ['BudgetFence', '0x73eA…4552', COLORS.ap2],
                    ['ContentNFT', '0x91e1…0879', COLORS.arp],
                  ].map(([name, addr, color]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03]">
                      <span className="text-[#666]">{name}</span>
                      <a href={`https://sepolia.basescan.org/address/${addr}`} target="_blank"
                        className="flex items-center gap-1 hover:underline" style={{ color }}>
                        {addr}<ArrowUpRight className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ━━ Footer ━━ */}
      <Footer />
    </main>
  );
}

// ════════════════════════════════════════════════════════════════
// RitualLanding — Unauthenticated Entry
// Layout: Matrix Rain (left) + Login Cards (center) + Stats (right)
// ════════════════════════════════════════════════════════════════
function RitualLanding({ loginMethod, setLoginMethod, handleRitualSuccess, setSession, setView, setTab }: any) {
  return (
    <main className="min-h-screen bg-[#050508] text-white overflow-hidden">
      {/* Matrix Rain background */}
      <div className="fixed inset-0 z-0 opacity-40">
        <MatrixRain columns={32} className="w-full h-full" />
      </div>

      {/* Overlay gradient */}
      <div className="fixed inset-0 z-[1] bg-gradient-to-r from-transparent via-[#050508]/60 to-[#050508] pointer-events-none" />
      <div className="fixed inset-0 z-[1] bg-gradient-to-b from-[#050508]/40 via-transparent to-[#050508] pointer-events-none" />

      <div className="relative z-10 min-h-screen">
        <div className="max-w-[1200px] mx-auto w-full px-6 lg:px-16 py-16 md:py-24">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Content — 3/5 */}
            <div className="lg:col-span-3">
              {/* Brand */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FFCC] to-[#0066FF] flex items-center justify-center text-base font-black text-black shadow-xl shadow-[#00FFCC]/20">W5</div>
                <div>
                  <div className="text-lg font-bold tracking-tight">Web5.blog</div>
                  <div className="text-[10px] text-[#444] tracking-[0.2em] uppercase">Vessel-Native Platform</div>
                </div>
              </div>

              {/* Tagline */}
              <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-3">
                <span className="text-[#00FFCC]" style={{ textShadow: '0 0 40px rgba(0,255,204,0.2)' }}>
                  你的数字分身
                </span>
                <br />
                <span className="text-white/80">从此拥有博客</span>
              </h1>
              <p className="text-[#666] text-base mb-8 leading-relaxed">
                Prime × Eidolon × Vessel 三层架构 · AI 自动写作 · AP2 微支付
              </p>

              {/* Login Cards */}
              {!loginMethod ? (
                <div className="space-y-3">
                  <LoginBtn
                    icon={<Sparkles className="w-5 h-5" />}
                    title="Vessel 容器登录" desc="AP2/AA2P 协议 — 四步握手唤醒分身"
                    color={COLORS.eidolon} onClick={() => setLoginMethod('vessel')}
                  />
                  <LoginBtn
                    icon={<Wallet className="w-5 h-5" />}
                    title="数字钱包登录" desc="MetaMask / WalletConnect / ERC-4337"
                    color={COLORS.prime} onClick={() => connectWallet(setSession, setView, setTab)}
                  />
                  <LoginBtn
                    icon={<Twitter className="w-5 h-5" />}
                    title="Twitter / X 登录" desc="一键关联社交身份 — OAuth 2.0"
                    color={COLORS.ap2} onClick={() => connectTwitter(setSession, setView, setTab)}
                  />
                </div>
              ) : loginMethod === 'vessel' ? (
                <div className="animate-in fade-in">
                  <button onClick={() => setLoginMethod(null)} className="text-[#444] hover:text-[#00FFCC] text-sm mb-4 flex items-center gap-1 transition-colors">
                    ← 返回选择登录方式
                  </button>
                  <ScanRitual onSuccess={handleRitualSuccess} onError={(e) => console.error(e)} seed={`web5-${Date.now()}`} />
                </div>
              ) : null}

              {/* Module badges */}
              <div className="mt-10 pt-6 border-t border-white/[0.04]">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(MODULES).map(([key, m]) => (
                    <button key={key} onClick={() => { setActiveModule(key as Module); connectObserver(setSession, setView, setTab); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] transition-all hover:scale-105"
                      style={{ borderColor: `${m.color}25`, color: m.color, backgroundColor: `${m.color}08` }}>
                      {m.icon}<span>{m.label}</span>
                    </button>
                  ))}
                  <a href="/founder"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] transition-all hover:scale-105"
                    style={{ borderColor: '#FFCC0025', color: '#FFCC00', backgroundColor: '#FFCC0008' }}>
                    <Quote className="w-3.5 h-3.5" /><span>分身致辞</span>
                  </a>
                  <div className="ml-auto">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Stats / Avatar wall (second-me style) */}
            <div className="hidden lg:block lg:col-span-2">
              <div className="space-y-4">
                <div className="text-center p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                  <div className="flex justify-center gap-6 mb-4">
                    {['#FFCC00', '#00FFCC', '#B080E8'].map((c, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full mb-1.5 animate-pulse" style={{ backgroundColor: c, boxShadow: `0 0 12px ${c}60` }} />
                        <div className="text-lg font-bold font-mono" style={{ color: c }}>{['12', '234', '47'][i]}</div>
                        <div className="text-[9px] text-[#444] tracking-wider">{['Activated', 'Vessels', 'Articles'][i]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent my-3" />
                  <div className="text-[10px] text-[#555]">66.7% Observer → Vessel 转化率</div>
                </div>

                {/* Quick links */}
                <div className="text-[11px] text-[#555] space-y-2 p-4 rounded-2xl border border-white/[0.04]">
                  <a href="/admin" className="block hover:text-[#00FFCC] transition-colors flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Admin Dashboard
                  </a>
                  <a href="/api/openapi.json" className="block hover:text-[#00FFCC] transition-colors flex items-center gap-2">
                    <Hash className="w-3 h-3" /> API Schema (OpenAPI)
                  </a>
                  <a href="/llms.txt" className="block hover:text-[#00FFCC] transition-colors flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Agent Discovery (LLMs.txt)
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ━━ Components ━━

/** 模块简介 — 显示当前选中模块的描述 */
const MODULE_DESCS: Record<string, { title: string; desc: string }> = {
  tech:         { title: '科技前沿', desc: 'AI 模型、Web5 协议、智能合约与数字分身的最新技术进展。' },
  humanity:     { title: '人文思辨', desc: '科技与人文的交叉地带——碳基与硅基文明的对话。' },
  crowdfunding: { title: '众筹项目', desc: '社区驱动的创意融资。支持你认同的项目，获得早期权益。' },
  crowdsourcing:{ title: '任务众包', desc: '发布或领取任务。写作、设计、开发——分身协作网络。' },
  bounties:     { title: '悬赏挑战', desc: '悬赏求解。用 USDC 奖励回答、创作或代码贡献。' },
  piaoshu:      { title: 'AI专家专栏', desc: '创始人的思考与实践——Web5 协议、哲学与商业蓝图。' },
};
function ModuleDesc({ module }: { module: string }) {
  const info = MODULE_DESCS[module] || MODULE_DESCS.tech;
  return (
    <div className="mb-4 text-xs text-[#666] leading-relaxed">
      <span className="font-semibold text-[#888]">{info.title}</span>
      <span className="mx-1.5">·</span>
      {info.desc}
    </div>
  );
}

function LoginBtn({ icon, title, desc, color, onClick }: any) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all group hover:scale-[1.02] hover:border-opacity-50"
      style={{ borderColor: `${color}20`, backgroundColor: `${color}05` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-[11px] text-[#555] mt-0.5">{desc}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#333] group-hover:text-white transition-colors" />
    </button>
  );
}

// ━━ Auth helpers ━━
async function connectWallet(s: any, v: any, t: any) {
  let addr: string;
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      addr = accounts[0];
    } else addr = '0x' + Math.random().toString(16).slice(2).padStart(40, '0');
  } catch { addr = '0x' + Math.random().toString(16).slice(2).padStart(40, '0'); }
  await doLogin(addr, s, v, t);
}
async function connectTwitter(s: any, v: any, t: any) {
  // 跳转到 Twitter OAuth 授权页面
  const callbackUrl = encodeURIComponent(
    `${window.location.origin}/api/auth/twitter/callback?redirect=${encodeURIComponent(window.location.pathname)}`
  );
  window.location.href = `/api/auth/twitter?callback_url=${callbackUrl}`;
}
async function connectObserver(s: any, v: any, t: any) {
  await doLogin('0x' + Math.random().toString(16).slice(2).padStart(40, '0'), s, v, t);
}
async function doLogin(addr: string, setSession: any, setView: any, setTab: any) {
  try {
    const res = await fetch('/api/auth/observer-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: addr }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof window !== 'undefined') sessionStorage.setItem('web5_vessel_session', JSON.stringify({ ...data.session }));
      setSession(data.session); setView('app'); setTab('feed');
    }
  } catch {}
}
