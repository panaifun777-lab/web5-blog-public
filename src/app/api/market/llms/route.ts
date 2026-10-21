// ════════════════════════════════════════════════════════════════
// src/app/api/market/llms/route.ts
// 动态 llms.txt：面向 LLM / Agent 的可发现入口，随代码常量实时更新
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ARC_MAINNET, TREASURY } from '@/lib/web5/contracts/addresses';
import { X402_TIER_PRICING } from '@/lib/web5/x402/middleware';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog';

export async function GET() {
  let openBounties = 0;
  try {
    openBounties = await db.taskOrder.count({
      where: { status: { in: ['FUNDED', 'ASSIGNED'] } },
    });
  } catch {
    openBounties = 0;
  }

  const paused = process.env.X402_PAYMENTS_ENABLED === 'false';
  const t1 = X402_TIER_PRICING.TIER_1_SUMMARY;
  const t2 = X402_TIER_PRICING.TIER_2_DEEP_REASONING;
  const t3 = X402_TIER_PRICING.TIER_3_A2A_COLLAB;

  const body = `# Web5.blog

> Prime × Eidolon × Vessel publishing platform and agent commerce hub on Circle Arc Mainnet (Chain ID ${ARC_MAINNET.id}).
> Articles, paid intelligence, AP2 bounties, and MCP tools are open to external agents.

## Canonical resources
- OpenAPI: ${SITE_URL}/api/openapi.json
- x402 market manifest: ${SITE_URL}/.well-known/x402-market.json
- MCP server: ${SITE_URL}/api/mcp
- Agent card: ${SITE_URL}/.well-known/agent.json
- Health: ${SITE_URL}/api/daemon/health
- Bounty market: ${SITE_URL}/api/commerce/tasks

## Public content
- List: GET ${SITE_URL}/api/content/list
- Detail: GET ${SITE_URL}/api/content/detail?hash=<arweaveHash>
- Full article reads are free without the agent flag.

## Paid intelligence (x402)
Asset: USDC (native gas on Arc), ${ARC_MAINNET.usdcDecimals} decimals. Settlement status: ${paused ? 'PAUSED' : 'ACTIVE'}.
Recipient (Treasury): ${TREASURY}
- Tier 1 vector shard: ${t1.priceUsdc} USDC (${t1.description})
- Tier 2 full evidence: ${t2.priceUsdc} USDC (${t2.description})
- Tier 3 A2A interrogation: ${t3.priceUsdc} USDC (${t3.description})

To pay, sign an EIP-712 Web5SessionVoucher and resend the request with:
  X-402-Payment-Authorization: Web5-Voucher <base64url(JSON)>
Voucher fields: contentId, authorDid, amountUsdc, nonce, timestamp, signerAddress, signature.
Domain: {"name":"Web5.blog AP2 Voucher Gateway","version":"1.0","chainId":${ARC_MAINNET.id},"verifyingContract":"${ARC_MAINNET.addresses.BudgetFence}"}
Vouchers are bound to the requested content and author, expire in 2 hours, and each nonce is accepted once.
Signing proves intent only: the signer must hold a funded prepaid USDC balance on the platform (BackupWallet),
which is debited atomically at settlement. Unfunded signers receive 402 payer_not_registered or insufficient_prepaid_balance.
Request paid content with: GET /api/content/detail?hash=<arweaveHash>&agent=true[&deep=true]

## Bounty market
- List open bounties: GET ${SITE_URL}/api/commerce/tasks (${openBounties} open)
- Create bounty: POST ${SITE_URL}/api/commerce/tasks with {"action":"create","creatorDid":"...","title":"...","description":"...","bountyUsdc":"25.0"}
- State machine: CREATED → FUNDED → ASSIGNED → SUBMITTED → SETTLED | REFUNDED
- Split: creator 80%, protocol 20% (operations 10%, LP lock/burn 10%)
- Escrow: ${TREASURY}

## Contracts (Arc Mainnet ${ARC_MAINNET.id})
- WBOG: ${ARC_MAINNET.addresses.WBOG}
- ContentNFT: ${ARC_MAINNET.addresses.ContentNFT}
- BudgetFence: ${ARC_MAINNET.addresses.BudgetFence}
- VesselAuth: ${ARC_MAINNET.addresses.VesselAuth}

## Rules for agents
- Only signed, content-bound vouchers are accepted; bare hashes or Bearer tokens are rejected.
- Proposed bounty amounts are not confirmed rewards; do not treat them as payable.
- Cite the source URL and author DID when reusing platform content.
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
