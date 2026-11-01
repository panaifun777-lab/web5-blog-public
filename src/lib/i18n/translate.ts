// ════════════════════════════════════════════════════════════════
// src/lib/i18n/translate.ts — pure translation core
//
// No React, no next/headers: usable from RSC, client code and vitest.
// Resolution order per key: requested locale → en → zh-CN → the key.
// ════════════════════════════════════════════════════════════════

import { DEFAULT_LOCALE, FALLBACK_LOCALE, type LocaleCode } from './config';
import { DICTIONARIES, type Catalog } from './locales';
import type { MessageKey, TFunction, TVars } from './types';

/** Resolves a dotted key inside a nested catalog. Returns `undefined` when absent. */
export function lookup(catalog: unknown, key: string): string | undefined {
  let node: unknown = catalog;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Replaces `{name}` placeholders. Unknown placeholders are left untouched. */
export function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

function chainFor(locale: LocaleCode): LocaleCode[] {
  return [locale, FALLBACK_LOCALE, DEFAULT_LOCALE].filter(
    (code, index, all) => all.indexOf(code) === index,
  );
}

/** Runtime translator. Accepts any string key; unknown keys return the key itself. */
export function translate(locale: LocaleCode, key: string, vars?: TVars): string {
  for (const code of chainFor(locale)) {
    const value = lookup(DICTIONARIES[code], key);
    if (value !== undefined) return interpolate(value, vars);
  }
  return key;
}

/** Compile-time checked translator for one locale. */
export function createT(locale: LocaleCode): TFunction {
  return (key: MessageKey, vars?: TVars) => translate(locale, key, vars);
}

/** Catalog for one locale, before fallback. Exposed for tooling and tests. */
export function getCatalog(locale: LocaleCode): Catalog {
  return DICTIONARIES[locale];
}

/** Flattens a catalog into `{ 'nav.founder': '…' }` — used by the catalog test. */
export function flattenCatalog(catalog: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof catalog !== 'object' || catalog === null) return out;
  for (const [key, value] of Object.entries(catalog as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[path] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(out, flattenCatalog(value, path));
    }
  }
  return out;
}
