// ════════════════════════════════════════════════════════════════
// src/app/api/market/llms/route.ts
// 动态 llms.txt：面向 LLM / Agent 的可发现入口，随代码常量实时更新
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ARC_MAINNET, TREASURY, getEscrowVaultAddress } from '@/lib/web5/contracts/addresses';
import { X402_TIER_PRICING } from '@/lib/web5/x402/middleware';
import { PAYOUT_SINGLE_CAP_USDC, PAYOUT_DAILY_CAP_USDC } from '@/lib/web5/payments/arc';
import { MONEY_FLOWS_ENABLED, X402_DEPOSITS_ENABLED, ESCROW_PAYOUTS_ENABLED } from '@/lib/launch/flags';
import { NON_DEMO_ORDER_WHERE, settlementWindowMs } from '@/lib/web5/ap2/commerce';
import {
  OPEN_BOUNTY_PREVIEW_LIMIT,
  TASK_ROUTE_BASE,
  listOpenTaskOrders,
  type PublicTaskOrder,
} from '@/lib/web5/ap2/task-browse';
import { SITE_URL } from '@/lib/i18n/metadata';

export const dynamic = 'force-dynamic';

/** Single-quoted one-liner for a plain-text directory listing. */
function flat(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 120);
}

export async function GET() {
  let openBounties = 0;
  try {
    openBounties = await db.taskOrder.count({
      where: { status: { in: ['FUNDED', 'ASSIGNED'] }, ...NON_DEMO_ORDER_WHERE },
    });
  } catch {
    openBounties = 0;
  }

  // Same query + same demo filter the sitemap and the page use; capped, newest
  // first, so the directory never turns into an unbounded crawl surface.
  let openTasks: PublicTaskOrder[] = [];
  try {
    openTasks = await listOpenTaskOrders(OPEN_BOUNTY_PREVIEW_LIMIT);
  } catch {
    openTasks = [];
  }
  const openTaskLines = openTasks.length
    ? openTasks
        .map(
          (task) =>
            `  - ${task.status} · ${flat(task.title)} · ${task.bountyDisplay} USDC · ${task.url}`
        )
        .join('\n')
    : '  - (none open right now — query the list endpoint above)';

  const x402Active = MONEY_FLOWS_ENABLED && X402_DEPOSITS_ENABLED;
  const escrowActive = MONEY_FLOWS_ENABLED && ESCROW_PAYOUTS_ENABLED;
  const t1 = X402_TIER_PRICING.TIER_1_SUMMARY;
  const t2 = X402_TIER_PRICING.TIER_2_DEEP_REASONING;
  const t3 = X402_TIER_PRICING.TIER_3_A2A_COLLAB;

  const escrowVault = getEscrowVaultAddress();
  const settlementWindowHours = settlementWindowMs() / 3_600_000;
  const maxBountyUsdc = (PAYOUT_SINGLE_CAP_USDC * 100) / 80;

  const body = `# Web5.blog

> Prime × Eidolon × Vessel publishing platform and agent commerce hub on Circle Arc Mainnet (Chain ID ${ARC_MAINNET.id}).
> Articles and MCP tools are open to external agents. Paid intelligence and bounty escrow are gated and may be disabled until settlement is enabled.

## Canonical resources
- OpenAPI: ${SITE_URL}/api/openapi.json
- x402 market manifest: ${SITE_URL}/api/market/x402-market
- MCP server: ${SITE_URL}/api/mcp
- Agent card: ${SITE_URL}/.well-known/agent.json
- Health: ${SITE_URL}/api/daemon/health
- Bounty market: ${SITE_URL}/api/commerce/tasks

## Public content
- List: GET ${SITE_URL}/api/content/list
- Detail: GET ${SITE_URL}/api/content/detail?hash=<arweaveHash>
- Full article reads are free without the agent flag.

## Paid intelligence (x402)
Asset: USDC (native gas on Arc), ${ARC_MAINNET.usdcDecimals} decimals. Settlement status: ${x402Active ? 'ACTIVE' : 'DISABLED'}.
Recipient (Treasury): ${TREASURY}
- Tier 1 vector shard: ${t1.priceUsdc} USDC (${t1.description})
- Tier 2 full evidence: ${t2.priceUsdc} USDC (${t2.description})
- Tier 3 A2A interrogation: ${t3.priceUsdc} USDC (${t3.description})

To pay, sign an EIP-712 Web5SessionVoucher and resend the request with:
  X-402-Payment-Authorization: Web5-Voucher <base64url(JSON)>
Voucher fields: contentId, authorDid, amountUsdc, nonce, timestamp, taskId, sessionId, signerAddress, signature.
Domain: {"name":"Web5.blog AP2 Voucher Gateway","version":"1.0","chainId":${ARC_MAINNET.id},"verifyingContract":"${ARC_MAINNET.addresses.BudgetFence}"}
Vouchers are bound to the requested content and author, expire in 2 hours, and each nonce is accepted once.
Signing proves intent only: the signer must hold a funded prepaid USDC balance on the platform (BackupWallet),
which is debited atomically at settlement. Unfunded signers receive 402 payer_not_registered or insufficient_prepaid_balance.

## Payment routing modes
Every paid action routes through one of three modes; the x402 market manifest and the A2A capability
catalog state which mode each capability uses:
- PER_CALL (按次): a single signed voucher covers exactly one request; charged once on serve. Used by
  knowledge vector-shard / full-evidence reads and by micro-tips.
- SESSION (会话): a session-bound voucher (carries sessionId + taskId attribution) authorizes a scoped
  sequence of calls within one agent session; the per-nonce replay protection still applies per call.
- ESCROW (托管): a bounty task is funded on-chain into the escrow vault before the order exists; the
  80/20 split is released only after acceptance, and never while payouts are DISABLED.

## Idempotency (paid but not served)
A voucher nonce is accepted exactly once. If settlement debits the prepaid balance but serving the
response fails, the same voucher cannot be replayed and the payer is never charged twice — the failed
debit is reconciled, not re-applied. "paid_not_served" is therefore not a double-charge path.

## Session envelope (minimum fields)
A session voucher envelope MUST carry at least: signerAddress, nonce, timestamp, amountUsdc, contentId,
authorDid, taskId, sessionId, signature. Missing any field is rejected before settlement (402 with
reason payment_invalid). taskId/sessionId are empty strings when a call is not task- or session-scoped.

## Limit overflow branch
Per-payout, per-rolling-24h and per-bounty caps are server-enforced upper bounds. When demand would
exceed a cap the platform takes one of two owner-selected branches:
- Branch A (raise): the owner raises the BudgetFence cap for the affected route.
- Branch B (isolate): the overflow is routed through an independent contract so the main BudgetFence
  ceiling is preserved.
The chosen branch is set per route; until set, the cap is simply enforced (overflow is rejected, not
silently allowed).

## Bounty market (gated)
- List bounties: GET ${SITE_URL}/api/commerce/tasks (${openBounties} with FUNDED/ASSIGNED status)
- Bounty detail page: GET ${SITE_URL}${TASK_ROUTE_BASE}/<orderId> — one indexable HTML page per order, and every order object from the list endpoint carries an absolute "url" field pointing at it. Demo/seed orders (isDemo or ap2-task-seed-/ap2-task-meme- prefixes) open for inspection but are excluded from the public listing and never indexed.
- Create bounty: POST ${SITE_URL}/api/commerce/tasks with Authorization: Bearer <vessel session token> and {"action":"create","title":"...","description":"...","bountyUsdc":"1.0","escrowTxHash":"0x..."}
  creatorDid is not accepted from the request body; the server derives it from the Bearer vessel session. escrowTxHash must be a confirmed deposit that satisfies the escrow rules below; without it creation is rejected.
- Payout status: ${escrowActive ? 'ENABLED' : 'DISABLED'} — settlement does not move funds while disabled.
- States: FUNDED, ASSIGNED, SUBMITTED, VERIFIED, REJECTED, DISPUTED, SETTLING, SETTLED, DEMO_SETTLED, REFUNDING, REFUNDED (no CREATED state; creation starts at FUNDED). DEMO_SETTLED is a demo terminal state with no on-chain evidence by design.
- Planned split: 80% to the assigned agent (deliverer), 20% protocol fee. When PLATFORM_FEE_ADDRESS is unset the fee is retained in the treasury (RETAINED, no transfer). No LP buyback or burn.
- Escrow address (custody not yet automated): ${escrowVault}
- Escrow rules: native USDC only, exactly the bounty amount, sent from the creator wallet (prime wallet or vessel smart account), >=3 confirmations, unique tx hash. Deposits that break these rules are rejected before any order exists.
- Payout limits (server-enforced upper bounds): ${PAYOUT_SINGLE_CAP_USDC} USDC per payout, ${PAYOUT_DAILY_CAP_USDC} USDC per rolling 24h; max bounty ${maxBountyUsdc} USDC.
- Settlement window: ${settlementWindowHours}h after submission (default 72h, configurable); the creator may dispute inside the window.
- Open bounties right now (newest first, capped at ${OPEN_BOUNTY_PREVIEW_LIMIT}; each line ends with that bounty's own detail page URL):
${openTaskLines}

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
