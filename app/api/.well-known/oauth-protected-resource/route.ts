import { NextResponse } from 'next/server';

/**
 * OAuth 2.1 Protected Resource Metadata endpoint
 * 
 * Note: This MCP server uses connection tokens instead of OAuth/JWT
 * This endpoint is kept for compatibility but returns custom auth info
 */
export async function GET() {
  const mcpServerUrl = process.env.MCP_SERVER_URL || process.env.VERCEL_URL || 'http://localhost:3000';

  const metadata = {
    resource: mcpServerUrl,
    authentication: {
      type: 'bearer-token',
      description: 'Long-lived connection tokens managed through the application UI',
      token_endpoint: `${mcpServerUrl}/app/settings/mcp`,
    },
  };

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
