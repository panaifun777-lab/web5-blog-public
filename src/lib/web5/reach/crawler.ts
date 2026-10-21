// ════════════════════════════════════════════════════════════════
// src/lib/web5/reach/crawler.ts
// 外部劳务机会真实抓取器 — 多源聚合 + 归一化 + 去重
//
// 数据源（全部公开、无需 API Key）：
//   1. GitHub Search API    — label:bounty 的开放 issue（真实赏金任务）
//   2. Remotive             — 远程技术岗位 API
//   3. Arbeitnow            — 欧洲/全球远程岗位
//   4. RemoteOK             — 全球远程岗位（UA 敏感，失败自动跳过）
//
// 设计约束：单源失败不影响整体；所有请求带超时；结果统一归一化为 RawOpportunity。
// ════════════════════════════════════════════════════════════════

export interface RawOpportunity {
  source: 'github' | 'remotive' | 'jobicy' | 'remoteok';
  externalId: string;
  title: string;
  organization?: string;
  url: string;
  description?: string;
  rewardText?: string;
  rewardUsdc?: number;
  tags: string[];
  remote: boolean;
  publishedAt?: Date;
}

const UA = 'Web5Blog-ResearchBot/1.0 (+https://web5.blog; contact: web5.blog)';

async function fetchJson(url: string, timeoutMs = 8000): Promise<any | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
      },
      signal: ac.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[crawler] ${url} -> HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    console.warn(`[crawler] ${url} -> ${e?.message || 'failed'}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 从自由文本中抽取 USDC 参考金额 */
export function parseReward(text?: string): number | undefined {
  if (!text) return undefined;
  const s = text.replace(/,/g, '');
  // $1,500 / 1500 USD / 2000 USDC / 50 USDC
  const m =
    s.match(/(\d+(?:\.\d+)?)\s*(usdc|usd|\$)/i) ||
    s.match(/\$\s*(\d+(?:\.\d+)?)/) ||
    s.match(/(\d+(?:\.\d+)?)\s*(eur|€)/i);
  if (!m) return undefined;
  const v = parseFloat(m[1]);
  if (!isFinite(v) || v <= 0 || v > 5_000_000) return undefined;
  return v;
}

// ── 1. GitHub bounty issues ───────────────────────────────────

async function crawlGitHub(limit = 15): Promise<RawOpportunity[]> {
  const queries = [
    'label:bounty state:open type:issue',
    '"bounty" in:title state:open type:issue',
  ];
  const out: RawOpportunity[] = [];

  for (const q of queries) {
    const url =
      'https://api.github.com/search/issues?q=' +
      encodeURIComponent(q) +
      `&sort=created&order=desc&per_page=${limit}`;
    const data = await fetchJson(url);
    if (!data?.items) continue;

    for (const it of data.items) {
      const labels: string[] = (it.labels || []).map((l: any) =>
        typeof l === 'string' ? l : l.name
      );
      const bodyText: string = it.body || '';
      const rewardText =
        labels.find((l) => /\$|usd|usdc|bounty/i.test(l)) ||
        (bodyText.match(/\$[\d,]+(?:\.\d+)?/)?.[0] ?? undefined);

      out.push({
        source: 'github',
        externalId: String(it.id),
        title: it.title,
        organization: it.repository_url?.split('/').slice(-2).join('/'),
        url: it.html_url,
        description: (bodyText || '').slice(0, 600),
        rewardText,
        rewardUsdc: parseReward(rewardText) ?? parseReward(bodyText),
        tags: labels.slice(0, 8),
        remote: true,
        publishedAt: it.created_at ? new Date(it.created_at) : undefined,
      });
    }
  }
  return out;
}

// ── 2. Remotive ───────────────────────────────────────────────

async function crawlRemotive(limit = 15): Promise<RawOpportunity[]> {
  const data = await fetchJson(
    `https://remotive.com/api/remote-jobs?limit=${limit}`
  );
  if (!Array.isArray(data?.jobs)) return [];

  return data.jobs.slice(0, limit).map((j: any) => ({
    source: 'remotive' as const,
    externalId: String(j.id),
    title: j.title,
    organization: j.company_name,
    url: j.url,
    description: String(j.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 600),
    rewardText: j.salary || undefined,
    rewardUsdc: parseReward(j.salary),
    tags: [j.category, ...(j.tags || [])].filter(Boolean).slice(0, 8),
    remote: true,
    publishedAt: j.publication_date ? new Date(j.publication_date) : undefined,
  }));
}

// ── 3. Jobicy ────────────────────────────────────────────────

async function crawlJobicy(limit = 15): Promise<RawOpportunity[]> {
  const data = await fetchJson(
    `https://jobicy.com/api/v2/remote-jobs?count=${limit}`
  );
  if (!Array.isArray(data?.jobs)) return [];

  return data.jobs.slice(0, limit).map((j: any) => ({
    source: 'jobicy' as const,
    externalId: String(j.id),
    title: j.jobTitle,
    organization: j.companyName,
    url: j.url,
    description: String(j.jobExcerpt || j.jobDescription || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 600),
    rewardText:
      j.annualSalaryMin && j.annualSalaryMax
        ? `$${j.annualSalaryMin}-${j.annualSalaryMax} ${j.salaryCurrency || 'USD'}`
        : undefined,
    rewardUsdc: j.annualSalaryMin
      ? parseReward(String(j.annualSalaryMin))
      : undefined,
    tags: [j.jobIndustry, j.jobType, ...(j.jobLevel || [])]
      .filter(Boolean)
      .map(String)
      .slice(0, 8),
    remote: true,
    publishedAt: j.pubDate ? new Date(j.pubDate) : undefined,
  }));
}

// ── 4. RemoteOK ──────────────────────────────────────────────

async function crawlRemoteOK(limit = 10): Promise<RawOpportunity[]> {
  const data = await fetchJson('https://remoteok.com/api', 7000);
  if (!Array.isArray(data)) return [];

  return data
    .filter((j: any) => j.id && j.position)
    .slice(0, limit)
    .map((j: any) => ({
      source: 'remoteok' as const,
      externalId: String(j.id),
      title: j.position,
      organization: j.company,
      url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
      description: String(j.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 600),
      rewardText:
        j.salary_min && j.salary_max
          ? `$${j.salary_min}-${j.salary_max}`
          : undefined,
      rewardUsdc: j.salary_min ? parseReward(String(j.salary_min)) : undefined,
      tags: (j.tags || []).slice(0, 8),
      remote: true,
      publishedAt: j.date ? new Date(j.date) : undefined,
    }));
}

/** 非货币报酬声明特征（避免把象征性积分当成真实赏金） */
const NON_MONETARY_HINTS = [
  'no money',
  'no financial payment',
  'non-monetary',
  'not a payment',
  'symbolic',
  'not be involved or paid',
  '0.00 eur',
  'compute-reciprocity',
  'no cryptocurrency',
];

/** 提案金额特征：尚未确认的报价，不能当作真实赏金展示或托管 */
const PROPOSED_HINTS = [
  'bounty proposal',
  'proposed bounty',
  'proposed amount',
  'proposed reward',
  'proposed prize',
  'proposed payment',
  'not an existing award',
  'amount to be confirmed',
  'payment to be confirmed',
];
const PROPOSED_AMOUNT_RE = /\$\s?\d[\d,.]*\s*(?:usd|usdc|eur)?\s*(?:is\s+)?proposed\b/i;
const PROPOSAL_TITLE_RE = /\b(?:bounty|reward|prize)\s+proposal\b/i;

/** 判定一条机会的报酬是否为真实货币 */
export function isMonetaryReward(op: RawOpportunity): boolean {
  const hay = `${op.title} ${op.description || ''} ${op.rewardText || ''}`.toLowerCase();
  return !NON_MONETARY_HINTS.some((h) => hay.includes(h));
}

/** 判定报酬金额是否只是“提案金额”（未确认） */
export function isProposedReward(
  op: { title: string; description?: string | null; rewardText?: string | null; tags?: string[] }
): boolean {
  if ((op.tags || []).includes('proposed')) return true;
  const hay = `${op.title} ${op.description || ''} ${op.rewardText || ''}`;
  return (
    PROPOSED_AMOUNT_RE.test(hay) ||
    PROPOSAL_TITLE_RE.test(hay) ||
    PROPOSED_HINTS.some((h) => hay.toLowerCase().includes(h))
  );
}

/** 清洗：非货币 / 未确认提案一律置空 rewardUsdc，保留原始文本供人判断 */
export function sanitizeReward(op: RawOpportunity): RawOpportunity {
  const tags = [...(op.tags || [])];
  let rewardUsdc = op.rewardUsdc;

  if (!isMonetaryReward(op)) {
    rewardUsdc = undefined;
    if (!tags.includes('non-monetary')) tags.push('non-monetary');
  }
  if (isProposedReward(op)) {
    rewardUsdc = undefined;
    if (!tags.includes('proposed')) tags.push('proposed');
  }

  if (rewardUsdc === op.rewardUsdc && tags.length === (op.tags || []).length) {
    return op;
  }
  return { ...op, rewardUsdc, tags: tags.slice(0, 10) };
}

/** 并发抓取全部源，任一失败不影响其他 */
export async function crawlAllSources(perSourceLimit = 12): Promise<{
  items: RawOpportunity[];
  stats: Record<string, number>;
  errors: string[];
}> {
  const jobs: Array<[string, () => Promise<RawOpportunity[]>]> = [
    ['github', () => crawlGitHub(perSourceLimit)],
    ['remotive', () => crawlRemotive(perSourceLimit)],
    ['jobicy', () => crawlJobicy(perSourceLimit)],
    ['remoteok', () => crawlRemoteOK(Math.min(8, perSourceLimit))],
  ];

  const stats: Record<string, number> = {};
  const errors: string[] = [];
  const items: RawOpportunity[] = [];

  const settled = await Promise.allSettled(jobs.map(([, fn]) => fn()));

  settled.forEach((r, i) => {
    const name = jobs[i][0];
    if (r.status === 'fulfilled') {
      stats[name] = r.value.length;
      items.push(...r.value);
    } else {
      stats[name] = 0;
      errors.push(`${name}: ${r.reason?.message || 'failed'}`);
    }
  });

  // 去重（源 + 外部 ID）+ 非货币报酬清洗
  const seen = new Set<string>();
  const unique = items
    .filter((it) => {
      const key = `${it.source}:${it.externalId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(sanitizeReward);

  return { items: unique, stats, errors };
}
