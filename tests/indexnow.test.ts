import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { articleUrl, indexNowKeyLocation, submitToIndexNow, INDEXNOW_KEY } from '@/lib/web5/seo/indexnow';
import { SITE_URL } from '@/lib/i18n/metadata';

// The article-URL scheme must stay identical to the sitemap generator; a
// drift would hand IndexNow a URL the crawler can't reconcile with sitemap.xml.
describe('indexnow articleUrl', () => {
  it('matches the sitemap /p/<hash> scheme', () => {
    expect(articleUrl('arw_abc123')).toBe(`${SITE_URL}/p/arw_abc123`);
  });

  it('points keyLocation at the publicly served key file', () => {
    expect(indexNowKeyLocation()).toBe(`${SITE_URL}/${INDEXNOW_KEY}.txt`);
  });
});

describe('submitToIndexNow', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200 })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dedupes and filters non-http urls, posts the right envelope once', async () => {
    const ok = await submitToIndexNow([
      `${SITE_URL}/p/a`,
      `${SITE_URL}/p/a`, // duplicate dropped
      'not-a-url',
      `${SITE_URL}/p/b`,
    ]);

    expect(ok).toBe(true);
    const fetchMock = (globalThis.fetch as any) as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.urlList).toEqual([`${SITE_URL}/p/a`, `${SITE_URL}/p/b`]);
    expect(body.host).toBe('web5.blog');
    expect(body.key).toBe(INDEXNOW_KEY);
    expect(body.keyLocation).toBe(indexNowKeyLocation());
  });

  it('accepts 202 (already known) as success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 202 })),
    );
    expect(await submitToIndexNow([`${SITE_URL}/p/x`])).toBe(true);
  });

  it('returns false on a server error without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('err', { status: 500 })),
    );
    expect(await submitToIndexNow([`${SITE_URL}/p/x`])).toBe(false);
  });

  it('returns false and swallows network/timeout failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await submitToIndexNow([`${SITE_URL}/p/x`])).toBe(false);
  });

  it('returns false on an empty/garbage url list', async () => {
    expect(await submitToIndexNow([])).toBe(false);
    expect(await submitToIndexNow(['garbage'])).toBe(false);
  });
});
