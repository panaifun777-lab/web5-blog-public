// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/index.ts — locale → catalog map
//
// fr/de/ru/ar are shipped as explicit `en` aliases so a locale pick can
// never resolve to `undefined`. ja/ko/es are partial and rely on the
// per-key fallback inside `translate()`.
// ════════════════════════════════════════════════════════════════

import type { LocaleCode } from '../config';
import type { DeepPartial } from '../types';
import type { Dictionary } from './zh-CN';
import zhCN from './zh-CN';
import en from './en';
import ja from './ja';
import ko from './ko';
import es from './es';

export type Catalog = DeepPartial<Dictionary>;

export const DICTIONARIES: Record<LocaleCode, Catalog> = {
  'zh-CN': zhCN,
  en,
  ja,
  ko,
  es,
  fr: en,
  de: en,
  ru: en,
  ar: en,
};

export { zhCN, en, ja, ko, es };
