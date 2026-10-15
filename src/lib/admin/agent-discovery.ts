// ════════════════════════════════════════════════════════════════
// src/lib/admin/agent-discovery.ts
// AGO (Agent Generative Optimization) + GEO (Generative Engine Optimization)
// Agent discovery headers, schema exports, API metadata
// ════════════════════════════════════════════════════════════════

import type { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://web5.blog';
const SUPERADMIN = '0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1';

export interface AgentDiscoveryMeta {
  platform: string;
  version: string;
  protocols: string[];
  contracts: Record<string, string>;
  superadmin: string;
  endpoints: Record<string, string>;
  capabilities: string[];
}

/**
 * Agent discovery metadata (for /.well-known/agent.json)
 */
export const AGENT_META: AgentDiscoveryMeta = {
  platform: 'Web5.blog',
  version: '2.0.0',
  protocols: ['AP2', 'ARP', 'AA2P', 'ERC-4337', 'ERC-721', 'ERC-2981'],
  contracts: {
    WBOG: '0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f',
    ContentNFT: '0x8537fe7268296f37c2f85f9aad992f11659d1c8a',
    BudgetFence: '0xe0d246c09d7a3097bab3148f89201157dd531eea',
    VesselAuth: '0x2d4aebbd5d3e318c0deb91f927019835ecd9a120',
    Superadmin: SUPERADMIN,
  },
  superadmin: SUPERADMIN,
  endpoints: {
    explore: '/api/explore',
    content: '/api/content/list',
    agent_admin: '/api/admin/agent',
    openapi: '/api/openapi.json',
  },
  capabilities: [
    'vessel_login',
    'ai_streaming_write',
    'arweave_permanent_storage',
    'content_nft_minting',
    'ap2_micropayments',
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
      description: 'Vessel-native blogging platform API for AI agent discovery and interaction',
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
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Paginated content list' },
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
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  };
}
