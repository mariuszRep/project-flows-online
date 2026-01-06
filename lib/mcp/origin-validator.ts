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

  // DNS rebinding protection: validate Host header
  // For localhost development, allow localhost with any port
  if (host) {
    const isLocalhost = host.startsWith('localhost:') || host === 'localhost';
    const expectedHost = process.env.MCP_EXPECTED_HOST;

    // In production, validate against expected host
    if (expectedHost && !isLocalhost) {
      if (host !== expectedHost) {
        return false;
      }
    }
  }

  return true;
}
