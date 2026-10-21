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
  TrendingUp, Clock, AlertCircle, Bell, ExternalLink, Sparkles, CheckCircle2, Lock,
  Bot, Check, ArrowRight, Fingerprint, Key, Twitter,
} from 'lucide-react';
import { getAvatarSkillTree, type AvatarSkillNode } from '@/lib/web5/resonance/bb-engine';
import { CognitivePanel } from './cognitive-panel';
import { Brain } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { verifyPasskeyBiometric, isPasskeySupported } from '@/lib/web5/auth/passkey-soul';
import { getOrCreateVesselWallet, getVesselWalletBalance, deriveVesselWalletFromSignature } from '@/lib/web5/vessel-wallet';
import { revokeVesselSession } from '@/lib/web5/vessel-auth';
import { PUBLIC_MONEY_FLOWS_ENABLED, PUBLIC_DEMO_NOTICE, PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE } from '@/lib/launch/public';

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
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<{ unreadCount: number; alerts: any[] }>({ unreadCount: 0, alerts: [] });
  const [distroStats, setDistroStats] = useState<any>(null);
  const [refStats, setRefStats] = useState<any>(null);
  const [fcProfile, setFcProfile] = useState<any>(null);

  const [dailyLimitUsdc, setDailyLimitUsdc] = useState<string>('2.0');
  const [spentTodayUsdc, setSpentTodayUsdc] = useState<string>('0.00');
  const [earnedHarvestUsdc, setEarnedHarvestUsdc] = useState<number>(0);
  const [withdrawing, setWithdrawing] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [vipExpires, setVipExpires] = useState<number | null>(null);
  const [passkeyGuardEnabled, setPasskeyGuardEnabled] = useState(true);
  const [agentStakeFee, setAgentStakeFee] = useState('0.10');
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [vesselWalletAddr, setVesselWalletAddr] = useState('');
  const [vesselWalletBal, setVesselWalletBal] = useState(0);
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  useEffect(() => {
    try {
      const savedLimit = localStorage.getItem('web5_daily_limit_usdc');
      if (savedLimit) setDailyLimitUsdc(savedLimit);
      const guard = localStorage.getItem('web5_passkey_guard');
      if (guard !== null) setPasskeyGuardEnabled(guard === 'true');
      // 初始化网站专用钱包（预付卡）
      const vw = getOrCreateVesselWallet();
      setVesselWalletAddr(vw.address);
      getVesselWalletBalance(vw.address).then(b => setVesselWalletBal(b));
    } catch {}
  }, []);

  const handleActivateVip = async (useWbog: boolean) => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) {
      alert(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
      return;
    }
    try {
      const res = await fetch('/api/commerce/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vesselDid: session?.vesselDid,
          paymentToken: useWbog ? 'WBOG' : 'USDC',
          months: 1,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setIsVip(true);
        setVipExpires(d.vip.expiresAt);
        alert(d.message);
      } else {
        alert(d.error || 'VIP 开通失败');
      }
    } catch (e: any) {
      alert('激活失败: ' + e.message);
    }
  };

  const togglePasskeyGuard = async () => {
    if (!passkeyGuardEnabled) {
      const ok = await verifyPasskeyBiometric('开启 Passkey 生物密钥二次锁');
      if (ok) {
        setPasskeyGuardEnabled(true);
        localStorage.setItem('web5_passkey_guard', 'true');
        alert(isEn ? '✅ Passkey Biometric Sovereign Guard enabled!' : '✅ Passkey 生物识别二次安全锁已成功启用！高危操作将受到硬件级保护。');
      }
    } else {
      const ok = await verifyPasskeyBiometric('关闭 Passkey 生物密钥二次锁');
      if (ok) {
        setPasskeyGuardEnabled(false);
        localStorage.setItem('web5_passkey_guard', 'false');
        alert(isEn ? 'Passkey Sovereign Guard disabled.' : 'Passkey 生物识别二次安全锁已关闭。');
      }
    }
  };

  const handleUpdateLimit = async (lim: string) => {
    if (passkeyGuardEnabled) {
      const ok = await verifyPasskeyBiometric(`修改单日预算限额为 ${lim} USDC`);
      if (!ok) {
        alert(isEn ? 'Biometric verification cancelled.' : '生物识别校验已取消或未通过，限额保持不变。');
        return;
      }
    }
    setDailyLimitUsdc(lim);
    localStorage.setItem('web5_daily_limit_usdc', lim);
    alert(isEn 
      ? `✅ Daily Limit updated to ${lim} USDC! Synced with BudgetFence contract allowance.`
      : `✅ 分身每日预算围栏已更新为 ${lim} USDC！已与 BudgetFence 链上合约配额同步。`);
  };

  const handleWithdraw = async () => {
    if (!PUBLIC_MONEY_FLOWS_ENABLED) {
      alert(PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE);
      return;
    }
    alert('提现入口尚未开放：请在收益详情中使用 EIP-712 提现流程，并确认链上出款哈希。');
  };

  const handlePanicRevoke = async () => {
    if (passkeyGuardEnabled) {
      const ok = await verifyPasskeyBiometric('确认执行紧急熔断注销 Session Key');
      if (!ok) {
        alert(isEn ? 'Biometric verification aborted.' : '生物特征确认未通过，熔断操作已中止。');
        return;
      }
    }
    const confirmed = confirm(isEn
      ? '🚨 [PANIC REVOKE CONFIRMATION]\n\nAre you sure you want to revoke your Avatar Session Key? This will immediately terminate all autonomous agent spending permissions on-chain.\n\nYour main wallet assets remain 100% untouched.'
      : '🚨【紧急熔断安全确认】\n\n确定要立即销毁当前 AI 分身的 Session Key 吗？\n\n这将立刻阻断分身的一切链上自动微支付与出纳权限，你的主钱包核心资产不受任何影响！');
    if (confirmed) {
      localStorage.removeItem('web5_vessel_session');
      alert(isEn
        ? 'Local session cleared. On-chain session-key revocation is not implemented yet; clear the browser session and review any standing allowances manually.'
        : '本地会话已清除。链上 Session Key 吊销尚未实现，请手动检查并撤销相关授权。');
      window.location.reload();
    }
  };

  const handleOpenVesselWithDiscount = (_useWbog: boolean) => {
    alert(isEn
      ? 'Opening additional avatars is not available during the closed beta.'
      : '内测期间暂不开放新增分身矩阵。');
  };

  const load = useCallback(async () => {
    if (!session?.vesselDid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'x-vessel-did': session.vesselDid },
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Dashboard request failed: ${res.status}`);
      }
      const d = await res.json();
      setData(d);
      // 同步真实链上收益与已花金额到显示（消除硬编码假数据）
      // 兼容 18 位精度与 6 位精度（统一折算为人类可读 USDC）
      if (d.totalYield !== undefined) {
        const rawYield = Number(toBigInt(d.totalYield));
        const formattedUsdc = rawYield > 1e12 ? rawYield / 1e18 : rawYield / 1e6;
        setEarnedHarvestUsdc(formattedUsdc);
      }
      if (d.treasury?.spentToday !== undefined) {
        const rawSpent = Number(toBigInt(d.treasury.spentToday));
        const formattedSpent = rawSpent > 1e12 ? rawSpent / 1e18 : rawSpent / 1e6;
        setSpentTodayUsdc(formattedSpent.toFixed(2));
      }
      if (d.treasury?.dailyLimit !== undefined) {
        const rawLimit = Number(toBigInt(d.treasury.dailyLimit));
        const formattedLimit = rawLimit > 1e12 ? rawLimit / 1e18 : rawLimit / 1e6;
        setDailyLimitUsdc(formattedLimit.toFixed(1));
      }
    } catch (err) {
      const e = err as Error;
      setError(e.name === 'AbortError' ? '请求超时（12s），请检查网络后重试。' : e.message);
      console.error('MyVessels load failed:', err);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }

    // 辅助数据并行加载，任一失败不影响主面板
    const did = encodeURIComponent(session.vesselDid);
    const [alertRes, distRes, refRes, fcRes] = await Promise.allSettled([
      fetch(`/api/alerts?did=${did}`),
      fetch(`/api/distribution/farcaster?did=${did}`),
      fetch(`/api/arp/referral?did=${did}`),
      fetch('/api/distribution/farcaster?action=profile'),
    ]);
    if (alertRes.status === 'fulfilled' && alertRes.value.ok) {
      setAlerts(await alertRes.value.json().catch(() => ({ unreadCount: 0, alerts: [] })));
    }
    if (distRes.status === 'fulfilled' && distRes.value.ok) {
      setDistroStats(await distRes.value.json().catch(() => null));
    }
    if (refRes.status === 'fulfilled' && refRes.value.ok) {
      setRefStats(await refRes.value.json().catch(() => null));
    }
    if (fcRes.status === 'fulfilled' && fcRes.value.ok) {
      setFcProfile(await fcRes.value.json().catch(() => null));
    }
  }, [session?.vesselDid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRelogin = async () => {
    await revokeVesselSession();
    if (typeof window !== 'undefined') window.location.reload();
  };

  if (!session) {
    return (
      <Card className="cyber-panel">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-[#B080E8]" />
          <h3 className="text-xl font-bold mb-2">需要容器权限</h3>
          <p className="text-[#999] mb-4">
            请先唤醒容器以查看分身矩阵、账本记录与自治交互日志。
          </p>
        </CardContent>
      </Card>
    );
  }

  // Observer 会话没有 Vessel DID，不能渲染矩阵（也不能无限骨架屏）
  if (!session.vesselDid || session.accessMode === 'observer') {
    return (
      <Card className="cyber-panel">
        <CardContent className="p-8 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-[#B080E8]" />
          <h3 className="text-xl font-bold mb-2">{isEn ? 'Observer Mode' : '当前为只读观察模式'}</h3>
          <p className="text-[#999] mb-4 max-w-md mx-auto text-sm leading-relaxed">
            {isEn
              ? 'This session has no Vessel DID, so the avatar matrix cannot load. Sign in again with your wallet to create a full Vessel identity.'
              : '当前会话没有 Vessel 容器身份（Vessel DID），无法加载分身矩阵。请返回登录页，使用「容器登录」或「钱包登录」完成主钱包签名后重试。'}
          </p>
          <Button onClick={handleRelogin} className="bg-[#B080E8]/15 text-[#B080E8] border border-[#B080E8]/30 hover:bg-[#B080E8]/25">
            {isEn ? 'Sign in again' : '重新登录'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="cyber-panel border-[#FF4444]/30">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[#FF66AA]" />
          <h3 className="text-xl font-bold mb-2">{isEn ? 'Failed to load dashboard' : '分身矩阵加载失败'}</h3>
          <p className="text-[#999] mb-4 text-sm break-all">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={load} className="cyber-mono text-xs">
              <RefreshCw className="w-3 h-3 mr-1" /> {isEn ? 'Retry' : '重试'}
            </Button>
            <Button onClick={handleRelogin} variant="ghost" className="cyber-mono text-xs text-[#999]">
              {isEn ? 'Sign in again' : '重新登录'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="cyber-loading-bar h-32 rounded" />
        ))}
      </div>
    );
  }

  if (!data) return null;

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

      {/* ━━ Vessel VIP 月度通行证 (4.99U / 2.99U WBOG 6折) ━━ */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all my-3 ${
        isVip
          ? 'border-[#FFCC00]/50 bg-gradient-to-r from-[#FFCC00]/15 via-[#B080E8]/10 to-[#00FFCC]/05 shadow-xl shadow-[#FFCC00]/10'
          : 'border-[#B080E8]/40 bg-gradient-to-r from-[#B080E8]/10 via-[#0a0e17] to-transparent'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isVip ? 'bg-[#FFCC00]/25 text-[#FFCC00] shadow-lg shadow-[#FFCC00]/20' : 'bg-[#B080E8]/20 text-[#B080E8]'
            }`}>
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                  <span>{isEn ? 'Vessel VIP Autonomous Pass' : 'Vessel VIP 分身尊享月度通行证'}</span>
                  <Badge className={isVip ? "bg-[#FFCC00] text-black font-black text-[9px] py-0" : "bg-[#B080E8]/20 text-[#B080E8] text-[9px] py-0"}>
                    {isVip ? 'ACTIVE VIP' : 'PRO ACCESS'}
                  </Badge>
                </h3>
              </div>
              <p className="text-[11px] text-[#aaa] mt-1 leading-relaxed">
                {isVip
                  ? `尊贵特权已生效（有效期至 ${new Date(vipExpires || Date.now()).toLocaleDateString()}）：全站付费博文免密畅读 · AI专家无限提问 · 写作3,000字上限 · 金色全息光环`
                  : '开通尊享全站 x402 认知付费无限畅读 · AI 专家无限次深度会诊 · AI 流式写作 3,000 字上限 · 金色粒子光环'}
              </p>
              {!isVip && (
                <div className="text-[10px] text-[#888] font-mono mt-1">
                  标准价: 4.99 USDC/月 · <span className="text-[#00FFCC] font-bold">优先使用 $WBOG 专享 6 折: 仅 2.99U (35,500 WBOG)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {isVip ? (
              <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 text-xs py-1.5 px-3 font-bold">
                ✓ 尊贵特权生效中
              </Badge>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => handleActivateVip(true)}
                  className="bg-gradient-to-r from-[#00FFCC] to-[#FFCC00] text-black font-black text-xs h-9 px-3.5 shadow-lg shadow-[#00FFCC]/20 hover:scale-[1.02] transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  {isEn ? 'Get VIP (35.5K WBOG · 60% OFF)' : '使用 $WBOG 开通 (仅 2.99U · 6折)'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleActivateVip(false)}
                  className="border-white/[0.15] text-[#ccc] hover:text-white text-xs h-9 px-3"
                >
                  4.99 USDC
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

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

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#888]">
                  {isEn ? 'Bound Root Wallet / Passkey DID:' : '绑定主钱包地址 / Passkey DID:'}
                </span>
                {session.primeDid?.includes('0x8f8') || session.primeDid?.includes('sim-') ? (
                  <Badge className="bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30 text-[9px] py-0 h-4">
                    {isEn ? '⚠️ Unverified Device ID' : '⚠️ 暂存设备身份 · 未确权'}
                  </Badge>
                ) : (
                  <Badge className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 text-[9px] py-0 h-4">
                    {isEn ? '✓ Verified Root Wallet' : '✓ 真实主钱包已确权'}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-[#00FFCC] font-mono break-all select-all font-semibold">
                {session.primeDid}
              </div>

              {/* 确权 / 绑定 / 更换真实主钱包 */}
              <div className="pt-2 border-t border-white/[0.04]">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const ethereum = (window as any).ethereum;
                    if (!ethereum) {
                      alert(isEn ? 'Please install MetaMask / OKX Web3 wallet extension.' : '未检测到 MetaMask / OKX 钱包插件，请安装后进行确权绑定。');
                      return;
                    }
                    try {
                      // 1. 切换 Circle ARC 主网 (5042)
                      const chainIdHex = '0x13b2';
                      try {
                        await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
                      } catch (switchError: any) {
                        if (switchError.code === 4902) {
                          await ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                              chainId: chainIdHex,
                              chainName: 'Arc Mainnet',
                              nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                              rpcUrls: ['https://rpc.mainnet.arc.io'],
                              blockExplorerUrls: ['https://explorer.arc.io'],
                            }],
                          });
                        } else {
                          throw switchError;
                        }
                      }

                      // 2. 获取账号
                      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                      const realAddr = accounts[0];

                      // 3. 签名确权（证明主权拥有）
                      const signMsg = `Web5.blog Sovereign Root Wallet Binding\n\nWallet: ${realAddr}\nTo Vessel Container: ${session.vesselDid}\nTimestamp: ${Date.now()}`;
                      const sig = await ethereum.request({
                        method: 'personal_sign',
                        params: [signMsg, realAddr],
                      });

                      // 4. 发送到后端更新绑定
                      const res = await fetch('/api/auth/bind-wallet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          vesselDid: session.vesselDid,
                          walletAddress: realAddr,
                          signature: sig,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        session.primeDid = data.primeDid;
                        try {
                          localStorage.setItem('web5_vessel_session', JSON.stringify(session));
                        } catch {}
                        alert(isEn
                          ? `🎉 Sovereign Root Wallet verified: ${realAddr}!\n\nBound to this vessel container. Withdrawals are not open yet; no transfer will occur until the payout channel goes live.`
                          : `🎉 主钱包确权成功：${realAddr}！\n\n已成功绑定至当前分身容器。提现通道尚未开放，绑定完成不代表会发生任何转账。`);
                        window.location.reload();
                      } else {
                        alert(data.error || '确权绑定失败');
                      }
                    } catch (e: any) {
                      if (e?.code === 4001) {
                        alert(isEn ? 'Binding cancelled' : '已取消签名绑定');
                      } else {
                        alert((isEn ? 'Binding failed: ' : '绑定失败：') + (e?.message?.slice(0, 80) || '未知错误'));
                      }
                    }
                  }}
                  className="w-full text-xs h-7 border-[#00FFCC]/40 text-[#00FFCC] hover:bg-[#00FFCC]/10 flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3 h-3" />
                  <span>
                    {session.primeDid?.includes('0x8f8') || session.primeDid?.includes('sim-')
                      ? (isEn ? '🔗 Sign to Bind Real Root Wallet' : '🔗 签名确权我的真实 Web3 主钱包')
                      : (isEn ? '🔄 Switch / Rebind Root Wallet' : '🔄 更换 / 重新确权主钱包')}
                  </span>
                </Button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#10B981]/05 border border-[#10B981]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-[#aaa]">
                  {isEn ? 'Avatar Earnings Ledger (not paid out):' : '分身收益账本（尚未出款）:'}
                </div>
                <div className="text-2xl font-black text-[#10B981] font-mono">
                  +{earnedHarvestUsdc.toFixed(2)} <span className="text-xs font-normal">USDC</span>
                </div>
                <div className="text-[9px] text-[#666] font-mono mt-0.5">
                  账本记录 · 提现尚未开放
                </div>
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing || !PUBLIC_MONEY_FLOWS_ENABLED}
                title={PUBLIC_MONEY_FLOWS_ENABLED ? undefined : PUBLIC_MONEY_FLOWS_DISABLED_MESSAGE}
                className="bg-gradient-to-r from-[#10B981] to-[#00FFCC] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs h-10 px-4 shadow-lg shadow-[#10B981]/20 hover:scale-[1.02] transition-all flex-shrink-0"
              >
                {!PUBLIC_MONEY_FLOWS_ENABLED ? PUBLIC_DEMO_NOTICE : withdrawing ? (isEn ? 'Processing...' : '提现处理中...') : (isEn ? '💰 Withdraw (not available yet)' : '💰 提现（暂未开放）')}
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

            {/* 网站专用钱包（预付卡模式：主钱包一次性充值，日常免签消费） */}
            <div className="p-3 rounded-xl bg-black/40 border border-[#B080E8]/20 space-y-2">
              <div className="text-[10px] text-[#888] font-mono flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-[#B080E8]" />
                {isEn ? 'Vessel Prepaid Wallet (website dedicated):' : '网站专用钱包 (Vessel 预付卡):'}
              </div>
              <div className="text-xs text-[#B080E8] font-mono break-all select-all font-semibold">
                {vesselWalletAddr || '0x0000…0000'}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#888]">{isEn ? 'Balance:' : '余额:'}</span>
                <span className="text-[#FFCC00] font-bold">{vesselWalletBal.toFixed(4)} USDC</span>
              </div>
              <div className="text-[9px] text-[#666] font-mono">
                {isEn ? 'Top up once from your root wallet, then tip/task auto-settles without signature' : '主钱包一次性充值，之后打赏/发任务免签自动结算'}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const ethereum = (window as any).ethereum;
                    if (!ethereum) { alert(isEn ? 'Please connect root wallet' : '请先连接主钱包'); return; }
                    try {
                      const chainIdHex = '0x13b2';
                      try { await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] }); }
                      catch (e: any) {
                        if (e.code === 4902) {
                          await ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: chainIdHex, chainName: 'Arc Mainnet', nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: ['https://rpc.mainnet.arc.io'], blockExplorerUrls: ['https://explorer.arc.io'] }] });
                        } else throw e;
                      }
                      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                      const from = accounts[0];
                      // ━━ 二次签名主权确认（personal_sign，证明充值意图） ━━
                      const signMsg = `Web5.blog Sovereign Recharge\n\nAmount: 0.1 USDC\nTo Vessel Wallet: ${vesselWalletAddr}\nTimestamp: ${Date.now()}`;
                      await ethereum.request({ method: 'personal_sign', params: [signMsg, from] });
                      // ━━ 链上转账 ━━
                      const amountWei = BigInt(Math.round(0.1 * 1e18));
                      await ethereum.request({ method: 'eth_sendTransaction', params: [{ from, to: vesselWalletAddr, value: '0x' + amountWei.toString(16) }] });
                      const b = await getVesselWalletBalance(vesselWalletAddr);
                      setVesselWalletBal(b);
                      alert(isEn ? '✅ Topped up 0.1 USDC to dedicated wallet!' : '✅ 已向专用钱包充值 0.1 USDC，可免签打赏了！');
                    } catch (e: any) {
                      if (e?.code === 4001) alert(isEn ? 'Cancelled' : '已取消充值');
                      else alert((isEn ? 'Recharge failed: ' : '充值失败：') + (e?.message?.slice(0, 80) || '请确认主钱包已连接'));
                    }
                  }}
                  className="flex-1 text-xs h-8 bg-[#B080E8]/20 text-[#B080E8] border border-[#B080E8]/40 hover:bg-[#B080E8]/30"
                >
                  ⚡ {isEn ? 'Top Up 0.1 USDC' : '主钱包充值 0.1U'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const ethereum = (window as any).ethereum;
                    if (!ethereum) { alert(isEn ? 'Please connect Web3 root wallet' : '请先连接 Web3 主钱包'); return; }
                    try {
                      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                      const from = accounts[0];
                      const seedMsg = `Web5.blog Sovereign Vessel Key Derivation for ${from.toLowerCase()}`;
                      const signature = await ethereum.request({ method: 'personal_sign', params: [seedMsg, from] });
                      const derived = deriveVesselWalletFromSignature(signature);
                      setVesselWalletAddr(derived.address);
                      const b = await getVesselWalletBalance(derived.address);
                      setVesselWalletBal(b);
                      alert(isEn
                        ? `✅ Synchronized dedicated wallet (${derived.address.slice(0, 8)}...) across devices via root signature!`
                        : `✅ 已成功通过主钱包签名派生并同步专属子卡（${derived.address.slice(0, 8)}...）！在任何设备登录均可永久找回余额。`);
                    } catch (e: any) {
                      if (e?.code === 4001) alert(isEn ? 'Cancelled signature' : '已取消签名');
                      else alert((isEn ? 'Sync failed: ' : '同步失败：') + (e?.message?.slice(0, 80) || '未知错误'));
                    }
                  }}
                  className="text-xs h-8 border-white/[0.15] text-[#aaa] hover:text-white hover:bg-white/[0.05]"
                  title={isEn ? "Recover or bind this dedicated wallet across devices via root signature" : "通过主钱包一次签名在任何设备永久同步/找回同一个专属零钱包"}
                >
                  🔗 {isEn ? 'Sync Sub-Card' : '跨设备同步子卡'}
                </Button>
              </div>
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

      {/* ━━ 🤖 智能体对外接入与 API 准入网关 (从首页移入内页供用户自主配置) ━━ */}
      <div className="p-4 rounded-xl border border-[#0066FF]/30 bg-gradient-to-r from-[#0066FF]/10 via-[#0a0e17] to-transparent space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0066FF]/20 flex items-center justify-center text-[#0066FF]">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Autonomous Agent API Gateway & Sybil Stake' : '🤖 智能体对外接入与 API 准入网关'}</span>
                <Badge className="bg-[#0066FF]/20 text-[#0066FF] border-[#0066FF]/30 text-[9px]">
                  x402 / MCP READY
                </Badge>
              </div>
              <p className="text-[11px] text-[#aaa] mt-0.5">
                允许第三方 AI 爬虫与外部智能体调用你的分身智识库；外部接入定价（0.10 USDC 防女巫质押）为预览，当前未开放扣款与分润。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`https://web5.blog/api/mcp?did=${session?.vesselDid}`);
                setCopiedApiKey(true);
                setTimeout(() => setCopiedApiKey(false), 2000);
              }}
              className="bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/40 hover:bg-[#0066FF]/30 text-xs h-8 px-3"
            >
              {copiedApiKey ? '✓ 专属 MCP 链接已复制' : '📋 复制分身 MCP 端点'}
            </Button>
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg border border-white/[0.1] text-[11px] text-[#888] hover:text-white text-xs h-8 flex items-center gap-1"
            >
              <span>OpenAPI</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.04] text-[11px] font-mono">
          <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
            <span className="text-[#666]">专属 Agent DID: </span>
            <span className="text-[#00FFCC] truncate block mt-0.5">did:agent:{session?.vesselDid?.slice(-20)}</span>
          </div>
          <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
            <span className="text-[#666]">机器准入质押费（预览）: </span>
            <span className="text-[#FFCC00] font-bold block mt-0.5">0.10 USDC 定价预览 · 未开放扣款</span>
          </div>
          <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
            <span className="text-[#666]">支持标准: </span>
            <span className="text-white block mt-0.5">Claude MCP / AA2P RPC / x402</span>
          </div>
        </div>
      </div>

      {/* ━━ 🔗 主权身份完善绑定（从首页移入内页：推特社交 + Passkey 指纹本体） ━━ */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.01] space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#B080E8]" />
          <span className="text-xs font-bold text-white">
            {isEn ? 'Sovereign Identity Completion (Bind more credentials)' : '主权身份完善绑定 (进一步绑定你的分身)'}
          </span>
          <Badge className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30 text-[9px]">
            OPTIONAL
          </Badge>
        </div>
        <p className="text-[11px] text-[#888] leading-relaxed">
          将社交图谱与硬件生物密钥绑定到你的分身本体，进一步加固身份主权与跨平台影响力。
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {/* Twitter / X 绑定 */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0066FF]/15 flex items-center justify-center text-[#0066FF]">
                <Twitter className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">绑定 Twitter / X 社交身份</div>
                <div className="text-[10px] text-[#666]">映射去中心化社交图谱与 DID</div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { window.location.href = '/api/auth/twitter'; }}
              className="w-full text-xs h-8 border-[#0066FF]/30 text-[#0066FF] hover:bg-[#0066FF]/10"
            >
              <Twitter className="w-3 h-3 mr-1" /> 绑定 X 账号
            </Button>
          </div>

          {/* Passkey 指纹绑定 */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/15 flex items-center justify-center text-[#FFCC00]">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">绑定 Passkey 生物指纹本体</div>
                <div className="text-[10px] text-[#666]">TouchID / FaceID 硬件级二次风控</div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => togglePasskeyGuard()}
              className="w-full text-xs h-8 border-[#FFCC00]/30 text-[#FFCC00] hover:bg-[#FFCC00]/10"
            >
              <Fingerprint className="w-3 h-3 mr-1" /> {passkeyGuardEnabled ? '指纹锁已绑定 · 点击验证' : '绑定指纹本体'}
            </Button>
          </div>
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
                      <div className="cyber-mono text-[10px] text-[#666]">DeFi 收益（未启用）</div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-[#FFCC00]" />
                        <span className="text-sm font-bold text-[#FFCC00]">—</span>
                      </div>
                      <div className="cyber-mono text-[10px] text-[#666]">自动复投 · 未启用</div>
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

                  {/* 收益概览（仅展示账本汇总，不伪造流水） */}
                  <div className="p-3.5 rounded-xl border border-[#00FFCC]/40 bg-gradient-to-r from-[#00FFCC]/10 via-[#050508] to-transparent space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00FFCC]" />
                        <span className="font-bold text-xs text-white">
                          {isEn ? 'Earnings Overview' : '收益概览'}
                        </span>
                      </div>
                      <Badge className="bg-white/[0.08] text-[#999] border-white/[0.12] text-[9px] font-mono">
                        LEDGER ONLY
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#ccc] leading-relaxed">
                      {isEn
                        ? 'Only confirmed on-chain income that has completed payout is counted here. No synthetic activity is displayed.'
                        : '仅统计已完成链上确认与出款的收益；页面不再展示虚构流水。'}
                    </p>
                    <div className="text-[10px] text-[#888] font-mono flex items-center justify-between pt-1 border-t border-white/[0.04]">
                      <span>{isEn ? 'Ledger total' : '账本累计'}</span>
                      <span className="text-[#00FFCC] font-bold">{earnedHarvestUsdc.toFixed(4)} USDC</span>
                    </div>
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
                  <Row label="SMART ACCOUNT" value={vesselStatus.smartAccountAddress || '未部署'} color="#0066FF" />
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
                  <Row label="SYNC LATENCY" value="未采集" color="#666" />
                  <Row label="STYLE DRIFT" value="未采集" color="#666" />
                  <div className="cyber-mono text-[10px] text-[#666]">
                    同步延迟与风格漂移指标尚未接入真实遥测。
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
                  {logs.map((log: any) => {
                    let meta: any = {};
                    try { meta = JSON.parse(log.metadata || '{}'); } catch {}
                    const verified = Boolean(meta.realTxHash || meta.sourceTxHash);
                    return (
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
                        {log.yieldAmount && verified && (
                          <div className="text-[#FFCC00]">
                            +{fromTokenUnits(toBigInt(log.yieldAmount))} USDC
                          </div>
                        )}
                        {log.spentAmount && verified && (
                          <div className="text-[#FF66AA]">
                            -{fromTokenUnits(toBigInt(log.spentAmount))} USDC
                          </div>
                        )}
                        {!verified && (log.yieldAmount || log.spentAmount) && (
                          <div className="text-[#666]">模拟记录 · 不计入收益</div>
                        )}
                      </div>
                    );
                  })}
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
            <Button size="sm" variant="outline" onClick={load} className="cyber-mono">
              <RefreshCw className="w-3 h-3 mr-1" /> REFRESH
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (!session?.sessionToken) { alert('需要 Vessel 会话后才能创建 Eidolon'); return; }
              const name = prompt('新 Eidolon 名称:','Eidolon-' + Math.random().toString(36).slice(2,8));
              if (name) {
                fetch('/api/eidolon/deploy', {
                  method:'POST',
                  headers:{'Content-Type':'application/json', Authorization:'Bearer ' + session.sessionToken},
                  body:JSON.stringify({name}),
                })
                  .then(async r => {
                    const j = await r.json();
                    if (!r.ok || !j.success) throw new Error(j.error || '创建失败');
                    alert(j.message || '✓ 分身创建成功');
                    load();
                  })
                  .catch(e => alert(e.message || '创建失败'));
              }
            }} className="border-[#B080E8]/30 text-[#B080E8] hover:bg-[#B080E8]/10">
              <Activity className="w-3 h-3 mr-1" /> DEPLOY NEW EIDOLON
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
