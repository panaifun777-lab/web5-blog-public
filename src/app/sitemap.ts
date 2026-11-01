import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { INDEXABLE_LOCALES, alternateLanguages, localizePath } from '@/lib/i18n/routing';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://web5.blog';

  // 1. 静态主路由 — 每种可索引语言一个 URL，并通过 hreflang 互相关联
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}${localizePath('/', 'zh-CN')}`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
      alternates: { languages: alternateLanguages('/') },
    },
    {
      url: `${baseUrl}${localizePath('/founder', 'zh-CN')}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages: alternateLanguages('/founder') },
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

  // 2. 动态拉取所有已发布的 Arweave 文章生成永久 URL（中文单一语言）
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

  // 可索引语言除 zh-CN 外的首页 / 分身致辞变体
  for (const locale of INDEXABLE_LOCALES) {
    if (locale === 'zh-CN') continue;
    routes.push({
      url: `${baseUrl}${localizePath('/', locale)}`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
      alternates: { languages: alternateLanguages('/') },
    });
    routes.push({
      url: `${baseUrl}${localizePath('/founder', locale)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages: alternateLanguages('/founder') },
    });
  }

  return routes;
}
