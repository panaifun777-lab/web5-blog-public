'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/settings/settings-panel.tsx
// 设置面板 — Prime 配置 / 邀请码 / 合约地址 / VPS 配置建议
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings, Shield, Ticket, Link2, Server, Copy,
  Check, AlertCircle, Cpu, Database,
} from 'lucide-react';
import type { VesselSession } from '@/lib/web5/types';
import { ADDRESSES, CHAIN, SUPERADMIN, CONTRACTS_DEPLOYED } from '@/lib/web5/contracts/addresses';

export function SettingsPanel({ session }: { session: VesselSession | null }) {
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/explore?section=invite-codes')
      .then((r) => r.json())
      .then((data) => setInviteCodes(data.codes || []))
      .catch(() => {});
  }, []);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold cyber-text-glow-cyan mb-4">设置</h2>

      <Tabs defaultValue="account" className="space-y-3">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-black/40">
          <TabsTrigger value="account" className="cyber-mono data-[state=active]:bg-[#00FFCC]/10 data-[state=active]:text-[#00FFCC]">
            <Shield className="w-3 h-3 mr-1" /> 账户
          </TabsTrigger>
          <TabsTrigger value="invite" className="cyber-mono data-[state=active]:bg-[#FFCC00]/10 data-[state=active]:text-[#FFCC00]">
            <Ticket className="w-3 h-3 mr-1" /> 邀请码
          </TabsTrigger>
          <TabsTrigger value="contracts" className="cyber-mono data-[state=active]:bg-[#0066FF]/10 data-[state=active]:text-[#0066FF]">
            <Link2 className="w-3 h-3 mr-1" /> 合约
          </TabsTrigger>
          <TabsTrigger value="vps" className="cyber-mono data-[state=active]:bg-[#B080E8]/10 data-[state=active]:text-[#B080E8]">
            <Server className="w-3 h-3 mr-1" /> VPS
          </TabsTrigger>
        </TabsList>

        {/* 账户 */}
        <TabsContent value="account">
          <Card className="cyber-panel">
            <CardHeader>
              <h3 className="cyber-mono cyber-text-glow-cyan flex items-center gap-2">
                <Shield className="w-4 h-4" /> PRIME 账户
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {session ? (
                <>
                  <Field label="PRIME DID" value={session.primeDid} color="#FFCC00" mono copyable onCopy={() => copy(session.primeDid, 'prime')} copied={copied === 'prime'} />
                  <Field label="EIDOLON DID" value={session.eidolonDid} color="#B080E8" mono copyable onCopy={() => copy(session.eidolonDid, 'eidolon')} copied={copied === 'eidolon'} />
                  <Field label="VESSEL DID" value={session.vesselDid} color="#00FFCC" mono copyable onCopy={() => copy(session.vesselDid, 'vessel')} copied={copied === 'vessel'} />
                  <Field label="ACCESS MODE" value={session.accessMode.toUpperCase()} color={session.accessMode === 'vessel' ? '#00FFCC' : '#FF66AA'} />
                  <Field label="PERMISSIONS" value={session.permissions.join(', ')} color="#0066FF" />
                  <Field label="EXPIRES AT" value={new Date(session.expiresAt).toLocaleString('zh-CN')} color="#999" />
                </>
              ) : (
                <div className="text-center text-[#666] py-4">
                  请先唤醒容器
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 邀请码 */}
        <TabsContent value="invite">
          <Card className="cyber-panel">
            <CardHeader>
              <h3 className="cyber-mono cyber-text-glow-gold flex items-center gap-2">
                <Ticket className="w-4 h-4" /> 邀请码（Alpha 测试）
              </h3>
            </CardHeader>
            <CardContent className="space-y-2">
              {inviteCodes.length === 0 ? (
                <div className="text-center text-[#666] py-4">加载中...</div>
              ) : (
                inviteCodes.map((c) => (
                  <div key={c.code} className="border border-[#1a1a1a] p-3 rounded flex items-center justify-between">
                    <div>
                      <div className="cyber-mono text-sm text-[#FFCC00] font-bold">{c.code}</div>
                      <div className="cyber-mono text-xs text-[#666]">
                        {c.usedCount}/{c.maxUses} 已使用
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copy(c.code, c.code)}
                      className="cyber-mono text-xs"
                    >
                      {copied === c.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                ))
              )}
              <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-3 mt-3">
                ▸ 邀请码用于 Alpha 测试期间的访问控制
                <br />▸ Observer Mode 用户使用邀请码可优先唤醒容器
                <br />▸ 每个邀请码最多 10 次使用
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 合约 */}
        <TabsContent value="contracts">
          <Card className="cyber-panel">
            <CardHeader>
              <h3 className="cyber-mono cyber-text-glow-blue flex items-center gap-2">
                <Link2 className="w-4 h-4" /> 智能合约（Base Sepolia）
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={CONTRACTS_DEPLOYED ? 'cyber-border-cyan text-[#00FFCC]' : 'border-[#FF66AA]/30 text-[#FF66AA]'}>
                  {CONTRACTS_DEPLOYED ? 'DEPLOYED' : 'PENDING'}
                </Badge>
                <span className="cyber-mono text-xs text-[#666]">
                  {CHAIN.name} · Chain ID {CHAIN.id}
                </span>
              </div>

              <Field label="飘叔 (SUPERADMIN)" value={SUPERADMIN} color="#FFCC00" mono copyable onCopy={() => copy(SUPERADMIN, 'admin')} copied={copied === 'admin'} />
              <Field label="VesselAuth" value={ADDRESSES.VesselAuth} color="#00FFCC" mono copyable onCopy={() => copy(ADDRESSES.VesselAuth, 'va')} copied={copied === 'va'} />
              <Field label="BudgetFence" value={ADDRESSES.BudgetFence} color="#0066FF" mono copyable onCopy={() => copy(ADDRESSES.BudgetFence, 'bf')} copied={copied === 'bf'} />
              <Field label="ContentNFT" value={ADDRESSES.ContentNFT} color="#B080E8" mono copyable onCopy={() => copy(ADDRESSES.ContentNFT, 'cn')} copied={copied === 'cn'} />

              <div className="cyber-mono text-xs text-[#666] border-t border-[#1a1a1a] pt-3 mt-3">
                <div className="mb-2">▸ 浏览器:</div>
                <a
                  href={CHAIN.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0066FF] hover:underline"
                >
                  {CHAIN.explorer}
                </a>
              </div>

              {!CONTRACTS_DEPLOYED && (
                <div className="cyber-panel border-[#FF66AA]/30 p-3 text-xs">
                  <div className="flex items-center gap-2 text-[#FF66AA] mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-bold">合约未部署</span>
                  </div>
                  <div className="text-[#999]">
                    当前使用模拟实现。部署步骤见：<br />
                    <code className="text-[#00FFCC]">/home/z/my-project/contracts/README.md</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VPS 配置 */}
        <TabsContent value="vps">
          <Card className="cyber-panel">
            <CardHeader>
              <h3 className="cyber-mono flex items-center gap-2" style={{ color: '#B080E8' }}>
                <Server className="w-4 h-4" /> VPS 配置建议
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <VPSConfig
                tier="入门（MVP 测试）"
                specs={['2 vCPU', '4GB RAM', '80GB SSD', 'Ubuntu 22.04 LTS']}
                cost="~$10/月"
                suitable="10-50 用户，开发与测试"
                color="#00FFCC"
              />
              <VPSConfig
                tier="标准（Beta 公测）"
                specs={['4 vCPU', '8GB RAM', '160GB SSD', 'Ubuntu 22.04 LTS']}
                cost="~$25/月"
                suitable="100-500 用户，AP2 微支付测试"
                color="#0066FF"
              />
              <VPSConfig
                tier="生产（GA 上线）"
                specs={['8 vCPU', '16GB RAM', '320GB NVMe', 'Ubuntu 24.04 LTS']}
                cost="~$60/月"
                suitable="1000+ 用户，合约节点 + 索引器"
                color="#FFCC00"
              />
              <VPSConfig
                tier="高可用（集群）"
                specs={['3 × 8 vCPU', '3 × 32GB RAM', '负载均衡', 'Kubernetes']}
                cost="~$200/月"
                suitable="10000+ 用户，多区域部署"
                color="#FF66AA"
              />

              <div className="cyber-panel border-[#1a1a1a] p-3">
                <div className="cyber-mono text-xs text-[#666] mb-2">部署清单</div>
                <div className="space-y-1 cyber-mono text-xs text-[#999]">
                  <div>▸ Node.js 20+ / Bun 1.1+</div>
                  <div>▸ PostgreSQL 15+（生产）或 SQLite（开发）</div>
                  <div>▸ Redis 7+（可选，缓存层）</div>
                  <div>▸ Foundry（合约编译部署）</div>
                  <div>▸ Nginx / Caddy（反向代理 + SSL）</div>
                  <div>▸ PM2 / systemd（进程管理）</div>
                  <div>▸ 防火墙：仅开放 80/443 端口</div>
                </div>
              </div>

              <div className="cyber-panel border-[#1a1a1a] p-3">
                <div className="cyber-mono text-xs text-[#666] mb-2">推荐供应商</div>
                <div className="grid grid-cols-2 gap-2 cyber-mono text-xs">
                  <div className="text-[#00FFCC]">DigitalOcean</div>
                  <div className="text-[#999]">简单易用，全球节点</div>
                  <div className="text-[#00FFCC]">Vultr</div>
                  <div className="text-[#999]">按小时计费</div>
                  <div className="text-[#00FFCC]">Hetzner</div>
                  <div className="text-[#999]">性价比最高（欧洲）</div>
                  <div className="text-[#00FFCC]">AWS EC2</div>
                  <div className="text-[#999]">企业级，生态完整</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, color, mono, copyable, onCopy, copied }: {
  label: string;
  value: string;
  color: string;
  mono?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="cyber-mono text-xs text-[#666] whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
        <span className={`${mono ? 'cyber-mono' : ''} text-xs truncate`} style={{ color }}>
          {value}
        </span>
        {copyable && (
          <button onClick={onCopy} className="text-[#666] hover:text-[#00FFCC]">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

function VPSConfig({ tier, specs, cost, suitable, color }: {
  tier: string;
  specs: string[];
  cost: string;
  suitable: string;
  color: string;
}) {
  return (
    <div className="border border-[#1a1a1a] p-3 rounded">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-sm" style={{ color }}>{tier}</span>
        <span className="cyber-mono text-xs text-[#FFCC00]">{cost}</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {specs.map((s) => (
          <span key={s} className="cyber-mono text-[10px] px-2 py-0.5 border border-[#1a1a1a] text-[#999]">
            {s}
          </span>
        ))}
      </div>
      <div className="cyber-mono text-xs text-[#666]">{suitable}</div>
    </div>
  );
}
