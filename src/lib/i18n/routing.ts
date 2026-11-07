// ════════════════════════════════════════════════════════════════
// src/lib/i18n/routing.ts — URL ↔ locale mapping (pure, testable)
//
// Policy: the default locale (zh-CN) is served unprefixed (`/founder`),
// every other locale lives under its own prefix (`/en/founder`). The URL
// is the source of truth, so a page renders the same bytes for everyone
// and can be cached by the CDN. No React, no server APIs.
// ════════════════════════════════════════════════════════════════

import {
  DEFAULT_LOCALE,
  LOCALE_CODES,
  LOCALES,
  isLocaleCode,
  type LocaleCode,
} from './config';

/** Locales that own a URL prefix. */
export const PREFIXED_LOCALES: LocaleCode[] = LOCALE_CODES.filter(
  (code) => code !== DEFAULT_LOCALE,
);

/** Locales whose copy is finished enough to be promoted in search results. */
export const INDEXABLE_LOCALES: LocaleCode[] = LOCALE_CODES.filter(
  (code) => LOCALES[code].status === 'source' || LOCALES[code].status === 'complete',
);

/** Prefixes that are never localized (machine endpoints, admin, assets). */
const NON_LOCALIZED_PREFIXES = [
  '/api',
  '/admin',
  '/_next',
  '/.well-known',
  '/llms.txt',
  '/rss.xml',
  '/sitemap.xml',
  '/robots.txt',
  '/opengraph-image',
  '/tokenlist.json',
  '/favicon',
];

export function isLocalizablePath(pathname: string): boolean {
  return !NON_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

/** `('/founder', 'en') → '/en/founder'`; the default locale is unprefixed. */
export function localizePath(pathname: string, locale: string): string {
  const path = normalizePath(pathname);
  if (locale === DEFAULT_LOCALE || !isLocalizablePath(path)) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** Inverse of `localizePath`: `' /en/founder' → { locale: 'en', path: '/founder' }`. */
export function parseLocalizedPath(pathname: string): { locale: LocaleCode; path: string } {
  const path = normalizePath(pathname);
  const [, first, ...rest] = path.split('/');
  if (first && first !== DEFAULT_LOCALE && isLocaleCode(first)) {
    const remainder = rest.length ? `/${rest.join('/')}` : '/';
    return { locale: first, path: remainder };
  }
  return { locale: DEFAULT_LOCALE, path };
}

/** Coerces an unknown route param to a locale, falling back to the default. */
export function coerceLocale(value: string | null | undefined): LocaleCode {
  return value && isLocaleCode(value) ? value : DEFAULT_LOCALE;
}

/**
 * `hreflang` map for one unprefixed path. Only locales whose copy is
 * complete take part, so we never point search engines at an English
 * duplicate served from `/de`.
 */
export function alternateLanguages(pathname: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of INDEXABLE_LOCALES) {
    languages[locale] = localizePath(pathname, locale);
  }
  languages['x-default'] = localizePath(pathname, DEFAULT_LOCALE);
  return languages;
}

/** Text direction for an `<html dir>` attribute. Unknown/legacy locales (e.g. 'ar') are handled as RTL. */
export function localeDirection(locale: string): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
