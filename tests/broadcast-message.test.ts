// Unit tests for the pure Telegram broadcast renderer
// (src/lib/web5/broadcast/telegram-message.ts).
//
// No DB, no fetch, no timers: these are the correctness rules the feature was
// designed around — escaping, escrow truthfulness, ours-only links, decimal-safe
// reward rendering and the 4096-char ceiling.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TELEGRAM_MESSAGE_LIMIT,
  TASK_ROUTE_PREFIX,
  broadcastRewardUsdc,
  escapeTelegramHtml,
  escrowTxUrl,
  getBroadcastSiteBaseUrl,
  renderTaskBroadcastMessage,
  taskCanonicalUrl,
  truncateEscapedHtml,
} from '@/lib/web5/broadcast/telegram-message';

const TX = `0x${'a'.repeat(64)}`;
const ENV_ONLY = { NEXT_PUBLIC_SITE_URL: 'https://web5.blog' };

function order(overrides: Record<string, any> = {}, limit?: number) {
  return renderTaskBroadcastMessage(
    {
      orderId: 'ap2-task-1700000000000-ab12',
      title: 'Translate the whitepaper',
      description: 'Needs a native reviewer.',
      bountyUsdc: '2.5',
      escrowTxHash: TX,
      status: 'FUNDED',
      ...overrides,
    },
    { env: ENV_ONLY, ...(limit ? { limit } : {}) }
  );
}

// getActiveChain() reads process.env, so the chain (and with it the explorer
// host) is pinned for every case; only the test that opts into testnet changes
// it. The site base always comes from the explicit `env` argument below.
beforeEach(() => {
  delete process.env.NEXT_PUBLIC_ACTIVE_CHAIN;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ACTIVE_CHAIN;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe('escapeTelegramHtml', () => {
  it('escapes the three characters Telegram HTML treats as markup', () => {
    expect(escapeTelegramHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeTelegramHtml('a & b')).toBe('a &amp; b');
    expect(escapeTelegramHtml('5 > 3 && 2 < 4')).toBe('5 &gt; 3 &amp;&amp; 2 &lt; 4');
  });

  it('escapes & first, so &lt; is never double-escaped to &amp;lt;', () => {
    expect(escapeTelegramHtml('&lt;')).toBe('&amp;lt;');
  });

  it('escapes `<`, which is what makes a description with markup postable', () => {
    // The `&`/`"`-only escaper this replaces left `<` raw and Telegram answered 400.
    expect(escapeTelegramHtml('<')).toBe('&lt;');
    expect(escapeTelegramHtml('<')).not.toBe('<');
  });
});

describe('reward rendering from the stored 18-decimal string', () => {
  it('keeps the stored value exactly, without float rounding', () => {
    expect(broadcastRewardUsdc('6.25')).toBe('6.25');
    expect(broadcastRewardUsdc('0.000000000000000001')).toBe('0.000000000000000001');
    expect(broadcastRewardUsdc('1.500')).toBe('1.5');
    expect(broadcastRewardUsdc('20')).toBe('20');
  });

  it('returns null instead of inventing a number for junk, zero or negatives', () => {
    expect(broadcastRewardUsdc('not-a-number')).toBeNull();
    expect(broadcastRewardUsdc('')).toBeNull();
    expect(broadcastRewardUsdc('0')).toBeNull();
    expect(broadcastRewardUsdc('-1.5')).toBeNull();
    expect(broadcastRewardUsdc(null)).toBeNull();
    // The other AI's snippet defaulted a missing reward to 5; we never do.
    expect(broadcastRewardUsdc(undefined)).toBeNull();
  });

  it('prints "amount unconfirmed" rather than a number the order does not state', () => {
    const rendered = order({ bountyUsdc: 'nonsense', escrowTxHash: null });
    expect(rendered.rewardUsdc).toBeNull();
    expect(rendered.text).toContain('amount unconfirmed');
    expect(rendered.text).not.toMatch(/\d+(\.\d+)? USDC/);
  });

  it('prints the stored bounty verbatim in the post', () => {
    const rendered = order({ bountyUsdc: '6.25' });
    expect(rendered.rewardUsdc).toBe('6.25');
    expect(rendered.text).toContain('6.25 USDC');
  });
});

describe('escrow truthfulness', () => {
  it('links the verified deposit on the ACTIVE chain explorer when escrowTxHash exists', () => {
    const rendered = order({ escrowTxHash: TX });
    expect(rendered.escrowVerified).toBe(true);
    expect(rendered.escrowTxUrl).toBe(`https://explorer.arc.io/tx/${TX}`);
    expect(rendered.text).toContain(`href="https://explorer.arc.io/tx/${TX}"`);
    expect(rendered.text).toContain('已验证存款');
  });

  it('follows NEXT_PUBLIC_ACTIVE_CHAIN instead of hardcoding mainnet', () => {
    process.env.NEXT_PUBLIC_ACTIVE_CHAIN = 'arc-testnet';
    const rendered = order({ escrowTxHash: TX });
    expect(rendered.escrowTxUrl).toBe(`https://explorer.testnet.arc.io/tx/${TX}`);
  });

  it('does NOT claim escrow when the order has no escrowTxHash', () => {
    const rendered = order({ escrowTxHash: null });
    expect(rendered.escrowVerified).toBe(false);
    expect(rendered.escrowTxUrl).toBeNull();
    expect(rendered.text).toMatch(/escrow NOT confirmed/i);
    expect(rendered.text).not.toMatch(/explorer\.arc\.io/);
    expect(rendered.text).not.toContain('已验证');
    expect(rendered.text).not.toMatch(/escrowed|funds are held|secured in escrow|verified deposit/i);
  });

  it('treats a malformed tx hash as no confirmed deposit at all', () => {
    for (const bad of ['', '0xdeadbeef', 'a'.repeat(64), 'not-a-hash', `${TX}<script>`]) {
      const rendered = order({ escrowTxHash: bad });
      expect(rendered.escrowVerified).toBe(false);
      expect(rendered.escrowTxUrl).toBeNull();
    }
    expect(escrowTxUrl('0xnope')).toBeNull();
  });

  it('never promises a payout: the bounty is the escrowed total, the agent share is 80%', () => {
    const rendered = order({ bountyUsdc: '6.25', escrowTxHash: TX });
    expect(rendered.text).toContain('Bounty');
    expect(rendered.text).not.toMatch(/guaranteed|risk-free|无风险/i);
  });
});

describe('canonical link', () => {
  it('uses the site base plus the single exported task-path constant', () => {
    expect(TASK_ROUTE_PREFIX).toBe('/task/');
    expect(taskCanonicalUrl('ap2-task-1', ENV_ONLY)).toBe('https://web5.blog/task/ap2-task-1');
    expect(getBroadcastSiteBaseUrl({ NEXT_PUBLIC_SITE_URL: 'https://Web5.blog/' })).toBe('https://Web5.blog');
    expect(getBroadcastSiteBaseUrl({})).toBe('https://web5.blog');
  });

  it('appears in the post so the channel link is a real page, not marketing copy', () => {
    const rendered = order();
    expect(rendered.canonicalUrl).toBe('https://web5.blog/task/ap2-task-1700000000000-ab12');
    expect(rendered.text).toContain(`href="${rendered.canonicalUrl}"`);
  });

  it('never interpolates a URL-unsafe order id into a link', () => {
    const hostile = 'x"></a><a href="https://evil.example';
    const rendered = order({ orderId: hostile });
    expect(rendered.canonicalUrl).toBe('https://web5.blog/');
    const hrefs = [...rendered.text.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    expect(
      hrefs.every((href) => href.startsWith('https://web5.blog') || href.startsWith('https://explorer.arc.io'))
    ).toBe(true);
    expect(rendered.text).not.toContain('evil.example');
  });

  it('rejects a user-controlled link inside the description', () => {
    const rendered = order({
      description: 'see https://evil.example/steal or <a href="https://evil.example">click</a>',
    });
    // Count ANCHOR TAGS only: escaped user text can contain the literal
    // characters `href="` (as `&lt;a href=`), which Telegram renders as text.
    const hrefs = [...rendered.text.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
    // Exactly the escrow tx link and our canonical link — nothing the author typed.
    expect(hrefs).toHaveLength(2);
    expect(hrefs.some((href) => href.includes('evil.example'))).toBe(false);
    expect(rendered.text).toContain('&lt;a href=');
  });
});

describe('user text is escaped end to end', () => {
  it('escapes a description containing <script>, & and <', () => {
    const rendered = order({ description: '<script>alert("xss")</script> & 1 < 2' });
    expect(rendered.text).not.toContain('<script');
    expect(rendered.text).toContain('&lt;script&gt;alert("xss")&lt;/script&gt; &amp; 1 &lt; 2');
  });

  it('escapes the title too, and keeps the template markup intact', () => {
    const rendered = order({ title: 'Bounty <b>HUGE</b> & more' });
    expect(rendered.text).toContain('&lt;b&gt;HUGE&lt;/b&gt; &amp; more');
    expect(rendered.text).toContain('<b>新悬赏 · New bounty</b>');
  });

  it('leaves no dangling ampersand entity anywhere in the payload', () => {
    const rendered = order({ description: 'a&b < c > d &e' });
    expect(rendered.text).toMatch(/&(amp|lt|gt);/);
    expect(rendered.text).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/);
  });

  it('always answers with HTML parse mode', () => {
    expect(order().parseMode).toBe('HTML');
  });
});

describe('4096-character ceiling', () => {
  const huge = 'x'.repeat(20_000);

  it('truncates an oversized description instead of letting Telegram reject the post', () => {
    const rendered = order({ description: huge });
    expect(rendered.text.length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_LIMIT);
    expect(rendered.text.length).toBeGreaterThan(3_000);
    expect(rendered.truncated).toBe(true);
    expect(rendered.text.endsWith('…')).toBe(true);
  });

  it('keeps the mandatory parts when the description is cut', () => {
    const rendered = order({ description: huge });
    expect(rendered.text).toContain(`href="${rendered.canonicalUrl}"`);
    expect(rendered.text).toContain(`href="https://explorer.arc.io/tx/${TX}"`);
    expect(rendered.text).toContain('2.5 USDC');
  });

  it('never splits an HTML entity when cutting', () => {
    // Every character becomes a 5-char entity, so any naive cut lands inside one.
    const rendered = order({ description: '&'.repeat(4_000) });
    expect(rendered.text.length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_LIMIT);
    expect(rendered.truncated).toBe(true);
    expect(rendered.text).not.toMatch(/&(amp|lt|gt)?$/);
    expect(rendered.text).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/);
  });

  it('stays inside a custom smaller limit', () => {
    const rendered = order({ description: huge }, 400);
    expect(rendered.text.length).toBeLessThanOrEqual(400);
    expect(rendered.truncated).toBe(true);
  });

  it('fits a short message untouched', () => {
    const rendered = order({ description: 'short' });
    expect(rendered.truncated).toBe(false);
    expect(rendered.text).toContain('short');
  });
});

describe('truncateEscapedHtml', () => {
  it('is a no-op when the text already fits', () => {
    expect(truncateEscapedHtml('hello', 10)).toEqual({ text: 'hello', truncated: false });
  });

  it('counts the ellipsis inside the budget', () => {
    const out = truncateEscapedHtml('abcdefghij', 5);
    expect(out.text).toBe('abcd…');
    expect(out.text.length).toBe(5);
    expect(out.truncated).toBe(true);
  });

  it('backs off before a cut entity', () => {
    const escaped = escapeTelegramHtml('aaaaaaaa<b>');
    const out = truncateEscapedHtml(escaped, 11);
    expect(out.text).not.toMatch(/&(amp|lt|gt|quot|apos|#\d*)$/);
    expect(out.text.length).toBeLessThanOrEqual(11);
    expect(out.text).toBe('aaaaaaaa…');
  });

  it('returns nothing when the budget is exhausted', () => {
    expect(truncateEscapedHtml('abc', 0)).toEqual({ text: '', truncated: true });
  });
});
