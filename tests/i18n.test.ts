import { describe, expect, it } from 'vitest';
import zhCN from '@/lib/i18n/locales/zh-CN';
import en from '@/lib/i18n/locales/en';
import ja from '@/lib/i18n/locales/ja';
import ko from '@/lib/i18n/locales/ko';
import es from '@/lib/i18n/locales/es';
import { DICTIONARIES } from '@/lib/i18n/locales';
import {
  createT,
  flattenCatalog,
  getCatalog,
  interpolate,
  translate,
} from '@/lib/i18n/translate';
import { matchLocaleTag, parseAcceptLanguage, resolveLocale } from '@/lib/i18n/resolve';
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/lib/i18n/config';
import type { MessageKey } from '@/lib/i18n/types';

const zhKeys = flattenCatalog(zhCN);

describe('catalog completeness', () => {
  it('exposes a non-trivial source catalog', () => {
    expect(Object.keys(zhKeys).length).toBeGreaterThan(50);
  });

  it('has every zh-CN key in en', () => {
    const enKeys = flattenCatalog(en);
    const missing = Object.keys(zhKeys).filter((key) => !(key in enKeys));
    expect(missing).toEqual([]);
  });

  it('has no key in en that zh-CN does not define', () => {
    const enKeys = flattenCatalog(en);
    const extra = Object.keys(enKeys).filter((key) => !(key in zhKeys));
    expect(extra).toEqual([]);
  });

  it('only holds string leaves', () => {
    for (const value of Object.values(zhKeys)) expect(typeof value).toBe('string');
  });

  it('ships the full catalog for ja/ko/es (100% key parity with zh-CN)', () => {
    const want = Object.keys(zhKeys).length;
    for (const [code, cat] of [['ja', ja], ['ko', ko], ['es', es]] as const) {
      const keys = Object.keys(flattenCatalog(cat));
      expect(keys.length, `${code} key count`).toBe(want);
      // every entry is a string, none empty
      for (const value of Object.values(flattenCatalog(cat))) {
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      }
    }
  });

  it('resolves every key in every locale without rendering undefined', () => {
    for (const locale of LOCALE_CODES) {
      for (const key of Object.keys(zhKeys)) {
        const value = translate(locale, key);
        expect(value, `${locale} ${key}`).toBeTruthy();
        expect(value).not.toBe('undefined');
      }
    }
  });
});

describe('fallback behaviour', () => {
  it('returns the key itself for an unknown key, deterministically', () => {
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist');
    expect(translate('zh-CN', 'does.not.exist')).toBe('does.not.exist');
    expect(translate('en', 'nav')).toBe('nav');
  });

  it('resolves its own translation for a completed locale (no en leak)', () => {
    // ja is now 100% complete, so article.noComments is the Japanese string,
    // not the English fallback.
    expect(translate('ja', 'article.noComments')).toBe(flattenCatalog(ja)['article.noComments']);
    expect(translate('ja', 'article.noComments')).not.toBe(en.article.noComments);
  });

  it('falls back from a dropped locale subtag to en', () => {
    expect(matchLocaleTag('ar')).toBe('en');
    expect(matchLocaleTag('de')).toBe('en');
    expect(translate(matchLocaleTag('ar')!, 'footer.follow')).toBe(en.footer.follow);
  });

  it('reads zh-CN from the source catalog', () => {
    expect(translate('zh-CN', 'nav.founder')).toBe(zhCN.nav.founder);
  });

  it('exposes the same catalog via createT and getCatalog', () => {
    const t = createT('ko');
    expect(t('nav.tabs.feed')).toBe(flattenCatalog(ko)['nav.tabs.feed'] ?? en.nav.tabs.feed);
    expect(getCatalog('zh-CN')).toBe(DICTIONARIES['zh-CN']);
  });
});

describe('interpolation', () => {
  it('substitutes {name} placeholders', () => {
    expect(interpolate('Hello {name}', { name: 'World' })).toBe('Hello World');
    expect(interpolate('{a}-{b}', { a: 1, b: 'x' })).toBe('1-x');
  });

  it('keeps unknown placeholders instead of writing undefined', () => {
    expect(interpolate('Hi {missing}')).toBe('Hi {missing}');
    expect(interpolate('Hi {missing}', { other: 1 })).toBe('Hi {missing}');
  });

  it('interpolates through the typed translator', () => {
    expect(translate('zh-CN', 'article.royalty', { rate: '5.0', license: 'CC-BY' })).toBe(
      '版税: 5.0% · CC-BY',
    );
    expect(translate('en', 'article.royalty', { rate: '5.0', license: 'CC-BY' })).toBe(
      'Royalty: 5.0% · CC-BY',
    );
  });

  it('interpolates error templates without leaking braces', () => {
    const rendered = translate('zh-CN', 'home.error.vesselAwakenFailed', { message: 'boom' });
    expect(rendered).toBe('容器唤醒失败：boom');
    expect(rendered).not.toContain('{');
  });

  it('accepts a typed key at compile time', () => {
    const key: MessageKey = 'home.hero.ctaRead';
    expect(translate('zh-CN', key)).toBe(zhCN.home.hero.ctaRead);
  });
});

describe('Accept-Language negotiation', () => {
  it('defaults to zh-CN when the header is absent', () => {
    expect(resolveLocale({})).toBe('zh-CN');
    expect(resolveLocale({ acceptLanguage: null })).toBe('zh-CN');
    expect(resolveLocale({ acceptLanguage: '' })).toBe('zh-CN');
  });

  it('maps en-US to en', () => {
    expect(resolveLocale({ acceptLanguage: 'en-US' })).toBe('en');
    expect(resolveLocale({ acceptLanguage: 'en-US,en;q=0.9,zh-CN;q=0.8' })).toBe('en');
  });

  it('maps zh-TW (and any zh-*) to zh-CN', () => {
    expect(resolveLocale({ acceptLanguage: 'zh-TW' })).toBe('zh-CN');
    expect(resolveLocale({ acceptLanguage: 'zh-Hant-HK,zh;q=0.9' })).toBe('zh-CN');
  });

  it('defaults to zh-CN for a malformed header', () => {
    expect(resolveLocale({ acceptLanguage: ';;;,,,' })).toBe('zh-CN');
    expect(resolveLocale({ acceptLanguage: 'en-US;q=not-a-number' })).toBe('zh-CN');
    expect(resolveLocale({ acceptLanguage: '*' })).toBe('zh-CN');
  });

  it('honours q-values and drops q=0 entries', () => {
    expect(parseAcceptLanguage('ja;q=0.4,ko;q=0.9')).toEqual([
      { tag: 'ko', quality: 0.9, index: 1 },
      { tag: 'ja', quality: 0.4, index: 0 },
    ]);
    expect(resolveLocale({ acceptLanguage: 'en;q=0,ja;q=0.5' })).toBe('ja');
  });

  it('prefers the cookie over Accept-Language', () => {
    expect(resolveLocale({ cookie: 'en', acceptLanguage: 'zh-CN' })).toBe('en');
    expect(resolveLocale({ cookie: 'ko', acceptLanguage: 'en-US' })).toBe('ko');
  });

  it('normalises short or lowercase cookie values and ignores junk', () => {
    expect(resolveLocale({ cookie: 'zh' })).toBe('zh-CN');
    expect(resolveLocale({ cookie: 'EN' })).toBe('en');
    expect(resolveLocale({ cookie: 'klingon', acceptLanguage: 'es-ES' })).toBe('es');
    expect(resolveLocale({ cookie: '' })).toBe(DEFAULT_LOCALE);
  });

  it('maps every primary subtag to a catalog locale', () => {
    // Shipped locales resolve to themselves (with region subtags).
    expect(matchLocaleTag('ja-JP')).toBe('ja');
    expect(matchLocaleTag('ko')).toBe('ko');
    expect(matchLocaleTag('es-ES')).toBe('es');
    expect(matchLocaleTag('zh-TW')).toBe('zh-CN');
    expect(matchLocaleTag('en')).toBe('en');
    // Dropped locales (fr/de/ru/ar) alias to en rather than resolve to themselves.
    expect(matchLocaleTag('fr-CA')).toBe('en');
    expect(matchLocaleTag('de')).toBe('en');
    expect(matchLocaleTag('ru-RU')).toBe('en');
    expect(matchLocaleTag('ar-EG')).toBe('en');
    expect(matchLocaleTag('x-private')).toBeNull();
  });
});
