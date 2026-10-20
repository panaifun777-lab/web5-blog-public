// ════════════════════════════════════════════════════════════════
// src/lib/web5/seo.ts
// SEO 工具集 — FAQ Schema · 动态 Meta · 结构化数据
// ════════════════════════════════════════════════════════════════

// ── FAQPage JSON-LD ──────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * 从 Markdown 正文中提取 FAQ（常见问题）条目
 *
 * 检测模式：
 *   1. "## 常见问题" / "## FAQ" 标题下连续的 **Q:** / **A:** 或流水列表
 *   2. 通篇扫描以问号结尾的段落作为问题，下一段作为回答
 */
export function extractFaqs(bodyMd: string): FaqItem[] {
  const items: FaqItem[] = [];

  // 模式1：Q/A 标记格式 **Q:...** / **A:...**
  const qaRegex = /\*\*Q[：:]\s*(.+?)\*\*([\s\S]*?)(?=\*\*Q[：:]|$)/gi;
  let match;
  while ((match = qaRegex.exec(bodyMd)) !== null) {
    const question = match[1].trim();
    const answerBlock = match[2].trim();
    // 从 answerBlock 中提取 **A:** 后的内容
    const aMatch = answerBlock.match(/\*\*A[：:]\s*(.+?)\*\*/);
    if (aMatch) {
      items.push({ question, answer: aMatch[1].trim() });
    } else if (answerBlock) {
      items.push({ question, answer: answerBlock.slice(0, 500) });
    }
  }

  // 模式2：在 "常见问题" 或 "FAQ" 标题下的有序/无序列表
  const faqSection = bodyMd.match(/##\s*(?:常见问题|FAQ|Q&A)[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
  if (faqSection) {
    const section = faqSection[1];
    // 寻找连续的问句行（包含中文问号或英文问号结尾）
    const lines = section.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].replace(/^[-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (/[\?\?？]$/.test(line) && !line.startsWith('*') && line.length > 5) {
        // 下一行可能是答案
        let answer = lines[i + 1]?.replace(/^[-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim() || '';
        // 跳过空行
        if (!answer && i + 2 < lines.length) {
          answer = lines[i + 2]?.replace(/^[-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim() || '';
        }
        if (answer) {
          items.push({ question: line, answer: answer.slice(0, 500) });
        }
      }
    }
  }

  return items.slice(0, 20); // 最多20条
}

/**
 * 生成 FAQPage JSON-LD 字符串
 */
export function generateFaqSchema(faqs: FaqItem[]): string | null {
  if (faqs.length === 0) return null;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  });
}

/**
 * 生成 Article / TechArticle & ClaimReview GEO JSON-LD 字符串（用于 AI 搜索引擎 GEO/AEO 优先抓取）
 */
export function generateArticleSchema(article: {
  headline: string;
  description: string;
  authorName: string;
  authorDid?: string;
  authorUrl?: string;
  datePublished: string;
  image?: string;
  claimReview?: string;
}): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.headline,
    description: article.description,
    author: {
      '@type': 'Person',
      name: article.authorName,
      identifier: article.authorDid || 'did:plvtvs:piaoshu',
      url: article.authorUrl || 'https://web5.blog',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Web5.blog (W · B · O · G)',
      url: 'https://web5.blog',
      logo: 'https://web5.blog/icon-logo.png',
    },
    datePublished: article.datePublished,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': typeof window !== 'undefined' ? window.location.href : 'https://web5.blog',
    },
    about: [
      { '@type': 'Thing', name: 'Web5' },
      { '@type': 'Thing', name: 'Circle ARC Mainnet' },
      { '@type': 'Thing', name: 'AA2P Protocol' },
      { '@type': 'Thing', name: 'Autonomous Agent' },
    ],
    review: {
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: '5',
        bestRating: '5',
      },
      author: {
        '@type': 'Organization',
        name: 'AA2P Autonomous Peer Review Arena',
      },
      reviewBody: article.claimReview || 'Verified by AA2P Peer Review & BudgetFence On-Chain Consensus.',
    },
    ...(article.image ? { image: article.image } : {}),
  });
}

// ── 动态 Meta 注入 ───────────────────────────────────────────

interface MetaState {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
}

/** 保存初始 meta 以便恢复 */
let savedMeta: MetaState | null = null;

/**
 * 设置页面级动态 meta（title / description / OG）
 */
export function setPageMeta(overrides: Partial<MetaState>): void {
  if (typeof document === 'undefined') return;

  // 保存原始值（仅首次）
  if (!savedMeta) {
    savedMeta = {
      title: document.title,
      description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content || '',
      ogTitle: document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content || '',
      ogDescription: document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content || '',
      ogUrl: document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content || '',
    };
  }

  // 更新 title
  if (overrides.title) document.title = overrides.title;

  // 更新 meta description
  const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (descMeta && overrides.description) descMeta.content = overrides.description;

  // 更新 OG tags
  const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (ogTitle && overrides.ogTitle) ogTitle.content = overrides.ogTitle;

  const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
  if (ogDesc && overrides.ogDescription) ogDesc.content = overrides.ogDescription;

  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (ogUrl && overrides.ogUrl) ogUrl.content = overrides.ogUrl;
}

/**
 * 恢复初始 meta
 */
export function restorePageMeta(): void {
  if (!savedMeta || typeof document === 'undefined') return;
  document.title = savedMeta.title;

  const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (descMeta) descMeta.content = savedMeta.description;

  const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = savedMeta.ogTitle;

  const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = savedMeta.ogDescription;

  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = savedMeta.ogUrl;
}

/**
 * 注入 JSON-LD script 标签到 <head>
 * 返回清理函数
 */
export function injectJsonLd(jsonLdStr: string): () => void {
  if (typeof document === 'undefined') return () => {};
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = jsonLdStr;
  script.id = 'web5-jsonld-seo';
  // 移除旧的同 id 标签
  document.querySelectorAll('script#web5-jsonld-seo').forEach((el) => el.remove());
  document.head.appendChild(script);
  return () => script.remove();
}

/**
 * 清除动态注入的 JSON-LD
 */
export function clearJsonLd(): void {
  document.querySelectorAll('script#web5-jsonld-seo').forEach((el) => el.remove());
}
