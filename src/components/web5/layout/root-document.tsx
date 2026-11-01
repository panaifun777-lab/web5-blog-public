import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/providers';
import { Rum } from '@/components/web5/observability/rum';
import { CloudflareAnalytics } from '@/components/web5/observability/cloudflare-analytics';
import { createT } from '@/lib/i18n/translate';
import { localeDirection } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/i18n/metadata';
import { LOCALE_CODES, type LocaleCode } from '@/lib/i18n/config';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * The `<html>` shell every root layout shares. Both `app/(default)` and
 * `app/[locale]` render this, so the document structure stays identical
 * while `lang`/`dir` come from the URL segment.
 */
export function RootDocument({ locale, children }: { locale: LocaleCode; children: ReactNode }) {
  const t = createT(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/#person`,
        name: 'piaoshu.eth',
        url: SITE_URL,
        sameAs: [
          'https://farcaster.xyz/piaoshu',
          'https://x.com/PiaoshuAgent',
          'https://github.com/piaoshu',
        ],
        knowsAbout: ['Web5', 'Decentralized Identity', 'AI Agent', 'Smart Contracts'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Web5.blog',
        description: t('layout.siteDescription'),
        publisher: { '@id': `${SITE_URL}/#person` },
        inLanguage: LOCALE_CODES,
      },
      {
        '@type': 'BlogPosting',
        '@id': `${SITE_URL}/#blogposting`,
        headline: t('layout.titleDefault'),
        description: t('layout.blogDescription'),
        author: { '@id': `${SITE_URL}/#person` },
        publisher: { '@id': `${SITE_URL}/#person` },
        mainEntityOfPage: SITE_URL,
      },
    ],
  };

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      suppressHydrationWarning
      className="dark"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers locale={locale}>{children}</Providers>
        <Toaster />
        <Rum />
        <CloudflareAnalytics />
      </body>
    </html>
  );
}
