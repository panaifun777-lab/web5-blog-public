import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { INDEXABLE_LOCALES, alternateLanguages, localizePath } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/i18n/metadata';
import { articleUrl } from '@/lib/web5/seo/indexnow';
import {
  OPEN_BOUNTY_PREVIEW_LIMIT,
  listOpenTaskOrders,
  taskPath,
  taskUrl,
  type PublicTaskOrder,
} from '@/lib/web5/ap2/task-browse';

// A metadata route is rendered by Next's static pipeline unless a route segment
// config says otherwise, and this file reads Prisma — without `revalidate` the
// list below would freeze at build time while the proxy still served the stale
// copy with `s-maxage=300` (src/proxy.ts). 300s keeps regeneration and the edge
// TTL honest with each other, and matches src/app/(default)/layout.tsx.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Single source of truth for the host (`NEXT_PUBLIC_SITE_URL`), also the
  // `metadataBase` every page writes into `<head>`.
  const baseUrl = SITE_URL;

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
          url: articleUrl(c.arweaveHash),
          lastModified: c.updatedAt || c.publishedAt,
          changeFrequency: 'monthly',
          priority: 0.9,
        });
      }
    }
  } catch (err) {
    console.warn('[sitemap] Failed to query dynamic articles:', err);
  }

  // 2b. 公开招募中的悬赏任务详情页 `/task/<orderId>`（排除演示单，最新优先）。
  // The query and the demo filter live in one place (task-browse.ts) so the
  // sitemap, /llms.txt and the x402 manifest can never disagree about which
  // bounties are open.
  let openTasks: PublicTaskOrder[] = [];
  try {
    openTasks = await listOpenTaskOrders(OPEN_BOUNTY_PREVIEW_LIMIT);
  } catch (err) {
    console.warn('[sitemap] Failed to query open bounties:', err);
  }

  for (const task of openTasks) {
    routes.push({
      url: task.url,
      lastModified: new Date(task.createdAt),
      changeFrequency: 'hourly',
      priority: 0.7,
      alternates: { languages: alternateLanguages(taskPath(task.orderId)) },
    });
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
    for (const task of openTasks) {
      routes.push({
        url: taskUrl(task.orderId, locale),
        lastModified: new Date(task.createdAt),
        changeFrequency: 'hourly',
        priority: 0.7,
        alternates: { languages: alternateLanguages(taskPath(task.orderId)) },
      });
    }
  }

  return routes;
}
