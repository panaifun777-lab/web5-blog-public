// ════════════════════════════════════════════════════════════════
// src/lib/web5/ap2/task-browse.ts
// TaskOrder 的公开浏览层 — the public browse layer for one bounty order.
//
// One module owns three decisions so no surface can drift:
//   • the task page URL (`/task/<orderId>`), built from the single site-URL
//     source `SITE_URL` in src/lib/i18n/metadata.ts — never a literal host;
//   • which columns may leave the server. This uses an allow-list Prisma
//     `select`, so `deliverableContent` / `acceptanceHash` cannot leak even by
//     construction — the same trimming philosophy as `publicOrder()` in
//     src/app/api/commerce/tasks/route.ts, taken one step further;
//   • the server-rendered JSON-LD. It is deliberately a `WebPage` +
//     `BreadcrumbList` (+ `ItemList`) graph and NOT a `JobPosting`: Google's
//     `MonetaryAmount`/`baseSalary` requires an ISO-4217 currency and USDC is
//     not one, so bounty pay could only be emitted as plain text, which makes
//     the node incomplete and looks like markup spam. The amount therefore
//     lives in `description` as text.
//
// Demo orders are excluded with `NON_DEMO_ORDER_WHERE` — the single demo
// filter rule in this codebase (see commerce.ts). Never write another one.
// ════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { NON_DEMO_ORDER_WHERE, type OrderStatus } from '@/lib/web5/ap2/commerce';
import { formatArcUsdc, parseArcUsdc } from '@/lib/web5/auth/eip712-types';
import { getActiveChain } from '@/lib/web5/contracts/addresses';
import { SITE_URL, pageMetadata } from '@/lib/i18n/metadata';
import { DEFAULT_LOCALE, type LocaleCode } from '@/lib/i18n/config';
import { localizePath } from '@/lib/i18n/routing';
import { createT } from '@/lib/i18n/translate';

/** Unprefixed route segment for one task; locales add their own prefix. */
export const TASK_ROUTE_BASE = '/task';

/**
 * A bounty an agent can still pick up. Same pair the x402 manifest and the
 * llms.txt open-bounty counter already use, hoisted so the sitemap, the
 * manifests and the page agree.
 */
export const OPEN_BOUNTY_STATUSES: OrderStatus[] = ['FUNDED', 'ASSIGNED'];

/** How many open bounties each public discovery surface lists (newest first). */
export const OPEN_BOUNTY_PREVIEW_LIMIT = 20;

/**
 * Mirrors the `ORDER_ID_RE` the commerce API validates writes against
 * (src/app/api/commerce/tasks/route.ts). A route param that cannot be a real
 * orderId is a 404, not a query.
 */
const TASK_ORDER_ID_RE = /^[A-Za-z0-9._:-]{1,100}$/;

/** Same gateway the article view links to, hoisted so both surfaces match. */
export const ARWEAVE_GATEWAY_BASE = 'https://gateway.irys.xyz';

/**
 * Allow-list projection. Anything not listed here never reaches a public
 * payload, template or manifest — including `deliverableContent`,
 * `acceptanceHash`, `deliverableHash`, `escrowContract`, `disputeReason` and
 * `settlementError`.
 */
export const TASK_PUBLIC_SELECT = {
  orderId: true,
  creatorDid: true,
  title: true,
  description: true,
  bountyUsdc: true,
  status: true,
  escrowTxHash: true,
  payoutTxHash: true,
  feeTxHash: true,
  refundTxHash: true,
  assignedAgentDid: true,
  deliverableArweaveHash: true,
  createdAt: true,
  submittedAt: true,
  verifiedAt: true,
  settlementDueAt: true,
  deliveryDueAt: true,
  settledAt: true,
} satisfies Prisma.TaskOrderSelect;

/** Shape of a row returned by `TASK_PUBLIC_SELECT`. */
export interface TaskOrderPublicRow {
  orderId: string;
  creatorDid: string;
  title: string;
  description: string;
  bountyUsdc: string;
  status: string;
  escrowTxHash: string | null;
  payoutTxHash: string | null;
  feeTxHash: string | null;
  refundTxHash: string | null;
  assignedAgentDid: string | null;
  deliverableArweaveHash: string | null;
  createdAt: Date;
  submittedAt: Date | null;
  verifiedAt: Date | null;
  settlementDueAt: Date | null;
  deliveryDueAt: Date | null;
  settledAt: Date | null;
}

/** Public, locale-independent view of one bounty. Safe for any payload. */
export interface PublicTaskOrder {
  orderId: string;
  /** Absolute canonical URL (default locale) — the field agents were missing. */
  url: string;
  title: string;
  description: string;
  /** Raw decimal string exactly as stored (up to 18 fraction digits). */
  bountyUsdc: string;
  /** Same value, precision-preserving and free of trailing zeros. */
  bountyDisplay: string;
  status: string;
  isOpen: boolean;
  creatorDid: string;
  assignedAgentDid: string | null;
  chainId: number;
  explorer: string;
  createdAt: string;
  createdAtMs: number;
  submittedAt: string | null;
  verifiedAt: string | null;
  settlementDueAt: string | null;
  deliveryDueAt: string | null;
  settledAt: string | null;
  escrowTxHash: string | null;
  payoutTxHash: string | null;
  feeTxHash: string | null;
  refundTxHash: string | null;
  deliverableArweaveHash: string | null;
}

// ── URLs ───────────────────────────────────────────────────────

/** Unprefixed path of one task page: `/task/<orderId>`. */
export function taskPath(orderId: string): string {
  // `ap2-task-<timestamp>-<rand>` is the id this platform generates
  // (commerce.ts) and the form the Telegram broadcaster links to. For it, and
  // for anything `encodeURIComponent` would not change, the id is used verbatim
  // so both surfaces byte-match. Anything else is escaped, so an id can never
  // escape its own path segment.
  const canonical = /^ap2-task-[A-Za-z0-9._-]{1,90}$/.test(orderId);
  const encoded = encodeURIComponent(orderId);
  return `${TASK_ROUTE_BASE}/${canonical || encoded === orderId ? orderId : encoded}`;
}

/**
 * Absolute URL of one task page. The host always comes from `SITE_URL`
 * (`NEXT_PUBLIC_SITE_URL`, also used as `metadataBase`), so a preview or
 * staging deploy never advertises the production host.
 */
export function taskUrl(orderId: string, locale: LocaleCode = DEFAULT_LOCALE): string {
  return `${SITE_URL}${localizePath(taskPath(orderId), locale)}`;
}

/** Explorer transaction link for a hash that is actually on chain. */
export function explorerTxUrl(txHash: string | null | undefined): string | null {
  if (!txHash) return null;
  return `${getActiveChain().explorer}/tx/${txHash}`;
}

/** Permanent-archive link for a deliverable that was actually archived. */
export function arweaveGatewayUrl(hash: string | null | undefined): string | null {
  if (!hash) return null;
  return `${ARWEAVE_GATEWAY_BASE}/${hash}`;
}

// ── formatting ─────────────────────────────────────────────────

/**
 * `bountyUsdc` is a decimal string with up to 18 fraction digits. Round-trip it
 * through the 18-decimal atomic form so display never touches a float, then
 * drop a redundant `.0`. Anything unparseable is shown verbatim rather than
 * silently zeroed.
 */
export function formatBountyUsdc(raw: string | null | undefined): string {
  const value = (raw ?? '').trim();
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) return value;
  try {
    return formatArcUsdc(parseArcUsdc(value)).replace(/\.0$/, '');
  } catch {
    return value;
  }
}

function isoOrNull(value: Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as unknown as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function millis(value: Date | null | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value as unknown as string);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function collapseWhitespace(value: string, max: number): string {
  const flat = (value || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

// ── mapping ────────────────────────────────────────────────────

/** Privacy-preserving projection of a public row. Never re-spread the row. */
export function toPublicTaskOrder(row: TaskOrderPublicRow): PublicTaskOrder {
  const chain = getActiveChain();
  return {
    orderId: row.orderId,
    url: taskUrl(row.orderId),
    title: row.title,
    description: row.description ?? '',
    bountyUsdc: row.bountyUsdc,
    bountyDisplay: formatBountyUsdc(row.bountyUsdc),
    status: row.status,
    isOpen: (OPEN_BOUNTY_STATUSES as string[]).includes(row.status),
    creatorDid: row.creatorDid,
    assignedAgentDid: row.assignedAgentDid ?? null,
    chainId: chain.id,
    explorer: chain.explorer,
    createdAt: isoOrNull(row.createdAt) ?? '',
    createdAtMs: millis(row.createdAt),
    submittedAt: isoOrNull(row.submittedAt),
    verifiedAt: isoOrNull(row.verifiedAt),
    settlementDueAt: isoOrNull(row.settlementDueAt),
    deliveryDueAt: isoOrNull(row.deliveryDueAt),
    settledAt: isoOrNull(row.settledAt),
    escrowTxHash: row.escrowTxHash ?? null,
    payoutTxHash: row.payoutTxHash ?? null,
    feeTxHash: row.feeTxHash ?? null,
    refundTxHash: row.refundTxHash ?? null,
    deliverableArweaveHash: row.deliverableArweaveHash ?? null,
  };
}

// ── queries ────────────────────────────────────────────────────

export function isTaskOrderId(value: unknown): value is string {
  return typeof value === 'string' && TASK_ORDER_ID_RE.test(value.trim());
}

/**
 * Single-order lookup for the public page and metadata. Demo ids and unknown
 * ids both resolve to `null`, which is the page's `notFound()` signal.
 * A database failure is allowed to throw: that is a 500, not a 404.
 */
export async function loadTaskOrder(orderId: string): Promise<TaskOrderPublicRow | null> {
  if (!isTaskOrderId(orderId)) return null;
  return db.taskOrder.findFirst({
    where: { orderId: orderId.trim(), ...NON_DEMO_ORDER_WHERE },
    select: TASK_PUBLIC_SELECT,
  });
}

/** Same lookup, already projected. `null` ⇒ render `notFound()`. */
export async function getPublicTaskOrder(orderId: string): Promise<PublicTaskOrder | null> {
  const row = await loadTaskOrder(orderId);
  return row ? toPublicTaskOrder(row) : null;
}

/**
 * Newest open bounties, for the sitemap, the machine manifests and the
 * related-tasks block. Throws with the database so callers keep their own
 * "discovery surface must not 500" handling.
 */
export async function listOpenTaskOrders(
  limit = OPEN_BOUNTY_PREVIEW_LIMIT
): Promise<PublicTaskOrder[]> {
  const rows = await db.taskOrder.findMany({
    where: { ...NON_DEMO_ORDER_WHERE, status: { in: OPEN_BOUNTY_STATUSES } },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(limit, OPEN_BOUNTY_PREVIEW_LIMIT)),
    select: TASK_PUBLIC_SELECT,
  });
  return rows.map(toPublicTaskOrder);
}

// ── labels & metadata ──────────────────────────────────────────

const STATUS_LABEL_KEYS: Record<string, 'statusFunded' | 'statusAssigned' | 'statusSubmitted' | 'statusVerified' | 'statusRejected' | 'statusDisputed' | 'statusSettling' | 'statusSettled' | 'statusRefunding' | 'statusRefunded'> = {
  FUNDED: 'statusFunded',
  ASSIGNED: 'statusAssigned',
  SUBMITTED: 'statusSubmitted',
  VERIFIED: 'statusVerified',
  REJECTED: 'statusRejected',
  DISPUTED: 'statusDisputed',
  SETTLING: 'statusSettling',
  SETTLED: 'statusSettled',
  REFUNDING: 'statusRefunding',
  REFUNDED: 'statusRefunded',
};

/** Localized state-machine label; an unknown status is shown verbatim. */
export function taskStatusLabel(status: string, locale: LocaleCode = DEFAULT_LOCALE): string {
  const t = createT(locale);
  const key = STATUS_LABEL_KEYS[status];
  return key ? t(`task.${key}`) : status;
}

/** Metadata for one task page, localized and hreflang-complete. */
export async function buildTaskMetadata(
  orderId: string,
  locale: LocaleCode = DEFAULT_LOCALE
): Promise<Metadata> {
  const t = createT(locale);
  const task = await getPublicTaskOrder(orderId);

  if (!task) {
    // Nothing indexable here: keep it out of the index instead of publishing a
    // generic title, and let the page answer 404.
    return { title: t('task.notFoundTitle'), robots: { index: false, follow: true } };
  }

  const status = taskStatusLabel(task.status, locale);
  const title = t('task.metaTitle', { title: task.title, amount: task.bountyDisplay });
  const description = collapseWhitespace(
    t('task.metaDescription', {
      amount: task.bountyDisplay,
      status,
      excerpt: task.description || task.title,
    }),
    160
  );

  // `pageMetadata()` owns canonical + `alternates.languages` exactly the way
  // `/founder` and `/p/<hash>` do, so /task cannot invent its own convention.
  return pageMetadata({
    locale,
    path: taskPath(task.orderId),
    title,
    description,
    ogTitle: title,
    ogDescription: description,
  });
}

// ── JSON-LD ────────────────────────────────────────────────────

/**
 * Sites this page really belongs to. Only same-origin surfaces that exist in
 * this repository — no social channel is claimed here, because none is live
 * for the bounty market yet.
 */
export function taskSameAs(): string[] {
  return [
    `${SITE_URL}/api/commerce/tasks`,
    `${SITE_URL}/api/market/x402-market`,
    `${SITE_URL}/llms.txt`,
    `${SITE_URL}/.well-known/agent.json`,
  ];
}

export interface TaskStructuredDataInput {
  task: PublicTaskOrder;
  /** Sibling open bounties for the `ItemList`; the current one is skipped. */
  related?: PublicTaskOrder[];
  locale?: LocaleCode;
}

/**
 * Server-rendered graph for `/task/<orderId>`: `WebPage` (the honest page node)
 * + `BreadcrumbList` (+ `ItemList` of sibling open bounties).
 *
 * Deliberately absent: `JobPosting`, `baseSalary`, `MonetaryAmount`,
 * `priceCurrency` — USDC has no ISO-4217 code, so a monetary typed node would
 * be invalid markup. The bounty is plain text inside `description`.
 */
export function taskStructuredData({
  task,
  related = [],
  locale = DEFAULT_LOCALE,
}: TaskStructuredDataInput): Record<string, unknown> {
  const t = createT(locale);
  const status = taskStatusLabel(task.status, locale);
  const url = taskUrl(task.orderId, locale);
  const updated = task.settledAt || task.verifiedAt || task.submittedAt || task.createdAt;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': url,
      url,
      name: t('task.metaTitle', { title: task.title, amount: task.bountyDisplay }),
      // Plain text on purpose: `{amount} USDC` is copy, not a MonetaryAmount.
      description: t('task.schemaDescription', {
        amount: task.bountyDisplay,
        status,
        orderId: task.orderId,
        description: collapseWhitespace(task.description || task.title, 300),
      }),
      identifier: task.orderId,
      datePublished: task.createdAt,
      dateModified: updated,
      inLanguage: locale,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      publisher: { '@id': `${SITE_URL}/#person` },
      sameAs: taskSameAs(),
      about: [
        { '@type': 'Thing', name: 'AP2 bounty task' },
        { '@type': 'Thing', name: 'USDC on Circle Arc' },
        { '@type': 'Thing', name: `Arc chain ${task.chainId}` },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: t('task.breadcrumbHome'),
          item: `${SITE_URL}${localizePath('/', locale)}`,
        },
        { '@type': 'ListItem', position: 2, name: task.title },
      ],
    },
  ];

  const siblings = related.filter((item) => item.orderId !== task.orderId).slice(0, 10);
  if (siblings.length > 0) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#open-bounties`,
      name: t('task.relatedTitle'),
      numberOfItems: siblings.length,
      itemListElement: siblings.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: item.url,
        name: item.title,
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
