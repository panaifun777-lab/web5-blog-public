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
  TrendingUp, Clock, AlertCircle, Bell, Share2,
} from 'lucide-react';

function toBigInt(v: any): bigint {
  if (typeof v === 'bigint') return v;
  if (v && typeof v === 'object' && v.__bigint !== undefined) return BigInt(v.__bigint);
  if (typeof v === 'string') return BigInt(v);
  if (typeof v === 'number') return BigInt(v);
  return 0n;
}

export function MyVessels({ session }: { session: VesselSession }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ unreadCount: number; alerts: any[] }>({ unreadCount: 0, alerts: [] });
  const [distroStats, setDistroStats] = useState<any>(null);
  const [refStats, setRefStats] = useState<any>(null);

  const load = useCallback(async () => {
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
  }, [session.vesselDid]);

  useEffect(() => {
    load();
  }, [load]);

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
                +{fromTokenUnits(totalYield)}
              </div>
              <div className="cyber-mono text-xs text-[#666]">USDC</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 模块详细 */}
      <Tabs defaultValue="treasury" className="space-y-3">
        <TabsList className="grid grid-cols-4 gap-2 bg-black/40">
          <TabsTrigger value="treasury" className="cyber-mono data-[state=active]:bg-[#0066FF]/10 data-[state=active]:text-[#0066FF]">
            <Coins className="w-3 h-3 mr-1" /> 财务
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
