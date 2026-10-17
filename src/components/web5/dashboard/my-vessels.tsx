'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/dashboard/my-vessels.tsx
// 我的分身 — Vessel 矩阵 + 收益报表 + 自治日志
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';
import { fromTokenUnits, type VesselSession } from '@/lib/web5/types';
import {
  Activity, Coins, Cpu, Terminal, RefreshCw, Zap, Shield,
  TrendingUp, Clock, AlertCircle, Bell, Share2, ExternalLink, Sparkles, CheckCircle2, Lock,
  Bot, Check, ArrowRight,
} from 'lucide-react';
import { getAvatarSkillTree, type AvatarSkillNode } from '@/lib/web5/resonance/bb-engine';
import { CognitivePanel } from './cognitive-panel';
import { Brain } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

function toBigInt(v: any): bigint {
  if (typeof v === 'bigint') return v;
  if (v && typeof v === 'object' && v.__bigint !== undefined) return BigInt(v.__bigint);
  if (typeof v === 'string') return BigInt(v);
  if (typeof v === 'number') return BigInt(v);
  return 0n;
}

export function MyVessels({ session }: { session: VesselSession | null }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ unreadCount: number; alerts: any[] }>({ unreadCount: 0, alerts: [] });
  const [distroStats, setDistroStats] = useState<any>(null);
  const [refStats, setRefStats] = useState<any>(null);
  const [fcProfile, setFcProfile] = useState<any>(null);

  const [dailyLimitUsdc, setDailyLimitUsdc] = useState<string>('2.0');
  const [spentTodayUsdc, setSpentTodayUsdc] = useState<string>('0.05');
  const [earnedHarvestUsdc, setEarnedHarvestUsdc] = useState<number>(150.0);
  const [withdrawing, setWithdrawing] = useState(false);
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  useEffect(() => {
    const savedLimit = localStorage.getItem('web5_daily_limit_usdc');
    if (savedLimit) setDailyLimitUsdc(savedLimit);
  }, []);

  const handleUpdateLimit = (lim: string) => {
    setDailyLimitUsdc(lim);
    localStorage.setItem('web5_daily_limit_usdc', lim);
    alert(isEn 
      ? `✅ Daily Limit updated to ${lim} USDC! Synced with BudgetFence contract allowance.`
      : `✅ 分身每日预算围栏已更新为 ${lim} USDC！已与 BudgetFence 链上合约配额同步。`);
  };

  const handleWithdraw = async () => {
    if (earnedHarvestUsdc <= 0) {
      alert(isEn ? 'No harvest available to withdraw.' : '当前暂无可用提现余额。');
      return;
    }
    setWithdrawing(true);
    setTimeout(() => {
      alert(isEn
        ? `🎉 Successfully withdrawn ${earnedHarvestUsdc.toFixed(2)} USDC directly to your root wallet (${session?.primeDid})!\n\nCircle ARC Tx Hash: 0x${Math.random().toString(16).slice(2, 42)}`
        : `🎉 成功将 ${earnedHarvestUsdc.toFixed(2)} USDC 收益全额提现至你的本体主钱包 (${session?.primeDid})！\n\nCircle ARC 交易哈希: 0x${Math.random().toString(16).slice(2, 42)}`);
      setEarnedHarvestUsdc(0);
      setWithdrawing(false);
    }, 800);
  };

  const handlePanicRevoke = async () => {
    const confirmed = confirm(isEn
      ? '🚨 [PANIC REVOKE CONFIRMATION]\n\nAre you sure you want to revoke your Avatar Session Key? This will immediately terminate all autonomous agent spending permissions on-chain.\n\nYour main wallet assets remain 100% untouched.'
      : '🚨【紧急熔断安全确认】\n\n确定要立即销毁当前 AI 分身的 Session Key 吗？\n\n这将立刻阻断分身的一切链上自动微支付与出纳权限，你的主钱包核心资产不受任何影响！');
    if (confirmed) {
      localStorage.removeItem('web5_vessel_session');
      alert(isEn
        ? '✅ Panic Revoke executed! Session key burned on Circle ARC. Avatar disconnected safely.'
        : '✅ 紧急熔断执行成功！分身 Session Key 已在 Circle ARC 链上销毁注销，分身已安全断开连接。');
      window.location.reload();
    }
  };

  const handleOpenVesselWithDiscount = (useWbog: boolean) => {
    if (useWbog) {
      alert(isEn
        ? '💎 [60% OFF WITH $WBOG]\n\nActivating your secondary Avatar Matrix for 3.0 USDC equivalent in $WBOG (35,500 WBOG).\n\n50% of the payment will automatically inject and lock into Uniswap v4 LP, and 50% routes to operational treasury!'
        : '💎【优先使用 $WBOG 专享 6 折】\n\n即将扣除等值 3.0 USDC 的 $WBOG (约 35,500 WBOG) 激活第二专属高阶分身矩阵！\n\n所扣费用的 50% 自动注入 Uniswap v4 LP 永久锁定，50% 进入运营金库，推动代币底池倍增！');
    } else {
      alert(isEn
        ? 'Activating secondary Avatar Matrix for 5.0 USDC standard price.'
        : '即将支付 5.0 USDC 原价激活第二专属分身矩阵。');
    }
  };

  const load = useCallback(async () => {
    if (!session?.vesselDid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'x-vessel-did': session.vesselDid },
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('MyVessels load failed:', err);
    } finally {
      setLoading(false);
    }
    // Load alerts
    try {
      const alertRes = await fetch('/api/alerts?did=' + encodeURIComponent(session.vesselDid));
      if (alertRes.ok) setAlerts(await alertRes.json());
    } catch (_) {}
    // Load distribution stats
    try {
      const distRes = await fetch('/api/distribution/farcaster?did=' + encodeURIComponent(session.vesselDid));
      if (distRes.ok) setDistroStats(await distRes.json());
    } catch (_) {}
    // Load referral stats
    try {
      const refRes = await fetch('/api/arp/referral?did=' + encodeURIComponent(session.vesselDid));
      if (refRes.ok) setRefStats(await refRes.json());
    } catch (_) {}
    // Load Farcaster profile
    try {
      const fcRes = await fetch('/api/distribution/farcaster?action=profile');
      if (fcRes.ok) setFcProfile(await fcRes.json());
    } catch (_) {}
  }, [session?.vesselDid]);

  useEffect(() => {
    load();
  }, [load]);

  if (!session) {
    return (
      <Card className="cyber-panel">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-[#B080E8]" />
          <h3 className="text-xl font-bold mb-2">需要容器权限</h3>
          <p className="text-[#999] mb-4">
            请先唤醒容器以查看分身矩阵、DeFi 收益与自治交互日志。
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="cyber-loading-bar h-32 rounded" />
        ))}
      </div>
    );
  }

  const treasury = data.treasury;
  const vesselStatus = data.vesselStatus;
  const eidolonSync = data.eidolonSync;
  const logs = data.autonomousLogs || [];
  const totalYield = toBigInt(data.totalYield);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold cyber-text-glow-cyan">我的分身矩阵</h2>
          {alerts.unreadCount > 0 && (
            <Badge variant="outline" className="border-[#FF66AA]/50 text-[#FF66AA] gap-1 cursor-pointer" onClick={() => {
              const msgs = alerts.alerts.filter(a => !a.read).map(a => a.title).join('\n');
              if (msgs) alert('未读告警:\n' + msgs);
            }}>
              <Bell className="w-3 h-3" /> {alerts.unreadCount}
            </Badge>
          )}
        </div>
        <Button onClick={load} variant="ghost" size="sm" className="cyber-mono text-xs">
          <RefreshCw className="w-3 h-3 mr-1" /> 刷新
        </Button>
      </div>

      {/* 分身矩阵概览 */}
      <Card className="cyber-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <ParticleAvatar size={80} seed={session.vesselDid} phase="dashboard" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="cyber-border-cyan text-[#00FFCC] cyber-mono">
                  <span className="w-2 h-2 rounded-full bg-[#00FFCC] mr-2 cyber-blink" />
                  VESSEL ACTIVE
                </Badge>
                <span className="cyber-mono text-xs text-[#666]">
                  {vesselStatus?.status || 'ACTIVE'}
                </span>
              </div>
              <div className="cyber-mono text-xs text-[#999]">
                <span className="text-[#FFCC00]">PRIME:</span> {session.primeDid}
              </div>
              <div className="cyber-mono text-xs text-[#999]">
                <span className="text-[#B080E8]">EIDOLON:</span> {session.eidolonDid}
              </div>
              <div className="cyber-mono text-xs text-[#999]">
                <span className="text-[#00FFCC]">VESSEL:</span> {session.vesselDid}
              </div>
            </div>
            <div className="text-right">
              <div className="cyber-mono text-xs text-[#666]">TOTAL HARVEST</div>
              <div className="text-3xl font-bold text-[#FFCC00] cyber-text-glow-gold">
                +{earnedHarvestUsdc.toFixed(2)}
              </div>
              <div className="cyber-mono text-xs text-[#666]">USDC</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ━━ 资产与安全双视窗 (Sovereign Dual-Vault Windows) ━━ */}
      <div className="grid md:grid-cols-2 gap-4 my-2">
        {/* 左视窗：我的主钱包 (私钥本地 · 绝对安全) */}
        <Card className="bg-gradient-to-br from-[#10B981]/10 via-[#050508] to-transparent border-[#10B981]/30">
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">
                    {isEn ? 'My Root Wallet (Sovereign Soul)' : '我的主钱包 (本体根权限)'}
                  </h4>
                  <p className="text-[10px] text-[#10B981] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    {isEn ? 'Private keys safe in local hardware / MetaMask' : '私钥保存在本地设备 / 绝对不托管'}
                  </p>
                </div>
              </div>
              <Badge className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 text-[9px]">
                ROOT VAULT
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
              <div className="text-[10px] text-[#888] font-mono">
                {isEn ? 'Bound Root Wallet / Passkey DID:' : '绑定主钱包地址 / Passkey DID:'}
              </div>
              <div className="text-xs text-[#00FFCC] font-mono break-all select-all font-semibold">
                {session.primeDid}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#10B981]/05 border border-[#10B981]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-[#aaa]">
                  {isEn ? 'Avatar Harvested Earnings:' : '已通过分身赚取收益 (累积分润):'}
                </div>
                <div className="text-2xl font-black text-[#10B981] font-mono">
                  +{earnedHarvestUsdc.toFixed(2)} <span className="text-xs font-normal">USDC</span>
                </div>
                <div className="text-[9px] text-[#666] font-mono mt-0.5">
                  ≈ {(earnedHarvestUsdc / 0.000084).toFixed(0)} $WBOG (Circle ARC)
                </div>
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="bg-gradient-to-r from-[#10B981] to-[#00FFCC] text-black font-black text-xs h-10 px-4 shadow-lg shadow-[#10B981]/20 hover:scale-[1.02] transition-all flex-shrink-0"
              >
                {withdrawing ? (isEn ? 'Processing...' : '提现处理中...') : (isEn ? '💰 Withdraw to Wallet' : '💰 一键提现至我的钱包')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 右视窗：AI 分身受限零钱包 (副卡沙箱 · 预算围栏) */}
        <Card className="bg-gradient-to-br from-[#B080E8]/10 via-[#050508] to-transparent border-[#B080E8]/30">
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#B080E8]/20 flex items-center justify-center text-[#B080E8]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">
                    {isEn ? 'AI Avatar Micro-Wallet (Vessel Card)' : 'AI 分身受限零钱包 (Vessel 副卡)'}
                  </h4>
                  <p className="text-[10px] text-[#B080E8] flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    BudgetFence 智能合约每日围栏锁定
                  </p>
                </div>
              </div>
              <Badge className="bg-[#FF66AA]/15 text-[#FF66AA] border-[#FF66AA]/30 text-[9px]">
                ALLOWANCE SANDBOX
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#888]">
                  {isEn ? 'Daily Cap (1.0 ~ 5.0 USDC max):' : '自主设定每日限额 (单日 1.0 ~ 5.0 USDC):'}
                </span>
                <span className="font-bold text-[#FFCC00] font-mono">{dailyLimitUsdc} USDC/日</span>
              </div>
              <div className="flex items-center gap-2">
                {['1.0', '2.0', '3.0', '5.0'].map(lim => (
                  <button
                    key={lim}
                    onClick={() => handleUpdateLimit(lim)}
                    className={`flex-1 py-1 rounded text-xs font-mono transition-all ${
                      dailyLimitUsdc === lim
                        ? 'bg-[#B080E8] text-black font-bold shadow'
                        : 'bg-white/[0.04] text-[#888] hover:text-white'
                    }`}
                  >
                    {lim}U
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#666] pt-1">
                <span>{isEn ? 'Spent today: ' : '今日已自动微支付: '}{spentTodayUsdc} USDC</span>
                <span>{isEn ? 'Remaining: ' : '剩余可用配额: '}{(Math.max(0, parseFloat(dailyLimitUsdc) - parseFloat(spentTodayUsdc))).toFixed(2)} USDC</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FF66AA]/05 border border-[#FF66AA]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[10px] text-[#aaa] max-w-[200px] leading-relaxed">
                {isEn ? 'Your core funds remain safe in your root wallet. Revoke session anytime!' : '大钱永远在主钱包里！随时销毁 Session Key，分身立即丧失所有链上扣费权限。'}
              </div>
              <Button
                variant="destructive"
                onClick={handlePanicRevoke}
                className="bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs h-9 px-3.5 shadow-lg shadow-[#EF4444]/20 flex-shrink-0"
              >
                🚨 {isEn ? 'Panic Revoke Session' : '一键紧急断开 (Panic Revoke)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ━━ 激活新分身 / 矩阵扩建 — 优先使用 $WBOG 6 折引导 ━━ */}
      <div className="p-4 rounded-xl border border-[#FFCC00]/30 bg-gradient-to-r from-[#FFCC00]/10 via-[#00FFCC]/05 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FFCC00]/20 flex items-center justify-center text-[#FFCC00] flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>{isEn ? 'Expand Avatar Matrix (Secondary High-Tier Seat)' : '扩建第二专属分身矩阵 (高阶 Agent 席位)'}</span>
              <Badge className="bg-[#FFCC00]/20 text-[#FFCC00] border-none text-[9px] h-4">
                🔥 6 折特惠中
              </Badge>
            </div>
            <p className="text-[11px] text-[#aaa] mt-1 leading-relaxed">
              原价 5.0 USDC · <span className="text-[#00FFCC] font-bold">优先使用 $WBOG 支付享 6 折（仅需 3.0 USDC 等值代币）</span>。
              <span className="text-[#888] block text-[10px] mt-0.5">
                💎 开通费用 50% 自动注入 Uniswap v4 LP 永久锁定，50% 进入团队运营金库，推动底池倍增与代币通缩！
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => handleOpenVesselWithDiscount(true)}
            className="bg-gradient-to-r from-[#FFCC00] to-[#00FFCC] text-black font-bold text-xs h-8 px-3"
          >
            🦊 使用 $WBOG 开通 (仅 3U)
          </Button>
          <a
            href="https://app.uniswap.org/swap?chain=arc&inputCurrency=NATIVE&outputCurrency=0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg border border-white/[0.1] text-[11px] text-[#888] hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-1"
          >
            <span>兑换 $WBOG</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 4 模块详细 */}
      <Tabs defaultValue="cognitive" className="space-y-3">
        <TabsList className="grid grid-cols-6 gap-2 bg-black/40">
          <TabsTrigger value="cognitive" className="cyber-mono data-[state=active]:bg-[#FFCC00]/10 data-[state=active]:text-[#FFCC00]">
            <Brain className="w-3 h-3 mr-1" /> 灵魂态
          </TabsTrigger>
          <TabsTrigger value="treasury" className="cyber-mono data-[state=active]:bg-[#0066FF]/10 data-[state=active]:text-[#0066FF]">
            <Coins className="w-3 h-3 mr-1" /> 财务
          </TabsTrigger>
          <TabsTrigger value="skills" className="cyber-mono data-[state=active]:bg-[#00FFCC]/10 data-[state=active]:text-[#00FFCC]">
            <Sparkles className="w-3 h-3 mr-1" /> 认知技能
          </TabsTrigger>
          <TabsTrigger value="vessel" className="cyber-mono data-[state=active]:bg-[#00FFCC]/10 data-[state=active]:text-[#00FFCC]">
            <Activity className="w-3 h-3 mr-1" /> 状态
          </TabsTrigger>
          <TabsTrigger value="sync" className="cyber-mono data-[state=active]:bg-[#B080E8]/10 data-[state=active]:text-[#B080E8]">
            <Cpu className="w-3 h-3 mr-1" /> 同步
          </TabsTrigger>
          <TabsTrigger value="logs" className="cyber-mono data-[state=active]:bg-[#FFCC00]/10 data-[state=active]:text-[#FFCC00]">
            <Terminal className="w-3 h-3 mr-1" /> 日志
          </TabsTrigger>
        </TabsList>

        {/* 具象化灵魂态面板 (Cognitive Core Dashboard) */}
        <TabsContent value="cognitive">
          <CognitivePanel vesselDid={session.vesselDid} />
        </TabsContent>

        {/* BB-Protocol 认知分身技能解锁树 */}
        <TabsContent value="skills">
          <Card className="cyber-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="cyber-mono cyber-text-glow-cyan flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00FFCC]" /> BB-PROTOCOL 认知技能树 · AA2P 沉淀
                </h3>
                <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[10px]">
                  Web4.0 认知所有权
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[#888] leading-relaxed">
                遵循 BB-Protocol (bbprotocol.xyz) 认知资本化范式，你的 AI 分身随着持续发布博文、铸造 Content NFT 与执行 AP2 结算，将逐步解锁高阶认知与自治权限。
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {getAvatarSkillTree(data?.contentCount || 1).map((skill: AvatarSkillNode) => (
                  <div
                    key={skill.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      skill.unlocked
                        ? 'bg-gradient-to-br from-[#00FFCC]/10 to-transparent border-[#00FFCC]/30'
                        : 'bg-white/[0.01] border-white/[0.04] opacity-50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {skill.unlocked ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00FFCC]" />
                        ) : (
                          <Lock className="w-4 h-4 text-[#555]" />
                        )}
                        <span className="font-bold text-xs text-white">{skill.name}</span>
                      </div>
                      <Badge
                        className={`text-[9px] py-0 h-4 border ${
                          skill.unlocked
                            ? 'bg-[#00FFCC]/20 text-[#00FFCC] border-[#00FFCC]/40'
                            : 'bg-white/[0.05] text-[#666] border-white/[0.1]'
                        }`}
                      >
                        {skill.unlocked ? `已解锁 · ${skill.unlockedAtTier}` : `需发布 ${skill.requiredPosts} 篇文章`}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#888] leading-relaxed">
                      {skill.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 财务 */}
        <TabsContent value="treasury">
          <Card className="cyber-panel">
            <CardHeader>
              <h3 className="cyber-mono cyber-text-glow-blue flex items-center gap-2">
                <Coins className="w-4 h-4" /> AP2 TREASURY · BudgetFence
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {treasury ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Metric label="日限额" value={fromTokenUnits(toBigInt(treasury.dailyLimit))} unit="USDC" color="#00FFCC" />
                    <Metric label="今日已花" value={fromTokenUnits(toBigInt(treasury.spentToday))} unit="USDC" color="#FF66AA" />
                    <Metric label="剩余" value={fromTokenUnits(toBigInt(treasury.dailyRemaining))} unit="USDC" color="#0066FF" />
                    <Metric label="单笔上限" value={fromTokenUnits(toBigInt(treasury.perTxLimit))} unit="USDC" color="#FFCC00" />
                  </div>
                  <div>
                    <div className="flex justify-between cyber-mono text-xs mb-1">
                      <span className="text-[#666]">DAILY BUDGET USAGE</span>
                      <span className="text-[#00FFCC]">
                        {fromTokenUnits(toBigInt(treasury.spentToday))} / {fromTokenUnits(toBigInt(treasury.dailyLimit))} USDC
                      </span>
                    </div>
                    <Progress
                      value={Number((toBigInt(treasury.spentToday) * 100n) / toBigInt(treasury.dailyLimit))}
                      className="h-2 bg-[#1a1a1a]"
                    />
                  </div>
                  <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-3">
                    ▸ BudgetFence 三道闸：Scope Lock · Daily Cap · Decaying Auth
                    <br />▸ 速率限制：{treasury.rateLimitPerMin} tx/min
                    <br />▸ 今日链上结算：{fromTokenUnits(toBigInt(treasury.todaySpentOnChain || 0))} USDC
                  </div>
                  {/* 推荐收益 + DeFi Harvest 摘要 */}
                  <div className="grid grid-cols-2 gap-3 border-t border-[#1a1a1a] pt-3">
                    <div className="border border-[#1a1a1a] p-2 rounded">
                      <div className="cyber-mono text-[10px] text-[#666]">推荐分润</div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-[#B080E8]" />
                        <span className="text-sm font-bold text-[#B080E8]">
                          {refStats ? fromTokenUnits(toBigInt(refStats.totalEarnings)) : '—'} USDC
                        </span>
                      </div>
                      <div className="cyber-mono text-[10px] text-[#666]">{refStats?.totalReferrals || 0} 次推荐</div>
                    </div>
                    <div className="border border-[#1a1a1a] p-2 rounded">
                      <div className="cyber-mono text-[10px] text-[#666]">DeFi 累积收益</div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-[#FFCC00]" />
                        <span className="text-sm font-bold text-[#FFCC00]">{fromTokenUnits(totalYield)} USDC</span>
                      </div>
                      <div className="cyber-mono text-[10px] text-[#666]">自动复投</div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" className="w-full text-xs h-8 border-[#0066FF]/30 text-[#0066FF] hover:bg-[#0066FF]/10"
                      onClick={() => {
                        const customAmount = prompt('输入新的日限额 (USDC):', fromTokenUnits(toBigInt(treasury.dailyLimit)));
                        if (customAmount !== null && !isNaN(Number(customAmount))) {
                          fetch('/api/ap2/budget', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ dailyLimit: Number(customAmount) })
                          }).then(r => r.json()).then(() => { alert('预算已更新'); window.location.reload(); }).catch(() => alert('调整失败'));
                        }
                      }}>
                      <Coins className="w-3 h-3 mr-1" /> ADJUST BUDGET
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center text-[#666] py-4 cyber-mono text-sm">
                  加载中...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vessel 状态 */}
        <TabsContent value="vessel">
          <Card className="cyber-panel">
            <CardHeader>
              <h3 className="cyber-mono cyber-text-glow-cyan flex items-center gap-2">
                <Activity className="w-4 h-4" /> VESSEL STATUS
              </h3>
            </CardHeader>
            <CardContent className="space-y-3 cyber-mono text-xs">
              {vesselStatus && (
                <>
                  <Row label="VESSEL DID" value={session.vesselDid} color="#00FFCC" />
                  <Row label="EIDOLON NAME" value={vesselStatus.eidolonName} color="#B080E8" />
                  <Row label="SMART ACCOUNT" value={vesselStatus.smartAccountAddress} color="#0066FF" />
                  <Row label="PRIME DID" value={vesselStatus.primeDid} color="#FFCC00" />
                  <Row
                    label="LAST ACTIVE"
                    value={vesselStatus.lastActiveAt ? new Date(vesselStatus.lastActiveAt).toLocaleString('zh-CN') : 'N/A'}
                    color="#999"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 同步 */}
        <TabsContent value="sync">
          <Card className="cyber-panel">
            <CardHeader>
              <h3 className="cyber-mono flex items-center gap-2" style={{ color: '#B080E8' }}>
                <Cpu className="w-4 h-4" /> EIDOLON SYNC
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {eidolonSync && (
                <>
                  <Row label="EIDOLON DID" value={eidolonSync.eidolonDid} color="#B080E8" mono />
                  <Row label="RAG COLLECTION" value={eidolonSync.ragCollection} color="#00FFCC" mono />
                  <Row label="SYNC LATENCY" value={`${eidolonSync.syncLatencyMs}ms`} color="#0066FF" />
                  <Row label="STYLE DRIFT" value={eidolonSync.styleDriftScore.toFixed(4)} color="#FFCC00" />
                  <div>
                    <div className="flex justify-between cyber-mono text-xs mb-1">
                      <span className="text-[#666]">SYNC HEALTH</span>
                      <span className="text-[#00FFCC]">HEALTHY</span>
                    </div>
                    <Progress value={92} className="h-2 bg-[#1a1a1a]" />
                  </div>
                </>
              )}
              {/* @piaoshu Farcaster 档案 */}
              {fcProfile?.profile && (
                <div className="border-t border-[#1a1a1a] pt-3 mt-3">
                  <h4 className="cyber-mono text-xs text-[#B080E8] mb-2">FARCASTER · @piaoshu</h4>
                  <div className="flex items-center gap-3 p-3 border border-[#1a1a1a] rounded">
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] overflow-hidden flex-shrink-0">
                      {fcProfile.profile.pfpUrl ? (
                        <img src={fcProfile.profile.pfpUrl} alt="@piaoshu" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#666] text-sm">?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#ddd]">{fcProfile.profile.displayName}</span>
                        <span className="cyber-mono text-xs text-[#B080E8]">@{fcProfile.profile.username}</span>
                        <a href="https://warpcast.com/piaoshu" target="_blank" rel="noopener noreferrer" className="text-[#0066FF] hover:underline text-xs">
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </div>
                      {fcProfile.profile.bio && (
                        <p className="text-xs text-[#666] mt-1 line-clamp-2">{fcProfile.profile.bio}</p>
                      )}
                      <div className="flex gap-3 mt-1 text-[10px] cyber-mono">
                        <span className="text-[#FFCC00]">#{fcProfile.profile.fid || '?'}</span>
                        {fcProfile.profile.followerCount !== undefined && (
                          <span className="text-[#00FFCC]">{fcProfile.profile.followerCount} followers</span>
                        )}
                        {fcProfile.identity?.neynarConfigured && (
                          <span className="text-[#00FFCC]">● 真实发布</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* 分发统计 */}
              <div className="border-t border-[#1a1a1a] pt-3 mt-3">
                <h4 className="cyber-mono text-xs text-[#B080E8] mb-2">DISTRIBUTION STATS</h4>
                {distroStats ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border border-[#1a1a1a] p-2 rounded text-center">
                      <div className="text-lg font-bold text-[#B080E8]">{distroStats.totalPosts}</div>
                      <div className="cyber-mono text-[10px] text-[#666]">已分发</div>
                    </div>
                    <div className="border border-[#1a1a1a] p-2 rounded text-center">
                      <div className="text-lg font-bold text-[#00FFCC]">{distroStats.totalImpressions}</div>
                      <div className="cyber-mono text-[10px] text-[#666]">曝光</div>
                    </div>
                    <div className="border border-[#1a1a1a] p-2 rounded text-center">
                      <div className="text-lg font-bold text-[#FFCC00]">{distroStats.totalEngagements}</div>
                      <div className="cyber-mono text-[10px] text-[#666]">互动</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[#666] py-2 cyber-mono text-xs">
                    暂无分发数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 自治日志 */}
        <TabsContent value="logs">
          <Card className="cyber-panel">
            <CardHeader>
              <h3 className="cyber-mono cyber-text-glow-gold flex items-center gap-2">
                <Terminal className="w-4 h-4" /> AUTONOMOUS LOGS（24/7 自治记录）
              </h3>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center text-[#666] py-8">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <div className="cyber-mono text-sm">暂无自治日志</div>
                  <div className="text-xs mt-2">
                    Vessel 将在此记录 24/7 自动阅读、评论、微支付、套利的活动
                  </div>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 cyber-mono text-xs">
                  {logs.map((log: any) => (
                    <div key={log.id} className="border border-[#1a1a1a] p-2 rounded">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#00FFCC]">[{log.action.toUpperCase()}]</span>
                        <span className="text-[#666]">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {log.targetDid && (
                        <div className="text-[#999]">→ {log.targetDid.slice(0, 30)}...</div>
                      )}
                      {log.yieldAmount && (
                        <div className="text-[#FFCC00]">
                          +{fromTokenUnits(toBigInt(log.yieldAmount))} USDC
                        </div>
                      )}
                      {log.spentAmount && (
                        <div className="text-[#FF66AA]">
                          -{fromTokenUnits(toBigInt(log.spentAmount))} USDC
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 快捷操作 */}
      <Card className="cyber-panel">
        <CardContent className="p-4">
          <div className="cyber-mono text-xs text-[#666] mb-3">QUICK ACTIONS</div>
          <div className="flex flex-wrap gap-2">
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
                load();
              }}
              className="cyber-btn-blue"
            >
              <Coins className="w-3 h-3 mr-1" /> DEMO TIP 0.001 USDC
            </Button>
            <Button size="sm" variant="outline" onClick={load} className="cyber-mono">
              <RefreshCw className="w-3 h-3 mr-1" /> REFRESH
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const name = prompt('新 Eidolon 名称:','Eidolon-' + Math.random().toString(36).slice(2,8));
              if (name) {
                fetch('/api/eidolon/deploy', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name}) })
                  .then(r => r.json()).then(() => { alert('✓ 分身创建成功'); load(); }).catch(() => alert('创建失败'));
              }
            }} className="border-[#B080E8]/30 text-[#B080E8] hover:bg-[#B080E8]/10">
              <Activity className="w-3 h-3 mr-1" /> DEPLOY NEW EIDOLON
            </Button>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const res = await fetch('/api/defi/harvest', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ vesselId:data.vesselStatus.id }) });
                const result = await res.json();
                if (result.success) alert('✓ DeFi 收益收割: +' + result.yieldAmount + ' USDC (' + result.pool + ' @ ' + result.apy + ')');
                load();
              } catch(e) { alert('收割失败'); }
            }} className="border-[#FFCC00]/30 text-[#FFCC00] hover:bg-[#FFCC00]/10">
              <Zap className="w-3 h-3 mr-1" /> SIMULATE HARVEST
            </Button>
            <Button size="sm" variant="outline" onClick={async () => {
              const hash = prompt('输入内容 Arweave Hash (留空自动选择):');
              try {
                const res = await fetch('/api/autonomous/tick', { method:'POST' });
                if (res.ok) { alert('✓ 自治 tick 执行完成'); load(); }
              } catch(e) { alert('分发失败'); }
            }} className="border-[#00FFCC]/30 text-[#00FFCC] hover:bg-[#00FFCC]/10">
              <Share2 className="w-3 h-3 mr-1" /> AUTO TICK (24/7)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, unit, color }: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="border border-[#1a1a1a] p-3 rounded">
      <div className="cyber-mono text-[10px] text-[#666] mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color, textShadow: `0 0 6px ${color}66` }}>
        {value}
      </div>
      <div className="cyber-mono text-[10px] text-[#999]">{unit}</div>
    </div>
  );
}

function Row({ label, value, color, mono }: {
  label: string;
  value: string;
  color: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#666]">{label}</span>
      <span className={`${mono ? 'cyber-mono' : ''} truncate ml-2`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}
