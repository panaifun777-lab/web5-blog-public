// ════════════════════════════════════════════════════════════════
// src/app/api/defi/harvest/route.ts
// DeFi 收益 API — 模拟收割已停用，等待真实策略与链上验证
// ════════════════════════════════════════════════════════════════

import { featureDisabled } from '@/lib/launch/flags';

export const dynamic = 'force-dynamic';

export async function POST() {
  return featureDisabled('DEFI_HARVEST_DISABLED', 'flags.defiHarvestDisabled');
}

export async function GET() {
  return featureDisabled('DEFI_HARVEST_DISABLED', 'flags.defiHarvestDisabled');
}
