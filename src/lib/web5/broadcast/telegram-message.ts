// ════════════════════════════════════════════════════════════════
// src/lib/web5/broadcast/telegram-message.ts
// Telegram channel broadcast copy for bounty orders.
//
// Pure module: no Prisma, no fetch, no clock reads other than the optional
// `nowMs` argument. Everything here is deterministic so it unit-tests without
// a DB or network (same split as src/lib/web5/payments/hot-wallet.ts).
//
// Correctness rules this file owns:
//  1. Telegram `parse_mode: "HTML"` supports only b i u s a code pre
//     blockquote tg-s span. Every user-authored field (title, description)
//     passes through escapeTelegramHtml(), which escapes `&`, `<` and `>`.
//     Escaping only `&` and `"` (as the naive snippet did) makes Telegram
//     answer HTTP 400 for any description containing `<`. All markup in the
//     output comes from THIS template, never from the order.
//  2. The reward is stated from the 18-decimal string via the bigint USDC
//     helpers (hot-wallet.ts), never Number(). An unparsable amount renders
//     `rewardUsdc: null` and no money claim at all.
//  3. Escrow is never claimed unless the row carries a syntactically valid
//     escrowTxHash; the truthful line is a link to the on-chain deposit on
//     the ACTIVE chain's explorer (getActiveChain()), not marketing copy.
//  4. Links are built from our own site base and our own explorer. Order ids
//     that are not URL-safe are never placed in an href.
//  5. The final text is hard-capped at Telegram's 4096-char limit with an
//     explicit ellipsis, and an HTML entity is never cut in half.
// ════════════════════════════════════════════════════════════════

import { getActiveChain } from '@/lib/web5/contracts/addresses';
import { formatUsdc, parseUsdcToWei } from '@/lib/web5/payments/hot-wallet';

/** Telegram rejects sendMessage above 4096 characters. */
export const TELEGRAM_MESSAGE_LIMIT = 4096;

/**
 * Canonical link prefix for a single bounty.
 *
 * ⚠ ALIGNMENT POINT: this must match the detail page route the other agent
 * is creating (`/task/[orderId]`). It is the single place that path exists in
 * this codebase — if their route lands elsewhere (e.g. under a locale prefix
 * or a different segment), change TASK_ROUTE_PREFIX here and nothing else.
 * The fallback below never 500s: an unknown path only means a soft link.
 */
export const TASK_ROUTE_PREFIX = '/task/';

/** Characters an order id may contain to be safe inside an href / visible link. */
const SAFE_ORDER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;

/** 0x + 64 hex, the same shape escrowTxHash is written with. */
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

const ELLIPSIS = '…';

/** Input ceiling before any work happens; orders are capped far below this. */
const MAX_SOURCE_TEXT = 40_000;

export interface TaskBroadcastInput {
  orderId: string;
  title: string;
  description?: string | null;
  /** Stored 18-decimal USDC string, exactly as TaskOrder.bountyUsdc. */
  bountyUsdc: string;
  escrowTxHash?: string | null;
  status?: string | null;
  /** Override for tests; defaults to getActiveChain().explorer. */
  explorerBaseUrl?: string;
  /** Override for tests; defaults to getActiveChain().name. */
  chainName?: string;
}

export interface RenderedTaskBroadcast {
  /** HTML payload for sendMessage. Always <= TELEGRAM_MESSAGE_LIMIT. */
  text: string;
  parseMode: 'HTML';
  canonicalUrl: string;
  /** Only true when the row has a syntactically valid escrow tx hash. */
  escrowVerified: boolean;
  escrowTxUrl: string | null;
  rewardUsdc: string | null;
  truncated: boolean;
  limit: number;
}

/** Site origin, without a trailing slash. Read per call so tests can set env. */
export function getBroadcastSiteBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog').trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}

/**
 * Canonical, ours-only link for one order. An order id that is not URL safe
 * falls back to the site root instead of being interpolated into a link.
 */
export function taskCanonicalUrl(orderId: string, env: Record<string, string | undefined> = process.env): string {
  const base = getBroadcastSiteBaseUrl(env);
  const id = String(orderId ?? '');
  if (!SAFE_ORDER_ID.test(id)) return `${base}/`;
  return `${base}${TASK_ROUTE_PREFIX}${encodeURIComponent(id)}`;
}

/** Explorer transaction link for the ACTIVE chain (Arc mainnet by default). */
export function escrowTxUrl(txHash: string, explorerBaseUrl?: string): string | null {
  if (!TX_HASH.test(txHash || '')) return null;
  const explorer = (explorerBaseUrl || getActiveChain().explorer).replace(/\/+$/, '');
  return `${explorer}/tx/${txHash}`;
}

/** Escape the three characters that are meaningful in Telegram HTML. */
export function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Whitespace-normalize user text before escaping (never for display of ids). */
function normalizeUserText(value: unknown, maxChars: number): string {
  const raw = String(value ?? '').slice(0, MAX_SOURCE_TEXT);
  return raw.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maxChars);
}

/**
 * Truncate an ALREADY ESCAPED string to `budget` characters (ellipsis included)
 * without splitting an HTML entity, which would make Telegram reject the post.
 */
export function truncateEscapedHtml(
  escaped: string,
  budget: number
): { text: string; truncated: boolean } {
  if (budget <= 0) return { text: '', truncated: escaped.length > 0 };
  if (escaped.length <= budget) return { text: escaped, truncated: false };

  // -1 reserves the ellipsis so the result never exceeds the budget.
  let cut = budget - 1;
  const amp = escaped.lastIndexOf('&', Math.max(0, cut - 1));
  if (amp !== -1 && escaped.slice(amp, cut).indexOf(';') === -1) {
    // The entity opened at `amp` would be cut in half — drop back before it.
    cut = amp;
  }
  const head = escaped.slice(0, cut).replace(/\s+$/, '');
  return { text: `${head}${ELLIPSIS}`, truncated: true };
}

/** "1.500" -> "1.5"; unparsable or non-positive -> null (never a fake number). */
export function broadcastRewardUsdc(bountyUsdc: string | null | undefined): string | null {
  const raw = String(bountyUsdc ?? '').trim();
  if (!raw) return null;
  try {
    const wei = parseUsdcToWei(raw);
    if (wei <= 0n) return null;
    return formatUsdc(wei);
  } catch {
    return null;
  }
}

/**
 * Render the channel post for one order. Pure and total: it never throws for
 * odd input, it only renders less.
 */
export function renderTaskBroadcastMessage(
  input: TaskBroadcastInput,
  options: { limit?: number; env?: Record<string, string | undefined> } = {}
): RenderedTaskBroadcast {
  const limit = Math.max(128, Math.min(options.limit ?? TELEGRAM_MESSAGE_LIMIT, TELEGRAM_MESSAGE_LIMIT));
  const env = options.env ?? process.env;

  const chain = getActiveChain();
  const explorer = input.explorerBaseUrl ?? chain.explorer;
  const chainName = input.chainName ?? chain.name;

  const canonicalUrl = taskCanonicalUrl(input.orderId, env);
  const rewardUsdc = broadcastRewardUsdc(input.bountyUsdc);
  const escrowTx = input.escrowTxHash ? escrowTxUrl(String(input.escrowTxHash), explorer) : null;
  const escrowVerified = escrowTx !== null;

  const title = normalizeUserText(input.title, 240);
  const description = normalizeUserText(input.description, 4000);

  const lines: string[] = [
    `🎯 <b>新悬赏 · New bounty</b> · ${escapeTelegramHtml(chainName)}`,
    '',
    `<b>${escapeTelegramHtml(title) || '(untitled bounty)'}</b>`,
    '',
    rewardUsdc
      ? `💰 赏金 Bounty: <b>${escapeTelegramHtml(rewardUsdc)} USDC</b>（订单声明金额；中标交付方按协议得 80%）`
      : '💰 赏金 Bounty: <b>金额未确认 amount unconfirmed</b>',
    escrowVerified
      ? `🔐 链上托管 Escrow: <a href="${escrowTx}">已验证存款 verified on-chain deposit</a>`
      : '⚠️ 托管状态未确认 · escrow NOT confirmed on chain — treat this bounty as unconfirmed',
    `🔗 详情 Details: <a href="${escapeTelegramHtml(canonicalUrl)}">${escapeTelegramHtml(canonicalUrl)}</a>`,
  ];

  const skeleton = lines.join('\n');
  const descriptionHeader = '\n\n📄 ';

  let truncated = false;
  let text = skeleton;

  if (description) {
    const budget = limit - skeleton.length - descriptionHeader.length;
    const fitted = truncateEscapedHtml(escapeTelegramHtml(description), Math.max(0, budget));
    truncated = fitted.truncated;
    if (fitted.text) text = `${skeleton}${descriptionHeader}${fitted.text}`;
  }

  // Absolute backstop: the payload must never exceed the API limit. Routed
  // through the same truncator so even this cut cannot split an HTML entity.
  if (text.length > limit) {
    text = truncateEscapedHtml(text, limit).text;
    truncated = true;
  }

  return {
    text,
    parseMode: 'HTML',
    canonicalUrl,
    escrowVerified,
    escrowTxUrl: escrowTx,
    rewardUsdc,
    truncated,
    limit,
  };
}

/**
 * What the bot may not decide for itself: it receives `text` + `parseMode`
 * already validated server-side. This is the payload contract, kept here so
 * both the claim route and the sender tests read the same shape.
 */
export interface TaskBroadcastPayload {
  orderId: string;
  parseMode: 'HTML';
  text: string;
  canonicalUrl: string;
  rewardUsdc: string | null;
  escrowVerified: boolean;
  queuedAt: string;
  attempts: number;
}
