// ════════════════════════════════════════════════════════════════
// src/lib/web5/dex/uniswap-v4.ts
// Circle ARC Mainnet (5042) Uniswap v4 价格信标池与实时流动性监控
// 真实仓位 Position ID: #304322
// ════════════════════════════════════════════════════════════════

import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

export interface DexPoolInfo {
  dexName: 'Uniswap v4';
  network: 'Circle ARC Mainnet';
  chainId: 5042;
  positionId: string;
  positionUrl: string;
  swapUrl: string;
  pair: '$WBOG / USDC';
  baseToken: string; // $WBOG 地址
  quoteToken: string; // USDC (Arc 原生 Gas 资产)
  initialPriceUsdc: number; // $0.00008
  status: 'ACTIVE_TRADING';
  beaconPoolActive: boolean;
  totalSwapsRecorded: number;
}

export const UNISWAP_V4_ARC_POOL: DexPoolInfo = {
  dexName: 'Uniswap v4',
  network: 'Circle ARC Mainnet',
  chainId: 5042,
  positionId: '304322',
  positionUrl: 'https://app.uniswap.org/positions/v4/arc/304322',
  swapUrl: 'https://app.uniswap.org/swap?chain=arc&inputCurrency=NATIVE&outputCurrency=0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f',
  pair: '$WBOG / USDC',
  baseToken: ARC_MAINNET.addresses.WBOG,
  quoteToken: '0x0000000000000000000000000000000000000000', // Arc 原生 USDC
  initialPriceUsdc: 0.00008,
  status: 'ACTIVE_TRADING',
  beaconPoolActive: true,
  totalSwapsRecorded: 2,
};

/**
 * 返回配置中的静态参考价。当前并未连接任何链上行情源，
 * 因此 source 标记为 BEACON_ANCHOR，调用方不得宣称“实时价格”。
 */
export async function getLiveTokenPrice(): Promise<{
  priceUsdc: number;
  wbogPerUsdc: number;
  pool: DexPoolInfo;
  source: 'UNISWAP_V4_LIVE' | 'BEACON_ANCHOR';
}> {
  const priceUsdc = UNISWAP_V4_ARC_POOL.initialPriceUsdc;
  const wbogPerUsdc = 1 / priceUsdc;

  return {
    priceUsdc,
    wbogPerUsdc,
    pool: UNISWAP_V4_ARC_POOL,
    source: 'BEACON_ANCHOR',
  };
}
