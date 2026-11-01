import { describe, expect, it } from 'vitest';
import {
  alternateLanguages,
  coerceLocale,
  isLocalizablePath,
  localizePath,
  localeDirection,
  parseLocalizedPath,
  PREFIXED_LOCALES,
} from '@/lib/i18n/routing';
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/lib/i18n/config';

describe('localizePath', () => {
  it('keeps the default locale unprefixed', () => {
    expect(localizePath('/founder', 'zh-CN')).toBe('/founder');
    expect(localizePath('/', 'zh-CN')).toBe('/');
  });

  it('prefixes non-default locales and never double-slashes', () => {
    expect(localizePath('/founder', 'en')).toBe('/en/founder');
    expect(localizePath('/', 'en')).toBe('/en');
    expect(localizePath('founder', 'ja')).toBe('/ja/founder');
  });

  it('never localizes machine endpoints', () => {
    expect(localizePath('/api/openapi.json', 'en')).toBe('/api/openapi.json');
    expect(localizePath('/admin', 'de')).toBe('/admin');
    expect(localizePath('/.well-known/security.txt', 'fr')).toBe(
      '/.well-known/security.txt',
    );
  });
});

describe('parseLocalizedPath', () => {
  it('returns the default locale for unprefixed paths', () => {
    expect(parseLocalizedPath('/founder')).toEqual({ locale: 'zh-CN', path: '/founder' });
    expect(parseLocalizedPath('/')).toEqual({ locale: 'zh-CN', path: '/' });
  });

  it('splits a prefix into locale + path', () => {
    expect(parseLocalizedPath('/en/founder')).toEqual({ locale: 'en', path: '/founder' });
    expect(parseLocalizedPath('/ja')).toEqual({ locale: 'ja', path: '/' });
  });

  it('treats the default-locale token as a literal path (no /zh-CN prefix route exists)', () => {
    // The default locale is served unprefixed, so `/zh-CN/...` is not a
    // recognized locale prefix and 404s in production; keep it literal.
    expect(parseLocalizedPath('/zh-CN/founder')).toEqual({
      locale: 'zh-CN',
      path: '/zh-CN/founder',
    });
  });
});

describe('alternateLanguages', () => {
  it('only lists indexable locales plus x-default', () => {
    const langs = alternateLanguages('/founder');
    const keys = Object.keys(langs);
    expect(keys).toContain('zh-CN');
    expect(keys).toContain('en');
    expect(keys).toContain('x-default');
    // fr/de/ru/ar are fallback-en and stay out of the index
    expect(keys).not.toContain('fr');
    expect(langs['zh-CN']).toBe('/founder');
    expect(langs['en']).toBe('/en/founder');
    expect(langs['x-default']).toBe('/founder');
  });
});

describe('coerceLocale', () => {
  it('falls back to the default for unknown values', () => {
    expect(coerceLocale('xx')).toBe(DEFAULT_LOCALE);
    expect(coerceLocale(null)).toBe(DEFAULT_LOCALE);
    expect(coerceLocale('en')).toBe('en');
  });
});

describe('localeDirection', () => {
  it('flags Arabic as RTL', () => {
    expect(localeDirection('ar')).toBe('rtl');
    expect(localeDirection('en')).toBe('ltr');
  });
});

describe('isLocalizablePath', () => {
  it('excludes assets and machine routes', () => {
    expect(isLocalizablePath('/founder')).toBe(true);
    expect(isLocalizablePath('/api/health')).toBe(false);
    expect(isLocalizablePath('/admin/dashboard')).toBe(false);
    expect(isLocalizablePath('/llms.txt')).toBe(false);
  });
});

describe('route invariants', () => {
  it('every locale appears exactly once in the prefix list except default', () => {
    expect(PREFIXED_LOCALES).toHaveLength(LOCALE_CODES.length - 1);
    expect(PREFIXED_LOCALES).not.toContain(DEFAULT_LOCALE);
  });
});
