import { NextResponse, type NextRequest } from 'next/server';
import { resolveLocale } from '@/lib/i18n/resolve';
import { PREFIXED_LOCALES } from '@/lib/i18n/routing';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';

const PUBLIC_CACHEABLE = [
  /^\/$/,
  /^\/p\/[^/]+$/,
  /^\/founder$/,
  /^\/rss\.xml$/,
  /^\/sitemap\.xml$/,
  /^\/llms\.txt$/,
  /^\/\.well-known\/.+/,
  /^\/api\/openapi\.json$/,
];

const SESSION_COOKIE = /(session|token|auth|wallet|vessel|connect\.sid)/i;

function securityHeaders(headers: Headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-DNS-Prefetch-Control', 'on');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), usb=(), payment=(self)'
  );
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set(
    'Content-Security-Policy-Report-Only',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ')
  );
}

function hasSession(req: NextRequest) {
  if (req.headers.has('authorization')) return true;
  return req.cookies.getAll().some((cookie) => SESSION_COOKIE.test(cookie.name));
}

// Locale negotiation only applies to localizable pages — never to API,
// admin, Next internals, feeds, well-known, or static assets.
const NON_PAGE_PREFIX = /^\/(api|admin|_next|\.well-known)(\/|$)/;
const NON_PAGE_FILE =
  /^\/(llms\.txt|rss\.xml|sitemap\.xml|opengraph-image|tokenlist\.json|favicon\.ico)$/;

function isLocalePage(pathname: string): boolean {
  if (NON_PAGE_PREFIX.test(pathname)) return false;
  if (NON_PAGE_FILE.test(pathname)) return false;
  const lastSegment = pathname.split('/').pop() ?? '';
  return !lastSegment.includes('.');
}

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto');
  const url = req.nextUrl;

  if (proto === 'http' && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
    url.protocol = 'https:';
    const redirect = NextResponse.redirect(url, 308);
    securityHeaders(redirect.headers);
    return redirect;
  }

  if (host.startsWith('www.')) {
    url.host = host.slice(4);
    const redirect = NextResponse.redirect(url, 301);
    securityHeaders(redirect.headers);
    return redirect;
  }

  // Accept-Language negotiation (merged from the former src/middleware.ts):
  // first-time visitors preferring a non-default, prefixed locale are sent
  // to the localized path. Already-prefixed paths and non-pages pass through.
  if (req.method === 'GET' && isLocalePage(url.pathname)) {
    const isPrefixed = PREFIXED_LOCALES.some(
      (locale) => url.pathname === `/${locale}` || url.pathname.startsWith(`/${locale}/`),
    );
    if (!isPrefixed) {
      const locale = resolveLocale({ acceptLanguage: req.headers.get('accept-language') });
      if (locale !== DEFAULT_LOCALE && PREFIXED_LOCALES.includes(locale)) {
        url.pathname = url.pathname === '/' ? `/${locale}` : `/${locale}${url.pathname}`;
        const redirect = NextResponse.redirect(url);
        securityHeaders(redirect.headers);
        return redirect;
      }
    }
  }

  const response = NextResponse.next();

  if (
    req.method === 'GET' &&
    PUBLIC_CACHEABLE.some((pattern) => pattern.test(url.pathname))
  ) {
    response.headers.set(
      'Cache-Control',
      hasSession(req)
        ? 'private, no-store'
        : 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
    );
  }

  securityHeaders(response.headers);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
