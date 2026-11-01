'use client';

// ════════════════════════════════════════════════════════════════
// src/lib/i18n/index.tsx — client entry point (provider + hooks)
//
// The provider is seeded by the root layout with the server-resolved
// locale, so SSR markup and the first client render agree. Switching
// writes the `locale` cookie (and the legacy `NEXT_LOCALE`) and reloads,
// so the next request is server-rendered in the new language.
// ════════════════════════════════════════════════════════════════

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LEGACY_LOCALE_COOKIE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_LIST,
  LOCALES,
  isLocaleCode,
  type LocaleCode,
  type LocaleMeta,
} from './config';
import { createT } from './translate';
import type { TFunction } from './types';

export { LOCALES, LOCALE_LIST, DEFAULT_LOCALE, isLocaleCode };
export type { LocaleCode, LocaleMeta, TFunction };
export type { MessageKey, TVars } from './types';

/** Legacy key read by the DOM translator; kept in sync for compatibility. */
const LEGACY_STORAGE_KEY = 'web5_locale';

function readCookieLocale(): LocaleCode | null {
  if (typeof document === 'undefined') return null;
  const match =
    document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`)) ??
    document.cookie.match(new RegExp(`(?:^|;\\s*)${LEGACY_LOCALE_COOKIE}=([^;]+)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isLocaleCode(value) ? value : null;
}

export interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  /** Typed translator: unknown keys are a compile error. */
  t: TFunction;
  locales: LocaleMeta[];
  /** True when the active locale falls back to `en` for some keys. */
  isPartial: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: LocaleCode;
}) {
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale);

  // Safety net: if the server could not resolve the cookie (e.g. a static
  // shell), adopt it right after mount instead of serving the wrong locale.
  useEffect(() => {
    const fromCookie = readCookieLocale();
    if (fromCookie && fromCookie !== locale) setLocaleState(fromCookie);
  }, [locale]);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    if (typeof document === 'undefined') return;
    const attrs = `path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `${LOCALE_COOKIE}=${code}; ${attrs}`;
    document.cookie = `${LEGACY_LOCALE_COOKIE}=${code}; ${attrs}`;
    try {
      window.localStorage.setItem(LEGACY_STORAGE_KEY, code);
    } catch {
      // private mode: the cookie is the source of truth anyway
    }
    document.documentElement.lang = code;
    window.dispatchEvent(new CustomEvent('web5_language_changed', { detail: { language: code } }));
  }, []);

  const t = useMemo(() => createT(locale), [locale]);
  const isPartial = LOCALES[locale].status === 'partial' || LOCALES[locale].status === 'fallback-en';

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, locales: LOCALE_LIST, isPartial }),
    [locale, setLocale, t, isPartial],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Shorthand for the typed translator. */
export function useT(): TFunction {
  return useI18n().t;
}
