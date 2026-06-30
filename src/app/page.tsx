'use client';

// ════════════════════════════════════════════════════════════════
// src/app/page.tsx — Web5.blog 主入口
// 全球首个分身原生博客平台 · 容器登录范式
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { ScanRitual } from '@/components/web5/ritual/scan-ritual';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';
import { getAudioEngine } from '@/lib/web5/audio-engine';
import { getCurrentVesselSession, revokeVesselSession } from '@/lib/web5/vessel-auth';
import { fromTokenUnits, type VesselSession, parseFromJson } from '@/lib/web5/types';

/** 安全地将后端返回的 BigInt 序列化对象还原为 bigint */
function toBigInt(v: any): bigint {
  if (typeof v === 'bigint') return v;
  if (v && typeof v === 'object' && v.__bigint !== undefined) return BigInt(v.__bigint);
  if (typeof v === 'string') return BigInt(v);
  if (typeof v === 'number') return BigInt(v);
  return 0n;
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, Coins, Zap, FileText, Cpu, Shield, LogOut,
  Sparkles, Eye, Terminal, ArrowRight,
} from 'lucide-react';

type View = 'landing' | 'ritual' | 'dashboard';

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [session, setSession] = useState<VesselSession | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // 启动时检查已有 session
  useEffect(() => {
    const s = getCurrentVesselSession();
    if (s && s.accessMode === 'vessel') {
      setSession(s);
      setView('dashboard');
    }
  }, []);

  // 加载 Dashboard 数据
  const loadDashboard = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'x-vessel-did': session.vesselDid },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Dashboard load failed:', err);
    }
  }, [session]);

  useEffect(() => {
    if (view === 'dashboard' && session) {
      loadDashboard();
    }
  }, [view, session, loadDashboard]);

  const handleRitualSuccess = (s: VesselSession) => {
    setSession(s);
    setView('dashboard');
    setTimeout(loadDashboard, 200);
  };

  const handleLogout = async () => {
    await revokeVesselSession();
    setSession(null);
    setDashboardData(null);
    setView('landing');
  };

  return (
    <main className="min-h-screen bg-background text-foreground cyber-grid-bg">
      {/* 顶部导航 */}
      <header className="border-b border-[#1a1a1a] bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00FFCC] to-[#0066FF] cyber-pulse" />
            <div>
              <div className="cyber-mono text-lg font-bold cyber-text-glow-cyan">Web5.blog</div>
              <div className="cyber-mono text-[10px] text-[#666] tracking-widest">
                VESSEL-NATIVE BLOG · V1.0
              </div>
            </div>
          </div>
          {session && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="cyber-border-cyan text-[#00FFCC] cyber-mono">
                <span className="w-2 h-2 rounded-full bg-[#00FFCC] mr-2 cyber-blink" />
                VESSEL ACTIVE
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogout}
                className="cyber-mono text-[#ff4444] hover:text-[#ff4444]"
              >
                <LogOut className="w-4 h-4 mr-1" /> REVOKE
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* 主内容 */}
      {view === 'landing' && <LandingView onAwaken={() => setView('ritual')} />}
      {view === 'ritual' && (
        <div className="max-w-7xl mx-auto px-6 py-16">
          <ScanRitual
            onSuccess={handleRitualSuccess}
            onError={(e) => console.error('Ritual error:', e)}
            seed={`web5-blog-${Date.now()}`}
          />
        </div>
      )}
      {view === 'dashboard' && session && (
        <DashboardView
          session={session}
          data={dashboardData}
          onReload={loadDashboard}
        />
      )}

      {/* 底部 */}
      <footer className="border-t border-[#1a1a1a] mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="cyber-mono text-xs text-[#666] tracking-widest">
            PLVTVS.ONE × EIDOLONOS.XYZ × WEB5.BLOG · 2026 DIGITAL LIBERATION
          </div>
          <div className="flex gap-4 cyber-mono text-xs text-[#00FFCC] opacity-70">
            <span>AP2</span><span>·</span>
            <span>ARP</span><span>·</span>
            <span>AA2P</span><span>·</span>
            <span>ERC-4337</span><span>·</span>
            <span>DWN</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ════════════════════════════════════════════════════════════════
// Landing View — 全球首创容器登录范式的展示
// ════════════════════════════════════════════════════════════════
function LandingView({ onAwaken }: { onAwaken: () => void }) {
  const audio = typeof window !== 'undefined' ? getAudioEngine() : null;

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Hero */}
      <section className="py-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="cyber-fade-in">
          <div className="cyber-mono text-xs text-[#00FFCC] tracking-widest mb-4 opacity-70">
            ▸ 全球首创 · 分身原生博客平台
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="cyber-text-glow-cyan">Web5.blog</span>
            <br />
            <span className="text-3xl md:text-4xl text-[#FFCC00] cyber-text-glow-gold">
              个人数字解放的协议级实现
            </span>
          </h1>
          <p className="text-[#999] mb-8 text-lg leading-relaxed">
            Prime × Eidolon × Vessel 三层生命架构 · AP2/ARP/AA2P 协议族 · ERC-4337 账户抽象
            <br />
            <span className="text-[#00FFCC]">不是 Web3 钱包登录的延续，而是 Web5 容器唤醒的开端。</span>
          </p>

          <div className="flex flex-wrap gap-4 mb-8">
            <Button
              size="lg"
              onClick={() => {
                audio?.playClick();
                onAwaken();
              }}
              className="cyber-btn text-base"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AWAKEN VESSEL
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                audio?.playClick();
                handleObserverLogin();
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
                className="cyber-mono text-xs px-2 py-1 border border-[#FFCC00]/30 text-[#FFCC00] rounded-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <ParticleAvatar
            size={360}
            seed="web5-blog-hero"
            phase="void"
            explode={0}
            className="cyber-pulse"
          />
        </div>
      </section>

      {/* 三层生命架构 */}
      <section className="py-16 border-t border-[#1a1a1a]">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 cyber-text-glow-cyan">
            三层生命架构
          </h2>
          <p className="cyber-mono text-sm text-[#666]">
            PRIME × EIDOLON × VESSEL · 人机共生体的本体论定义
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <LayerCard
            title="PRIME"
            subtitle="本体 · 真人意识"
            color="gold"
            icon={<Shield className="w-6 h-6" />}
            desc="战略意图发源地 · 价值判断裁决者 · DID 锚定 Bitcoin/Base 双链 · 一键撤回所有 Vessel 授权"
            entry="eidolonos.xyz"
          />
          <LayerCard
            title="EIDOLON"
            subtitle="真身 · AI 代理人格"
            color="cyan"
            icon={<Cpu className="w-6 h-6" />}
            desc="RAG 私有记忆 · 风格画像 · AA2P 灵魂密钥 · TEE/zkML 隐私保护 · SSE 流式意识输出"
            entry="piaoshu.avataros.one"
          />
          <LayerCard
            title="VESSEL"
            subtitle="容器 · 链上执行环境"
            color="blue"
            icon={<Zap className="w-6 h-6" />}
            desc="ERC-4337 Smart Account · Session Key 无感微支付 · BudgetFence 预算控制 · Paymaster gasless"
            entry="plvtvs.one"
          />
        </div>
      </section>

      {/* 五层架构 */}
      <section className="py-16 border-t border-[#1a1a1a]">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 cyber-text-glow-cyan">
            五层系统架构
          </h2>
          <p className="cyber-mono text-sm text-[#666]">
            协议驱动 · 层间解耦 · 深度复用 · 渐进演进
          </p>
        </div>

        <div className="space-y-3 max-w-4xl mx-auto">
          {[
            { layer: 'L5', name: '应用与交互层', tech: 'Next.js 16 · Three.js · ScanRitual · shadcn', color: '#00FFCC' },
            { layer: 'L4', name: '经济与微支付层', tech: 'AP2 · BudgetFence · Revenue Splitter · Auto-Harvest', color: '#0066FF' },
            { layer: 'L3', name: 'AI 分身与计算层', tech: 'DWN RAG · LangChain · Phala TEE · zkML', color: '#B080E8' },
            { layer: 'L2', name: '存储与确权层', tech: 'Arweave · Irys · IPFS · Ceramic · ARP', color: '#FFCC00' },
            { layer: 'L1', name: '身份与资产层', tech: 'DID · ERC-4337 · Passkey · RainbowKit', color: '#FF66AA' },
          ].map((l) => (
            <div
              key={l.layer}
              className="cyber-panel flex items-center gap-6 p-4 hover:scale-[1.01] transition-transform"
            >
              <div
                className="cyber-mono text-2xl font-bold w-12"
                style={{ color: l.color, textShadow: `0 0 8px ${l.color}` }}
              >
                {l.layer}
              </div>
              <div className="flex-1">
                <div className="font-bold">{l.name}</div>
                <div className="cyber-mono text-xs text-[#999]">{l.tech}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 30/60/90 路线图 */}
      <section className="py-16 border-t border-[#1a1a1a]">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 cyber-text-glow-cyan">
            30/60/90 天冲刺路线图
          </h2>
          <p className="cyber-mono text-sm text-[#666]">
            MVP → BETA → GA · 边建边发布形成自增强循环
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <RoadmapCard
            phase="DAY 0-30"
            title="MVP"
            color="#00FFCC"
            items={[
              'VesselAuth 合约 · Base Sepolia',
              '容器登录 + ScanRitual 动效',
              'Arweave 永久存储集成',
              '基础 AI 写作（SSE 流式）',
              '5 篇种子文章 NFT 铸造',
            ]}
            kpi="100+ 测试网容器激活"
          />
          <RoadmapCard
            phase="DAY 31-60"
            title="BETA"
            color="#0066FF"
            items={[
              'AP2 合约主网 + OpenZeppelin 审计',
              '4 模块 Dashboard 上线',
              'Read-to-Earn 模块',
              '推荐分润合约',
              '100 个种子 Vessel（邀请制）',
            ]}
            kpi="$500+/月微支付总额"
          />
          <RoadmapCard
            phase="DAY 61-90"
            title="GA"
            color="#FFCC00"
            items={[
              'web5-deploy CLI 一键白标',
              'Web5 域名合约',
              'Stripe + Crypto 双支付',
              'Affiliate Program',
              '10 个 White-label 合作伙伴',
            ]}
            kpi="$5k+ MRR"
          />
        </div>
      </section>
    </div>
  );
}

async function handleObserverLogin() {
  // 模拟 Observer Mode 登录
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
          ap2Budget: {
            ...data.session.ap2Budget,
            dailyLimit: data.session.ap2Budget.dailyLimit,
            perTxLimit: data.session.ap2Budget.perTxLimit,
          },
        }));
      }
      window.location.reload();
    }
  } catch (err) {
    console.error('Observer login failed:', err);
  }
}

function LayerCard({
  title, subtitle, color, icon, desc, entry,
}: {
  title: string;
  subtitle: string;
  color: 'gold' | 'cyan' | 'blue';
  icon: React.ReactNode;
  desc: string;
  entry: string;
}) {
  const colorMap = {
    gold: { hex: '#FFCC00', glow: 'cyber-text-glow-gold' },
    cyan: { hex: '#00FFCC', glow: 'cyber-text-glow-cyan' },
    blue: { hex: '#0066FF', glow: 'cyber-text-glow-blue' },
  };
  const c = colorMap[color];
  return (
    <div className="cyber-panel group hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-sm flex items-center justify-center border"
          style={{ borderColor: c.hex, color: c.hex, boxShadow: `0 0 12px ${c.hex}33` }}
        >
          {icon}
        </div>
        <div>
          <div className={`cyber-mono text-2xl font-bold ${c.glow}`} style={{ color: c.hex }}>
            {title}
          </div>
          <div className="text-xs text-[#999]">{subtitle}</div>
        </div>
      </div>
      <p className="text-sm text-[#ccc] leading-relaxed mb-4">{desc}</p>
      <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-3">
        ▸ ENTRY: <span style={{ color: c.hex }}>{entry}</span>
      </div>
    </div>
  );
}

function RoadmapCard({
  phase, title, color, items, kpi,
}: {
  phase: string;
  title: string;
  color: string;
  items: string[];
  kpi: string;
}) {
  return (
    <div className="cyber-panel">
      <div className="cyber-mono text-xs mb-2" style={{ color }}>
        {phase}
      </div>
      <div className="text-3xl font-bold mb-4" style={{ color, textShadow: `0 0 8px ${color}` }}>
        {title}
      </div>
      <ul className="space-y-2 mb-4">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-[#ccc] flex gap-2">
            <span style={{ color }}>▸</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-[#1a1a1a] pt-3">
        <div className="cyber-mono text-xs text-[#666]">KPI</div>
        <div className="text-sm font-bold" style={{ color }}>{kpi}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Dashboard View — 4 模块容器状态监控
// ════════════════════════════════════════════════════════════════
function DashboardView({
  session, data, onReload,
}: {
  session: VesselSession;
  data: any;
  onReload: () => void;
}) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 顶部：分身矩阵热切换 */}
      <Card className="cyber-panel mb-6">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <ParticleAvatar size={64} seed={session.vesselDid} phase="dashboard" />
          <div className="flex-1 min-w-0">
            <div className="cyber-mono text-xs text-[#00FFCC] opacity-70">VESSEL DID</div>
            <div className="cyber-mono text-sm truncate">{session.vesselDid}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="cyber-mono text-xs text-[#FFCC00] opacity-70">EIDOLON DID</div>
            <div className="cyber-mono text-sm truncate">{session.eidolonDid}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="cyber-mono text-xs text-[#0066FF] opacity-70">PRIME DID</div>
            <div className="cyber-mono text-sm truncate">{session.primeDid}</div>
          </div>
          <Badge className="cyber-btn-blue">
            {session.permissions.length} PERMISSIONS
          </Badge>
        </CardContent>
      </Card>

      {/* 4 模块 Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-black/40">
          <TabsTrigger value="overview" className="cyber-mono data-[state=active]:bg-[#00FFCC]/10 data-[state=active]:text-[#00FFCC]">
            <Activity className="w-4 h-4 mr-1" /> STATUS
          </TabsTrigger>
          <TabsTrigger value="treasury" className="cyber-mono data-[state=active]:bg-[#0066FF]/10 data-[state=active]:text-[#0066FF]">
            <Coins className="w-4 h-4 mr-1" /> TREASURY
          </TabsTrigger>
          <TabsTrigger value="sync" className="cyber-mono data-[state=active]:bg-[#B080E8]/10 data-[state=active]:text-[#B080E8]">
            <Cpu className="w-4 h-4 mr-1" /> SYNC
          </TabsTrigger>
          <TabsTrigger value="logs" className="cyber-mono data-[state=active]:bg-[#FFCC00]/10 data-[state=active]:text-[#FFCC00]">
            <Terminal className="w-4 h-4 mr-1" /> LOGS
          </TabsTrigger>
        </TabsList>

        {/* Module 1: Vessel Status */}
        <TabsContent value="overview">
          <Card className="cyber-panel">
            <CardHeader>
              <CardTitle className="cyber-mono cyber-text-glow-cyan flex items-center gap-2">
                <Activity className="w-5 h-5" /> VESSEL STATUS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.vesselStatus ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusItem label="STATUS" value={data.vesselStatus.status} color="#00FFCC" />
                    <StatusItem label="EIDOLON" value={data.vesselStatus.eidolonName} color="#B080E8" />
                    <StatusItem label="SMART ACCOUNT" value={data.vesselStatus.smartAccountAddress} color="#0066FF" mono />
                    <StatusItem label="LAST ACTIVE" value={data.vesselStatus.lastActiveAt ? new Date(data.vesselStatus.lastActiveAt).toLocaleString() : 'N/A'} color="#FFCC00" />
                  </div>
                  <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-3">
                    ▸ Vessel is online and ready for autonomous operations
                  </div>
                </>
              ) : (
                <div className="cyber-loading-bar h-2 rounded" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module 2: AP2 Treasury */}
        <TabsContent value="treasury">
          <Card className="cyber-panel">
            <CardHeader>
              <CardTitle className="cyber-mono cyber-text-glow-blue flex items-center gap-2">
                <Coins className="w-5 h-5" /> AP2 TREASURY
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.treasury ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="DAILY LIMIT" value={fromTokenUnits(toBigInt(data.treasury.dailyLimit))} unit="USDC" color="#00FFCC" />
                    <MetricCard label="SPENT TODAY" value={fromTokenUnits(toBigInt(data.treasury.spentToday))} unit="USDC" color="#FF66AA" />
                    <MetricCard label="REMAINING" value={fromTokenUnits(toBigInt(data.treasury.dailyRemaining))} unit="USDC" color="#0066FF" />
                    <MetricCard label="TOTAL HARVEST" value={fromTokenUnits(toBigInt(data.totalYield))} unit="USDC" color="#FFCC00" />
                  </div>
                  <div>
                    <div className="flex justify-between cyber-mono text-xs mb-1">
                      <span className="text-[#666]">DAILY BUDGET</span>
                      <span className="text-[#00FFCC]">
                        {fromTokenUnits(toBigInt(data.treasury.spentToday))} / {fromTokenUnits(toBigInt(data.treasury.dailyLimit))} USDC
                      </span>
                    </div>
                    <Progress
                      value={Number((toBigInt(data.treasury.spentToday) * 100n) / toBigInt(data.treasury.dailyLimit))}
                      className="h-2 bg-[#1a1a1a]"
                    />
                  </div>
                  <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-3">
                    ▸ BudgetFence 三道闸：Scope Lock · Daily Cap · Decaying Auth
                  </div>
                </>
              ) : (
                <div className="cyber-loading-bar h-2 rounded" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module 3: Eidolon Sync */}
        <TabsContent value="sync">
          <Card className="cyber-panel">
            <CardHeader>
              <CardTitle className="cyber-mono flex items-center gap-2" style={{ color: '#B080E8' }}>
                <Cpu className="w-5 h-5" /> EIDOLON SYNC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.eidolonSync ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusItem label="EIDOLON DID" value={data.eidolonSync.eidolonDid} color="#B080E8" mono />
                    <StatusItem label="RAG COLLECTION" value={data.eidolonSync.ragCollection} color="#00FFCC" mono />
                    <StatusItem label="SYNC LATENCY" value={`${data.eidolonSync.syncLatencyMs}ms`} color="#0066FF" />
                    <StatusItem label="STYLE DRIFT" value={data.eidolonSync.styleDriftScore.toFixed(4)} color="#FFCC00" />
                  </div>
                  <div>
                    <div className="flex justify-between cyber-mono text-xs mb-1">
                      <span className="text-[#666]">SYNC HEALTH</span>
                      <span className="text-[#00FFCC]">HEALTHY</span>
                    </div>
                    <Progress value={92} className="h-2 bg-[#1a1a1a]" />
                  </div>
                  <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-3">
                    ▸ Memory palace updated · Style profile aligned · No drift detected
                  </div>
                </>
              ) : (
                <div className="cyber-loading-bar h-2 rounded" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module 4: Autonomous Logs */}
        <TabsContent value="logs">
          <Card className="cyber-panel">
            <CardHeader>
              <CardTitle className="cyber-mono cyber-text-glow-gold flex items-center gap-2">
                <Terminal className="w-5 h-5" /> AUTONOMOUS LOGS
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.autonomousLogs && data.autonomousLogs.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-2 cyber-mono text-xs">
                  {data.autonomousLogs.map((log: any) => (
                    <div key={log.id} className="border border-[#1a1a1a] p-2 rounded">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#00FFCC]">[{log.action.toUpperCase()}]</span>
                        <span className="text-[#666]">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      {log.targetDid && (
                        <div className="text-[#999]">→ {log.targetDid.slice(0, 30)}...</div>
                      )}
                      {log.yieldAmount && (
                        <div className="text-[#FFCC00]">+{fromTokenUnits(toBigInt(log.yieldAmount))} USDC</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#666] cyber-mono text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No autonomous logs yet.
                  <div className="text-xs mt-2">
                    Vessel will log its 24/7 autonomous interactions here.
                  </div>
                </div>
              )}
              <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-3 mt-4">
                ▸ Autonomous harvest bot status: STANDBY · Last run: never
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 快捷操作 */}
      <Card className="cyber-panel mt-6">
        <CardContent className="p-4">
          <div className="cyber-mono text-xs text-[#666] mb-3">QUICK ACTIONS</div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await fetch('/api/ap2/pay', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: session.primeDid,
                    amount: '0.001',
                    category: 'tip',
                    ref: 'demo-tip',
                  }),
                });
                onReload();
              }}
              className="cyber-btn-blue"
            >
              <Coins className="w-3 h-3 mr-1" /> DEMO MICRO-TIP (0.001 USDC)
            </Button>
            <Button size="sm" variant="outline" onClick={onReload} className="cyber-mono">
              <Activity className="w-3 h-3 mr-1" /> REFRESH
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusItem({ label, value, color, mono }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <div>
      <div className="cyber-mono text-xs text-[#666] mb-1">{label}</div>
      <div className={`${mono ? 'cyber-mono text-xs' : 'text-sm'} truncate`} style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="border border-[#1a1a1a] p-3 rounded">
      <div className="cyber-mono text-xs text-[#666] mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ color, textShadow: `0 0 6px ${color}66` }}>
        {value}
      </div>
      <div className="cyber-mono text-xs text-[#999]">{unit}</div>
    </div>
  );
}
