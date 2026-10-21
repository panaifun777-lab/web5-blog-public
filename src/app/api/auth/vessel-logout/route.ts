// ════════════════════════════════════════════════════════════════
// src/app/api/auth/vessel-logout/route.ts
// 容器登出：撤销 Session Token
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('x-vessel-token');
    if (!token) {
      return NextResponse.json({ success: true, message: 'No active session' });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    await db.vesselSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[vessel-logout] Error:', err);
    return NextResponse.json({ success: true }); // 幂等
  }
}
