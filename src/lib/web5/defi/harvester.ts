// ════════════════════════════════════════════════════════════════
// src/lib/web5/defi/harvester.ts
// DeFi 收益模拟器 — 模拟 Aave/Compound/Morpho 自动复投
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';

export interface HarvestRecord {
  vesselId: string;
  source: string;
  pool: string;
  apy: number;
  yieldAmount: bigint;
  timestamp: Date;
}

/**
 * 模拟执行一次 DeFi 收益收割
 */
export async function simulateHarvest(vesselId: string): Promise<HarvestRecord> {
  const vessel = await db.vessel.findUnique({ where: { id: vesselId } });
  if (!vessel) throw new Error('Vessel not found');

  const pools = [
    { name: 'Aave USDC', apy: 4.2 + Math.random() * 2.5 },
    { name: 'Compound USDC', apy: 3.8 + Math.random() * 3.0 },
    { name: 'Morpho Blue', apy: 5.1 + Math.random() * 3.5 },
    { name: 'Aerodrome USDC/USDT', apy: 8.5 + Math.random() * 4.0 },
  ];
  const pool = pools[Math.floor(Math.random() * pools.length)];
  const yieldAmount = BigInt(Math.floor(Math.random() * 2500) + 500);

  await db.autonomousLog.create({
    data: {
      vesselId,
      action: 'harvest',
      yieldAmount,
      metadata: JSON.stringify({ source: 'DeFi', pool: pool.name, apy: pool.apy.toFixed(2) + '%', strategy: 'auto-compound' }),
    },
  });

  return { vesselId, source: 'DeFi', pool: pool.name, apy: pool.apy, yieldAmount, timestamp: new Date() };
}

/**
 * 查询 Vessel 的总 DeFi 收益
 */
export async function getTotalHarvest(vesselDid: string): Promise<{
  totalYield: string;
  harvestCount: number;
  recentHarvests: any[];
}> {
  const vessel = await db.vessel.findUnique({ where: { did: vesselDid } });
  if (!vessel) return { totalYield: '0', harvestCount: 0, recentHarvests: [] };

  const harvests = await db.autonomousLog.findMany({
    where: { vesselId: vessel.id, action: 'harvest' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const totalYield = harvests.reduce((sum, h) => sum + (h.yieldAmount || 0n), 0n);
  return {
    totalYield: totalYield.toString(),
    harvestCount: harvests.length,
    recentHarvests: harvests.map(h => ({
      amount: h.yieldAmount?.toString() || '0',
      pool: JSON.parse(h.metadata || '{}').pool || 'unknown',
      apy: JSON.parse(h.metadata || '{}').apy || '0%',
      createdAt: h.createdAt,
    })),
  };
}
