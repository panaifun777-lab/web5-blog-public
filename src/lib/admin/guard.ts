import type { NextRequest } from 'next/server';
import { isSuperadmin, validateApiKey } from '@/lib/admin/auth';
import { getAdminSessionFromRequest } from '@/lib/admin/session';

export interface AdminIdentity {
  ok: boolean;
  address?: string;
  via?: 'session' | 'api_key';
  status?: number;
  error?: string;
}

export function authorizeAdmin(req: NextRequest): AdminIdentity {
  const session = getAdminSessionFromRequest(req);
  if (session && isSuperadmin(session.address)) {
    return { ok: true, address: session.address, via: 'session' };
  }

  const apiKey = req.headers.get('x-api-key');
  if (validateApiKey(apiKey)) {
    return { ok: true, via: 'api_key' };
  }

  return {
    ok: false,
    status: 401,
    error: 'Unauthorized: sign in with an admin wallet or provide a valid API key',
  };
}
