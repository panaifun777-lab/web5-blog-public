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
  Trophy, Ticket, RefreshCw, Globe, ArrowUpRight, Briefcase,
} from 'lucide-react';
import { GLOBAL_REMOTE_JOBS } from '@/lib/web5/ap2/remote-jobs';

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
            <span className="text-[#666]">飘叔 (SUPERADMIN)</span>
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

      {/* NFT 市场 */}
      <MarketplaceSection />

      {/* 全球自由劳务与工作机会精选 */}
      <GlobalRemoteJobsSection />
    </div>
  );
}

function GlobalRemoteJobsSection() {
  return (
    <Card className="cyber-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="cyber-mono text-[#00FFCC] flex items-center gap-2">
            <Globe className="w-4 h-4" /> 全球自由劳务与工作机会精选
          </h3>
          <Badge variant="outline" className="border-[#00FFCC]/50 text-[#00FFCC]">
            {GLOBAL_REMOTE_JOBS.length} 岗位在招
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {GLOBAL_REMOTE_JOBS.map((job) => (
            <div
              key={job.id}
              className="border border-[#1a1a1a] p-3 rounded-lg hover:border-[#00FFCC]/40 transition-colors bg-black/40 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-sm font-bold text-white line-clamp-1">{job.title}</h4>
                  <Badge className="bg-[#FFCC00]/15 text-[#FFCC00] text-[10px] flex-shrink-0 font-mono">
                    {job.budgetUsdc} U/{job.rateType === 'monthly' ? '月' : job.rateType === 'hourly' ? '时' : '单'}
                  </Badge>
                </div>
                <div className="text-[10px] text-[#00FFCC] font-mono flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" />
                  <span>{job.company}</span>
                  <span className="text-[#555]">·</span>
                  <span className="text-[#888]">{job.location}</span>
                </div>
                <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                  {job.description}
                </p>
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#B080E8]/10 text-[#B080E8] border border-[#B080E8]/20 font-mono">
                    {job.type}
                  </span>
                  {job.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[#777] border border-white/[0.06] font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] pt-2 mt-2 border-t border-white/[0.04]">
                <span className="text-[#555] font-mono">来源: {job.source}</span>
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00FFCC] hover:underline flex items-center gap-0.5 font-bold"
                >
                  申请投递 <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MarketplaceSection() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketplace/list').then(r => r.json()).then(d => {
      if (d.listings) setListings(d.listings);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="cyber-loading-bar h-24 rounded" />;
  }

  if (listings.length === 0) {
    return (
      <Card className="cyber-panel">
        <CardHeader>
          <h3 className="cyber-mono cyber-text-glow-gold flex items-center gap-2">
            <Coins className="w-4 h-4" /> Content NFT 市场
          </h3>
        </CardHeader>
        <CardContent>
          <div className="text-center text-[#666] py-4 cyber-mono text-sm">
            暂无已铸造 NFT 上线交易
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cyber-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="cyber-mono cyber-text-glow-gold flex items-center gap-2">
            <Coins className="w-4 h-4" /> Content NFT 市场
          </h3>
          <Badge variant="outline" className="border-[#FFCC00]/50 text-[#FFCC00]">{listings.length} 个在售</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {listings.slice(0, 6).map((nft: any) => (
            <div key={nft.id} className="border border-[#1a1a1a] p-3 rounded hover:border-[#FFCC00]/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-bold text-[#ddd] truncate flex-1">{nft.title}</h4>
                {nft.forSale && <Badge className="bg-[#FFCC00]/10 text-[#FFCC00] text-[10px]">{nft.price} USDC</Badge>}
              </div>
              <p className="text-xs text-[#666] mb-2 line-clamp-2">{nft.excerpt || '—'}</p>
              <div className="flex justify-between text-[10px] cyber-mono">
                <span className="text-[#B080E8]">版税 {nft.royaltyRate / 100}%</span>
                <span className="text-[#0066FF]">Token #{nft.tokenId?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between text-[10px] cyber-mono mt-1">
                <span className="text-[#999]">{nft.authorName}</span>
                <span className="text-[#666]">{nft.license}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
