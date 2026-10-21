'use client';

// ════════════════════════════════════════════════════════════════
// Web5.blog v3.0 — 创世主网版
// 调性: 暗色数字圣殿 · 协议级精密 · 三层视觉映射
// 融合 Circle ARC 稳定币公链 · $WBOG 原生代币 · 创世先锋空投
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MatrixRain } from '@/components/web5/effects/matrix-rain';
import { SplashAwakening } from '@/components/web5/effects/splash-awakening';
import { getCurrentVesselSession, revokeVesselSession, parseSessionResponse, persistVesselSession } from '@/lib/web5/vessel-auth';
import type { VesselSession } from '@/lib/web5/types';
import type { VesselAuthPayload } from '@/components/web5/ritual/scan-ritual';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Cpu, BookOpen, Users, Globe, Target, Bot, Sparkles, Eye, Wallet, Twitter,
  ChevronRight, TrendingUp, Radio, FileText, MessageCircle, Heart, Share2,
  Search, LogOut, Zap, Shield, Activity, ArrowUpRight, ArrowRight, Clock, Hash, Quote, Gift, Rocket, Loader2,
} from 'lucide-react';

import { useTma } from '@/components/web5/telegram/tma-provider';
import { getOrCreateVesselWallet, signVesselLoginMessage } from '@/lib/web5/vessel-wallet';
import { useI18n } from '@/lib/i18n/index';

const PanelLoading = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center py-16 text-xs font-mono text-[#555]">{label}</div>
);

const ScanRitual = dynamic(() => import('@/components/web5/ritual/scan-ritual').then((m) => m.ScanRitual), {
  ssr: false,
  loading: () => <PanelLoading label="LOADING RITUAL…" />,
});
const BlogFeed = dynamic(() => import('@/components/web5/blog/blog-feed').then((m) => m.BlogFeed), {
  loading: () => <PanelLoading label="LOADING FEED…" />,
});
const Writer = dynamic(() => import('@/components/web5/write/writer').then((m) => m.Writer), {
  ssr: false,
  loading: () => <PanelLoading label="LOADING EDITOR…" />,
});
const ExplorePanel = dynamic(() => import('@/components/web5/explore/explore-panel').then((m) => m.ExplorePanel), {
  loading: () => <PanelLoading label="LOADING EXPLORE…" />,
});
const MyVessels = dynamic(() => import('@/components/web5/dashboard/my-vessels').then((m) => m.MyVessels), {
  ssr: false,
  loading: () => <PanelLoading label="LOADING DASHBOARD…" />,
});
const SettingsPanel = dynamic(() => import('@/components/web5/settings/settings-panel').then((m) => m.SettingsPanel), {
  loading: () => <PanelLoading label="LOADING SETTINGS…" />,
});
const LanguageSwitcher = dynamic(() => import('@/components/web5/i18n/language-switcher').then((m) => m.LanguageSwitcher));
const Footer = dynamic(() => import('@/components/web5/footer').then((m) => m.Footer));
const GenesisAirdropModal = dynamic(() => import('@/components/web5/airdrop/genesis-airdrop-modal').then((m) => m.GenesisAirdropModal), { ssr: false });
const SponsorModal = dynamic(() => import('@/components/web5/trending/sponsor-modal').then((m) => m.SponsorModal), { ssr: false });
const GenesisCurveModal = dynamic(() => import('@/components/web5/vault/genesis-curve-modal').then((m) => m.GenesisCurveModal), { ssr: false });
const WalletGuideModal = dynamic(() => import('@/components/web5/auth/wallet-guide-modal').then((m) => m.WalletGuideModal), { ssr: false });
const TaskBoard = dynamic(() => import('@/components/web5/commerce/task-board').then((m) => m.TaskBoard), {
  loading: () => <PanelLoading label="LOADING BOUNTIES…" />,
});
const ExpertChamber = dynamic(() => import('@/components/web5/experts/expert-chamber').then((m) => m.ExpertChamber), {
  loading: () => <PanelLoading label="LOADING EXPERTS…" />,
});
const CrowdfundingPanel = dynamic(() => import('@/components/web5/crowdfunding/crowdfunding-panel').then((m) => m.CrowdfundingPanel), {
  loading: () => <PanelLoading label="LOADING CROWDFUNDING…" />,
});
const HologramAvatarStage = dynamic(() => import('@/components/web5/hero/hologram-avatar-stage').then((m) => m.HologramAvatarStage), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-3xl border border-[#00FFCC]/10 bg-[#070b12] flex items-center justify-center">
      <span className="text-[10px] font-mono text-[#3a5a55] tracking-[0.3em]">INITIALIZING STAGE…</span>
    </div>
  ),
});

// ━━ 协议色语义映射 ━━
const COLORS = {
  prime: '#FFCC00', eidolon: '#00FFCC', vessel: '#B080E8',
  ap2: '#0066FF', arp: '#FF66AA',
} as const;

type View = 'ritual' | 'app';
type Tab = 'feed' | 'write' | 'vessels' | 'explore' | 'settings';
type Module = 'tech' | 'humanities' | 'experts' | 'bounties' | 'crowdfunding';

const MODULES: Record<Module, { label: string; icon: React.ReactNode; color: string }> = {
  tech:          { label: '科技前沿', icon: <Cpu />,      color: '#00FFCC' },
  humanities:    { label: '人文思辨', icon: <BookOpen />, color: '#FFCC00' },
  experts:       { label: 'AI专家',   icon: <Bot />,      color: '#0066FF' },
  bounties:      { label: '悬赏广场', icon: <Target />,   color: '#FF6633' },
  crowdfunding:  { label: '创意众筹', icon: <Users />,    color: '#B080E8' },
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [session, setSession] = useState<VesselSession | null>(null);
  const [view, setView] = useState<View>('ritual');
  const [tab, setTab] = useState<Tab>('vessels');
  const [activeModule, setActiveModule] = useState<Module>('tech');
  const [loginMethod, setLoginMethod] = useState<'vessel' | 'wallet' | 'twitter' | null>(null);
  const [vesselWalletAddr, setVesselWalletAddr] = useState<string>('');
  const [vesselAuth, setVesselAuth] = useState<VesselAuthPayload | null>(null);
  const [loginBusy, setLoginBusy] = useState<'vessel' | 'wallet' | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [airdropOpen, setAirdropOpen] = useState(false);
  const [curveModalOpen, setCurveModalOpen] = useState(false);
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [walletGuideOpen, setWalletGuideOpen] = useState(false);
  const [sponsoredAd, setSponsoredAd] = useState<any>(null);
  const [targetPostHash, setTargetPostHash] = useState<string | null>(null);
  const [trendingList, setTrendingList] = useState<any[]>([]);
  const [realStats, setRealStats] = useState({ posts: 0, vessels: 0, primes: 0 });
  const [curveReserve, setCurveReserve] = useState(0);
  const { t, locale } = useI18n();
  const { isTma, user: tmaUser } = useTma();
  const isEn = locale !== 'zh-CN';

  // 加载真实全局统计（Posts / Vessels / Primes）
  useEffect(() => {
    fetch('/api/explore?section=overview')
      .then(r => r.json())
      .then(d => {
        if (d?.stats) {
          setRealStats({
            posts: d.stats.contents || 0,
            vessels: d.stats.activeVessels || 0,
            primes: d.stats.primes || 0,
          });
        }
      })
      .catch(() => {});
    fetch('/api/curve/vault')
      .then(r => r.json())
      .then(d => {
        if (d?.vault?.currentReserveUsdc !== undefined) {
          setCurveReserve(d.vault.currentReserveUsdc);
        }
      })
      .catch(() => {});
  }, []);

  const fetchSponsor = useCallback(async () => {
    try {
      const res = await fetch('/api/commerce/sponsor');
      if (res.ok) {
        const d = await res.json();
        if (d.sponsored) setSponsoredAd(d.sponsored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchSponsor();
  }, [fetchSponsor]);

  // 动态轮动与加载最新发布的文章至 Trending 榜单
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/content/list?limit=10');
        if (res.ok) {
          const d = await res.json();
          if (d.contents && d.contents.length > 0) {
            const mapped = d.contents.map((c: any, idx: number) => ({
              rank: idx + 1,
              title: c.title,
              views: c.stats?.reads || 0,
              tag: '科技',
              arweaveHash: c.arweaveHash,
            }));
            setTrendingList(mapped);
          }
        }
      } catch {}
    };
    fetchTrending();
    const timer = setInterval(fetchTrending, 15000);
    return () => clearInterval(timer);
  }, []);

  // 客户端挂载安全恢复 Session，根治 Hydration Mismatch
  useEffect(() => {
    setMounted(true);
    const stored = getCurrentVesselSession();
    if (stored) {
      setSession(stored);
      setView('app');
    }

    const params = new URLSearchParams(window.location.search);

    // 深链直达：?tab=feed&module=bounties（Telegram Bot / 外部入口）
    const tabParam = params.get('tab');
    if (tabParam && ['feed', 'write', 'vessels', 'explore', 'settings'].includes(tabParam)) {
      setTab(tabParam as Tab);
      setView('app');
    }
    const moduleParam = params.get('module');
    if (moduleParam && ['tech', 'humanities', 'experts', 'bounties', 'crowdfunding'].includes(moduleParam)) {
      setActiveModule(moduleParam as Module);
      setTab('feed');
      setView('app');
    }

    // 检查直达弹窗参数 (?vault=curve 或 ?modal=airdrop)
    if (params.get('vault') === 'curve' || params.get('modal') === 'curve') {
      setCurveModalOpen(true);
    }
    if (params.get('modal') === 'airdrop' || params.get('airdrop') === 'true') {
      setAirdropOpen(true);
    }
    if (params.get('modal') === 'sponsor' || params.get('sponsor') === 'true') {
      setSponsorModalOpen(true);
    }

    // 检查 Twitter 回调
    const twitterSession = params.get('twitter_session');
    const twitterLogin = params.get('twitter_login');
    if (twitterSession && twitterLogin === 'success') {
      try {
        const parsed = JSON.parse(decodeURIComponent(twitterSession));
        sessionStorage.setItem('web5_vessel_session', JSON.stringify(parsed));
        window.history.replaceState({}, '', window.location.pathname);
        setSession(parsed);
        setView('app');
      } catch {}
    }
  }, []);

  const moduleLabels: Record<Module, string> = {
    tech: isEn ? 'Technology' : (t?.modules?.tech || '科技前沿'),
    humanities: isEn ? 'Humanities' : (t?.modules?.humanity || '人文思辨'),
    experts: isEn ? 'AI Experts' : (t?.modules?.experts || t?.modules?.piaoshu || 'AI专家'),
    bounties: isEn ? 'Bounties & Tasks' : (t?.modules?.bounty || '悬赏广场'),
    crowdfunding: isEn ? 'Crowdfunding' : (t?.modules?.crowd || '创意众筹'),
  };

  const handleRitualSuccess = (s: VesselSession) => {
    setSession(s);
    setView('app');
    // 观察者会话没有 Vessel 身份，落到分身矩阵只会看到升级提示，直接进博客流
    setTab(s.vesselDid ? 'vessels' : 'feed');
    setLoginMethod(null);
    setVesselAuth(null);
    setLoginError(null);
  };

  // 容器登录：用本机持久化 Vessel 密钥直接签名，免钱包插件，也不会被 WebView 吞掉弹窗
  const handleVesselLogin = async () => {
    if (loginBusy) return;
    setLoginError(null);
    setLoginBusy('vessel');
    // 提前预热分身矩阵代码块，仪式结束后立即渲染
    void import('@/components/web5/dashboard/my-vessels').catch(() => {});
    try {
      const vessel = getOrCreateVesselWallet();
      const signMsg = `Web5.blog Sovereign Login\n\nWallet: ${vessel.address}\nVessel: ${vessel.address}\nChain: Arc Mainnet (5042)\nTimestamp: ${Date.now()}`;
      const signature = await signVesselLoginMessage(signMsg);
      setVesselWalletAddr(vessel.address);
      setVesselAuth({ walletAddress: vessel.address, vesselAddress: vessel.address, signature, message: signMsg });
      setLoginMethod('vessel');
    } catch (err: any) {
      console.warn('[Web5] Vessel awakening error:', err);
      setLoginError(isEn
        ? 'Vessel awakening failed: ' + (err?.message || 'please retry')
        : '容器唤醒失败：' + (err?.message || '请重试'));
    } finally {
      setLoginBusy(null);
    }
  };

  const handleWalletLogin = async () => {
    if (loginBusy) return;
    setLoginError(null);
    await connectWallet(
      setSession,
      setView,
      setTab,
      () => setWalletGuideOpen(true),
      (busy: boolean) => setLoginBusy(busy ? 'wallet' : null),
      (msg: string | null) => setLoginError(msg),
    );
  };

  const handleLogout = async () => {
    await revokeVesselSession(); setSession(null); setView('ritual'); setVesselAuth(null); setLoginMethod(null);
    setLoginBusy(null); setLoginError(null);
  };

  // 弹窗内的“唤醒容器”入口：关掉遮挡的弹窗，回到登录页立即唤醒
  const openVesselLogin = () => {
    setWalletGuideOpen(false);
    setAirdropOpen(false);
    setView('ritual');
    void handleVesselLogin();
  };

  // ━━ 统一服务端与首屏渲染，防止客户端插件注入引发报错 ━━
  if (!mounted) {
    return <SplashAwakening onFinished={() => {}} />;
  }

  return (
    <>
      {showSplash && <SplashAwakening onFinished={() => setShowSplash(false)} />}
      {view === 'ritual' ? (
        <RitualLanding
          t={t}
          moduleLabels={moduleLabels}
          loginMethod={loginMethod}
          setLoginMethod={setLoginMethod}
          vesselAuth={vesselAuth}
          onVesselLogin={handleVesselLogin}
          onWalletLogin={handleWalletLogin}
          loginBusy={loginBusy}
          loginError={loginError}
          handleRitualSuccess={handleRitualSuccess}
          setSession={setSession}
          setView={setView}
          setTab={setTab}
          setActiveModule={setActiveModule}
          onOpenAirdrop={() => setAirdropOpen(true)}
          onOpenCurve={() => setCurveModalOpen(true)}
          onOpenWalletGuide={() => setWalletGuideOpen(true)}
          curveReserve={curveReserve}
          isEn={isEn}
        />
      ) : (
        <main className="min-h-screen bg-[#050508] text-white flex flex-col" suppressHydrationWarning>
      {/* Matrix Rain background */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <MatrixRain columns={32} className="w-full h-full" />
      </div>
      {/* Ambient gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,255,204,0.02),transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,102,255,0.015),transparent_60%)] pointer-events-none" />

      {/* ━━ Header (TMA 模式下自动收敛为极简全屏沉浸栏) ━━ */}
      <header className={`relative z-50 border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-2xl sticky top-0 ${isTma ? 'py-1' : ''}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          {/* Brand & 动态唤醒光环 */}
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer" onClick={() => setTab('feed')}>
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-[#00FFCC]/40 shadow-lg shadow-[#00FFCC]/20 bg-black flex items-center justify-center">
              <img
                src="/brand-awakening-poster.jpg"
                alt="Web5.blog"
                width={72}
                height={72}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#00FFCC]/10 pointer-events-none" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-wider text-sm font-mono text-white flex items-center gap-1">
                <span>W</span><span className="text-[#00FFCC]">•</span>
                <span>B</span><span className="text-[#FFCC00]">•</span>
                <span>O</span><span className="text-[#B080E8]">•</span>
                <span>G</span>
                {isTma && (
                  <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] text-[8px] h-3.5 px-1 py-0 ml-1 border-none font-mono">
                    TMA
                  </Badge>
                )}
              </span>
              <span className="text-[9px] text-[#666] font-mono leading-none tracking-tight hidden sm:block">Web5 Blog Ontology Gateway</span>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search articles, contracts, DID..." : "搜索文章、合约、用户..."}
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
              >{m.icon}<span>{moduleLabels[key as Module] || m.label}</span></button>
            ))}
            {/* Language switcher */}
            <LanguageSwitcher />
          </nav>

          {/* Auth & Airdrop */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 创世空投入口 */}
            <Button
              size="sm"
              onClick={() => setAirdropOpen(true)}
              className="bg-gradient-to-r from-[#FFCC00]/15 to-[#FF66AA]/15 border border-[#FFCC00]/30 text-[#FFCC00] hover:bg-[#FFCC00]/25 text-xs h-8 px-2.5 font-mono"
            >
              <Gift className="w-3.5 h-3.5 mr-1 text-[#FFCC00] animate-bounce" />
              <span className="hidden sm:inline">{isEn ? 'Genesis 1,000 $WBOG' : '创世空投 1,000 $WBOG'}</span>
              <span className="sm:hidden">{isEn ? 'Airdrop' : '空投'}</span>
            </Button>

            {/* 写作按钮 */}
            <Button size="sm" variant="ghost" onClick={() => setTab('write')}
              className={`text-xs h-8 hidden sm:flex ${tab === 'write' ? 'bg-[#00FFCC]/20 text-[#00FFCC] border border-[#00FFCC]/40' : 'text-[#00FFCC] hover:text-[#00FFCC]/80'}`}>
              <Zap className="w-3.5 h-3.5 mr-1" />{isEn ? 'Write' : '写作'}
            </Button>

            {session ? (
              <div className="flex items-center gap-2">
                <Badge
                  onClick={() => setTab('vessels')}
                  className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/20 text-[10px] h-6 cursor-pointer hover:bg-[#B080E8]/25 hover:border-[#B080E8]/50 transition-all flex items-center gap-1 select-none"
                  title={isEn ? "Click to open My Avatar Matrix & Vault" : "点击一键直达我的分身矩阵与资产看板"}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B080E8] mr-1.5 animate-pulse" />
                  VESSEL
                </Badge>
                <Button size="sm" variant="ghost" onClick={handleLogout}
                  className="text-[#555] hover:text-[#FF66AA] h-8 w-8 p-0" title={isEn ? "Logout Session" : "退出会话"}><LogOut className="w-3.5 h-3.5" /></Button>
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
            {/* 子功能导航 Tab (常驻顶端) */}
            <div className="flex items-center gap-2 p-1.5 mb-6 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-x-auto">
              {[
                { id: 'vessels', label: isEn ? '🧬 Avatar Matrix' : '🧬 我的分身矩阵', icon: <Activity className="w-3.5 h-3.5 text-[#B080E8]" /> },
                { id: 'feed', label: isEn ? 'Blog Stream' : '博客流', icon: <FileText className="w-3.5 h-3.5" /> },
                { id: 'write', label: isEn ? '✍️ AI Stream Write' : '✍️ AI 流式写作', icon: <Zap className="w-3.5 h-3.5 text-[#00FFCC]" /> },
                { id: 'explore', label: isEn ? '🔍 Explorer & DEX' : '🔍 探索面板与市场', icon: <Shield className="w-3.5 h-3.5 text-[#0066FF]" /> },
                { id: 'settings', label: isEn ? '⚙️ Settings' : '⚙️ 系统设置', icon: <Bot className="w-3.5 h-3.5 text-[#FF66AA]" /> },
              ].map(tItem => (
                <button
                  key={tItem.id}
                  onClick={() => setTab(tItem.id as Tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    tab === tItem.id
                      ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.1]'
                      : 'text-[#666] hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {tItem.icon}
                  <span>{tItem.label}</span>
                </button>
              ))}
            </div>

            {/* Module header */}
            <div className="mb-4 pb-3 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span style={{ color: MODULES[activeModule].color, filter: `drop-shadow(0 0 6px ${MODULES[activeModule].color}40)` }}>
                  {MODULES[activeModule].icon}
                </span>
                <h2 className="text-lg font-bold">{moduleLabels[activeModule] || MODULES[activeModule].label}</h2>
                <span className="text-xs text-[#555] hidden sm:inline">{isEn ? '— Web5 Curated Matrix' : '— Web5 专题聚合'}</span>
              </div>
              <Button
                size="sm"
                onClick={() => setTab('write')}
                className="bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/30 hover:bg-[#00FFCC]/20 text-xs h-7 px-2.5 flex items-center"
              >
                <Zap className="w-3 h-3 mr-1" />
                <span>{isEn ? '✍️ Compose in Category' : '✍️ 创作此专题博文'}</span>
              </Button>
            </div>

            {/* Module description */}
            <ModuleDesc module={activeModule} />

            {/* 内容区 */}
            {tab === 'feed' && (
              <>
                {activeModule === 'bounties' && <TaskBoard session={session} />}
                {activeModule === 'experts' && <ExpertChamber session={session} />}
                {activeModule === 'crowdfunding' && <CrowdfundingPanel session={session} />}
                {activeModule !== 'crowdfunding' && (
                  <BlogFeed
                    session={session}
                    module={activeModule}
                    searchQuery={searchQuery}
                    targetHash={targetPostHash}
                    onClearTargetHash={() => setTargetPostHash(null)}
                  />
                )}
              </>
            )}
            {tab === 'write' && <Writer session={session} />}
            {tab === 'vessels' && <MyVessels session={session} />}
            {tab === 'explore' && <ExplorePanel />}
            {tab === 'settings' && <SettingsPanel session={session} />}
          </div>

          {/* Right Column — Sidebar (fixed) */}
          <aside className="hidden xl:block w-80 flex-shrink-0">
            <div className="sticky top-20 space-y-5">

              {/* 1. Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  [String(realStats.posts), 'Posts', COLORS.eidolon],
                  [String(realStats.vessels), 'Vessels', COLORS.vessel],
                  [String(realStats.primes), 'Primes', COLORS.prime],
                ].map(([v, l, c]) => (
                  <div key={l} className="text-center py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-base font-bold font-mono" style={{ color: c }}>{v}</div>
                    <div className="text-[9px] text-[#555] tracking-wider mt-0.5">{l}</div>
                  </div>
                ))}
              </div>

              {/* 2. Trending */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: COLORS.prime }} />
                    <span className="text-xs font-semibold tracking-widest uppercase text-[#888]">Trending</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSponsorModalOpen(true)}
                    className="h-6 px-2 text-[10px] text-[#FFCC00] hover:bg-[#FFCC00]/15 flex items-center gap-1 border border-[#FFCC00]/30"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{isEn ? '+ Sponsor' : '+ 赞助榜首'}</span>
                  </Button>
                </div>
                <div className="px-2 py-1">
                  {/* 置顶商业赞助卡片 */}
                  {sponsoredAd && (
                    <div
                      onClick={() => {
                        if (sponsoredAd.targetUrl?.startsWith('http')) {
                          window.open(sponsoredAd.targetUrl, '_blank');
                        } else {
                          window.location.href = sponsoredAd.targetUrl;
                        }
                      }}
                      className="my-1.5 p-2.5 rounded-lg border border-[#FFCC00]/40 bg-gradient-to-r from-[#FFCC00]/15 via-[#00FFCC]/05 to-transparent cursor-pointer hover:border-[#FFCC00]/70 transition-all group"
                      title={isEn ? "Sponsored Hot Topic - Click to view" : "商业热搜置顶 - 点击直达"}
                    >
                      <div className="flex items-center justify-between text-[9px] mb-1">
                        <span className="text-[#FFCC00] font-bold font-mono flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#FFCC00] animate-pulse" /> SPONSORED · 官方推荐
                        </span>
                        <Badge className="bg-[#FFCC00]/20 text-[#FFCC00] text-[8px] py-0 h-3.5 border-none">
                          TOP #1
                        </Badge>
                      </div>
                      <div className="text-xs font-bold text-white group-hover:text-[#FFCC00] transition-colors truncate">
                        {sponsoredAd.title}
                      </div>
                      <div className="text-[10px] text-[#aaa] truncate mt-0.5">
                        {sponsoredAd.description}
                      </div>
                    </div>
                  )}

                  {trendingList.map((t) => (
                    <div
                      key={t.rank + '-' + (t.arweaveHash || t.title)}
                      onClick={() => {
                        setTab('feed');
                        if (t.arweaveHash) {
                          setTargetPostHash(t.arweaveHash);
                        } else {
                          setSearchQuery(t.title.slice(0, 10));
                        }
                      }}
                      className="flex items-start gap-3 px-2 py-2.5 rounded-lg hover:bg-white/[0.04] transition-all cursor-pointer group hover:scale-[1.01]"
                      title={isEn ? "Click to open and read full article" : "点击立即阅读此文章"}
                    >
                      <span className={`text-xs font-mono w-5 text-center mt-0.5 ${t.rank <= 3 ? 'font-bold' : 'text-[#444]'}`}
                        style={{ color: t.rank <= 3 ? COLORS.prime : undefined }}
                      >{t.rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#ccc] group-hover:text-[#00FFCC] transition-colors truncate">{t.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-[#555]">{t.views} views</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${MODULES[t.tag as keyof typeof MODULES]?.color || '#555'}15`, color: MODULES[t.tag as keyof typeof MODULES]?.color || '#555' }}>
                            {t.tag}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#444] group-hover:text-[#00FFCC] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. 创世空投资产看板 */}
              <div className="rounded-xl border border-[#FFCC00]/30 bg-gradient-to-br from-[#FFCC00]/10 via-[#0a0e17] to-transparent p-4 cursor-pointer hover:border-[#FFCC00]/50 transition-all" onClick={() => setAirdropOpen(true)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#FFCC00]" />
                    <span className="text-xs font-bold uppercase text-[#FFCC00]">{isEn ? 'Genesis Airdrop' : '创世先锋空投'}</span>
                  </div>
                  <Badge className="bg-[#FFCC00]/20 text-[#FFCC00] border-none text-[9px] h-4">
                    {isEn ? '10k Slots' : '10,000 名'}
                  </Badge>
                </div>
                <div className="font-mono text-base font-bold text-white mb-1">
                  1,000 $WBOG <span className="text-xs text-[#888] font-normal">{isEn ? '/ User' : '/ 人'}</span>
                </div>
                <div className="text-[10px] text-[#aaa] leading-relaxed">
                  {isEn ? 'Complete 5 badges to claim tokens & Genesis NFT badge. Click to inspect →' : '完成 5 项任务即可领取原生代币与 Genesis NFT 徽章。点击查看进度 →'}
                </div>
              </div>

              {/* 3.1 创世金库 3000U 冲刺认购看板 (GenesisCurveVault) */}
              <div
                onClick={() => setCurveModalOpen(true)}
                className="rounded-xl border border-[#00FFCC]/30 bg-gradient-to-br from-[#00FFCC]/10 via-[#0a0e17] to-transparent p-4 cursor-pointer hover:border-[#00FFCC]/60 transition-all group shadow-lg shadow-[#00FFCC]/05"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-[#00FFCC] animate-pulse" />
                    <span className="text-xs font-bold uppercase text-[#00FFCC]">{isEn ? 'Angel Vault 3k Cap' : '创世金库 3000U 冲刺'}</span>
                  </div>
                  <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] border-none text-[9px] h-4 font-mono">
                    {isEn ? 'LP Lock Vault' : '锁池倒计时'}
                  </Badge>
                </div>
                <div className="font-mono text-base font-bold text-white mb-1 flex items-center justify-between">
                  <span>{curveReserve.toFixed(4)} / 3,000 <span className="text-xs text-[#888] font-normal">USDC</span></span>
                  <span className="text-xs text-[#FFCC00] font-bold">{((curveReserve / 3000) * 100).toFixed(2)}%</span>
                </div>
                <Progress value={Math.min(100, (curveReserve / 3000) * 100)} className="h-1.5 bg-white/[0.08] mb-2" />
                <div className="text-[10px] text-[#aaa] leading-relaxed flex items-center justify-between">
                  <span>{isEn ? 'Max 20U/tx · 100% Locked on Cap' : '单笔限额 20U 防鲸 · 满额丢弃权限'}</span>
                  <ArrowRight className="w-3 h-3 text-[#00FFCC] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* 3.5. W · B · O · G 品牌词源矩阵 (Ontology Matrix) */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <span className="text-xs font-bold font-mono tracking-wider text-white">
                    <span>W</span><span className="text-[#00FFCC]">•</span>
                    <span>B</span><span className="text-[#FFCC00]">•</span>
                    <span>O</span><span className="text-[#B080E8]">•</span>
                    <span>G</span> 矩阵
                  </span>
                  <span className="text-[9px] text-[#666] font-mono">ONTOLOGY</span>
                </div>
                <div className="space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[#00FFCC] font-bold">[W]</span>
                    <span className="text-[#aaa]"><b className="text-white">Web5</b>: 终极个体主权 (DID+DWN)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[#FFCC00] font-bold">[B]</span>
                    <span className="text-[#aaa]"><b className="text-white">Blog</b>: 深度思想母体与长程推演</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[#B080E8] font-bold">[O]</span>
                    <span className="text-[#aaa]"><b className="text-white">Ontology</b>: 数字本体论 × 语义知识</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[#FF66AA] font-bold">[G]</span>
                    <span className="text-[#aaa]"><b className="text-white">Gateway</b>: Arc x402 智能体商贸网关</span>
                  </div>
                </div>
              </div>

              {/* 3.8. Uniswap v4 价格信标池与实时流动性 (Position #304322) */}
              <div className="rounded-xl border border-[#00FFCC]/30 bg-gradient-to-br from-[#00FFCC]/10 via-[#0a0e17] to-transparent p-4 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00FFCC] animate-ping" />
                    <span className="text-xs font-bold text-white font-mono">Uniswap v4 价格参考</span>
                  </div>
                  <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] border-none text-[9px] py-0 h-4 font-mono">
                    #304322
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-[11px] text-[#888]">$WBOG 单价 (示例):</span>
                  <span className="text-base font-bold text-[#00FFCC]">$0.000080 USDC</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#666] font-mono">
                  <span>示例汇率 1 USDC = 12,500 WBOG</span>
                  <span className="text-[#888]">○ 静态示例价 · 未接入实时报价</span>
                </div>
                <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-2">
                  <a
                    href="https://app.uniswap.org/positions/v4/arc/304322"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-[#aaa] font-mono transition-all"
                  >
                    <span>查看 LP 仓位</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href="https://app.uniswap.org/swap?chain=arc&inputCurrency=NATIVE&outputCurrency=0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-1 rounded bg-[#00FFCC]/15 hover:bg-[#00FFCC]/25 text-[10px] text-[#00FFCC] font-bold font-mono transition-all"
                  >
                    <span>去 Uniswap 交易</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* 4. Contracts (Circle Arc Mainnet) */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" style={{ color: COLORS.ap2 }} />
                    <span className="text-xs font-semibold tracking-widest uppercase text-[#888]">Arc Mainnet</span>
                  </div>
                  <Badge className="bg-[#00FFCC]/10 text-[#00FFCC] border-[#00FFCC]/30 text-[9px] py-0 h-4">
                    5042
                  </Badge>
                </div>
                <div className="space-y-2 text-[10px] font-mono">
                  {[
                    ['$WBOG Token', '0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f', COLORS.prime],
                    ['ContentNFT', '0x8537fe7268296f37c2f85f9aad992f11659d1c8a', COLORS.arp],
                    ['BudgetFence', '0xe0d246c09d7a3097bab3148f89201157dd531eea', COLORS.ap2],
                    ['VesselAuth', '0x2d4aebbd5d3e318c0deb91f927019835ecd9a120', COLORS.vessel],
                  ].map(([name, addr, color]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03]">
                      <span className="text-[#888]">{name}</span>
                      <a href={`https://explorer.arc.io/address/${addr}`} target="_blank"
                        className="flex items-center gap-1 hover:underline font-mono" style={{ color }}>
                        {addr.slice(0, 6)}…{addr.slice(-4)}<ArrowUpRight className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  ))}
                </div>

                {/* EIP-747 一键将 $WBOG 与高清图标添加到多链钱包 */}
                <div className="pt-3 mt-3 border-t border-white/[0.04]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (typeof window !== 'undefined' && (window as any).ethereum) {
                        try {
                          await (window as any).ethereum.request({
                            method: 'wallet_watchAsset',
                            params: {
                              type: 'ERC20',
                              options: {
                                address: '0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f',
                                symbol: 'WBOG',
                                decimals: 18,
                                image: 'https://web5.blog/tokens/wbog.png',
                              },
                            },
                          });
                        } catch (err: any) {
                          alert('添加代币取消或失败: ' + err?.message);
                        }
                      } else {
                        alert('请先安装 MetaMask / OKX Web3 钱包插件。');
                      }
                    }}
                    className="w-full text-[10px] border-[#00FFCC]/30 text-[#00FFCC] hover:bg-[#00FFCC]/10 h-7"
                  >
                    🦊 {isEn ? 'Add $WBOG to Web3 Wallet' : '一键添加 $WBOG 至 Web3 钱包'}
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ━━ Footer ━━ */}
      <Footer />
    </main>
    )}

      {/* ━━ 全局常驻弹窗 (无论是否登录、PC还是移动端/TMA均可随时唤出) ━━ */}
      <GenesisAirdropModal
        open={airdropOpen}
        onOpenChange={setAirdropOpen}
        session={session}
        onAwaken={openVesselLogin}
        onGoWrite={() => { setView('app'); setTab('write'); }}
      />

      <GenesisCurveModal
        open={curveModalOpen}
        onOpenChange={setCurveModalOpen}
        session={session}
      />

      <WalletGuideModal
        open={walletGuideOpen}
        onOpenChange={setWalletGuideOpen}
        onUseVessel={openVesselLogin}
      />

      <SponsorModal
        open={sponsorModalOpen}
        onOpenChange={setSponsorModalOpen}
        onSuccess={fetchSponsor}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// RitualLanding — Unauthenticated Entry
// ════════════════════════════════════════════════════════════════
function RitualLanding({ t, moduleLabels, loginMethod, setLoginMethod, vesselAuth, onVesselLogin, onWalletLogin, loginBusy, loginError, handleRitualSuccess, setSession, setView, setTab, setActiveModule, onOpenAirdrop, onOpenCurve, onOpenWalletGuide, curveReserve = 0, isEn }: any) {
  return (
    <main className="min-h-screen bg-[#050508] text-white overflow-hidden relative" suppressHydrationWarning>
      {/* ━━ 顶部右上角常驻工具栏：语言切换 + 分身致辞 ━━ */}
      <div className="fixed top-5 right-5 sm:right-8 z-50 flex items-center gap-2.5">
        <a
          href="/founder"
          className="text-xs text-[#888] hover:text-[#FFCC00] font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-black/60 backdrop-blur-xl shadow-lg hover:border-[#FFCC00]/40 transition-all"
        >
          <Quote className="w-3.5 h-3.5 text-[#FFCC00]" />
          <span>{t?.nav?.founder || '分身致辞'}</span>
        </a>
        <div className="p-1 rounded-xl border border-white/[0.08] bg-black/60 backdrop-blur-xl shadow-lg">
          <LanguageSwitcher />
        </div>
      </div>

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
              {/* Brand & 动态觉醒徽章 */}
              <div className="flex items-center gap-3 mb-8">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#00FFCC]/50 shadow-2xl shadow-[#00FFCC]/30 bg-black flex items-center justify-center">
                  <video
                    src="/brand-awakening.mp4"
                    poster="/brand-awakening-poster.jpg"
                    preload="metadata"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-110"
                  />
                  <div className="absolute inset-0 bg-[#00FFCC]/10 pointer-events-none" />
                </div>
                <div>
                  <div className="text-2xl font-black tracking-wider text-white font-mono flex items-center gap-1">
                    <span>W</span><span className="text-[#00FFCC]">•</span>
                    <span>B</span><span className="text-[#FFCC00]">•</span>
                    <span>O</span><span className="text-[#B080E8]">•</span>
                    <span>G</span>
                  </div>
                  <div className="text-[11px] text-[#00FFCC] tracking-[0.15em] uppercase font-mono mt-0.5">
                    Web5 Blog Ontology Gateway
                  </div>
                  <div className="text-[9px] text-[#666] tracking-wider mt-0.5">
                    {isEn ? 'Ontology Verification · Cognitive Matrix · Agent Gateway' : '存在论确权 · 思想母体 · 智能体价值网关'}
                  </div>
                </div>
              </div>

              {/* Tagline — 说人话：人话在前，协议在后 */}
              <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3 tracking-tight">
                <span className="text-white">
                  {isEn ? 'Write Once, ' : '写一次，'}
                </span>
                <span className="text-[#00FFCC]" style={{ textShadow: '0 0 40px rgba(0,255,204,0.3)' }}>
                  {isEn ? 'Long-term Archive.' : '长期存档。'}
                </span>
                <br />
                <span className="text-white/90 text-2xl sm:text-4xl mt-1.5 block font-bold">
                  {isEn ? 'Readable by Humans & AI · Transparent Provenance' : 'AI 和人类都能读，存证状态透明。'}
                </span>
              </h1>
              <p className="text-[#888] text-xs sm:text-sm mb-6 leading-relaxed max-w-xl">
                {isEn
                  ? 'Built with distributed storage (Arweave when confirmed) and Circle ARC USDC settlement rails. Every essay publishes its storage and provenance status, is discoverable by AI agents, and follows transparent revenue rules. Real payments and payouts remain in closed beta.'
                  : '采用分布式存储（确认后标注 Arweave 存证）与 Circle ARC USDC 结算架构。每篇博文公开存储与确权状态，可被外部 AI 检索，收益规则透明可查。真实打赏与结算通道内测中，暂不开放打款。'}
              </p>

              {/* 首屏核心行动 CTA 按钮组 (收敛至获客与赚钱主干) */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <button
                  onClick={() => { setView('app'); setTab('feed'); setActiveModule('tech'); }}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#0066FF] text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-[#00FFCC]/25 hover:scale-[1.02] transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{isEn ? '📖 Read Curated Articles' : '📖 立即阅读思想博文'}</span>
                </button>
                <button
                  onClick={() => { setView('app'); setTab('feed'); setActiveModule('bounties'); }}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#FFCC00] to-[#FF6633] text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-[#FFCC00]/25 hover:scale-[1.02] transition-all"
                >
                  <Target className="w-4 h-4" />
                  <span>{isEn ? '🎯 Bounty Plaza (Preview)' : '🎯 悬赏任务大厅 (内测展示)'}</span>
                </button>
                <button
                  onClick={() => { setView('app'); setTab('write'); }}
                  className="px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.15] font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Zap className="w-4 h-4 text-[#FFCC00]" />
                  <span>{isEn ? '✍️ Start Writing' : '✍️ 开启 AI 写作'}</span>
                </button>
                <a
                  href="/api/openapi.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-3 rounded-xl border border-white/[0.08] bg-black/40 text-[#888] hover:text-[#00FFCC] hover:border-[#00FFCC]/30 font-mono text-xs flex items-center gap-1.5 transition-all"
                >
                  <Bot className="w-4 h-4 text-[#00FFCC]" />
                  <span>{isEn ? '🤖 Agent API' : '🤖 接入 Agent API'}</span>
                </a>
              </div>

              {/* 创世空投横幅 */}
              <div
                onClick={onOpenAirdrop}
                className="mb-3.5 p-3.5 rounded-xl border border-[#FFCC00]/40 bg-gradient-to-r from-[#FFCC00]/10 via-[#00FFCC]/05 to-transparent flex items-center justify-between cursor-pointer hover:border-[#FFCC00]/70 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FFCC00]/15 flex items-center justify-center text-[#FFCC00]">
                    <Gift className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{isEn ? 'Genesis 1,000 $WBOG Airdrop Preview' : '创世先锋 $WBOG 空投预告'}</span>
                      <Badge className="bg-[#FFCC00]/20 text-[#FFCC00] text-[9px] py-0 h-4">
                        {isEn ? 'Not Open' : '未开放'}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-[#888] mt-0.5">
                      {isEn ? 'Planned allocation · Claim not yet open' : '方案展示 · 领取暂未开放，请勿打款'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#FFCC00] group-hover:translate-x-1 transition-transform" />
              </div>

              {/* 创世金库 3000U 冲刺横幅 */}
              <div
                onClick={onOpenCurve}
                className="mb-6 p-3.5 rounded-xl border border-[#00FFCC]/40 bg-gradient-to-r from-[#00FFCC]/15 via-[#FFCC00]/05 to-transparent flex items-center justify-between cursor-pointer hover:border-[#00FFCC]/70 transition-all group shadow-lg shadow-[#00FFCC]/05"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#00FFCC]/15 flex items-center justify-center text-[#00FFCC]">
                    <Rocket className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{isEn ? 'Genesis Curve Angel Vault (Preview)' : 'GenesisCurve 创世金库（内测展示）'}</span>
                      <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] text-[9px] py-0 h-4 font-mono">
                        {isEn ? 'Not Open' : '未开放'}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-[#888] mt-0.5">
                      {isEn ? 'Subscription and custody are not open · Do not send funds' : '认购与资金托管尚未开放 · 请勿打款'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#00FFCC] group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Login Cards — 仅保留容器与钱包两种主权登录 */}
              {!loginMethod ? (
                <div className="space-y-3">
                  {loginError && (
                    <div role="alert" className="rounded-lg border border-[#FF66AA]/40 bg-[#FF66AA]/10 px-3 py-2 text-[12px] leading-relaxed text-[#FF9AC4]">
                      {loginError}
                    </div>
                  )}
                  <LoginBtn
                    icon={<Sparkles className="w-5 h-5" />}
                    title={isEn ? "Vessel Container Awakening" : (t?.login?.vessel || 'Vessel 容器登录')}
                    desc={isEn ? "AP2/AA2P Protocol — 4-step cryptographic handshake to awaken your unique avatar" : "AP2/AA2P 协议 — 四步握手唤醒专属分身，首次自动生成唯一恒定 DID"}
                    color={COLORS.eidolon} onClick={onVesselLogin} busy={loginBusy === 'vessel'}
                  />
                  <LoginBtn
                    icon={<Wallet className="w-5 h-5" />}
                    title={isEn ? "Web3 Wallet Connect" : (t?.login?.wallet || '数字钱包登录')}
                    desc={isEn ? "MetaMask / OKX / Web3 Wallet — Direct on-chain container binding & signing" : "MetaMask / OKX / Web3 钱包 — 链上签名绑定容器，直接开启完整创作权限"}
                    color={COLORS.prime} onClick={onWalletLogin} busy={loginBusy === 'wallet'}
                  />
                </div>
              ) : loginMethod === 'vessel' ? (
                <div className="animate-in fade-in">
                  <button onClick={() => setLoginMethod(null)} className="text-[#444] hover:text-[#00FFCC] text-sm mb-4 flex items-center gap-1 transition-colors">
                    ← {isEn ? 'Back to Login Options' : '返回选择登录方式'}
                  </button>
                  <ScanRitual auth={vesselAuth} onSuccess={handleRitualSuccess} onError={(e) => console.error(e)} seed="web5-ritual-constant" />
                </div>
              ) : null}
            </div>

            {/* Right — 3D Cyber Hologram Avatar Stage (with Real Yield HUD) */}
            <div className="hidden lg:block lg:col-span-2 space-y-4 lg:pt-36">
              <HologramAvatarStage />
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
  tech:          { title: '科技前沿', desc: 'AI 模型、Web5 协议、智能合约与数字分身的最新技术进展。' },
  humanities:    { title: '人文思辨', desc: '科技与人文的交叉地带——碳基与硅基文明的对话。' },
  humanity:      { title: '人文思辨', desc: '科技与人文的交叉地带——碳基与硅基文明的对话。' },
  experts:       { title: 'AI 专家智库', desc: '直连 4 大核心领域智能体专家，提供深度研报与 x402 付费会诊。' },
  piaoshu:       { title: 'AI 专家智库', desc: '直连 4 大核心领域智能体专家，提供深度研报与 x402 付费会诊。' },
  bounties:      { title: '悬赏与任务广场', desc: '做任务赚 USDC！认领去中心化任务，分身自主推进，链上秒级结算。' },
  bounty:        { title: '悬赏与任务广场', desc: '做任务赚 USDC！认领去中心化任务，分身自主推进，链上秒级结算。' },
  crowdfunding:  { title: '创意众筹', desc: '社区驱动的创意融资。支持前瞻性实验，获取早期生态权益。' },
  crowd:         { title: '创意众筹', desc: '社区驱动的创意融资。支持前瞻性实验，获取早期生态权益。' },
  crowdsourcing: { title: '悬赏与任务广场', desc: '做任务赚 USDC！认领去中心化任务，分身自主推进，链上秒级结算。' },
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

function LoginBtn({ icon, title, desc, color, onClick, busy }: any) {
  return (
    <button onClick={onClick} disabled={busy}
      aria-busy={busy || undefined}
      className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all group hover:scale-[1.02] hover:border-opacity-50 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
      style={{ borderColor: `${color}20`, backgroundColor: `${color}05` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15`, color }}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-[11px] text-[#555] mt-0.5">
          {busy ? '处理中，请在弹出的钱包窗口确认…' : desc}
        </div>
      </div>
      {busy
        ? <span className="text-[10px] font-mono" style={{ color }}>…</span>
        : <ChevronRight className="w-4 h-4 text-[#333] group-hover:text-white transition-colors" />}
    </button>
  );
}

// ━━ Auth helpers ━━
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 超时（${Math.round(ms / 1000)}s），请检查钱包插件或网络后重试`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

async function connectWallet(
  s: any, v: any, t: any,
  openGuide?: () => void,
  onBusy?: (busy: boolean) => void,
  onError?: (msg: string | null) => void,
) {
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    onError?.('未检测到浏览器钱包。请安装 MetaMask / OKX Web3 插件（或在内置浏览器中打开），也可以先用「Vessel 容器登录」免插件进入。');
    openGuide?.();
    return;
  }

  onError?.(null);
  onBusy?.(true);
  try {
    // ━━ 1. 切换 Circle ARC 主网 (5042 = 0x13b2)，失败不阻塞登录 ━━
    const chainIdHex = '0x13b2';
    try {
      const current: string = await withTimeout(
        ethereum.request({ method: 'eth_chainId' }), 8000, '读取钱包网络',
      );
      if (current?.toLowerCase() !== chainIdHex) {
        try {
          await withTimeout(
            ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] }),
            12000, '切换 Arc 网络',
          );
        } catch (switchError: any) {
          if (switchError?.code === 4902) {
            await withTimeout(ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainIdHex,
                chainName: 'Arc Mainnet',
                nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                rpcUrls: ['https://rpc.mainnet.arc.io'],
                blockExplorerUrls: ['https://explorer.arc.io'],
              }],
            }), 12000, '添加 Arc 网络');
          } else if (switchError?.code !== 4001) {
            console.warn('[Web5] Chain switch skipped:', switchError);
          }
        }
      }
    } catch (chainErr) {
      console.warn('[Web5] Chain preparation skipped:', chainErr);
    }

    // ━━ 2. 获取钱包地址 ━━
    const accounts = await withTimeout(
      ethereum.request({ method: 'eth_requestAccounts' }), 60000, '等待钱包授权',
    );
    const addr = accounts?.[0];
    if (!addr) throw new Error('钱包未返回账户地址');

    // ━━ 3. 个人签名（证明钱包所有权，弹窗确认） ━━
    const vessel = getOrCreateVesselWallet();
    const signMsg = `Web5.blog Sovereign Login\n\nWallet: ${addr}\nVessel: ${vessel.address}\nChain: Arc Mainnet (5042)\nTimestamp: ${Date.now()}`;
    const signature = await withTimeout(
      ethereum.request({ method: 'personal_sign', params: [signMsg, addr] }),
      180000, '等待钱包签名',
    );

    // ━━ 4. 后端钱包登录（完整权限，非 Observer 只读；主钱包身份 + 专用钱包容器） ━━
    const res = await withTimeout(fetch('/api/auth/wallet-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: addr, vesselAddress: vessel.address, signature, message: signMsg }),
    }), 30000, '服务器验证签名');
    const data = await res.json();

    if (data.success && data.session) {
      const session = parseSessionResponse(data.session);
      persistVesselSession(session);
      s(session);
      v('app');
      t('vessels');
    } else {
      onError?.(data.error || '钱包登录失败，请重试');
    }
  } catch (err: any) {
    console.warn('[Web5] Wallet login error:', err);
    if (err?.code === 4001) {
      onError?.('已取消签名，登录未完成。');
    } else {
      onError?.('钱包登录失败：' + (err?.message || '请在钱包中确认签名后重试'));
    }
  } finally {
    onBusy?.(false);
  }
}
async function connectTwitter(s: any, v: any, t: any) {
  const callbackUrl = encodeURIComponent(
    `${window.location.origin}/api/auth/twitter/callback?redirect=${encodeURIComponent(window.location.pathname)}`
  );
  window.location.href = `/api/auth/twitter?callback_url=${callbackUrl}`;
}
async function connectObserver(s: any, v: any, t: any) {
  await doLogin('0x' + Math.random().toString(16).slice(2).padStart(40, '0'), s, v, t, false);
}

/** 统一登录逻辑：真实验证与 Vessel 权限分发 */
async function doLogin(addr: string, setSession: any, setView: any, setTab: any, isVessel: boolean = true) {
  try {
    let sessionData: any = null;

    if (isVessel) {
      // 真实唤醒 Vessel 容器并分发 Circle 托管钱包与完整写作确权权限
      const vesselDid = `did:vessel:${addr.toLowerCase()}`;
      const eidolonDid = `did:eidolon:${addr.toLowerCase().slice(-16)}`;
      const res = await fetch('/api/auth/vessel-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge: {
            blogDid: 'did:web5blog:default',
            permissions: ['read', 'comment', 'publish', 'micropay'],
            timestamp: Date.now(),
            nonce: 'web5-login-' + Math.random().toString(36).slice(2),
          },
          aa2pClaim: {
            vesselDid,
            eidolonDid,
            signature: '0x' + '1'.repeat(130),
            challenge: {
              blogDid: 'did:web5blog:default',
              permissions: ['read', 'comment', 'publish', 'micropay'],
              timestamp: Date.now(),
              nonce: 'web5-login-claim',
            },
            expiresAt: Date.now() + 86400000 * 30,
          },
          vesselDid,
          eidolonDid,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        sessionData = d.session || d;
      }
    }

    if (!sessionData) {
      const res = await fetch('/api/auth/observer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: addr }),
      });
      if (res.ok) {
        const d = await res.json();
        sessionData = d.session;
      }
    }

    if (sessionData && typeof window !== 'undefined') {
      sessionStorage.setItem('web5_vessel_session', JSON.stringify(sessionData));
      setSession(sessionData);
      setView('app');
      setTab('feed');
    }
  } catch (err) {
    console.error('Login process error:', err);
  }
}
