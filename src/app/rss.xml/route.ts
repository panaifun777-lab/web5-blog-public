import { db } from '@/lib/db';

export async function GET() {
  const baseUrl = 'https://web5.blog';
  const articles = await db.content.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 50,
    include: {
      prime: { select: { displayName: true } },
    },
  });

  const itemsXml = articles
    .map((a) => {
      const author = a.prime?.displayName || a.authorDid;
      const url = `${baseUrl}/p/${a.arweaveHash}`;
      return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${a.excerpt || a.bodyMd.slice(0, 200)}]]></description>
      <author>${author}</author>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Web5.blog · Vessel-Native Blog Ontology Gateway</title>
    <link>${baseUrl}</link>
    <description>Prime × Eidolon × Vessel 三层生命架构。内容分布式存档并标注存证状态，支付通道处于内测阶段。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
