// ════════════════════════════════════════════════════════════════
// src/lib/i18n/config.ts — locale registry (no React, no server APIs)
// Safe to import from RSC, route handlers, client components and tests.
// ════════════════════════════════════════════════════════════════

/** Every locale the switcher offers, in display order. */
export const LOCALE_CODES = ['zh-CN', 'en', 'ja', 'ko', 'es'] as const;

export type LocaleCode = (typeof LOCALE_CODES)[number];

/** zh-CN is the source of truth for the catalog. */
export const DEFAULT_LOCALE: LocaleCode = 'zh-CN';

/** Per-key fallback target for partially translated locales. */
export const FALLBACK_LOCALE: LocaleCode = 'en';

/** Canonical cookie written by the language switcher. */
export const LOCALE_COOKIE = 'locale';

/** Cookie used by the pre-2026-11 skeleton; still honoured on read. */
export const LEGACY_LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * - `source`      — zh-CN, the source of truth
 * - `complete`    — full key parity with zh-CN and localized copy; promoted
 *                   into the sitemap / hreflang / robots index. Latin-script
 *                   proper nouns and gated-feature notices may stay in English.
 * - `partial`     — `satisfies DeepPartial<Dictionary>`; missing keys fall back
 *                   to `en`. Currently unused (ja/ko/es graduated to complete).
 * - `fallback-en` — not translated at all, renders the `en` catalog. Kept out
 *                   of the index so search engines never see an English dup.
 */
export type LocaleStatus = 'source' | 'complete' | 'partial' | 'fallback-en';

export interface LocaleMeta {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  flag: string;
  /** Value for `openGraph.locale`. */
  ogLocale: string;
  status: LocaleStatus;
}

export const LOCALES: Record<LocaleCode, LocaleMeta> = {
  'zh-CN': { code: 'zh-CN', label: 'Chinese', nativeLabel: '简体中文', flag: '🇨🇳', ogLocale: 'zh_CN', status: 'source' },
  en: { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸', ogLocale: 'en_US', status: 'complete' },
  ja: { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵', ogLocale: 'ja_JP', status: 'complete' },
  ko: { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷', ogLocale: 'ko_KR', status: 'complete' },
  es: { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸', ogLocale: 'es_ES', status: 'complete' },
};

export const LOCALE_LIST: LocaleMeta[] = LOCALE_CODES.map((code) => LOCALES[code]);

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (LOCALE_CODES as readonly string[]).includes(value);
}

/**
 * BCP-47 primary subtag → catalog locale. `zh-TW`/`zh-Hant` intentionally map
 * to zh-CN. `fr`/`de`/`ru`/`ar` are dropped locales that alias `en` so a visitor
 * whose browser requests them still lands on readable English rather than the
 * zh-CN default.
 */
export const LANGUAGE_SUBTAG_TO_LOCALE: Record<string, LocaleCode> = {
  zh: 'zh-CN',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'en',
  de: 'en',
  ru: 'en',
  ar: 'en',
};
