// ════════════════════════════════════════════════════════════════
// src/app/api/daemon/health/route.ts
// 无头守护引擎与自治系统健康检查监控端点
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { voucherGateway } from '@/lib/web5/x402/voucher-engine';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  return NextResponse.json({
    status: 'HEALTHY',
    timestamp: Date.now(),
    system: {
      version: 'v0.9.0-alpha-testnet',
      uptimeSeconds: Math.floor(uptime),
      memory: {
        rssMb: (memUsage.rss / 1024 / 1024).toFixed(1),
        heapUsedMb: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
      },
    },
    daemon: {
      circuitBreaker: 'CLOSED', // 正常放行状态
      maxConcurrency: 3,
      llmTier: 'DeepSeek / Native Ontology Microkernel',
      retryPolicy: 'ExponentialBackoff (1s -> 2s -> 4s)',
    },
    voucherGateway: voucherGateway.getChannelStats(),
    onChain: {
      network: 'Circle ARC Mainnet',
      chainId: ARC_MAINNET.id,
      contracts: ARC_MAINNET.addresses,
    },
  });
}
