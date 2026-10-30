import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://web5.blog';

  // 1. 静态主路由
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/founder`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 2. 动态拉取所有已发布的 Arweave 文章生成永久 URL
  try {
    const contents = await db.content.findMany({
      select: {
        arweaveHash: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 200,
    });

    for (const c of contents) {
      if (c.arweaveHash) {
        routes.push({
          url: `${baseUrl}/p/${c.arweaveHash}`,
          lastModified: c.updatedAt || c.publishedAt,
          changeFrequency: 'monthly',
          priority: 0.9,
        });
      }
    }
  } catch (err) {
    console.warn('[sitemap] Failed to query dynamic articles:', err);
  }

  return routes;
}
