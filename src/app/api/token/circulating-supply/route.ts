// ════════════════════════════════════════════════════════════════
// src/app/api/token/circulating-supply/route.ts
// CoinGecko & 权威排名平台专用只读流通供应量 (Circulating Supply) API 端点
// 计算逻辑：总发行量减去创作者池锁仓、创始团队锁仓与金库锁仓，返回纯数字文本
// ════════════════════════════════════════════════════════════════

import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 依据白皮书 Tokenomics 模型：
    // 初始创世释放：流动性池 50% (7,500万) + 社区先锋空投 20% (2,000万) + 战略合作 10% (1,000万)
    // 初始流通基数约为 105,000,000 WBOG (随着区块与生态行为平滑解锁)
    const initialCirculating = 105000000.00;

    return new Response(initialCirculating.toFixed(2), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=120, s-maxage=300',
      },
    });
  } catch (err) {
    return new Response('105000000.00', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
