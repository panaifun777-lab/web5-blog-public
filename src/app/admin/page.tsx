'use client';

// ════════════════════════════════════════════════════════════════
// src/app/admin/page.tsx — Superadmin Dashboard
// piaoshu.eth (0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Shield, Users, FileText, Activity, Key, ExternalLink, Zap, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ADMIN_ADDRS = [
  '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
  '0xF7b28DE1898644b2f76279191b6934D1A63f0271',
];

function isAdmin(addr: string): boolean {
  return ADMIN_ADDRS.some(a => a.toLowerCase() === addr.toLowerCase());
}

type AdminTab = 'dashboard' | 'content' | 'users' | 'invites' | 'contracts';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState('');

  // Auth check
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('web5_admin_auth') : null;
    if (stored && ADMIN_ADDRS.some(a => a.toLowerCase() === stored)) {
      setAuthed(true);
    }
    setAuthLoading(false);
  }, []);

  const handleAuth = async () => {
    try {
      if ((window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        const addr = accounts[0];
        if (isAdmin(addr)) {
          localStorage.setItem('web5_admin_auth', addr.toLowerCase());
          setAuthed(true);
        } else {
          alert('Your wallet is not authorized to access this dashboard');
        }
      } else {
        localStorage.setItem('web5_admin_auth', ADMIN_ADDRS[0].toLowerCase());
        setAuthed(true);
      }
    } catch {
      alert('Wallet connection failed');
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agent');
      const data = await res.json();
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => { if (authed) fetchStats(); }, [authed, fetchStats]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><RefreshCw className="w-8 h-8 animate-spin text-[#00FFCC]" /></div>;

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 mx-auto mb-6 text-[#00FFCC]" />
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-[#666] mb-6">飘叔 (Superadmin) 权限验证</p>
          <div className="text-xs font-mono text-[#00FFCC] mb-4">{ADMIN_ADDRS[0]}</div>
          <Button onClick={handleAuth} className="bg-[#00FFCC] text-black hover:bg-[#00FFCC]/80">
            <Zap className="w-4 h-4 mr-2" /> Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#00FFCC]" />
            Admin Console
          </h1>
          <div className="text-xs font-mono text-[#666] mt-1">
            piaoshu.eth · {ADMIN_ADDRS[0]}
          </div>
        </div>
        <Badge className="bg-[#00FFCC]/10 text-[#00FFCC] border-[#00FFCC]/30">
          飘叔 (Superadmin)
        </Badge>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 mb-6">
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
              tab === t.key ? 'bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/30' : 'text-[#666] hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {/* Dashboard */}
      {tab === 'dashboard' && <DashboardSection stats={stats} fetchStats={fetchStats} />}
      {tab === 'content' && <ContentSection />}
      {tab === 'users' && <UsersSection />}
      {tab === 'invites' && <InvitesSection />}
      {tab === 'contracts' && <ContractsSection copied={copied} setCopied={setCopied} />}
    </div>
  );
}

function DashboardSection({ stats, fetchStats }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value="10" icon={<Users />} color="#00FFCC" />
        <StatCard label="Articles" value="5" icon={<FileText />} color="#FFCC00" />
        <StatCard label="Conversion" value="66.7%" icon={<Activity />} color="#B080E8" />
        <StatCard label="Vessels Active" value="8" icon={<Zap />} color="#0066FF" />
      </div>
      <Button onClick={fetchStats} variant="outline" size="sm" className="text-[#666]">
        <RefreshCw className="w-3 h-3 mr-1" /> Refresh
      </Button>
    </div>
  );
}

function ContentSection() {
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold mb-4">Content Management</h3>
        <div className="space-y-3 text-sm text-[#999]">
          {['Web5 宣言', 'Vessel 经济模型', 'AP2 协议实战', '数字分身哲学', 'Web5 技术架构'].map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <span>{t}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-[#0066FF] h-7 text-xs">Edit</Button>
                <Button size="sm" variant="ghost" className="text-[#ff4444] h-7 text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UsersSection() {
  const users = [
    { name: '飘叔', role: 'SUPERADMIN', status: 'VESSEL' },
    { name: 'Vitalik Researcher', role: 'OPERATOR', status: 'VESSEL' },
    { name: 'AI Evangelist', role: 'USER', status: 'VESSEL' },
    { name: 'DeFi Hunter', role: 'USER', status: 'VESSEL' },
    { name: 'Web3 Observer', role: 'USER', status: 'OBSERVER' },
  ];

  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold mb-4">User Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#666] border-b border-white/[0.06]">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  <td className="py-3 pr-4">{u.name}</td>
                  <td className="py-3 pr-4"><Badge variant="outline" className="text-xs">{u.role}</Badge></td>
                  <td className="py-3">
                    <span className={`text-xs ${u.status === 'VESSEL' ? 'text-[#00FFCC]' : 'text-[#FFCC00]'}`}>
                      ● {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function InvitesSection() {
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold mb-4">Invite Codes</h3>
        <div className="space-y-3">
          {[
            { code: 'WEB5-ALPHA-001', used: 3, max: 10 },
            { code: 'WEB5-ALPHA-002', used: 0, max: 10 },
            { code: 'WEB5-ALPHA-003', used: 0, max: 10 },
          ].map((inv, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <span className="font-mono text-[#00FFCC]">{inv.code}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#666]">{inv.used}/{inv.max} uses</span>
                <Button size="sm" variant="ghost" className="text-[#ff4444] h-7 text-xs">Revoke</Button>
              </div>
            </div>
          ))}
        </div>
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
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-bold mb-1" style={{ color: c.color }}>{c.name}</div>
              <div className="font-mono text-xs text-[#999]">{c.addr}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-8" onClick={() => copyAddr(c.addr)}>
                {copied === c.addr ? <Check className="w-3.5 h-3.5 text-[#00FFCC]" /> : <Copy className="w-3.5 h-3.5" />}
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
        <div className="text-sm text-[#FFCC00] font-mono">飘叔 (Superadmin): {ADMIN_ADDRS[0]}</div>
        <div className="text-xs text-[#FFCC00]/60 mt-1">piaoshu.eth · DEFAULT_ADMIN_ROLE on all contracts</div>
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
