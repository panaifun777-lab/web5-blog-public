// ════════════════════════════════════════════════════════════════
// src/app/api/ap2/budget/route.ts
// AP2 预算调整 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authorizeAdmin } from '@/lib/admin/guard';
import { resolveVesselSessionFromToken } from '@/lib/web5/token-issuer';
import { apiError } from '@/lib/web5/api/errors';

// 预算以 6 位精度 USDC 存储（与 toTokenUnits / BudgetFence 消费方一致）。
const USDC_UNIT = 1_000_000n;
const MIN_LIMIT_USDC = 1;
const MAX_LIMIT_USDC = 100;

function bearerToken(req: NextRequest): string {
  const raw = req.headers.get('authorization') || '';
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
}

function parseLimit(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < MIN_LIMIT_USDC || value > MAX_LIMIT_USDC) return null;
  return value;
}

export async function POST(req: NextRequest) {
  try {
    // 预算影响资金策略：管理员可调整任意当前 vessel，或登陆中的 vessel
    // 只能调整自己的预算。匿名请求一律拒绝。
    const admin = authorizeAdmin(req);
    let vesselId: string | null = null;

    if (!admin.ok) {
      const session = await resolveVesselSessionFromToken(bearerToken(req));
      if (!session?.vesselDid || session.accessMode !== 'vessel') {
        return apiError('BUDGET_AUTH_REQUIRED', { request: req });
      }
      const own = await db.vessel.findUnique({
        where: { did: session.vesselDid },
        select: { id: true },
      });
      if (!own) {
        return apiError('VESSEL_NOT_FOUND', { request: req });
      }
      vesselId = own.id;
    }

    const body = await req.json().catch(() => ({}));
    const dailyLimit = parseLimit(body.dailyLimit);
    if (dailyLimit === null) {
      return apiError('BUDGET_LIMIT_OUT_OF_RANGE', {
        request: req,
        params: { field: 'dailyLimit', min: MIN_LIMIT_USDC, max: MAX_LIMIT_USDC },
      });
    }

    const rawPerTxLimit = body.perTxLimit;
    const perTxLimit = rawPerTxLimit === undefined ? null : parseLimit(rawPerTxLimit);
    if (rawPerTxLimit !== undefined && perTxLimit === null) {
      return apiError('BUDGET_LIMIT_OUT_OF_RANGE', {
        request: req,
        params: { field: 'perTxLimit', min: MIN_LIMIT_USDC, max: MAX_LIMIT_USDC },
      });
    }

    // 管理员未指定 vessel 时沿用 MVP 行为：第一个活跃 vessel。
    const vessel = vesselId
      ? await db.vessel.findUnique({ where: { id: vesselId } })
      : await db.vessel.findFirst({ where: { status: 'ACTIVE' } });
    if (!vessel) {
      return apiError('NO_ACTIVE_VESSEL', { request: req });
    }

    const budget = await db.aP2Budget.findFirst({ where: { vesselId: vessel.id } });
    if (!budget) {
      return apiError('BUDGET_NOT_FOUND', { request: req });
    }

    const effectivePerTxLimit =
      perTxLimit ?? Number(budget.perTxLimit) / Number(USDC_UNIT);
    if (effectivePerTxLimit > dailyLimit) {
      return apiError('PER_TX_EXCEEDS_DAILY_LIMIT', { request: req });
    }

    const updated = await db.aP2Budget.update({
      where: { id: budget.id },
      data: {
        dailyLimit: BigInt(dailyLimit) * USDC_UNIT,
        ...(perTxLimit === null ? {} : { perTxLimit: BigInt(perTxLimit) * USDC_UNIT }),
      },
    });

    return NextResponse.json({
      success: true,
      dailyLimit: Number(updated.dailyLimit) / Number(USDC_UNIT),
    });
  } catch (err) {
    console.error('[ap2/budget] Error:', err);
    return apiError('INTERNAL_ERROR', { request: req });
  }
}
