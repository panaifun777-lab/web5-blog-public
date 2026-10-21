// ════════════════════════════════════════════════════════════════
// src/app/api/openapi.json/route.ts
// OpenAPI 3.1 schema — AI agent discovery endpoint
// ════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { generateOpenApiSchema, setAgentDiscoveryHeaders } from '@/lib/admin/agent-discovery';

export async function GET() {
  const schema = generateOpenApiSchema();
  const response = NextResponse.json(schema);
  setAgentDiscoveryHeaders(response);
  return response;
}
