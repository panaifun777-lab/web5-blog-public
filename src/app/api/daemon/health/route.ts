// ════════════════════════════════════════════════════════════════
// src/app/api/daemon/health/route.ts
// 无头守护引擎与自治系统健康检查监控端点
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voucherGateway } from '@/lib/web5/x402/voucher-engine';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';
import { AGENT_DAEMON_ENABLED } from '@/lib/launch/flags';
import pkg from '../../../../../package.json';

export const dynamic = 'force-dynamic';

const startedAt = Date.now();

export async function GET() {
  const memUsage = process.memoryUsage();

  let database = 'UNAVAILABLE';
  try {
    await db.$queryRaw`SELECT 1`;
    database = 'OK';
  } catch (err) {
    console.error('[daemon/health] database check failed:', err);
  }

  const daemonEnabled = AGENT_DAEMON_ENABLED && process.env.DISABLE_AGENT_DAEMON !== 'true';
  const healthy = database === 'OK';

  let voucherStats: Awaited<ReturnType<typeof voucherGateway.getChannelStats>> | null = null;
  try {
    voucherStats = await voucherGateway.getChannelStats();
  } catch (err) {
    console.error('[daemon/health] voucher stats check failed:', err);
  }

  return NextResponse.json(
    {
      status: healthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: Date.now(),
      system: {
        version: process.env.APP_VERSION || `v${pkg.version}`,
        commit: process.env.APP_COMMIT || null,
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        memory: {
          rssMb: (memUsage.rss / 1024 / 1024).toFixed(1),
          heapUsedMb: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
        },
      },
      checks: {
        database,
      },
      daemon: {
        enabled: daemonEnabled,
        mode: daemonEnabled ? 'ACTIVE' : 'DISABLED',
        maxConcurrency: 3,
        retryPolicy: 'ExponentialBackoff (1s -> 2s -> 4s)',
      },
      voucherGateway: voucherStats,
      onChain: {
        network: 'Circle ARC Mainnet',
        chainId: ARC_MAINNET.id,
        contracts: ARC_MAINNET.addresses,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
