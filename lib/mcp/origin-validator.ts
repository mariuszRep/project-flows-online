import { NextRequest } from 'next/server';

/**
 * Validates the Origin and Host headers to prevent DNS rebinding attacks
 * per MCP 2025-03-26 specification security requirements
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Get allowed origins from environment variable
  const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

  // If no origins configured, reject all (fail-secure)
  if (allowedOrigins.length === 0) {
    return false;
  }

  // Validate Origin header if present
  if (origin) {
    const isAllowed = allowedOrigins.includes(origin);
    if (!isAllowed) {
      return false;
    }
  }

  // CRITICAL: DNS rebinding protection - validate Host header
  // Default to request host if MCP_EXPECTED_HOST not set (fail-safe for production)
  const expectedHost = process.env.MCP_EXPECTED_HOST || host;

  if (!expectedHost) {
    // Missing both env and host header - reject
    return false;
  }

  if (host) {
    // Allow localhost variations in development
    const isLocalhost = host.startsWith('localhost:') || host === 'localhost' ||
                       host.startsWith('127.0.0.1:') || host === '127.0.0.1';
    const expectedIsLocalhost = expectedHost.startsWith('localhost:') || expectedHost === 'localhost';

    // In development (localhost), be more permissive with ports
    if (isLocalhost && expectedIsLocalhost) {
      return true;
    }

    // In production or when expected host is set, require exact match
    if (host !== expectedHost) {
      console.warn(`[Security] Host mismatch: got "${host}", expected "${expectedHost}"`);
      return false;
    }
  } else {
    // Missing host header - MCP clients should always send this
    // Some proxies might strip it, but we require it for security
    console.warn('[Security] Missing Host header - rejecting request');
    return false;
  }

  return true;
}
