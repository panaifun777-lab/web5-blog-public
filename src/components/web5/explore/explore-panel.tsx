'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/explore/explore-panel.tsx
// 探索面板 — 全局统计 / Top Vessels / 内容浏览 / 邀请码
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';
import { fromTokenUnits } from '@/lib/web5/types';
import {
  Users, Activity, FileText, Coins, TrendingUp,
  Trophy, Ticket, RefreshCw,
} from 'lucide-react';

interface ExploreData {
  stats: {
    primes: number;
    activeVessels: number;
    contents: number;
    interactions: number;
    totalYield: string;
  };
  conversion: any;
  topVessels: Array<{
    vesselDid: string;
    primeDid: string;
    displayName: string;
    avatarSeed: string;
    bio: string;
    eidolonName: string;
    smartAccountAddress: string;
    lastActiveAt: string | null;
    totalYield: string;
  }>;
  contracts: {
    deployed: boolean;
    addresses: any;
    chain: any;
    superadmin: string;
  };
}

export function ExplorePanel() {
  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/explore?section=overview');
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Explore load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="cyber-loading-bar h-24 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold cyber-text-glow-cyan">探索</h2>
        <Button onClick={load} variant="ghost" size="sm" className="cyber-mono text-xs">
          <RefreshCw className="w-3 h-3 mr-1" /> 刷新
        </Button>
      </div>

      {/* 全局统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="PRIMES"
          value={data.stats.primes}
          icon={<Users className="w-4 h-4" />}
          color="#FFCC00"
        />
        <StatCard
          label="ACTIVE VESSELS"
          value={data.stats.activeVessels}
          icon={<Activity className="w-4 h-4" />}
          color="#00FFCC"
        />
        <StatCard
          label="CONTENTS"
          value={data.stats.contents}
          icon={<FileText className="w-4 h-4" />}
          color="#0066FF"
        />
        <StatCard
          label="INTERACTIONS"
          value={data.stats.interactions}
          icon={<TrendingUp className="w-4 h-4" />}
          color="#B080E8"
        />
        <StatCard
          label="TOTAL YIELD"
          value={`${fromTokenUnits(BigInt(data.stats.totalYield))}`}
          unit="USDC"
          icon={<Coins className="w-4 h-4" />}
          color="#FF66AA"
        />
      </div>

      {/* 转化统计 */}
      {data.conversion && (
        <Card className="cyber-panel">
          <CardHeader>
            <h3 className="cyber-mono cyber-text-glow-gold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Observer → Vessel 转化追踪
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="cyber-mono text-xs text-[#666]">总用户</div>
                <div className="text-2xl font-bold text-[#00FFCC]">{data.conversion.totalUsers}</div>
              </div>
              <div>
                <div className="cyber-mono text-xs text-[#666]">Vessel 模式</div>
                <div className="text-2xl font-bold text-[#0066FF]">{data.conversion.vesselMode}</div>
              </div>
              <div>
                <div className="cyber-mono text-xs text-[#666]">Observer 模式</div>
                <div className="text-2xl font-bold text-[#FFCC00]">{data.conversion.observerMode}</div>
              </div>
              <div>
                <div className="cyber-mono text-xs text-[#666]">转化率</div>
                <div className="text-2xl font-bold text-[#FF66AA]">{data.conversion.conversionRate}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Vessels 排行 */}
      <Card className="cyber-panel">
        <CardHeader>
          <h3 className="cyber-mono cyber-text-glow-cyan flex items-center gap-2">
            <Trophy className="w-4 h-4" /> TOP VESSELS（按收益排行）
          </h3>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {data.topVessels.length === 0 ? (
            <div className="text-center text-[#666] py-8 cyber-mono text-sm">
              暂无活跃 Vessel
            </div>
          ) : (
            data.topVessels.map((v, i) => (
              <div
                key={v.vesselDid}
                className="flex items-center gap-3 p-2 border border-[#1a1a1a] rounded hover:border-[#00FFCC]/30"
              >
                <div className="cyber-mono text-lg font-bold w-8 text-center" style={{
                  color: i === 0 ? '#FFCC00' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#666',
                }}>
                  #{i + 1}
                </div>
                <ParticleAvatar size={36} seed={v.avatarSeed} phase="dashboard" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{v.displayName}</div>
                  <div className="cyber-mono text-[10px] text-[#666] truncate">
                    {v.eidolonName} · {v.smartAccountAddress.slice(0, 10)}...
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#FFCC00] font-bold text-sm">
                    +{fromTokenUnits(BigInt(v.totalYield))}
                  </div>
                  <div className="cyber-mono text-[10px] text-[#666]">USDC</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 合约状态 */}
      <Card className="cyber-panel">
        <CardHeader>
          <h3 className="cyber-mono flex items-center gap-2" style={{ color: '#B080E8' }}>
            <FileText className="w-4 h-4" /> 智能合约状态
          </h3>
        </CardHeader>
        <CardContent className="space-y-2 cyber-mono text-xs">
          <div className="flex justify-between">
            <span className="text-[#666]">CHAIN</span>
            <span className="text-[#00FFCC]">{data.contracts.chain.name} (ID: {data.contracts.chain.id})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">DEPLOYED</span>
            <span className={data.contracts.deployed ? 'text-[#00FFCC]' : 'text-[#FF66AA]'}>
              {data.contracts.deployed ? 'TRUE' : 'PENDING (using mock)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">SUPERADMIN</span>
            <span className="text-[#FFCC00]">{data.contracts.superadmin.slice(0, 12)}...{data.contracts.superadmin.slice(-6)}</span>
          </div>
          <div className="border-t border-[#1a1a1a] pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-[#666]">VesselAuth</span>
              <span className="text-[#0066FF]">{data.contracts.addresses.VesselAuth.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">BudgetFence</span>
              <span className="text-[#0066FF]">{data.contracts.addresses.BudgetFence.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">ContentNFT</span>
              <span className="text-[#0066FF]">{data.contracts.addresses.ContentNFT.slice(0, 12)}...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, unit, icon, color }: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="cyber-panel p-3">
      <div className="cyber-mono text-[10px] text-[#666] flex items-center gap-1 mb-1" style={{ color }}>
        {icon} {label}
      </div>
      <div className="text-xl font-bold" style={{ color, textShadow: `0 0 6px ${color}66` }}>
        {value}
      </div>
      {unit && <div className="cyber-mono text-[10px] text-[#999]">{unit}</div>}
    </div>
  );
}
