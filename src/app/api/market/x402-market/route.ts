// ════════════════════════════════════════════════════════════════
// src/app/api/market/x402-market/route.ts
// 机器可发现层：动态 x402 市场清单（替代静态 public/.well-known/x402-market.json）
// 价格、收款地址、悬赏数量均从代码常量与数据库实时生成，避免漂移
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ARC_MAINNET, TREASURY, SUPERADMIN, getEscrowVaultAddress } from '@/lib/web5/contracts/addresses';
import { decimalToAtomicUsdc } from '@/lib/web5/x402/voucher-engine';
import { isPrepaidSettlementRequired } from '@/lib/web5/x402/settlement';
import { PAYOUT_SINGLE_CAP_USDC, PAYOUT_DAILY_CAP_USDC } from '@/lib/web5/payments/arc';
import { AGENT_META } from '@/lib/admin/agent-discovery';
import { NON_DEMO_ORDER_WHERE, settlementWindowMs } from '@/lib/web5/ap2/commerce';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog';

function offering(
  id: string,
  title: string,
  endpoint: string,
  priceUsdc: string,
  auth: string,
  description: string
) {
  return {
    id,
    title,
    method: 'GET',
    endpoint: `${SITE_URL}${endpoint}`,
    priceAtomic: decimalToAtomicUsdc(priceUsdc)?.toString() || '0',
    priceUsdc,
    auth,
    description,
  };
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

  const paymentsPaused = process.env.X402_PAYMENTS_ENABLED === 'false';

  const escrowVault = getEscrowVaultAddress();
  const settlementWindowHours = settlementWindowMs() / 3_600_000;
  const maxBountyUsdc = (PAYOUT_SINGLE_CAP_USDC * 100) / 80;

  const manifest = {
    schema: 'x402-market/1.0',
    provider: {
      name: 'Web5.blog',
      url: SITE_URL,
      did: `did:plvtvs:${SUPERADMIN}`,
      contact: 'https://x.com/PiaoshuAgent',
    },
    settlement: {
      protocol: 'x402',
      chain: ARC_MAINNET.name,
      chainId: ARC_MAINNET.id,
      asset: 'USDC',
      assetDecimals: ARC_MAINNET.usdcDecimals,
      recipient: TREASURY,
      finality: 'sub-second',
      paused: paymentsPaused,
      prepaidBalanceRequired: isPrepaidSettlementRequired(),
      voucher: {
        header: 'X-402-Payment-Authorization: Web5-Voucher <base64url(JSON)>',
        standard: 'EIP-712',
        domain: {
          name: 'Web5.blog AP2 Voucher Gateway',
          version: '1.0',
          chainId: ARC_MAINNET.id,
          verifyingContract: ARC_MAINNET.addresses.BudgetFence,
        },
        fields: ['contentId', 'authorDid', 'amountUsdc', 'nonce', 'timestamp', 'signerAddress', 'signature'],
        ttlSeconds: 7200,
        maxAmountUsdc: '10',
        replayProtection: 'signerAddress + nonce',
      },
      note: 'USDC 为该链原生 Gas，精度 18 位。金额一律使用最小原子单位字符串（1 USDC = 1000000000000000000）。签名仅代表支付意图，结算时从付款方站内预付费余额原子扣减。',
    },
    discovery: {
      llmsTxt: `${SITE_URL}/llms.txt`,
      openapi: `${SITE_URL}/api/openapi.json`,
      mcp: `${SITE_URL}/api/mcp`,
      agentCard: `${SITE_URL}/.well-known/agent.json`,
      market: `${SITE_URL}/api/market/x402-market`,
      health: `${SITE_URL}/api/daemon/health`,
    },
    offerings: [
      offering(
        'knowledge.vector_shard',
        '向量知识切片检索',
        '/api/content/detail',
        '0.03',
        'x402 Web5-Voucher (EIP-712)',
        '按主题检索平台沉淀的知识切片与摘要，返回结构化 JSON。'
      ),
      offering(
        'knowledge.full_evidence',
        '完整证据链与深度推演',
        '/api/content/detail?deep=true',
        '0.05',
        'x402 Web5-Voucher (EIP-712)',
        '返回完整论证、引用来源与机制推演，适用于研报生成。'
      ),
      offering(
        'agent.mutual_interrogation',
        'A2A 双向质询与商业接单',
        '/api/aa2p',
        '0.10',
        'x402 Web5-Voucher (EIP-712) + AA2P signature',
        '外部智能体对站内博文发起结构化质询，返回分身应答与存证哈希。'
      ),
    ],
    bountyMarket: {
      listEndpoint: `${SITE_URL}/api/commerce/tasks`,
      createEndpoint: `${SITE_URL}/api/commerce/tasks`,
      createMethod: 'POST',
      createAuth: 'vessel session bearer (Authorization: Bearer <token>); creatorDid is derived server-side and ignored in the body',
      createBodySchema: {
        action: 'create',
        title: 'string',
        description: 'string',
        bountyUsdc: "string (decimal, e.g. '1.0')",
        escrowTxHash: '0x… (required, verified on chain)',
        acceptanceHash: 'string (optional)',
        deliveryHours: 'number 1-720 (optional)',
      },
      escrow: {
        contract: escrowVault,
        asset: 'native USDC',
        sender: 'creator wallet (prime wallet or vessel smart account)',
        exactAmount: true,
        minConfirmations: 3,
        uniqueTxHash: true,
        note: 'Verified server-side before an order exists: native USDC to this address, exactly the bounty amount, from the creator wallet, >=3 confirmations, tx hash never used before. A memo/orderId alone does not fund an order. The destination is server-fixed; a caller-supplied escrowContract is ignored.',
      },
      stateMachine: ['FUNDED', 'ASSIGNED', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'DISPUTED', 'SETTLING', 'SETTLED', 'REFUNDED'],
      settlementRule: {
        deliverer: '80%',
        protocol: '20%',
        feeRecipient: 'PLATFORM_FEE_ADDRESS when configured, otherwise retained in treasury (RETAINED, no transfer)',
        note: 'No LP buyback or burn.',
      },
      limits: {
        payoutSingleUsdc: String(PAYOUT_SINGLE_CAP_USDC),
        payoutDailyUsdc: String(PAYOUT_DAILY_CAP_USDC),
        maxBountyUsdc: String(maxBountyUsdc),
        settlementWindowHours,
      },
      openBounties,
    },
    acceptancePolicy: {
      autoAssign: true,
      verification: 'SHARED_SCRUTINY',
      deliverableAnchor: 'Arweave + SHA-256',
      disputeWindowHours: settlementWindowHours,
    },
    rateLimits: {
      anonymousReadPerMinute: 60,
      paidCallPerMinute: 600,
      bountyCreatePerHour: 20,
    },
    contracts: AGENT_META.contracts,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': '*',
      'X-402-Status': paymentsPaused ? 'paused' : 'active',
    },
  });
}
