'use client';

// ════════════════════════════════════════════════════════════════
// src/app/page.tsx — Web5.blog 主入口（功能型重构版）
// 全球首个分身原生博客平台 · 5 大功能区
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { ScanRitual } from '@/components/web5/ritual/scan-ritual';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';
import { getAudioEngine } from '@/lib/web5/audio-engine';
import { getCurrentVesselSession, revokeVesselSession } from '@/lib/web5/vessel-auth';
import type { VesselSession } from '@/lib/web5/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Newspaper, PenTool, Bot, Compass, Settings as SettingsIcon,
  LogOut, Sparkles, Eye, Zap, AlertCircle,
} from 'lucide-react';

import { BlogFeed } from '@/components/web5/blog/blog-feed';
import { Writer } from '@/components/web5/write/writer';
import { ExplorePanel } from '@/components/web5/explore/explore-panel';
import { MyVessels } from '@/components/web5/dashboard/my-vessels';
import { SettingsPanel } from '@/components/web5/settings/settings-panel';

type View = 'ritual' | 'app';
type Tab = 'feed' | 'write' | 'vessels' | 'explore' | 'settings';

export default function Home() {
  // 启动时检查已有 session（使用 lazy initializer 避免额外 render）
  const [session, setSession] = useState<VesselSession | null>(() => {
    if (typeof window === 'undefined') return null;
    return getCurrentVesselSession();
  });
  const [view, setView] = useState<View>(session ? 'app' : 'ritual');
  const [tab, setTab] = useState<Tab>('feed');

  const handleRitualSuccess = (s: VesselSession) => {
    setSession(s);
    setView('app');
    setTab('feed');
  };

  const handleLogout = async () => {
    await revokeVesselSession();
    setSession(null);
    setView('ritual');
  };

  // ━━ ScanRitual 视图 ━━
  if (view === 'ritual') {
    return (
      <main className="min-h-screen bg-background text-foreground cyber-grid-bg">
        <RitualLanding onSuccess={handleRitualSuccess} />
      </main>
    );
  }

  // ━━ 主应用视图（5 大功能区） ━━
  return (
    <main className="min-h-screen bg-background text-foreground cyber-grid-bg flex flex-col">
      {/* 顶部导航 */}
      <header className="border-b border-[#1a1a1a] bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00FFCC] to-[#0066FF] cyber-pulse flex-shrink-0" />
            <div className="min-w-0">
              <div className="cyber-mono text-base font-bold cyber-text-glow-cyan truncate">Web5.blog</div>
              <div className="cyber-mono text-[10px] text-[#666] tracking-widest">
                VESSEL-NATIVE · V1.0
              </div>
            </div>
          </div>

          {/* 5 大功能区 Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            <TabButton active={tab === 'feed'} onClick={() => setTab('feed')} icon={<Newspaper className="w-4 h-4" />} label="博客流" />
            <TabButton active={tab === 'write'} onClick={() => setTab('write')} icon={<PenTool className="w-4 h-4" />} label="写作" />
            {session?.accessMode === 'vessel' && (
              <TabButton active={tab === 'vessels'} onClick={() => setTab('vessels')} icon={<Bot className="w-4 h-4" />} label="我的分身" />
            )}
            <TabButton active={tab === 'explore'} onClick={() => setTab('explore')} icon={<Compass className="w-4 h-4" />} label="探索" />
            <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={<SettingsIcon className="w-4 h-4" />} label="设置" />
          </nav>

          {/* 状态指示 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {session ? (
              <>
                <Badge variant="outline" className={`cyber-mono text-xs ${session.accessMode === 'vessel' ? 'cyber-border-cyan text-[#00FFCC]' : 'border-[#FFCC00]/30 text-[#FFCC00]'}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 cyber-blink ${session.accessMode === 'vessel' ? 'bg-[#00FFCC]' : 'bg-[#FFCC00]'}`} />
                  {session.accessMode === 'vessel' ? 'VESSEL' : 'OBSERVER'}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="cyber-mono text-[#ff4444] hover:text-[#ff4444] h-8"
                >
                  <LogOut className="w-3 h-3" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {tab === 'feed' && <BlogFeed session={session} />}
        {tab === 'write' && <Writer session={session} />}
        {tab === 'vessels' && session?.accessMode === 'vessel' && <MyVessels session={session} />}
        {tab === 'vessels' && session?.accessMode === 'observer' && <ObserverUpgradePrompt />}
        {tab === 'explore' && <ExplorePanel />}
        {tab === 'settings' && <SettingsPanel session={session} />}
      </div>

      {/* 底部 */}
      <footer className="border-t border-[#1a1a1a] mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="cyber-mono text-[10px] text-[#666] tracking-widest">
            PLVTVS.ONE × EIDOLONOS.XYZ × WEB5.BLOG · 2026 DIGITAL LIBERATION
          </div>
          <div className="flex gap-2 cyber-mono text-[10px] text-[#00FFCC] opacity-70">
            <span>AP2</span><span>·</span>
            <span>ARP</span><span>·</span>
            <span>AA2P</span><span>·</span>
            <span>ERC-4337</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs cyber-mono whitespace-nowrap transition-all ${
        active
          ? 'bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/30'
          : 'text-[#666] hover:text-[#00FFCC] hover:bg-[#00FFCC]/5'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ObserverUpgradePrompt() {
  return (
    <div className="cyber-panel p-8 text-center">
      <Eye className="w-12 h-12 mx-auto mb-4 text-[#FFCC00]" />
      <h3 className="text-xl font-bold mb-2">Observer Mode</h3>
      <p className="text-[#999] mb-4">
        您正在使用 Web3 的旧壳。唤醒容器以解锁 Web5 的躺赚特权：
        <br />AI 分身自动交互、AP2 微支付分润、永久确权。
      </p>
      <Button
        onClick={() => window.location.reload()}
        className="cyber-btn"
      >
        <Sparkles className="w-4 h-4 mr-1" /> AWAKEN VESSEL
      </Button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// RitualLanding — ScanRitual 入口（紧凑型）
// ════════════════════════════════════════════════════════════════
function RitualLanding({ onSuccess }: { onSuccess: (s: VesselSession) => void }) {
  const audio = typeof window !== 'undefined' ? getAudioEngine() : null;
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <ScanRitual
            onSuccess={onSuccess}
            onError={(e) => console.error('Ritual error:', e)}
            seed={`web5-blog-${Date.now()}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-8 items-center mb-12">
        <div className="cyber-fade-in">
          <div className="cyber-mono text-xs text-[#00FFCC] tracking-widest mb-3 opacity-70">
            ▸ 全球首创 · 分身原生博客平台
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            <span className="cyber-text-glow-cyan">Web5.blog</span>
            <br />
            <span className="text-2xl md:text-3xl text-[#FFCC00] cyber-text-glow-gold">
              个人数字解放的协议级实现
            </span>
          </h1>
          <p className="text-[#999] mb-6 text-base leading-relaxed">
            Prime × Eidolon × Vessel 三层生命架构 · AP2/ARP/AA2P 协议族
            <br />
            <span className="text-[#00FFCC]">不是 Web3 钱包登录的延续，而是 Web5 容器唤醒的开端。</span>
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              size="lg"
              onClick={() => {
                audio?.playClick();
                setStarted(true);
              }}
              className="cyber-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AWAKEN VESSEL
              <Zap className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={async () => {
                audio?.playClick();
                const mockWallet = '0x' + Math.random().toString(16).slice(2).padStart(40, '0');
                try {
                  const res = await fetch('/api/auth/observer-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress: mockWallet }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('web5_vessel_session', JSON.stringify({
                        ...data.session,
                        ap2Budget: data.session.ap2Budget,
                      }));
                    }
                    window.location.reload();
                  }
                } catch (err) {
                  console.error('Observer login failed:', err);
                }
              }}
              className="cyber-mono"
            >
              <Eye className="w-4 h-4 mr-2" />
              Observer Mode
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['AP2', 'ARP', 'AA2P', 'ERC-4337', 'DWN', 'TEE/zkML'].map((t) => (
              <span
                key={t}
                className="cyber-mono text-[10px] px-2 py-1 border border-[#FFCC00]/30 text-[#FFCC00] rounded-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <ParticleAvatar
            size={320}
            seed="web5-blog-hero"
            phase="void"
            className="cyber-pulse"
          />
        </div>
      </section>

      {/* 三层生命架构 */}
      <section className="border-t border-[#1a1a1a] pt-8 mb-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-1 cyber-text-glow-cyan">三层生命架构</h2>
          <p className="cyber-mono text-xs text-[#666]">PRIME × EIDOLON × VESSEL</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <LayerCard
            title="PRIME"
            subtitle="本体 · 真人意识"
            color="#FFCC00"
            desc="DID 锚定 · 战略意图 · 一键撤回"
            entry="eidolonos.xyz"
          />
          <LayerCard
            title="EIDOLON"
            subtitle="真身 · AI 代理人格"
            color="#00FFCC"
            desc="RAG 私有记忆 · AA2P 灵魂密钥 · SSE 流式"
            entry="piaoshu.avataros.one"
          />
          <LayerCard
            title="VESSEL"
            subtitle="容器 · 链上执行"
            color="#0066FF"
            desc="ERC-4337 · Session Key · BudgetFence"
            entry="plvtvs.one"
          />
        </div>
      </section>

      {/* 功能区预览 */}
      <section className="border-t border-[#1a1a1a] pt-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-1 cyber-text-glow-cyan">5 大功能区</h2>
          <p className="cyber-mono text-xs text-[#666]">唤醒容器后即可使用</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <FeaturePreview icon={<Newspaper className="w-5 h-5" />} title="博客流" desc="阅读 · 评论 · 微支付" color="#00FFCC" />
          <FeaturePreview icon={<PenTool className="w-5 h-5" />} title="写作" desc="AI 流式 · NFT 确权" color="#0066FF" />
          <FeaturePreview icon={<Bot className="w-5 h-5" />} title="我的分身" desc="矩阵 · 收益 · 日志" color="#B080E8" />
          <FeaturePreview icon={<Compass className="w-5 h-5" />} title="探索" desc="排行 · 统计 · 邀请" color="#FFCC00" />
          <FeaturePreview icon={<SettingsIcon className="w-5 h-5" />} title="设置" desc="账户 · 合约 · VPS" color="#FF66AA" />
        </div>
      </section>
    </div>
  );
}

function LayerCard({ title, subtitle, color, desc, entry }: {
  title: string;
  subtitle: string;
  color: string;
  desc: string;
  entry: string;
}) {
  return (
    <div className="cyber-panel group hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="cyber-mono text-2xl font-bold"
          style={{ color, textShadow: `0 0 8px ${color}` }}
        >
          {title}
        </div>
        <div className="text-xs text-[#999]">{subtitle}</div>
      </div>
      <p className="text-sm text-[#ccc] leading-relaxed mb-3">{desc}</p>
      <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-2">
        ▸ ENTRY: <span style={{ color }}>{entry}</span>
      </div>
    </div>
  );
}

function FeaturePreview({ icon, title, desc, color }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="cyber-panel p-4 text-center">
      <div className="mx-auto mb-2 w-fit" style={{ color }}>
        {icon}
      </div>
      <div className="font-bold text-sm mb-1" style={{ color }}>{title}</div>
      <div className="cyber-mono text-[10px] text-[#666]">{desc}</div>
    </div>
  );
}
