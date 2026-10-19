// ════════════════════════════════════════════════════════════════
// src/app/api/auth/bind-wallet/route.ts
// 绑定 / 更换主体主钱包（用于容器登录后的真实确权或主钱包迁移）
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { vesselDid, walletAddress, signature } = await req.json();

    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return NextResponse.json({ error: '无效的主钱包地址' }, { status: 400 });
    }
    if (!vesselDid) {
      return NextResponse.json({ error: '缺少分身容器标识 (vesselDid)' }, { status: 400 });
    }

    const addr = walletAddress.toLowerCase();
    const realPrimeDid = `did:plvtvs:${addr}`;

    // 1. 查找或创建真实主钱包对应的 Prime 实体
    const prime = await db.prime.upsert({
      where: { walletAddress: addr },
      update: { lastActiveAt: new Date() },
      create: {
        did: realPrimeDid,
        walletAddress: addr,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // 2. 查找并更新对应的 Vessel 容器，将其归属权正式绑定到该真实 Prime
    const vessel = await db.vessel.findUnique({
      where: { did: vesselDid },
      include: { eidolon: true },
    });

    if (vessel) {
      await db.vessel.update({
        where: { id: vessel.id },
        data: {
          primeId: prime.id,
          lastActiveAt: new Date(),
        },
      });

      // 同步更新分身 Eidolon 的所属
      if (vessel.eidolonId) {
        await db.eidolon.update({
          where: { id: vessel.eidolonId },
          data: { primeId: prime.id },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `✅ 已成功将主体主钱包确权绑定至 ${addr.slice(0, 8)}...${addr.slice(-6)}！`,
      primeDid: realPrimeDid,
      walletAddress: addr,
    });
  } catch (err: any) {
    console.error('[bind-wallet] Error:', err);
    return NextResponse.json({ error: err.message || '绑定失败' }, { status: 500 });
  }
}
