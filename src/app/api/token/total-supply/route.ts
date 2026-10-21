// ════════════════════════════════════════════════════════════════
// src/app/api/token/total-supply/route.ts
// CoinGecko & 权威排名平台专用只读总供应量 API 端点
// 返回纯文本纯数字字符串 (Plain Text)，供爬虫每 5 分钟自动抓取
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createPublicClient, http, defineChain } from 'viem';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

export const dynamic = 'force-dynamic';

const arcMainnet = defineChain({
  id: ARC_MAINNET.id,
  name: ARC_MAINNET.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_MAINNET.rpcUrl] } },
});

const TOKEN_ABI = [
  { type: 'function', name: 'totalSupply', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

export async function GET() {
  try {
    const client = createPublicClient({ chain: arcMainnet, transport: http() });
    
    // 读取链上实际 totalSupply
    const rawTotal = await client.readContract({
      address: ARC_MAINNET.addresses.WBOG as `0x${string}`,
      abi: TOKEN_ABI,
      functionName: 'totalSupply',
    });

    // 读取已打入黑洞地址的销毁数量
    const burnedBal = await client.readContract({
      address: ARC_MAINNET.addresses.WBOG as `0x${string}`,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: ['0x000000000000000000000000000000000000dEaD'],
    }).catch(() => 0n);

    // 净总供应量 (减去黑洞销毁)
    const netTotal = rawTotal - burnedBal;
    const formatted = (Number(netTotal / 10n ** 16n) / 100).toFixed(2);

    return new Response(formatted, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=120, s-maxage=300',
      },
    });
  } catch (err) {
    // 基础固定上限兜底: 1,000,000,000.00
    return new Response('1000000000.00', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
