// ════════════════════════════════════════════════════════════════
// src/lib/i18n/index.tsx — 全球 9 大主流语言国际化定义
// 涵盖联合国官方语言 + 全球核心币圈市场（中/英/日/韩/西/法/德/俄/阿）
// ════════════════════════════════════════════════════════════════

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import zhCN from './locales/zh-CN';
import en from './locales/en';
import ja from './locales/ja';
import ko from './locales/ko';
import es from './locales/es';
import type { Translations } from './locales/zh-CN';

export type LocaleCode = 'zh-CN' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'ar';

export interface LocaleDef {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  flag: string;
  translations: Translations;
}

export const LOCALES: Record<LocaleCode, LocaleDef> = {
  'zh-CN': { code: 'zh-CN', label: 'Chinese',    nativeLabel: '简体中文', flag: '🇨🇳', translations: zhCN },
  'en':    { code: 'en',    label: 'English',    nativeLabel: 'English',  flag: '🇺🇸', translations: en as unknown as Translations },
  'ja':    { code: 'ja',    label: 'Japanese',   nativeLabel: '日本語',   flag: '🇯🇵', translations: ja as unknown as Translations },
  'ko':    { code: 'ko',    label: 'Korean',     nativeLabel: '한국어',   flag: '🇰🇷', translations: ko as unknown as Translations },
  'es':    { code: 'es',    label: 'Spanish',    nativeLabel: 'Español',  flag: '🇪🇸', translations: es as unknown as Translations },
  'fr':    { code: 'fr',    label: 'French',     nativeLabel: 'Français', flag: '🇫🇷', translations: en as unknown as Translations },
  'de':    { code: 'de',    label: 'German',     nativeLabel: 'Deutsch',  flag: '🇩🇪', translations: en as unknown as Translations },
  'ru':    { code: 'ru',    label: 'Russian',    nativeLabel: 'Русский',  flag: '🇷🇺', translations: en as unknown as Translations },
  'ar':    { code: 'ar',    label: 'Arabic',     nativeLabel: 'العربية',  flag: '🇦🇪', translations: en as unknown as Translations },
};

function detectLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'zh-CN';
  const stored = localStorage.getItem('web5_locale') as LocaleCode | null;
  if (stored && LOCALES[stored]) return stored;
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang === 'en') return 'en';
  if (browserLang === 'ja') return 'ja';
  if (browserLang === 'ko') return 'ko';
  if (browserLang === 'es') return 'es';
  if (browserLang === 'fr') return 'fr';
  if (browserLang === 'de') return 'de';
  if (browserLang === 'ru') return 'ru';
  if (browserLang === 'ar') return 'ar';
  return 'zh-CN';
}

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t: Translations;
  locales: LocaleDef[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectLocale);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('web5_locale', code);
      // 派发全站全局事件通知实时翻译引擎联动
      window.dispatchEvent(new CustomEvent('web5_language_changed', { detail: { language: code } }));
    }
  }, []);

  const t = LOCALES[locale]?.translations || LOCALES['zh-CN'].translations;
  const locales = Object.values(LOCALES);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT() {
  return useI18n().t;
}
