'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/reach/opportunity-radar.tsx
// 外部劳务机会雷达 — 真实抓取结果 + 推荐分 + 一键导入站内悬赏
// ════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Radar, RefreshCw, ExternalLink, ArrowDownToLine, Loader2,
  Flame, Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Opp {
  id: string;
  source: string;
  title: string;
  organization: string | null;
  url: string;
  description: string | null;
  rewardText: string | null;
  rewardUsdc: number | null;
  tags: string[];
  matchScore: number;
  matchReasons: string[];
  publishedAt: string | null;
  fetchedAt: string;
  status: string;
}

const SOURCE_LABEL: Record<string, string> = {
  github: 'GitHub Bounty',
  remotive: 'Remotive',
  arbeitnow: 'Arbeitnow',
  jobicy: 'Jobicy',
  remoteok: 'RemoteOK',
};

export function OpportunityRadar({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  const [items, setItems] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reach/opportunities?limit=12', {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      /* 忽略 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const crawl = async () => {
    setCrawling(true);
    setMsg(null);
    try {
      const res = await fetch('/api/reach/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 12 }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(
          isEn
            ? `Fetched ${data.fetched} · new ${data.inserted} · updated ${data.updated}`
            : `抓取 ${data.fetched} 条 · 新增 ${data.inserted} · 更新 ${data.updated}`
        );
        await load();
      } else {
        setMsg(data.error || '抓取失败');
      }
    } catch (e: any) {
      setMsg(e?.message || '抓取失败');
    } finally {
      setCrawling(false);
      setTimeout(() => setMsg(null), 6000);
    }
  };

  const importToBounty = async (id: string) => {
    setImportingId(id);
    try {
      const res = await fetch('/api/reach/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setMsg(data.message || data.error || '已处理');
      await load();
    } catch (e: any) {
      setMsg(e?.message || '导入失败');
    } finally {
      setImportingId(null);
      setTimeout(() => setMsg(null), 6000);
    }
  };

  const shown = compact ? items.slice(0, 4) : items;

  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-[#00FFCC] animate-pulse" />
            <span className="text-xs font-bold text-white font-mono tracking-wider">
              {isEn ? 'GLOBAL LABOR OPPORTUNITY RADAR' : '全球劳务机会雷达'}
            </span>
            <Badge className="bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30 text-[9px] py-0 h-4">
              LIVE
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={crawl}
            disabled={crawling}
            className="h-7 px-2 text-[11px] text-[#00FFCC] hover:bg-[#00FFCC]/10"
          >
            {crawling ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            {isEn ? 'Crawl Now' : '立即抓取'}
          </Button>
        </div>

        {msg && (
          <div className="mb-2 text-[11px] font-mono text-[#FFCC00] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {msg}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#666]">
            <AlertTriangle className="w-5 h-5 mx-auto mb-2 opacity-40" />
            {isEn
              ? 'No opportunities yet. Click "Crawl Now" to fetch live listings.'
              : '暂无机会数据。点击「立即抓取」从公开源实时拉取。'}
          </div>
        ) : (
          <div className="space-y-2">
            {shown.map((op) => (
              <div
                key={op.id}
                className="p-2.5 rounded-lg bg-black/40 border border-white/[0.05] hover:border-[#00FFCC]/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-white leading-snug line-clamp-2">
                      {op.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[9px] font-mono text-[#777]">
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[#00FFCC]">
                        {SOURCE_LABEL[op.source] || op.source}
                      </span>
                      {op.organization && <span className="truncate max-w-[110px]">{op.organization}</span>}
                      {op.tags.includes('proposed') ? (
                        <span
                          className="text-[#F59E0B] flex items-center gap-0.5"
                          title={op.rewardText || undefined}
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {isEn ? 'Proposed amount (unconfirmed)' : '提案金额（未确认）'}
                        </span>
                      ) : op.rewardUsdc ? (
                        <span className="text-[#FFCC00] flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> {op.rewardUsdc} USDC
                        </span>
                      ) : (
                        op.rewardText && <span className="text-[#FFCC00]">{op.rewardText.slice(0, 18)}</span>
                      )}
                    </div>
                    {op.matchReasons.length > 0 && (
                      <div className="mt-1 text-[9px] text-[#555] font-mono truncate">
                        {op.matchReasons.slice(0, 2).join(' · ')}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge
                      className={`text-[9px] py-0 h-4 border font-mono ${
                        op.matchScore >= 70
                          ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                          : op.matchScore >= 45
                            ? 'bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30'
                            : 'bg-white/[0.05] text-[#888] border-white/[0.1]'
                      }`}
                    >
                      {op.matchScore}
                    </Badge>
                    <div className="flex gap-1">
                      <a
                        href={op.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-white/[0.08] text-[#888] hover:text-white"
                        title={isEn ? 'Open source' : '查看来源'}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {op.source === 'github' && op.status === 'OPEN' && !op.tags.includes('proposed') && (
                        <button
                          onClick={() => importToBounty(op.id)}
                          disabled={importingId === op.id}
                          className="p-1 rounded hover:bg-[#00FFCC]/15 text-[#888] hover:text-[#00FFCC]"
                          title={isEn ? 'Import as on-site bounty' : '导入为站内悬赏'}
                        >
                          {importingId === op.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ArrowDownToLine className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-[#555]">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {isEn ? 'Sources: GitHub · Remotive · Jobicy · RemoteOK' : '数据源：GitHub · Remotive · Jobicy · RemoteOK'}
          </span>
          <span>{items.length} {isEn ? 'items' : '条'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
