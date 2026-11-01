// ════════════════════════════════════════════════════════════════
// src/lib/i18n/server.ts — RSC / server-helper entry point
//
// Reads the `locale` cookie first, then Accept-Language, default zh-CN.
// Only import this from server components, route handlers or server
// actions — it pulls in `next/headers`.
// ════════════════════════════════════════════════════════════════

import { cookies, headers } from 'next/headers';
import { LEGACY_LOCALE_COOKIE, LOCALE_COOKIE, type LocaleCode } from './config';
import { resolveLocale } from './resolve';
import { createT } from './translate';
import type { TFunction } from './types';

/** Locale for the current request. */
export async function getLocale(): Promise<LocaleCode> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const cookie =
    cookieStore.get(LOCALE_COOKIE)?.value ?? cookieStore.get(LEGACY_LOCALE_COOKIE)?.value ?? null;
  return resolveLocale({ cookie, acceptLanguage: headerList.get('accept-language') });
}

/** Typed translator for the current request, for use inside RSC. */
export async function getT(): Promise<TFunction> {
  return createT(await getLocale());
}

export { createT, translate } from './translate';
export type { TFunction, MessageKey, TVars } from './types';
