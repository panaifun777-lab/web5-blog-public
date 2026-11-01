// ════════════════════════════════════════════════════════════════
// src/lib/web5/payments/arc-chain.ts
// Single source of truth for the Arc viem chain object + read client.
// Extracted out of arc.ts so that the signer abstraction (signer.ts) can
// reuse the exact same chain without importing the Prisma-backed arc.ts
// (which would create a cycle once arc.ts delegates signing to signer.ts).
// ════════════════════════════════════════════════════════════════

import { createPublicClient, defineChain, http } from 'viem';
import { getActiveChain } from '@/lib/web5/contracts/addresses';

const ACTIVE_CHAIN = getActiveChain();

/** RPC endpoint of the active chain (arc-mainnet 5042 unless overridden). */
export const arcRpcUrl = ACTIVE_CHAIN.rpcUrl;

export const arcChain = defineChain({
  id: ACTIVE_CHAIN.id,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ACTIVE_CHAIN.rpcUrl] } },
  blockExplorers: { default: { name: 'ArcScan', url: ACTIVE_CHAIN.explorer } },
});

export const arcPublicClient = createPublicClient({
  chain: arcChain,
  transport: http(ACTIVE_CHAIN.rpcUrl),
});
