// ════════════════════════════════════════════════════════════════
// src/lib/web5/seo/indexnow.ts
// IndexNow ping — new content is handed to Bing/Yandex/Seznam/Naver
// the moment it publishes instead of waiting for a crawl.
// The key is not a secret: engines require it to be publicly readable
// at keyLocation, which is why public/<key>.txt is served verbatim.
// ════════════════════════════════════════════════════════════════

import { SITE_URL } from '@/lib/i18n/metadata';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const DEFAULT_KEY = 'b5d411ce46213fc716a7f0c3b6331708';
/** Engines answer in well under a second; cap worst-case added latency. */
const REQUEST_TIMEOUT_MS = 4_000;

export const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '').trim() || DEFAULT_KEY;

/** The one place the article URL scheme is spelled out, shared with the sitemap. */
export function articleUrl(arweaveHash: string): string {
  return `${SITE_URL}/p/${arweaveHash}`;
}

export function indexNowKeyLocation(): string {
  return `${SITE_URL}/${INDEXNOW_KEY}.txt`;
}

/**
 * Submits a URL batch. Returns false on any failure — discovery is a bonus,
 * never a reason to fail the operation that produced the content.
 */
export async function submitToIndexNow(urls: string[]): Promise<boolean> {
  const unique = [...new Set(urls.filter((u) => /^https?:\/\/[^/]+/.test(u)))];
  if (unique.length === 0) return false;

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: indexNowKeyLocation(),
        urlList: unique,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    // 200 = accepted, 202 = already seen; both are successes.
    return res.ok || res.status === 202;
  } catch {
    return false;
  }
}
