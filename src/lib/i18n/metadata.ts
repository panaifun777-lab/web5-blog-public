// ════════════════════════════════════════════════════════════════
// src/lib/i18n/metadata.ts — per-locale <head> construction
//
// Every page builds its metadata from here so `canonical`, `hreflang`
// and `openGraph.locale` always agree with the URL the page is served
// from. Locales whose catalog is still a fallback stay out of the index.
// ════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { LOCALES, type LocaleCode } from './config';
import { INDEXABLE_LOCALES, alternateLanguages, localizePath } from './routing';
import { createT } from './translate';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog').replace(
  /\/+$/,
  '',
);

const KEYWORDS = [
  'Web5', 'Web5.blog', 'PLVTVS', 'EidolonOS', 'AP2', 'ARP', 'AA2P',
  'Vessel Auth', 'Container Login', 'ERC-4337', 'Account Abstraction',
  'Arweave', 'DWN', 'Digital Twin', 'AI Agent', 'Decentralized Blog',
  'piaoshu.eth', '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1',
];

export function isIndexableLocale(locale: LocaleCode): boolean {
  return INDEXABLE_LOCALES.includes(locale);
}

function robotsFor(locale: LocaleCode): Metadata['robots'] {
  return isIndexableLocale(locale)
    ? { index: true, follow: true, 'max-snippet': 300, 'max-image-preview': 'large' }
    : { index: false, follow: true };
}

/** Fields shared by every route in a locale tree (applied by the layout). */
export function siteMetadata(locale: LocaleCode): Metadata {
  const t = createT(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('layout.titleDefault'),
      template: '%s | Web5.blog',
    },
    description: t('layout.description'),
    keywords: KEYWORDS,
    authors: [{ name: 'piaoshu.eth', url: SITE_URL }],
    creator: 'piaoshu.eth',
    publisher: 'PLVTVS.ONE × EIDOLONOS.XYZ',
    robots: robotsFor(locale),
    icons: { icon: '/favicon.svg' },
    twitter: {
      card: 'summary_large_image',
      title: 'Web5.blog',
      description: t('layout.twitterDescription'),
      site: '@PiaoshuAgent',
      creator: '@PiaoshuAgent',
    },
    other: {
      'X-Agent-Discovery': '/.well-known/agent.json',
      'X-API-Discovery': '/api/openapi.json',
      'X-LLMs-Discovery': '/llms.txt',
    },
  };
}

export interface PageMetadataInput {
  locale: LocaleCode;
  /** Unprefixed path this page represents, e.g. `/` or `/founder`. */
  path: string;
  /** Page title, rendered through the layout template. */
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  /** Set for pages whose title must not get the `| Web5.blog` suffix. */
  absoluteTitle?: string;
}

/** Metadata for one page: canonical + hreflang + matching og/twitter copy. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const { locale, path } = input;
  const t = createT(locale);
  const canonical = `${SITE_URL}${localizePath(path, locale)}`;
  const title = input.title ?? t('layout.titleDefault');
  const description = input.description ?? t('layout.description');
  const ogTitle = input.ogTitle ?? title;
  const ogDescription = input.ogDescription ?? description;

  return {
    metadataBase: new URL(SITE_URL),
    title: input.absoluteTitle ? { absolute: input.absoluteTitle } : title,
    description,
    alternates: {
      canonical,
      languages: alternateLanguages(path),
    },
    robots: robotsFor(locale),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      siteName: 'Web5.blog',
      type: 'website',
      locale: LOCALES[locale].ogLocale,
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Web5.blog',
      description: ogDescription,
      site: '@PiaoshuAgent',
      creator: '@PiaoshuAgent',
    },
  };
}
