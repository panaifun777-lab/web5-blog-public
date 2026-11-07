// ════════════════════════════════════════════════════════════════
// src/lib/i18n/locales/index.ts — locale → catalog map
//
// Only the five shipped locales carry a catalog; fr/de/ru/ar were trimmed and
// are no longer LocaleCode values (their subtag requests alias `en` in
// config.LANGUAGE_SUBTAG_TO_LOCALE). ja/ko/es are partial and rely on the
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
};

export { zhCN, en, ja, ko, es };
