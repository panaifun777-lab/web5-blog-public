// ════════════════════════════════════════════════════════════════
// src/lib/web5/reach/radar.ts
// Agent-Reach 实时雷达 — 从真实抓取结果读取推荐机会
// 不再使用任何硬编码假数据；抓取源见 ./crawler.ts
// ════════════════════════════════════════════════════════════════

export interface TrendingInsight {
  topic: string;
  source: string;
  heatScore: number;
  summary: string;
  category: 'tech' | 'humanities' | 'defi' | 'agent';
  url?: string;
}

function categoryOf(source: string, tags: string[]): TrendingInsight['category'] {
  const h = `${source} ${tags.join(' ')}`.toLowerCase();
  if (/(agent|ai|llm|prompt)/.test(h)) return 'agent';
  if (/(defi|crypto|web3|blockchain|wallet)/.test(h)) return 'defi';
  if (/(research|writing|translation|philosoph)/.test(h)) return 'humanities';
  return 'tech';
}

/**
 * 读取已入库的真实外部机会（推荐分排序），供写作灵感与机会面板使用。
 * 若无数据，可选择触发一次抓取。
 */
export async function scanAgentReachRadar(opts?: {
  limit?: number;
  triggerCrawlIfEmpty?: boolean;
}): Promise<TrendingInsight[]> {
  const limit = opts?.limit ?? 6;

  const read = async (): Promise<TrendingInsight[]> => {
    const res = await fetch(`/api/reach/opportunities?limit=${limit}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.items || [];
    return items.map((it: any) => ({
      topic: it.title,
      source: `${it.organization || it.source}`.slice(0, 40),
      heatScore: Math.round(it.matchScore || 0),
      summary: (it.description || it.rewardText || '').slice(0, 120),
      category: categoryOf(it.source, it.tags || []),
      url: it.url,
    }));
  };

  try {
    let items = await read();

    if (items.length === 0 && opts?.triggerCrawlIfEmpty !== false) {
      await fetch('/api/reach/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 12 }),
      }).catch(() => {});
      items = await read();
    }

    return items.sort((a, b) => b.heatScore - a.heatScore);
  } catch (err) {
    console.warn('[Agent-Reach] 读取失败:', err);
    return [];
  }
}

/** 手动触发一次全源抓取 */
export async function triggerReachCrawl(payload?: {
  skills?: string[];
  limit?: number;
}): Promise<any> {
  const res = await fetch('/api/reach/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || { limit: 12 }),
  });
  if (!res.ok) throw new Error(`抓取失败: ${res.status}`);
  return res.json();
}
