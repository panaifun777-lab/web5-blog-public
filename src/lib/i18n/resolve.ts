// ════════════════════════════════════════════════════════════════
// src/lib/i18n/resolve.ts — locale negotiation (pure, testable)
//
// Order: cookie `locale` (legacy `NEXT_LOCALE`) → Accept-Language → zh-CN.
// ════════════════════════════════════════════════════════════════

import {
  DEFAULT_LOCALE,
  LANGUAGE_SUBTAG_TO_LOCALE,
  LOCALE_CODES,
  type LocaleCode,
} from './config';

export interface LanguagePreference {
  tag: string;
  quality: number;
  index: number;
}

/** Maps a BCP-47 tag (`en-US`, `zh-TW`, `ja`) to a catalog locale. */
export function matchLocaleTag(tag: string): LocaleCode | null {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return null;
  const exact = LOCALE_CODES.find((code) => code.toLowerCase() === normalized);
  if (exact) return exact;
  const base = normalized.split('-')[0];
  return LANGUAGE_SUBTAG_TO_LOCALE[base] ?? null;
}

/**
 * Parses an `Accept-Language` header into preferences ordered by quality.
 * Malformed entries (empty tags, `*`, unparseable `q`, `q=0`) are dropped,
 * so a garbage header degrades to the default locale instead of throwing.
 */
export function parseAcceptLanguage(header?: string | null): LanguagePreference[] {
  if (!header) return [];
  return header
    .split(',')
    .map((raw, index): LanguagePreference => {
      const [tagPart, ...params] = raw.split(';');
      let quality = 1;
      for (const param of params) {
        const match = /^\s*q\s*=\s*(.*?)\s*$/i.exec(param);
        if (!match) continue;
        const parsed = Number.parseFloat(match[1]);
        quality = Number.isFinite(parsed) ? parsed : 0;
      }
      return { tag: (tagPart ?? '').trim(), quality, index };
    })
    .filter((entry) => entry.tag.length > 0 && entry.tag !== '*' && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export interface LocaleResolutionInput {
  cookie?: string | null;
  acceptLanguage?: string | null;
}

/** Resolves the active locale for one request. */
export function resolveLocale(input: LocaleResolutionInput = {}): LocaleCode {
  const cookieLocale = input.cookie ? matchLocaleTag(safeDecode(input.cookie)) : null;
  if (cookieLocale) return cookieLocale;

  for (const preference of parseAcceptLanguage(input.acceptLanguage)) {
    const matched = matchLocaleTag(preference.tag);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}
