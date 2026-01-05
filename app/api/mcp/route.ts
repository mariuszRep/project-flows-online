import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/services/mcp-service";

/**
 * Gets CORS headers for MCP endpoint
 */
function getCorsHeaders() {
  const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigins,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version",
    "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
  };
}

/**
 * Handles MCP requests using WebStandardStreamableHTTPServerTransport
 * Creates a new server and transport instance per request to avoid shared state
 */
async function handleMcpRequest(request: NextRequest): Promise<Response> {
  try {
    // Create transport and server per request (stateless mode)
    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = createMcpServer();

    // Connect server to transport
    await server.connect(transport);

    // Handle the request using Web Standard Request API
    const response = await transport.handleRequest(request);

    // Add CORS headers to the response
    const corsHeaders = getCorsHeaders();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("MCP request error:", error);

    return new NextResponse(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(),
        },
      }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

/**
 * Handle GET requests (typically for SSE streams)
 */
export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

/**
 * Handle POST requests (JSON-RPC messages)
 */
export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

/**
 * Handle DELETE requests (close sessions)
 */
export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}
