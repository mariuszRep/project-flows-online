import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/services/mcp-service";
import { validateOrigin } from "@/lib/mcp/origin-validator";
import { AuthContext } from "@/lib/mcp/auth-context";

/**
 * Gets CORS headers for MCP endpoint
 * Properly reflects the validated origin per-request (multiple origins in one header is invalid)
 */
function getCorsHeaders(validatedOrigin?: string) {
  // Reflect the validated origin, or default to first allowed origin
  const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  const origin = validatedOrigin || allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version",
    "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Handles MCP requests using WebStandardStreamableHTTPServerTransport
 * Creates a new server and transport instance per request to avoid shared state
 * Implements security layer per MCP 2025-03-26 specification
 */
async function handleMcpRequest(request: NextRequest): Promise<Response> {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const origin = request.headers.get('origin');

  try {
    // Step 1: Validate Origin header (DNS rebinding protection)
    if (!validateOrigin(request)) {
      console.warn(`[${timestamp}] Origin validation failed: ${origin}`);
      return new NextResponse(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Invalid origin",
            data: { origin },
          },
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin || undefined),
          },
        }
      );
    }

    // Step 2: Validate connection token authentication
    let authContext: AuthContext | null = null;
    try {
      authContext = await AuthContext.fromRequest(request);
      console.log(`[${timestamp}] ${method} ${origin} user:${authContext.getUserId()} connection:${authContext.getConnectionName()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

      // Determine specific error code
      let errorCode = -32002; // Default: invalid token
      if (errorMessage.includes('Missing Authorization') || errorMessage.includes('Missing connection')) {
        errorCode = -32004; // Missing token
      } else if (errorMessage.includes('expired')) {
        errorCode = -32003; // Expired token
      }

      console.warn(`[${timestamp}] Authentication failed: ${errorMessage}`);

      return new NextResponse(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: errorCode,
            message: errorMessage,
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": 'Bearer realm="MCP", error="invalid_token", error_description="' + errorMessage + '"',
            ...getCorsHeaders(origin || undefined),
          },
        }
      );
    }

    // Step 3: Create transport and server per request (stateless mode)
    // Pass authContext to enable organization-scoped data filtering in tools
    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = createMcpServer(authContext);

    // Connect server to transport
    await server.connect(transport);

    // Handle the request using Web Standard Request API
    const response = await transport.handleRequest(request);

    // Add CORS headers to the response (reflect validated origin)
    const corsHeaders = getCorsHeaders(origin || undefined);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error(`[${timestamp}] MCP request error:`, error);

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
  try {
    const authContext = await AuthContext.fromRequest(request);
    const { ConnectionValidator } = await import('@/lib/mcp/connection-validator');
    
    // Mark connection as disconnected
    await ConnectionValidator.disconnect(authContext.getConnectionId());
    
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(),
    });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Failed to disconnect",
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
