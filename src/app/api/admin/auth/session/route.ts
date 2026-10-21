import { NextRequest, NextResponse } from 'next/server';
import { isSuperadmin } from '@/lib/admin/auth';
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  getAdminSessionFromRequest,
} from '@/lib/admin/session';

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session || !isSuperadmin(session.address)) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return NextResponse.json(
    {
      authenticated: true,
      address: session.address,
      expiresAt: session.expiresAt,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', adminCookieOptions(0));
  return response;
}
