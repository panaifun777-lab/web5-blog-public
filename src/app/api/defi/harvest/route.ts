// ════════════════════════════════════════════════════════════════
// src/app/api/defi/harvest/route.ts
// DeFi 收益 API — 模拟收割已停用，等待真实策略与链上验证
// ════════════════════════════════════════════════════════════════

import { featureDisabled } from '@/lib/launch/flags';

export const dynamic = 'force-dynamic';

const DISABLED_MESSAGE =
  'DeFi 收益收割尚未接入真实策略与链上结算，当前不会产生任何收益记录。';

export async function POST() {
  return featureDisabled('DEFI_HARVEST_DISABLED', DISABLED_MESSAGE);
}

export async function GET() {
  return featureDisabled('DEFI_HARVEST_DISABLED', DISABLED_MESSAGE);
}
