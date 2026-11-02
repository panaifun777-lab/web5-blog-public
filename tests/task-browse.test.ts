// The public browse layer behind `/task/<orderId>` (src/lib/web5/ap2/task-browse.ts).
//
// Three things must never regress, and all three are cheap to prove against the
// in-memory fake db:
//   1. demo orders stay invisible — the lookup must reuse NON_DEMO_ORDER_WHERE,
//      which the fake db really evaluates (isDemo + the ap2-task-seed-/meme-
//      prefixes), so a hand-rolled filter that forgot one arm fails here;
//   2. private columns must not be reachable. `TASK_PUBLIC_SELECT` is an
//      allow-list, and `toPublicTaskOrder()` re-lists every field by hand. The
//      fake db ignores `select` and hands back full rows including
//      `deliverableContent` / `acceptanceHash` / `disputeReason`, so a leak
//      would show up as a key on the mapped object;
//   3. the JSON-LD must stay the conservative WebPage graph it is today — no
//      `JobPosting`/`baseSalary`/`MonetaryAmount`, because USDC has no
//      ISO-4217 code and an invalid monetary node is worse than none.
//
// No network, no signing, no real chain calls.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from './helpers/fake-db';

vi.mock('@/lib/db', async () => {
  const { fakeDb: db } = await import('./helpers/fake-db');
  return { db: db.db };
});

import { db } from '@/lib/db';
import { NON_DEMO_ORDER_WHERE } from '@/lib/web5/ap2/commerce';
import { SITE_URL } from '@/lib/i18n/metadata';
import zhCN from '@/lib/i18n/locales/zh-CN';
import en from '@/lib/i18n/locales/en';
import {
  ARWEAVE_GATEWAY_BASE,
  OPEN_BOUNTY_STATUSES,
  TASK_PUBLIC_SELECT,
  TASK_ROUTE_BASE,
  arweaveGatewayUrl,
  buildTaskMetadata,
  explorerTxUrl,
  formatBountyUsdc,
  getPublicTaskOrder,
  isTaskOrderId,
  listOpenTaskOrders,
  loadTaskOrder,
  taskPath,
  taskStatusLabel,
  taskStructuredData,
  taskUrl,
  toPublicTaskOrder,
} from '@/lib/web5/ap2/task-browse';

/** A row that carries every private column, so a leak is unambiguous. */
const PRIVATE_VALUES = {
  deliverableContent: 'TOP-SECRET-DELIVERABLE-BODY',
  deliverableHash: 'secret-sha256-hash',
  acceptanceHash: 'secret-acceptance-hash',
  escrowContract: '0x0000000000000000000000000000000000000000',
  disputeReason: 'private dispute transcript',
  settlementError: 'private settlement stack trace',
  isDemo: false,
};

function seedTask(orderId: string, data: Record<string, any> = {}) {
  return fakeDb.seedOrder({
    orderId,
    creatorDid: 'did:plvtvs:creator',
    title: 'Audit the Arc escrow vault',
    description: 'Report reentrancy and rounding on the vault.',
    bountyUsdc: '2.50',
    status: 'FUNDED',
    escrowTxHash: `0x${'a'.repeat(64)}`,
    payoutTxHash: null,
    ...PRIVATE_VALUES,
    ...data,
  });
}

const SECRET_STRINGS = Object.values(PRIVATE_VALUES).filter((v) => typeof v === 'string');

beforeEach(() => {
  fakeDb.reset();
});

describe('task URL derivation', () => {
  it('builds /task/<orderId> from the single site-URL source', () => {
    expect(taskPath('order-1')).toBe(`${TASK_ROUTE_BASE}/order-1`);
    expect(taskUrl('order-1')).toBe(`${SITE_URL}${TASK_ROUTE_BASE}/order-1`);
    // the default locale is unprefixed; en owns the /en prefix
    expect(taskUrl('order-1', 'zh-CN')).toBe(taskUrl('order-1'));
    expect(taskUrl('order-1', 'en')).toBe(`${SITE_URL}/en${TASK_ROUTE_BASE}/order-1`);
  });

  it('never hardcodes the production host into a derived URL', () => {
    // SITE_URL is env-driven; a literal here would let a preview deploy
    // advertise web5.blog to crawlers.
    expect(taskUrl('order-1').startsWith(SITE_URL)).toBe(true);
    expect(SITE_URL).toBe((process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog').replace(/\/+$/, ''));
  });

  it('percent-encodes an id so it cannot escape the path segment', () => {
    expect(taskPath('a b/c')).toBe('/task/a%20b%2Fc');
    expect(taskPath('ap2-task-x/..:y')).toContain('%2F');
  });

  it('keeps a generated ap2-task id verbatim, matching the broadcaster link', () => {
    // The Telegram broadcast module links to `<site>/task/<orderId>` unescaped;
    // every id this platform generates (commerce.ts) stays byte-identical here.
    const id = 'ap2-task-1730000000000-ab12';
    expect(taskPath(id)).toBe(`${TASK_ROUTE_BASE}/${id}`);
    expect(taskUrl(id)).toBe(`${SITE_URL}${TASK_ROUTE_BASE}/${id}`);
  });

  it('links chain and archive evidence only when a hash exists', () => {
    expect(explorerTxUrl(null)).toBeNull();
    expect(arweaveGatewayUrl('')).toBeNull();
    expect(explorerTxUrl('0xabc')?.startsWith('https://')).toBe(true);
    expect(explorerTxUrl('0xabc')).toContain('/tx/0xabc');
    expect(arweaveGatewayUrl('HASH123')).toBe(`${ARWEAVE_GATEWAY_BASE}/HASH123`);
  });
});

describe('bounty amount display', () => {
  it('round-trips the 18-decimal string without floats', () => {
    expect(formatBountyUsdc('2.50')).toBe('2.5');
    expect(formatBountyUsdc('1.0')).toBe('1');
    expect(formatBountyUsdc('10')).toBe('10');
    expect(formatBountyUsdc('0.000000000000000001')).toBe('0.000000000000000001');
    expect(formatBountyUsdc('1234.5678')).toBe('1234.5678');
  });

  it('shows anything unparseable verbatim instead of zeroing it', () => {
    expect(formatBountyUsdc('-5')).toBe('-5');
    expect(formatBountyUsdc('07')).toBe('07');
    expect(formatBountyUsdc('')).toBe('');
    expect(formatBountyUsdc(null)).toBe('');
    expect(formatBountyUsdc(undefined)).toBe('');
  });
});

describe('loadTaskOrder demo filter', () => {
  it('reads a real order and keeps the where clause demo-free', async () => {
    const spy = vi.spyOn(db.taskOrder, 'findFirst');
    seedTask('order-1');

    const row = await loadTaskOrder('order-1');
    expect(row).not.toBeNull();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orderId: 'order-1',
          isDemo: NON_DEMO_ORDER_WHERE.isDemo,
          NOT: NON_DEMO_ORDER_WHERE.NOT,
        }),
        select: TASK_PUBLIC_SELECT,
      })
    );
  });

  it('hides isDemo rows', async () => {
    seedTask('order-demo', { isDemo: true });
    expect(await loadTaskOrder('order-demo')).toBeNull();
    expect(await getPublicTaskOrder('order-demo')).toBeNull();
  });

  it('hides the legacy ap2-task-seed- / ap2-task-meme- prefixes', async () => {
    seedTask('ap2-task-seed-01');
    seedTask('ap2-task-meme-07');
    expect(await getPublicTaskOrder('ap2-task-seed-01')).toBeNull();
    expect(await getPublicTaskOrder('ap2-task-meme-07')).toBeNull();
  });

  it('returns null for an unknown id — that is the page notFound() signal', async () => {
    seedTask('order-1');
    expect(await getPublicTaskOrder('order-404')).toBeNull();
  });

  it('refuses a malformed id without querying at all', async () => {
    const spy = vi.spyOn(db.taskOrder, 'findFirst');
    for (const bad of ['', '   ', '../../etc/passwd', 'a'.repeat(101), 'order 1/2']) {
      expect(await getPublicTaskOrder(bad), bad).toBeNull();
    }
    expect(spy).not.toHaveBeenCalled();
    expect(isTaskOrderId('order-1_ok:v2.0')).toBe(true);
    expect(isTaskOrderId('order/../x')).toBe(false);
  });

  it('trims the route param before matching', async () => {
    seedTask('order-1');
    const row = await loadTaskOrder('  order-1  ');
    expect(row?.orderId).toBe('order-1');
  });
});

describe('public projection', () => {
  it('carries no private column even when the row does', async () => {
    // The fake db ignores `select`, so getPublicTaskOrder sees a full row.
    // If the mapper ever re-spreads the row, these assertions fail.
    seedTask('order-1', { assignedAgentDid: 'did:plvtvs:agent', deliverableArweaveHash: 'ARX' });
    const task = await getPublicTaskOrder('order-1');
    expect(task).not.toBeNull();

    for (const secret of ['deliverableContent', 'acceptanceHash', 'deliverableHash', 'escrowContract', 'disputeReason', 'settlementError', 'isDemo']) {
      expect(task, secret).not.toHaveProperty(secret);
    }
    const dumped = JSON.stringify(task);
    for (const value of SECRET_STRINGS) expect(dumped).not.toContain(value);
  });

  it('exposes the fields the page and the API promise', async () => {
    seedTask('order-1', { status: 'ASSIGNED', assignedAgentDid: 'did:plvtvs:agent' });
    const task = await getPublicTaskOrder('order-1');
    expect(task?.url).toBe(taskUrl('order-1'));
    expect(task?.bountyUsdc).toBe('2.50');
    expect(task?.bountyDisplay).toBe('2.5');
    expect(task?.status).toBe('ASSIGNED');
    expect(task?.isOpen).toBe(true);
    expect(task?.creatorDid).toBe('did:plvtvs:creator');
    expect(task?.assignedAgentDid).toBe('did:plvtvs:agent');
    expect(task?.deliverableArweaveHash).toBe(null);
    expect(typeof task?.createdAt).toBe('string');
    expect(task?.escrowTxHash).toBe(`0x${'a'.repeat(64)}`);
  });

  it('treats a settled order as not open', () => {
    const base = {
      orderId: 'order-9',
      creatorDid: 'did:plvtvs:creator',
      title: 't',
      description: '',
      bountyUsdc: '1.0',
      status: 'SETTLED',
      escrowTxHash: null,
      payoutTxHash: null,
      feeTxHash: null,
      refundTxHash: null,
      assignedAgentDid: null,
      deliverableArweaveHash: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      submittedAt: null,
      verifiedAt: null,
      settlementDueAt: null,
      deliveryDueAt: null,
      settledAt: null,
    };
    const mapped = toPublicTaskOrder(base);
    expect(mapped.isOpen).toBe(false);
    expect(mapped.description).toBe('');
    expect(mapped.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(mapped.submittedAt).toBeNull();
  });

  it('keeps the allow-list select free of private columns', () => {
    const selected = Object.keys(TASK_PUBLIC_SELECT);
    for (const secret of ['deliverableContent', 'acceptanceHash', 'deliverableHash', 'disputeReason', 'settlementError', 'refundOrigin', 'blockNumbers', 'claimAt']) {
      expect(selected, secret).not.toContain(secret);
    }
    expect(selected).toContain('orderId');
    expect(selected).toContain('bountyUsdc');
  });
});

describe('listOpenTaskOrders', () => {
  it('lists only non-demo FUNDED/ASSIGNED orders and sorts newest first', async () => {
    seedTask('open-old', { createdAt: new Date('2026-01-01T00:00:00Z') });
    seedTask('open-new', { createdAt: new Date('2026-06-01T00:00:00Z') });
    seedTask('settled', { status: 'SETTLED' });
    seedTask('demo-open', { isDemo: true });
    seedTask('ap2-task-seed-open');

    const spy = vi.spyOn(db.taskOrder, 'findMany');
    const rows = await listOpenTaskOrders(10);
    expect(rows.map((r) => r.orderId).sort()).toEqual(['open-new', 'open-old']);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: OPEN_BOUNTY_STATUSES },
          isDemo: NON_DEMO_ORDER_WHERE.isDemo,
          NOT: NON_DEMO_ORDER_WHERE.NOT,
        }),
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: TASK_PUBLIC_SELECT,
      })
    );
    expect(rows.every((r) => r.url.startsWith(SITE_URL))).toBe(true);
  });

  it('caps the preview so discovery surfaces never become unbounded', async () => {
    const spy = vi.spyOn(db.taskOrder, 'findMany');
    await listOpenTaskOrders(999);
    expect(spy.mock.calls[0][0]).toEqual(
      expect.objectContaining({ take: 20 })
    );
    await listOpenTaskOrders(0);
    expect(spy.mock.calls[1][0]).toEqual(expect.objectContaining({ take: 1 }));
  });

  it('does not leak private columns into the listing either', async () => {
    seedTask('order-1');
    const rows = await listOpenTaskOrders();
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain('TOP-SECRET-DELIVERABLE-BODY');
  });
});

describe('localized labels', () => {
  it('maps every state the machine manifest advertises', () => {
    const expected: Record<string, string> = {
      FUNDED: zhCN.task.statusFunded,
      ASSIGNED: zhCN.task.statusAssigned,
      SUBMITTED: zhCN.task.statusSubmitted,
      VERIFIED: zhCN.task.statusVerified,
      REJECTED: zhCN.task.statusRejected,
      DISPUTED: zhCN.task.statusDisputed,
      SETTLING: zhCN.task.statusSettling,
      SETTLED: zhCN.task.statusSettled,
      REFUNDING: zhCN.task.statusRefunding,
      REFUNDED: zhCN.task.statusRefunded,
    };
    for (const [status, label] of Object.entries(expected)) {
      expect(taskStatusLabel(status, 'zh-CN'), status).toBe(label);
    }
    expect(taskStatusLabel('FUNDED', 'en')).toBe(en.task.statusFunded);
    expect(taskStatusLabel('FUNDED', 'en')).not.toBe('FUNDED');
  });

  it('shows an unknown status verbatim instead of an empty badge', () => {
    expect(taskStatusLabel('SOMETHING_NEW', 'zh-CN')).toBe('SOMETHING_NEW');
  });
});

describe('buildTaskMetadata', () => {
  it('writes a canonical and hreflang map for the task path', async () => {
    seedTask('order-1');
    const md = await buildTaskMetadata('order-1', 'en');
    expect(md.alternates?.canonical).toBe(`${SITE_URL}/en/task/order-1`);
    expect(md.alternates?.languages).toEqual({
      'zh-CN': '/task/order-1',
      en: '/en/task/order-1',
      'x-default': '/task/order-1',
    });
    expect(md.openGraph && !Array.isArray(md.openGraph) ? md.openGraph.url : undefined).toBe(
      `${SITE_URL}/en/task/order-1`
    );
    expect(String(md.title)).toContain('Audit the Arc escrow vault');
    expect(String(md.description)).toContain('2.5 USDC');
    expect(String(md.description)).not.toContain('{');
  });

  it('keeps an unknown or demo order out of the index instead of publishing a stub', async () => {
    seedTask('order-demo', { isDemo: true });
    for (const id of ['order-404', 'order-demo']) {
      const md = await buildTaskMetadata(id, 'zh-CN');
      expect(md.robots).toEqual({ index: false, follow: true });
      expect(md.alternates?.canonical).toBeUndefined();
    }
  });
});

describe('taskStructuredData', () => {
  async function graph() {
    seedTask('order-1');
    const task = await getPublicTaskOrder('order-1');
    const related = [
      toPublicTaskOrder({
        orderId: 'order-2',
        creatorDid: 'did:plvtvs:other',
        title: 'Translate the whitepaper',
        description: 'EN→JA.',
        bountyUsdc: '0.75',
        status: 'ASSIGNED',
        escrowTxHash: null,
        payoutTxHash: null,
        feeTxHash: null,
        refundTxHash: null,
        assignedAgentDid: null,
        deliverableArweaveHash: null,
        createdAt: new Date('2026-02-02T00:00:00Z'),
        submittedAt: null,
        verifiedAt: null,
        settlementDueAt: null,
        deliveryDueAt: null,
        settledAt: null,
      }),
      // must be dropped: a page never lists itself as a sibling
      task!,
    ];
    return taskStructuredData({ task: task!, related, locale: 'zh-CN' });
  }

  it('emits a WebPage + BreadcrumbList (+ ItemList) graph', async () => {
    const ld = await graph();
    expect(ld['@context']).toBe('https://schema.org');
    const types = (ld['@graph'] as any[]).map((node) => node['@type']);
    expect(types).toEqual(['WebPage', 'BreadcrumbList', 'ItemList']);
    const webPage = (ld['@graph'] as any[])[0];
    expect(webPage['@id']).toBe(taskUrl('order-1'));
    expect(webPage.datePublished).toBeTruthy();
    expect(webPage.isPartOf['@id']).toBe(`${SITE_URL}/#website`);
    expect(webPage.publisher['@id']).toBe(`${SITE_URL}/#person`);
    const itemList = (ld['@graph'] as any[])[2];
    expect(itemList.numberOfItems).toBe(1);
    expect(itemList.itemListElement[0].url).toBe(taskUrl('order-2'));
  });

  it('omits the ItemList when nothing else is open', async () => {
    seedTask('lone-order');
    const task = await getPublicTaskOrder('lone-order');
    const ld = taskStructuredData({ task: task! });
    expect((ld['@graph'] as any[]).map((n) => n['@type'])).toEqual(['WebPage', 'BreadcrumbList']);
  });

  it('states the bounty as text and never as a MonetaryAmount', async () => {
    const raw = JSON.stringify(await graph());
    for (const forbidden of ['JobPosting', 'baseSalary', 'MonetaryAmount', 'priceCurrency', 'hiringOrganization', 'validThrough']) {
      expect(raw, forbidden).not.toContain(forbidden);
    }
    expect(raw).toContain('USDC');
  });

  it('only points sameAs at surfaces this site actually serves', async () => {
    const ld = await graph();
    const raw = JSON.stringify(ld);
    for (const node of ld['@graph'] as any[]) {
      for (const url of [node['@id'], node.url, ...(node.sameAs ?? [])].filter(Boolean)) {
        expect(String(url).startsWith(SITE_URL), String(url)).toBe(true);
      }
    }
    // no social channel is claimed for the bounty market yet
    const sameAs = ((ld['@graph'] as any[])[0].sameAs as string[]).map((u) => u.toLowerCase());
    expect(sameAs.some((u) => u.includes('telegram') || u.includes('t.me'))).toBe(false);
    expect(raw.toLowerCase()).not.toContain('discord');
  });

  it('never serializes a private column into the markup', async () => {
    const raw = JSON.stringify(await graph());
    for (const value of SECRET_STRINGS) expect(raw, value).not.toContain(value);
  });
});
