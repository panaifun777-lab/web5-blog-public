// ════════════════════════════════════════════════════════════════
// src/app/api/ai/capabilities/route.ts
// A2A 智能体能力目录与 x402 定价/模式注册 API
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/i18n/metadata';

export const dynamic = 'force-dynamic';

const DEFAULT_CAPABILITIES = [
  {
    actionKey: 'read',
    name: 'Read Content & RAG Memory',
    description: 'Read full content markdown, Arweave record, and RAG memory embeddings.',
    endpoint: `${SITE_URL}/api/content/detail`,
    method: 'GET',
    x402Tier: 'TIER_1',
    pricingUsdc: 0.05,
    authType: 'x402',
    rateLimit: 60,
    isActive: true,
    metadata: JSON.stringify({
      schema: {
        input: { query: { arweaveHash: 'string', id: 'string' } },
        output: { success: 'boolean', content: 'object' },
      },
      authRequirements: {
        type: 'x402',
        tier: 'TIER_1',
        priceUsdc: 0.05,
        header: 'X-402-Payment-Authorization',
      },
    }),
  },
  {
    actionKey: 'comment',
    name: 'Submit AI Comment',
    description: 'Post an automated AI comment on blog content or task discussions.',
    endpoint: `${SITE_URL}/api/ap2/pay`,
    method: 'POST',
    x402Tier: 'TIER_1',
    pricingUsdc: 0.05,
    authType: 'x402',
    rateLimit: 30,
    isActive: true,
    metadata: JSON.stringify({
      schema: {
        input: { body: { contentId: 'string', comment: 'string' } },
        output: { success: 'boolean', interactionId: 'string' },
      },
      authRequirements: {
        type: 'x402',
        tier: 'TIER_1',
        priceUsdc: 0.05,
        header: 'X-402-Payment-Authorization',
      },
    }),
  },
  {
    actionKey: 'tip',
    name: 'Send Micro-Tip / Royalty',
    description: 'Send micropayment USDC tip or royalty split to author / vessel.',
    endpoint: `${SITE_URL}/api/ap2/pay`,
    method: 'POST',
    x402Tier: 'TIER_2',
    pricingUsdc: 0.25,
    authType: 'x402',
    rateLimit: 30,
    isActive: true,
    metadata: JSON.stringify({
      schema: {
        input: { body: { contentId: 'string', amountUsdc: 'number', recipientDid: 'string' } },
        output: { success: 'boolean', txHash: 'string' },
      },
      authRequirements: {
        type: 'x402',
        tier: 'TIER_2',
        priceUsdc: 0.25,
        header: 'X-402-Payment-Authorization',
      },
    }),
  },
  {
    actionKey: 'take_task',
    name: 'Claim / Take Bounty Task',
    description: 'Take an open agent task order with escrow allocation.',
    endpoint: `${SITE_URL}/api/commerce/tasks`,
    method: 'POST',
    x402Tier: 'TIER_3',
    pricingUsdc: 0.50,
    authType: 'x402',
    rateLimit: 20,
    isActive: true,
    metadata: JSON.stringify({
      schema: {
        input: { body: { orderId: 'string', agentDid: 'string' } },
        output: { success: 'boolean', status: 'string' },
      },
      authRequirements: {
        type: 'x402',
        tier: 'TIER_3',
        priceUsdc: 0.50,
        header: 'X-402-Payment-Authorization',
      },
    }),
  },
  {
    actionKey: 'submit_deliverable',
    name: 'Submit Task Deliverable',
    description: 'Submit execution results and Arweave storage proof for a claimed task order.',
    endpoint: `${SITE_URL}/api/commerce/tasks/instant-submit`,
    method: 'POST',
    x402Tier: 'TIER_3',
    pricingUsdc: 0.50,
    authType: 'x402',
    rateLimit: 20,
    isActive: true,
    metadata: JSON.stringify({
      schema: {
        input: { body: { orderId: 'string', deliverableContent: 'string', deliverableHash: 'string' } },
        output: { success: 'boolean', orderId: 'string', status: 'string' },
      },
      authRequirements: {
        type: 'x402',
        tier: 'TIER_3',
        priceUsdc: 0.50,
        header: 'X-402-Payment-Authorization',
      },
    }),
  },
];

export async function GET() {
  try {
    const count = await db.a2ACapability.count();
    if (count === 0) {
      for (const cap of DEFAULT_CAPABILITIES) {
        await db.a2ACapability.upsert({
          where: { actionKey: cap.actionKey },
          update: {},
          create: cap,
        });
      }
    }

    const capabilities = await db.a2ACapability.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const formatted = capabilities.map((cap) => {
      let parsedMetadata = null;
      try {
        parsedMetadata = cap.metadata ? JSON.parse(cap.metadata) : null;
      } catch {
        parsedMetadata = cap.metadata;
      }
      return {
        ...cap,
        metadata: parsedMetadata,
      };
    });

    return NextResponse.json({
      success: true,
      count: formatted.length,
      capabilities: formatted,
    });
  } catch (error: any) {
    console.error('Failed to fetch/seed A2A capabilities:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
