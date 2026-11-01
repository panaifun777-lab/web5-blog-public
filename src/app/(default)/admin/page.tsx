'use client';

// ════════════════════════════════════════════════════════════════
// src/app/admin/page.tsx — Superadmin Dashboard
// Auth: wallet challenge signature -> HttpOnly admin session cookie
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, FileText, Activity, Key, ExternalLink, Zap, Copy, Check,
  RefreshCw, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ADMIN_ADDRS = [
  '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
  '0xF7b28DE1898644b2f76279191b6934D1A63f0271',
];

function isAdmin(addr: string): boolean {
  return ADMIN_ADDRS.some((a) => a.toLowerCase() === addr.toLowerCase());
}

function toHex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

type AdminTab = 'dashboard' | 'content' | 'users' | 'invites' | 'contracts';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminAddress, setAdminAddress] = useState('');
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch('/api/admin/auth/session', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          setAuthed(false);
          return;
        }
        const data = await res.json();
        if (data.authenticated) {
          setAuthed(true);
          setAdminAddress(data.address);
        }
      })
      .catch(() => setAuthed(false))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuth = async () => {
    setAuthError(null);
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setAuthError('未检测到 Web3 钱包。管理员登录必须使用已授权钱包签名。');
      return;
    }

    setSigningIn(true);
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts?.[0];
      if (!address || !isAdmin(address)) {
        throw new Error('该钱包不在管理员名单中');
      }

      const challengeRes = await fetch('/api/admin/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const challenge = await challengeRes.json();
      if (!challengeRes.ok) {
        throw new Error(challenge.error || '无法获取登录挑战');
      }

      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [toHex(challenge.message), address],
      });

      const verifyRes = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature,
          challengeToken: challenge.challengeToken,
        }),
      });
      const verified = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verified.error || '签名验证失败');
      }

      setAuthed(true);
      setAdminAddress(verified.address);
    } catch (err: any) {
      setAuthError(err?.message || '钱包登录失败');
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/session', { method: 'DELETE' }).catch(() => {});
    setAuthed(false);
    setStats(null);
    setAdminAddress('');
  };

  const fetchStats = useCallback(async () => {
    setStatsError(null);
    try {
      const res = await fetch('/api/admin/agent', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setAuthed(false);
          return;
        }
        throw new Error(data.error || 'Failed to load stats');
      }
      setStats(data);
    } catch (err: any) {
      setStatsError(err?.message || 'Failed to load stats');
    }
  }, []);

  useEffect(() => {
    if (authed) fetchStats();
  }, [authed, fetchStats]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00FFCC]" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 mx-auto mb-6 text-[#00FFCC]" />
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-[#888] mb-1 text-sm">仅限已授权管理员钱包签名登录</p>
          <p className="text-[11px] text-[#555] mb-6">签名不会触发任何资金交易</p>
          <div className="text-xs font-mono text-[#00FFCC] mb-4 break-all">
            {ADMIN_ADDRS[0]}
          </div>
          <Button
            onClick={handleAuth}
            disabled={signingIn}
            className="bg-[#00FFCC] text-black hover:bg-[#00FFCC]/80"
          >
            <Zap className="w-4 h-4 mr-2" />
            {signingIn ? '等待钱包签名...' : '连接钱包并签名登录'}
          </Button>
          {authError && (
            <div className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {authError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#00FFCC]" />
            Admin Console
          </h1>
          <div className="text-xs font-mono text-[#888] mt-1 break-all">
            {adminAddress || ADMIN_ADDRS[0]}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#00FFCC]/10 text-[#00FFCC] border-[#00FFCC]/30">
            Wallet session
          </Badge>
          <Button onClick={handleLogout} variant="outline" size="sm" className="text-[#888]">
            <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <nav className="flex gap-1 mb-6 flex-wrap">
        {[
          { key: 'dashboard' as AdminTab, label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
          { key: 'content' as AdminTab, label: 'Content', icon: <FileText className="w-4 h-4" /> },
          { key: 'users' as AdminTab, label: 'Users', icon: <Users className="w-4 h-4" /> },
          { key: 'invites' as AdminTab, label: 'Invites', icon: <Key className="w-4 h-4" /> },
          { key: 'contracts' as AdminTab, label: 'Contracts', icon: <ExternalLink className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              tab === t.key
                ? 'bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/30'
                : 'text-[#888] hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {statsError && (
        <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {statsError}
        </div>
      )}

      {tab === 'dashboard' && <DashboardSection stats={stats} fetchStats={fetchStats} />}
      {tab === 'content' && <ContentSection stats={stats} />}
      {tab === 'users' && <UsersSection stats={stats} />}
      {tab === 'invites' && <InvitesSection stats={stats} fetchStats={fetchStats} />}
      {tab === 'contracts' && <ContractsSection copied={copied} setCopied={setCopied} />}
    </div>
  );
}

function DashboardSection({ stats, fetchStats }: any) {
  const values = stats?.stats || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Users" value={String(values.users ?? '—')} icon={<Users />} color="#00FFCC" />
        <StatCard label="Articles" value={String(values.articles ?? '—')} icon={<FileText />} color="#FFCC00" />
        <StatCard label="Vessels" value={String(values.vessels ?? '—')} icon={<Zap />} color="#0066FF" />
        <StatCard label="Interactions" value={String(values.interactions ?? '—')} icon={<Activity />} color="#B080E8" />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={fetchStats} variant="outline" size="sm" className="text-[#888]">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
        <span className="text-[11px] text-[#555]">数据来自生产数据库实时统计</span>
      </div>
    </div>
  );
}

function ContentSection({ stats }: any) {
  const contents = stats?.recentContent || [];
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold mb-4">Recent Content</h3>
        {contents.length === 0 ? (
          <div className="text-sm text-[#666]">暂无内容</div>
        ) : (
          <div className="space-y-3 text-sm text-[#999]">
            {contents.map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]"
              >
                <div className="min-w-0">
                  <div className="truncate text-white/90">{c.title}</div>
                  <div className="text-[10px] text-[#555] font-mono truncate">
                    {c.arweaveHash}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] text-[#666] font-mono">
                    {new Date(c.publishedAt).toLocaleDateString()}
                  </span>
                  <a
                    href={`/p/${c.arweaveHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0066FF] text-xs hover:underline"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsersSection({ stats }: any) {
  const users = stats?.recentUsers || [];
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold mb-4">Recent Identities</h3>
        {users.length === 0 ? (
          <div className="text-sm text-[#666]">暂无用户</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#666] border-b border-white/[0.06]">
                  <th className="pb-3 pr-4">Identity</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3">Stage / Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.did} className="border-b border-white/[0.03]">
                    <td className="py-3 pr-4">
                      <div className="text-white/90">{u.displayName || 'Unnamed'}</div>
                      <div className="text-[10px] text-[#555] font-mono truncate max-w-[280px]">
                        {u.did}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">{u.role}</Badge>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs ${u.status === 'ACTIVE' ? 'text-[#00FFCC]' : 'text-[#FFCC00]'}`}>
                        ● {u.accountStage || u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvitesSection({ stats, fetchStats }: any) {
  const [creating, setCreating] = useState(false);
  const invites = stats?.invites || [];

  const createInvite = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_invite' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await fetchStats();
    } catch (err: any) {
      alert(err?.message || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Invite Codes</h3>
          <Button onClick={createInvite} disabled={creating} size="sm" variant="outline">
            {creating ? 'Creating...' : 'Generate'}
          </Button>
        </div>
        {invites.length === 0 ? (
          <div className="text-sm text-[#666]">暂无邀请码</div>
        ) : (
          <div className="space-y-3">
            {invites.map((inv: any) => (
              <div
                key={inv.code}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]"
              >
                <span className="font-mono text-[#00FFCC]">{inv.code}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[#666]">
                    {inv.usedCount}/{inv.maxUses} uses
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContractsSection({ copied, setCopied }: { copied: string; setCopied: (s: string) => void }) {
  const contracts = [
    { name: '$WBOG Token', addr: '0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f', color: '#FFCC00' },
    { name: 'ContentNFT', addr: '0x8537fe7268296f37c2f85f9aad992f11659d1c8a', color: '#FF66AA' },
    { name: 'BudgetFence', addr: '0xe0d246c09d7a3097bab3148f89201157dd531eea', color: '#0066FF' },
    { name: 'VesselAuth', addr: '0x2d4aebbd5d3e318c0deb91f927019835ecd9a120', color: '#00FFCC' },
  ];

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-4">
      {contracts.map((c) => (
        <Card key={c.name} className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-bold mb-1" style={{ color: c.color }}>{c.name}</div>
              <div className="font-mono text-xs text-[#999] break-all">{c.addr}</div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="ghost" className="h-8" onClick={() => copyAddr(c.addr)}>
                {copied === c.addr ? (
                  <Check className="w-3.5 h-3.5 text-[#00FFCC]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
              <a href={`https://explorer.arc.io/address/${c.addr}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="h-8 text-[#0066FF]">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="p-4 rounded-lg bg-[#FFCC00]/5 border border-[#FFCC00]/20">
        <div className="text-sm text-[#FFCC00] font-mono break-all">
          Superadmin: {ADMIN_ADDRS[0]}
        </div>
        <div className="text-xs text-[#FFCC00]/60 mt-1">
          合约权限以链上角色为准，此页面仅展示已知地址。
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2" style={{ color }}>
          {icon}
          <span className="text-xs text-[#666]">{label}</span>
        </div>
        <div className="text-2xl font-bold font-mono">{value}</div>
      </CardContent>
    </Card>
  );
}
