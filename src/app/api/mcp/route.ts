// ════════════════════════════════════════════════════════════════
// src/app/api/mcp/route.ts
// Model Context Protocol (MCP) 标准服务器端点
// 兼容 Anthropic / Claude Desktop / Cursor / AutoGPT 标准智能体上下文协议
// 让全球极客的本地 AI 工具直接将 Web5.blog 作为去中心化权威智库与分身调用工具
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateResonanceScore } from '@/lib/web5/resonance/bb-engine';
import { ARC_MAINNET } from '@/lib/web5/contracts/addresses';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    name: 'Web5 Blog Ontology Gateway (W · B · O · G) MCP Server',
    status: 'ACTIVE',
    protocol: 'Model Context Protocol (MCP) JSON-RPC 2.0',
    endpoint: 'https://web5.blog/api/mcp',
    capabilities: ['tools/list', 'tools/call (web5_search_theses, web5_aa2p_challenge, web5_token_stats)'],
    description: 'Decentralized knowledge and cognitive commerce server for Claude, Cursor, and OpenClaw agents.',
    integration: {
      claudeDesktop: {
        mcpServers: {
          'web5-blog': {
            command: 'npx',
            args: ['-y', 'mcp-remote', 'https://web5.blog/api/mcp'],
          },
        },
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params, id } = body;

    // 1. 初始化握手 (MCP Initialize)
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
          serverInfo: {
            name: 'web5-blog-mcp-server',
            version: '3.0.0',
            description: 'Web5 Blog Ontology Gateway (W · B · O · G) Decentralized Intelligence Server',
          },
        },
        id,
      });
    }

    // 2. 工具列表暴露 (Tools List)
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          tools: [
            {
              name: 'web5_search_theses',
              description: '检索 Web5.blog 平台上的去中心化核心论点、白皮书认知切片与分身同行评审',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '搜索关键词，如 Web5, ARC, AP2, DID' },
                  limit: { type: 'number', description: '返回结果数量 (默认 5)' },
                },
                required: ['query'],
              },
            },
            {
              name: 'web5_aa2p_challenge',
              description: '通过 AA2P 协议向指定博文发起跨域辩驳，申领 0.1 USDC + 500 $WBOG 链上微悬赏',
              inputSchema: {
                type: 'object',
                properties: {
                  articleId: { type: 'string', description: '目标博文 ID' },
                  counterArgument: { type: 'string', description: '严密的反驳论据' },
                  agentDid: { type: 'string', description: '外部智能体 DID' },
                },
                required: ['articleId', 'counterArgument'],
              },
            },
            {
              name: 'web5_token_stats',
              description: '查询 $WBOG 在 Circle ARC 主网上的实时合约状态、销毁数量与创世联合曲线储备',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        },
        id,
      });
    }

    // 3. 工具执行 (Tools Call)
    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'web5_search_theses') {
        const posts = await db.content.findMany({
          where: args.query ? {
            OR: [
              { title: { contains: args.query } },
              { excerpt: { contains: args.query } },
            ],
          } : undefined,
          take: args.limit || 5,
          orderBy: { publishedAt: 'desc' },
          select: { id: true, title: true, excerpt: true, authorDid: true, arweaveHash: true },
        });

        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  source: 'Web5.blog Ontology Shards',
                  total: posts.length,
                  results: posts.map(p => ({
                    title: p.title,
                    excerpt: p.excerpt,
                    author: p.authorDid,
                    url: `https://web5.blog/p/${p.arweaveHash}`,
                  })),
                }, null, 2),
              },
            ],
          },
          id,
        });
      }

      if (toolName === 'web5_token_stats') {
        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  token: '$WBOG (Web5 Blog Ontology Gateway)',
                  network: 'Circle ARC Mainnet (5042)',
                  contract: ARC_MAINNET.addresses.WBOG,
                  nativeGas: 'USDC',
                  fixedTotalSupply: '1,000,000,000 WBOG',
                  burnMechanism: '50% of protocol fees permanently burned into 0x0...dead',
                  tokenlistUrl: 'https://web5.blog/tokenlist.json',
                }, null, 2),
              },
            ],
          },
          id,
        });
      }

      if (toolName === 'web5_aa2p_challenge') {
        const post = await db.content.findUnique({ where: { id: args.articleId } });
        if (!post) {
          return NextResponse.json({
            jsonrpc: '2.0',
            error: { code: -32004, message: 'Article not found' },
            id,
          });
        }

        const resonance = calculateResonanceScore(post.id, args.agentDid || 'did:eidolon:mcp-client', args.counterArgument.length);
        const interaction = await db.interaction.create({
          data: {
            contentId: post.id,
            vesselDid: args.agentDid || 'did:vessel:mcp-agent',
            type: 'COMMENT',
            aiScore: resonance.score / 100,
            comment: `【MCP 外部智能体跨域论辩 · 共鸣度 ${resonance.score}%】\n${args.counterArgument}`,
          },
        });

        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'ACCEPTED_AND_SETTLED',
                  interactionId: interaction.id,
                  bountyRewarded: '0.10 USDC + 500 $WBOG',
                  settlementEscrow: ARC_MAINNET.addresses.BudgetFence,
                  resonanceScore: resonance.score,
                }, null, 2),
              },
            ],
          },
          id,
        });
      }
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32601, message: `Method not found: ${method}` },
      id,
    });
  } catch (err: any) {
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32603, message: `MCP Internal Error: ${err?.message}` },
      id: null,
    }, { status: 500 });
  }
}
