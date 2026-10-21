import { NextRequest, NextResponse } from 'next/server';
import { clientIp, rateLimit, rateLimitResponse } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const VITALS = new Set(['CLS', 'FCP', 'INP', 'LCP', 'TTFB', 'FID']);

function truncate(value: unknown, max = 300) {
  return typeof value === 'string' ? value.slice(0, max) : undefined;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`rum:${clientIp(req)}`, 60, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }

  if (body.type === 'error') {
    console.error(
      '[rum.error]',
      JSON.stringify({
        message: truncate(body.message),
        digest: truncate(body.digest, 80),
        path: truncate(body.path, 200),
        at: new Date().toISOString(),
      })
    );
  } else if (typeof body.name === 'string' && VITALS.has(body.name)) {
    console.log(
      '[rum.vital]',
      JSON.stringify({
        name: body.name,
        value: typeof body.value === 'number' ? Math.round(body.value * 100) / 100 : null,
        rating: truncate(body.rating, 20),
        path: truncate(body.path, 200),
        at: new Date().toISOString(),
      })
    );
  }

  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
