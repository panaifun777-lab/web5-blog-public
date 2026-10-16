// ════════════════════════════════════════════════════════════════
// src/app/api/aa2p/route.ts
// 开放式 AA2P JSON-RPC 2.0 网关路由
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { handleAa2pRpc, type Aa2pRpcRequest } from '@/lib/web5/aa2p/rpc';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Aa2pRpcRequest;
    if (!body || body.jsonrpc !== '2.0') {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request: jsonrpc must be 2.0' }, id: null },
        { status: 400 }
      );
    }

    const response = await handleAa2pRpc(body);
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: `Internal error: ${err?.message}` }, id: null },
      { status: 500 }
    );
  }
}
