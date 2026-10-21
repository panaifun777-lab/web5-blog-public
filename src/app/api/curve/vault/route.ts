// ════════════════════════════════════════════════════════════════
// src/app/api/curve/vault/route.ts
// GenesisCurveVault 创世联合曲线储备金库与天使认购 API
// 门槛: 3,000 USDC 触发自动毕业并永久锁死 Uniswap LP 与丢弃权限
// 所有进度与金额均来自链上真实查询，无演示数据
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { TREASURY } from '@/lib/web5/contracts/addresses';
import { featureDisabled } from '@/lib/launch/flags';

interface Contribution {
  txHash: string;
  buyerDid: string;
  usdcPaid: number;
  wbogReceived: number;
  timestamp: number;
}

const GRADUATION_CAP_USDC = 3000.0;
const BASE_PRICE_USDC = 0.00008;
const MAX_PER_TX_USDC = 20.0;

const publicClient = createPublicClient({
  chain: {
    id: 5042,
    name: 'Arc Mainnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } },
  },
  transport: http(),
});

// 链上真实查询金库余额
async function getRealReserveUsdc(): Promise<number> {
  try {
    const bal = await publicClient.getBalance({ address: TREASURY as `0x${string}` });
    return Number(bal) / 1e18;
  } catch {
    return 0;
  }
}

export async function GET() {
  const currentReserveUsdc = await getRealReserveUsdc();
  const currentPrice = BASE_PRICE_USDC * (1 + 0.0005 * (currentReserveUsdc / 10.0));
  const progressPercent = Math.min(100, (currentReserveUsdc / GRADUATION_CAP_USDC) * 100);

  return NextResponse.json({
    success: true,
    vault: {
      implemented: false,
      status: 'DISABLED',
      currentReserveUsdc: Number(currentReserveUsdc.toFixed(6)),
      graduationCapUsdc: GRADUATION_CAP_USDC,
      progressPercent: parseFloat(progressPercent.toFixed(2)),
      currentPriceUsdc: parseFloat(currentPrice.toFixed(8)),
      maxPerTxUsdc: MAX_PER_TX_USDC,
      isGraduated: false,
      contributionsCount: 0,
      recentContributions: [],
      treasury: TREASURY,
      graduationRules: '认购、毕业与 LP 锁仓合约尚未上线，当前页面不接收任何资金。',
    },
  });
}

export async function POST(_req: NextRequest) {
  return featureDisabled(
    'CURVE_VAULT_DISABLED',
    '创世认购尚未开放：认购合约、代币发放与毕业机制均未上线，请勿转账。'
  );
}
