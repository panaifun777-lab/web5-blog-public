// ════════════════════════════════════════════════════════════════
// src/middleware.ts — Edge middleware: Accept-Language locale negotiation
//
// Policy (mirrors src/lib/i18n/routing.ts): the default locale (zh-CN) is
// served unprefixed at `/`, every other locale lives under `/<locale>`.
// First-time visitors whose browser prefers a non-default, prefixed locale
// are redirected to the localized path. Already-prefixed paths, default/
// unknown languages, and non-page assets are passed through untouched.
// ════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from 'next/server';
import { resolveLocale } from '@/lib/i18n/resolve';
import { PREFIXED_LOCALES } from '@/lib/i18n/routing';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';

export const config = {
  // Negative-lookahead matcher: run the middleware for every request EXCEPT
  // the listed routes (API, admin, Next internals, feeds, well-known, etc.).
  // Static files that don't start with those prefixes are additionally
  // guarded in the handler below (see isStaticAsset).
  matcher: [
    '/((?!api|_next|.well-known|llms.txt|admin|rss.xml|sitemap.xml|opengraph-image|tokenlist.json|favicon).*)',
  ],
};

// A request whose final path segment carries a file extension is a static
// asset (image, font, document, …); it must never be locale-redirected.
function isStaticAsset(pathname: string): boolean {
  const lastSegment = pathname.split('/').pop() ?? '';
  return lastSegment.includes('.');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // (1) Don't touch static assets — they're not localizable pages.
  if (isStaticAsset(pathname)) return NextResponse.next();

  // (2) Already locale-prefixed (e.g. /en, /en/founder)? Leave it alone to
  //     avoid redirect loops and to respect an explicit locale choice.
  const isPrefixed = PREFIXED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (isPrefixed) return NextResponse.next();

  // (3) Negotiate from Accept-Language (reuse the shared helper — do not
  //     reimplement BCP-47 parsing here).
  const acceptLanguage = request.headers.get('accept-language');
  const locale = resolveLocale({ acceptLanguage });

  // Only redirect when the negotiated locale is a non-default, prefixed one.
  if (locale === DEFAULT_LOCALE || !PREFIXED_LOCALES.includes(locale)) {
    return NextResponse.next();
  }

  // (4) `/` → `/<locale>`; `/founder` → `/<locale>/founder`. Preserve query.
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}
