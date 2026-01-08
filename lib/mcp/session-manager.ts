import { randomUUID } from 'crypto';

/**
 * Session data stored in Redis for MCP session binding
 */
export interface SessionData {
  userId: string;
  organizationId: string;
  createdAt: number;
}

/**
 * Session management configuration
 */
const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10); // 24 hours default

/**
 * Check if KV/Redis is configured
 */
const isKVConfigured = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ||
  process.env.KV_URL ||
  process.env.REDIS_URL
);

/**
 * Lazy-load KV client only when configured
 */
let kvClient: any = null;
async function getKV() {
  if (!isKVConfigured) {
    return null;
  }
  if (!kvClient) {
    const { kv } = await import('@vercel/kv');
    kvClient = kv;
  }
  return kvClient;
}

/**
 * SessionManager provides Redis-backed session management for MCP connections
 * Implements cryptographic binding between session IDs and authenticated user IDs
 * to prevent session hijacking attacks per MCP specification
 *
 * @see https://spec.modelcontextprotocol.io/specification/basic/transports/#session-management
 */
export class SessionManager {
  /**
   * Generates Redis key for session storage
   * Format: mcp_session:{userId}:{sessionId}
   * User-scoped keys enable efficient queries and prevent enumeration attacks
   */
  private static getSessionKey(userId: string, sessionId: string): string {
    return `mcp_session:${userId}:${sessionId}`;
  }

  /**
   * Creates a new MCP session with cryptographic binding to user ID
   *
   * @param userId - Authenticated user ID from connection token
   * @param organizationId - Organization ID from connection context
   * @returns UUID session ID for Mcp-Session-Id header
   *
   * @example
   * const sessionId = await SessionManager.createSession(
   *   authContext.getUserId(),
   *   authContext.getOrganizationId()
   * );
   * response.headers.set('Mcp-Session-Id', sessionId);
   */
  static async createSession(
    userId: string,
    organizationId: string
  ): Promise<string> {
    // Generate cryptographically secure UUID
    const sessionId = randomUUID();

    const kv = await getKV();
    if (!kv) {
      console.warn(
        `[SessionManager] KV not configured - session ${sessionId} created without persistence. ` +
        'Configure KV_REST_API_URL and KV_REST_API_TOKEN for production session security.'
      );
      return sessionId;
    }

    try {
      const sessionData: SessionData = {
        userId,
        organizationId,
        createdAt: Date.now(),
      };

      const key = this.getSessionKey(userId, sessionId);

      // Store session with automatic expiration
      // Vercel KV handles JSON serialization automatically
      await kv.setex(key, SESSION_TTL_SECONDS, sessionData);

      console.log(`[SessionManager] Created session ${sessionId} for user ${userId} org ${organizationId}`);

      return sessionId;
    } catch (error) {
      console.error('[SessionManager] Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validates session ownership by checking if session belongs to authenticated user
   * Critical security check prevents session hijacking even with stolen session ID
   *
   * @param sessionId - Session ID from Mcp-Session-Id header
   * @param userId - Authenticated user ID from connection token
   * @returns true if session exists and belongs to user, false otherwise
   *
   * @example
   * const sessionId = request.headers.get('Mcp-Session-Id');
   * if (!await SessionManager.validateSession(sessionId, authContext.getUserId())) {
   *   return jsonRpcErrorResponse(403, 'Session mismatch');
   * }
   */
  static async validateSession(
    sessionId: string | null,
    userId: string
  ): Promise<boolean> {
    if (!sessionId) {
      return false;
    }

    const kv = await getKV();
    if (!kv) {
      // When KV is not configured, accept all sessions for backward compatibility
      // This allows local development without Redis
      return true;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const data = await kv.get(key);

      if (!data) {
        console.warn(`[SessionManager] Session ${sessionId} not found for user ${userId}`);
        return false;
      }

      // Handle both JSON string and already-parsed object from KV
      let sessionData: SessionData;
      if (typeof data === 'string') {
        sessionData = JSON.parse(data) as SessionData;
      } else {
        sessionData = data as SessionData;
      }

      // Verify session belongs to the authenticated user
      if (sessionData.userId !== userId) {
        console.warn(
          `[SessionManager] Session ${sessionId} user mismatch: expected ${userId}, got ${sessionData.userId}`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SessionManager] Session validation error:', error);
      // Return false on error for graceful degradation
      return false;
    }
  }

  /**
   * Deletes a session from Redis storage
   * Used for explicit logout or session cleanup
   *
   * @param sessionId - Session ID to delete
   * @param userId - User ID for key construction
   *
   * @example
   * await SessionManager.deleteSession(sessionId, authContext.getUserId());
   */
  static async deleteSession(sessionId: string, userId: string): Promise<void> {
    const kv = await getKV();
    if (!kv) {
      console.log(`[SessionManager] KV not configured - session ${sessionId} deletion skipped`);
      return;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      await kv.del(key);
      console.log(`[SessionManager] Deleted session ${sessionId} for user ${userId}`);
    } catch (error) {
      console.error('[SessionManager] Failed to delete session:', error);
      throw new Error('Failed to delete session');
    }
  }

  /**
   * Extends session TTL to keep active sessions alive
   * Refreshes expiration time for continued use
   *
   * @param sessionId - Session ID to extend
   * @param userId - User ID for key construction
   * @returns true if session was extended, false if session doesn't exist
   *
   * @example
   * if (await SessionManager.extendSession(sessionId, userId)) {
   *   console.log('Session extended');
   * }
   */
  static async extendSession(
    sessionId: string,
    userId: string
  ): Promise<boolean> {
    const kv = await getKV();
    if (!kv) {
      return true; // Consider extended when KV not configured
    }

    try {
      const key = this.getSessionKey(userId, sessionId);

      // Check if session exists first
      const exists = await kv.exists(key);
      if (!exists) {
        return false;
      }

      // Refresh TTL
      await kv.expire(key, SESSION_TTL_SECONDS);
      console.log(`[SessionManager] Extended session ${sessionId} for user ${userId}`);

      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to extend session:', error);
      return false;
    }
  }

  /**
   * Retrieves session data from Redis
   * Internal method for debugging and audit purposes
   *
   * @param sessionId - Session ID to retrieve
   * @param userId - User ID for key construction
   * @returns Session data or null if not found
   */
  static async getSession(
    sessionId: string,
    userId: string
  ): Promise<SessionData | null> {
    const kv = await getKV();
    if (!kv) {
      return null;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const data = await kv.get(key);

      if (!data) {
        return null;
      }

      // Handle both JSON string and already-parsed object from KV
      if (typeof data === 'string') {
        return JSON.parse(data) as SessionData;
      }
      return data as SessionData;
    } catch (error) {
      console.error('[SessionManager] Failed to retrieve session:', error);
      return null;
    }
  }
}

/**
 * Validates Redis/KV configuration at module load time
 * Provides clear error messages if environment is not properly configured
 */
if (!isKVConfigured) {
  console.warn(
    '[SessionManager] Warning: KV/Redis not configured. ' +
    'Session management will operate in development mode without persistence. ' +
    'For production, configure KV_REST_API_URL and KV_REST_API_TOKEN (Vercel KV), ' +
    'or KV_URL/REDIS_URL for Redis.'
  );
}
