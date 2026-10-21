// ════════════════════════════════════════════════════════════════
// src/lib/admin/agent-discovery.ts
// AGO (Agent Generative Optimization) + GEO (Generative Engine Optimization)
// Agent discovery headers, schema exports, API metadata
// ════════════════════════════════════════════════════════════════

import type { NextResponse } from 'next/server';
import { ARC_MAINNET, TREASURY } from '@/lib/web5/contracts/addresses';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog';
const SUPERADMIN = ARC_MAINNET.addresses.Deployer;

export interface AgentDiscoveryMeta {
  platform: string;
  version: string;
  protocols: string[];
  contracts: Record<string, string>;
  superadmin: string;
  treasury: string;
  endpoints: Record<string, string>;
  capabilities: string[];
}

/**
 * Agent discovery metadata (for /.well-known/agent.json)
 */
export const AGENT_META: AgentDiscoveryMeta = {
  platform: 'Web5.blog',
  version: '2.0.0',
  protocols: ['AP2', 'ARP', 'AA2P', 'x402', 'ERC-4337', 'ERC-721', 'ERC-2981'],
  contracts: {
    WBOG: ARC_MAINNET.addresses.WBOG,
    ContentNFT: ARC_MAINNET.addresses.ContentNFT,
    BudgetFence: ARC_MAINNET.addresses.BudgetFence,
    VesselAuth: ARC_MAINNET.addresses.VesselAuth,
    Superadmin: SUPERADMIN,
    Treasury: TREASURY,
  },
  superadmin: SUPERADMIN,
  treasury: TREASURY,
  endpoints: {
    explore: '/api/explore',
    content: '/api/content/list',
    contentDetail: '/api/content/detail',
    agent_admin: '/api/admin/agent',
    openapi: '/api/openapi.json',
    market: '/api/market/x402-market',
    llms: '/llms.txt',
    mcp: '/api/mcp',
    commerce: '/api/commerce/tasks',
    health: '/api/daemon/health',
  },
  capabilities: [
    'vessel_login',
    'ai_streaming_write',
    'content_provenance',
    'content_nft_minting',
    'ap2_bounty_preview',
    'x402_prepaid_preview',
    'mcp_server',
    'agent_discovery',
  ],
};

/**
 * Set agent discovery response headers
 */
export function setAgentDiscoveryHeaders(response: NextResponse) {
  response.headers.set('X-Platform', 'Web5.blog');
  response.headers.set('X-Protocols', 'AP2,ARP,AA2P,ERC-4337');
  response.headers.set('X-Agent-Discovery', `${SITE_URL}/.well-known/agent.json`);
  response.headers.set('X-LLMs-Discovery', `${SITE_URL}/llms.txt`);
  response.headers.set('X-API-Discovery', `${SITE_URL}/api/openapi.json`);
  response.headers.set('Link', `<${SITE_URL}/.well-known/agent.json>; rel="agent-discovery"`);
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
}

/**
 * Generate OpenAPI-compatible schema for agent discovery
 */
export function generateOpenApiSchema() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog';

  return {
    openapi: '3.1.0',
    info: {
      title: 'Web5.blog Agent API',
      description:
        'Vessel-native blogging platform API for AI agents: content discovery, storage provenance, x402 voucher-based paid reads with a prepaid ledger (closed beta), AP2 bounty lifecycle (preview), and MCP tools.',
      version: '2.0.0',
      contact: { name: 'piaoshu.eth', url: base },
    },
    servers: [{ url: base, description: 'Production' }],
    'x-platform': 'Web5.blog',
    'x-protocols': ['AP2', 'ARP', 'AA2P'],
    'x-contracts': AGENT_META.contracts,
    paths: {
      '/api/explore': {
        get: {
          operationId: 'exploreContent',
          summary: 'Discover blog content',
          description: 'Returns trending articles, stats, and platform data for AI agents',
          responses: {
            '200': {
              description: 'Successful response',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/content/list': {
        get: {
          operationId: 'listContent',
          summary: 'List published content',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0, minimum: 0 } },
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Full-text search across title, excerpt and body' },
          ],
          responses: {
            '200': { description: 'Paginated content list with total, limit, offset and hasMore' },
          },
        },
      },
      '/api/admin/agent': {
        get: {
          operationId: 'agentAdminStats',
          summary: 'Get platform stats (API key required)',
          security: [{ ApiKeyAuth: [] }],
          responses: { '200': { description: 'Platform statistics' } },
        },
      },
      '/api/content/detail': {
        get: {
          operationId: 'getContentDetail',
          summary: 'Read a published article (x402 paid when agent=true)',
          parameters: [
            { name: 'hash', in: 'query', required: true, schema: { type: 'string' }, description: 'Arweave content hash' },
            { name: 'agent', in: 'query', schema: { type: 'boolean' }, description: 'Enable x402 payment gate' },
            { name: 'deep', in: 'query', schema: { type: 'boolean' }, description: 'Tier 2 (0.05 USDC) instead of Tier 1 (0.03 USDC)' },
          ],
          security: [{ X402Voucher: [] }],
          responses: {
            '200': { description: 'Article detail and recent interactions' },
            '402': { description: 'Payment required: signed Web5SessionVoucher missing or invalid' },
          },
          'x-payment': {
            protocol: 'x402',
            header: 'X-402-Payment-Authorization: Web5-Voucher <base64url(JSON)>',
            chainId: ARC_MAINNET.id,
            recipient: TREASURY,
            asset: 'USDC',
            decimals: 18,
          },
        },
      },
      '/api/x402/register': {
        post: {
          operationId: 'registerPrepaidWallet',
          summary: 'Register a prepaid wallet with an EIP-191 signature (feature-flagged)',
          responses: {
            '200': { description: 'Wallet registered' },
            '503': { description: 'Prepaid deposits are disabled' },
          },
        },
      },
      '/api/x402/deposits': {
        post: {
          operationId: 'creditPrepaidDeposit',
          summary: 'Submit an on-chain USDC deposit for verification and credit (feature-flagged)',
          responses: {
            '200': { description: 'Deposit verified and credited' },
            '503': { description: 'Prepaid deposits are disabled' },
          },
        },
      },
      '/api/x402/balance': {
        get: {
          operationId: 'getPrepaidBalance',
          summary: 'Query the prepaid USDC balance for an address',
          parameters: [
            { name: 'address', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Registered flag and balance' } },
        },
      },
      '/api/market/x402-market': {
        get: {
          operationId: 'getMarketManifest',
          summary: 'Machine-readable x402 pricing, bounty market, and settlement manifest',
          responses: { '200': { description: 'Market manifest' } },
        },
      },
      '/api/commerce/tasks': {
        get: {
          operationId: 'listBounties',
          summary: 'List open AP2 bounty orders',
          responses: { '200': { description: 'Active bounty orders' } },
        },
        post: {
          operationId: 'createOrAdvanceBounty',
          summary: 'Create, assign, or advance an AP2 bounty order (settlement is disabled until escrow payouts are enabled)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'assign', 'settle'] } }, required: ['action'] } } },
          },
          responses: { '200': { description: 'Bounty order state' } },
        },
      },
      '/api/mcp': {
        get: {
          operationId: 'mcpServerInfo',
          summary: 'MCP server card',
          responses: { '200': { description: 'MCP server metadata' } },
        },
        post: {
          operationId: 'mcpJsonRpc',
          summary: 'MCP JSON-RPC 2.0 endpoint (initialize, tools/list, tools/call)',
          responses: { '200': { description: 'JSON-RPC response' } },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
        X402Voucher: {
          type: 'apiKey',
          in: 'header',
          name: 'X-402-Payment-Authorization',
          description: 'Web5-Voucher <base64url(JSON EIP-712 Web5SessionVoucher)>',
        },
      },
    },
  };
}
