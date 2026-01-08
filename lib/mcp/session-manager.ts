import { randomUUID } from 'crypto';
import type { SessionMetricType, SessionState, SessionMetricsAggregation } from '@/types/metrics';

/**
 * Session data stored in Redis for MCP session binding
 */
export interface SessionData {
  userId: string;
  organizationId: string;
  createdAt: number;
  lastActivityAt?: number;
  connectionId?: string;
  connectionName?: string;
}

/**
 * Session management configuration
 */
const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10); // 24 hours default
const SESSION_EXTENSION_THRESHOLD_SECONDS = parseInt(
  process.env.SESSION_EXTENSION_THRESHOLD_SECONDS || '3600',
  10
); // 1 hour default
const SESSION_CLEANUP_BATCH_SIZE = parseInt(process.env.SESSION_CLEANUP_BATCH_SIZE || '100', 10);
const METRICS_RETENTION_DAYS = parseInt(process.env.METRICS_RETENTION_DAYS || '90', 10);
const METRICS_ENABLED = process.env.METRICS_ENABLED
  ? process.env.METRICS_ENABLED !== 'false'
  : true;

/**
 * Check if KV/Redis is configured
 */
function isKVConfigured(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ||
    process.env.KV_URL ||
    process.env.REDIS_URL
  );
}

/**
 * Lazy-load KV client only when configured
 */
let kvClient: any = null;
let kvClientOverride: any | undefined;
async function getKV() {
  if (kvClientOverride !== undefined) {
    return kvClientOverride;
  }
  if (!isKVConfigured()) {
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
   * Generates Redis key for session state storage
   * Format: mcp_session_state:{userId}:{sessionId}
   */
  private static getStateKey(userId: string, sessionId: string): string {
    return `mcp_session_state:${userId}:${sessionId}`;
  }

  /**
   * Generates Redis key for session state version
   */
  private static getStateVersionKey(userId: string, sessionId: string): string {
    return `mcp_session_state_version:${userId}:${sessionId}`;
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
    organizationId: string,
    connectionId?: string,
    connectionName?: string
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
        lastActivityAt: Date.now(),
        connectionId,
        connectionName,
      };

      const key = this.getSessionKey(userId, sessionId);

      // Store session with automatic expiration
      // Vercel KV handles JSON serialization automatically
      await kv.setex(key, SESSION_TTL_SECONDS, sessionData);

      console.log(`[SessionManager] Created session ${sessionId} for user ${userId} org ${organizationId}`);
      await this.recordMetric('session_created', {
        sessionId,
        userId,
        organizationId,
        connectionId,
        connectionName,
      });

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
   * @returns validation result indicating session status
   *
   * @example
   * const sessionId = request.headers.get('Mcp-Session-Id');
   * const validation = await SessionManager.validateSession(sessionId, authContext.getUserId());
   * if (!validation.valid) {
   *   return jsonRpcErrorResponse(403, 'Session mismatch');
   * }
   */
  static async validateSession(
    sessionId: string | null,
    userId: string
  ): Promise<SessionValidationResult> {
    if (!sessionId) {
      return { valid: false, reason: 'not_found' };
    }

    const kv = await getKV();
    if (!kv) {
      // When KV is not configured, accept all sessions for backward compatibility
      // This allows local development without Redis
      return { valid: true };
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const data = await kv.get(key);

      if (!data) {
        console.warn(`[SessionManager] Session ${sessionId} not found for user ${userId}`);
        await this.recordMetric('session_validation_failed', { sessionId, userId });
        return { valid: false, reason: 'not_found' };
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
        await this.recordMetric('session_hijack_blocked', {
          sessionId,
          userId,
          organizationId: sessionData.organizationId,
        });
        return { valid: false, reason: 'user_mismatch' };
      }

      await this.recordMetric('session_validated', {
        sessionId,
        userId,
        organizationId: sessionData.organizationId,
      });
      return { valid: true };
    } catch (error) {
      console.error('[SessionManager] Session validation error:', error);
      await this.recordMetric('session_validation_failed', { sessionId, userId });
      // Return false on error for graceful degradation
      return { valid: false, reason: 'error' };
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
      await this.recordMetric('session_deleted', { sessionId, userId });
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

      let shouldExtend = true;
      if (typeof kv.ttl === 'function') {
        const ttl = await kv.ttl(key);
        if (ttl > SESSION_EXTENSION_THRESHOLD_SECONDS) {
          shouldExtend = false;
        }
      }

      if (shouldExtend) {
        const data = await kv.get(key);
        let sessionData: SessionData | null = null;
        if (data) {
          sessionData = typeof data === 'string' ? JSON.parse(data) as SessionData : (data as SessionData);
          sessionData.lastActivityAt = Date.now();
        }

        if (sessionData) {
          await kv.setex(key, SESSION_TTL_SECONDS, sessionData);
        } else {
          await kv.expire(key, SESSION_TTL_SECONDS);
        }

        const stateKey = this.getStateKey(userId, sessionId);
        if (await kv.exists(stateKey)) {
          await kv.expire(stateKey, SESSION_TTL_SECONDS);
        }

        console.log(`[SessionManager] Extended session ${sessionId} for user ${userId}`);
        await this.recordMetric('session_extended', { sessionId, userId });
      }

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

  /**
   * Stores session state for a given user/session pairing
   */
  static async setState<T extends SessionState>(
    sessionId: string,
    userId: string,
    state: T
  ): Promise<boolean> {
    const kv = await getKV();
    if (!kv) {
      return true;
    }

    try {
      const sessionKey = this.getSessionKey(userId, sessionId);
      const exists = await kv.exists(sessionKey);
      if (!exists) {
        return false;
      }

      const stateKey = this.getStateKey(userId, sessionId);
      await kv.setex(stateKey, SESSION_TTL_SECONDS, state);
      await kv.setex(this.getStateVersionKey(userId, sessionId), SESSION_TTL_SECONDS, 1);
      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to set state:', error);
      return false;
    }
  }

  /**
   * Retrieves session state with type safety
   */
  static async getState<T extends SessionState>(
    sessionId: string,
    userId: string
  ): Promise<T | null> {
    const kv = await getKV();
    if (!kv) {
      return null;
    }

    try {
      const sessionKey = this.getSessionKey(userId, sessionId);
      const exists = await kv.exists(sessionKey);
      if (!exists) {
        return null;
      }

      const stateKey = this.getStateKey(userId, sessionId);
      const data = await kv.get(stateKey);
      if (!data) {
        return null;
      }

      if (typeof data === 'string') {
        return JSON.parse(data) as T;
      }
      return data as T;
    } catch (error) {
      console.error('[SessionManager] Failed to get state:', error);
      return null;
    }
  }

  /**
   * Updates session state with shallow merge and optimistic versioning
   */
  static async updateState<T extends SessionState>(
    sessionId: string,
    userId: string,
    patch: Partial<T>
  ): Promise<T | null> {
    const kv = await getKV();
    if (!kv) {
      return null;
    }

    try {
      const sessionKey = this.getSessionKey(userId, sessionId);
      const exists = await kv.exists(sessionKey);
      if (!exists) {
        return null;
      }

      const stateKey = this.getStateKey(userId, sessionId);
      const versionKey = this.getStateVersionKey(userId, sessionId);

      const [currentStateRaw, currentVersionRaw] = await Promise.all([
        kv.get(stateKey),
        kv.get(versionKey),
      ]);

      let currentState: T = {} as T;
      if (currentStateRaw) {
        currentState = typeof currentStateRaw === 'string'
          ? (JSON.parse(currentStateRaw) as T)
          : (currentStateRaw as T);
      }

      const currentVersion = typeof currentVersionRaw === 'number'
        ? currentVersionRaw
        : Number.parseInt(String(currentVersionRaw || 0), 10) || 0;

      const mergedState = {
        ...(currentState || {}),
        ...(patch || {}),
      } as T;

      await kv.setex(stateKey, SESSION_TTL_SECONDS, mergedState);
      await kv.setex(versionKey, SESSION_TTL_SECONDS, currentVersion + 1);

      return mergedState;
    } catch (error) {
      console.error('[SessionManager] Failed to update state:', error);
      return null;
    }
  }

  /**
   * Deletes session state explicitly
   */
  static async deleteState(sessionId: string, userId: string): Promise<boolean> {
    const kv = await getKV();
    if (!kv) {
      return true;
    }

    try {
      const stateKey = this.getStateKey(userId, sessionId);
      await kv.del(stateKey);
      await kv.del(this.getStateVersionKey(userId, sessionId));
      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to delete state:', error);
      return false;
    }
  }

  /**
   * Finds an existing session for a specific connection
   * Reuses active session for the same connection token to avoid duplicate sessions
   *
   * @param userId - User ID for key scoping
   * @param connectionId - Connection ID from auth context
   * @returns Session ID if found, otherwise null
   */
  static async findSessionForConnection(
    userId: string,
    connectionId: string
  ): Promise<string | null> {
    const kv = await getKV();
    if (!kv) {
      return null;
    }

    try {
      const keys: string[] = [];
      const matchPattern = `mcp_session:${userId}:*`;

      if (typeof kv.scanIterator === 'function') {
        for await (const key of kv.scanIterator({ match: matchPattern, count: 200 })) {
          keys.push(String(key));
        }
      } else if (typeof kv.scan === 'function') {
        let cursor = '0';
        do {
          // eslint-disable-next-line no-await-in-loop -- bounded scan loop
          const [nextCursor, batch] = await kv.scan(cursor, { match: matchPattern, count: 200 });
          cursor = nextCursor;
          keys.push(...batch);
        } while (cursor !== '0');
      }

      if (keys.length === 0) {
        return null;
      }

      const values = typeof kv.mget === 'function'
        ? await kv.mget(...keys)
        : await Promise.all(keys.map((key) => kv.get(key)));

      let newest: { sessionId: string; createdAt: number } | null = null;

      values.forEach((value, index) => {
        if (!value) {
          return;
        }

        let sessionData: SessionData;
        try {
          if (typeof value === 'string') {
            sessionData = JSON.parse(value) as SessionData;
          } else {
            sessionData = value as SessionData;
          }
        } catch (parseError) {
          console.warn('[SessionManager] Failed to parse session data:', parseError);
          return;
        }

        if (sessionData.connectionId !== connectionId) {
          return;
        }

        const parsedKey = this.parseSessionKey(keys[index]);
        if (!parsedKey) {
          return;
        }

        if (!newest || sessionData.createdAt > newest.createdAt) {
          newest = { sessionId: parsedKey.sessionId, createdAt: sessionData.createdAt };
        }
      });

      return newest ? newest.sessionId : null;
    } catch (error) {
      console.error('[SessionManager] Failed to find session for connection:', error);
      return null;
    }
  }

  /**
   * Deletes all sessions and state entries for a specific user
   */
  static async cleanupUserSessions(userId: string): Promise<{ sessions: number; states: number }> {
    const kv = await getKV();
    if (!kv) {
      return { sessions: 0, states: 0 };
    }

    try {
      const sessionPattern = `mcp_session:${userId}:*`;
      const statePattern = `mcp_session_state:${userId}:*`;
      const versionPattern = `mcp_session_state_version:${userId}:*`;

      const [sessionKeys, stateKeys, versionKeys] = await Promise.all([
        this.scanKeys(sessionPattern, SESSION_CLEANUP_BATCH_SIZE),
        this.scanKeys(statePattern, SESSION_CLEANUP_BATCH_SIZE),
        this.scanKeys(versionPattern, SESSION_CLEANUP_BATCH_SIZE),
      ]);

      let sessionsDeleted = 0;
      let statesDeleted = 0;

      for (const key of sessionKeys) {
        // eslint-disable-next-line no-await-in-loop -- bounded delete loop
        await kv.del(key);
        sessionsDeleted += 1;
      }

      for (const key of stateKeys) {
        // eslint-disable-next-line no-await-in-loop -- bounded delete loop
        await kv.del(key);
        statesDeleted += 1;
      }

      for (const key of versionKeys) {
        // eslint-disable-next-line no-await-in-loop -- bounded delete loop
        await kv.del(key);
      }

      console.log(
        `[SessionManager] Cleanup for user ${userId} removed ${sessionsDeleted} sessions and ${statesDeleted} states`
      );

      return { sessions: sessionsDeleted, states: statesDeleted };
    } catch (error) {
      console.error('[SessionManager] Failed to cleanup user sessions:', error);
      return { sessions: 0, states: 0 };
    }
  }

  /**
   * Removes orphaned state keys when sessions expire
   */
  static async cleanupExpiredSessions(): Promise<{ statesDeleted: number }> {
    const kv = await getKV();
    if (!kv) {
      return { statesDeleted: 0 };
    }

    try {
      const stateKeys = await this.scanKeys('mcp_session_state:*', SESSION_CLEANUP_BATCH_SIZE);
      let statesDeleted = 0;

      const chunkSize = SESSION_CLEANUP_BATCH_SIZE;
      for (let i = 0; i < stateKeys.length; i += chunkSize) {
        const chunk = stateKeys.slice(i, i + chunkSize);
        const pairs = chunk
          .map((stateKey) => {
            const parsed = this.parseStateKey(stateKey);
            if (!parsed) {
              return null;
            }
            return {
              stateKey,
              sessionKey: this.getSessionKey(parsed.userId, parsed.sessionId),
              versionKey: this.getStateVersionKey(parsed.userId, parsed.sessionId),
            };
          })
          .filter(Boolean) as Array<{ stateKey: string; sessionKey: string; versionKey: string }>;

        const sessionKeys = pairs.map((pair) => pair.sessionKey);

        if (sessionKeys.length === 0) {
          continue;
        }

        // eslint-disable-next-line no-await-in-loop -- bounded batch fetch
        const sessionValues = typeof kv.mget === 'function'
          ? await kv.mget(...sessionKeys)
          : await Promise.all(sessionKeys.map((key) => kv.get(key)));

        for (let j = 0; j < sessionValues.length; j += 1) {
          if (sessionValues[j]) {
            continue;
          }

          const { stateKey, versionKey } = pairs[j];
          // eslint-disable-next-line no-await-in-loop -- bounded delete loop
          await kv.del(stateKey);
          await kv.del(versionKey);
          statesDeleted += 1;
        }
      }

      console.log(`[SessionManager] Cleanup removed ${statesDeleted} orphaned session state keys`);
      return { statesDeleted };
    } catch (error) {
      console.error('[SessionManager] Failed to cleanup expired sessions:', error);
      return { statesDeleted: 0 };
    }
  }

  /**
   * Records metrics into Redis sorted sets and counters
   */
  private static async recordMetric(
    type: SessionMetricType,
    data: {
      sessionId?: string;
      userId?: string;
      organizationId?: string;
      connectionId?: string;
      connectionName?: string;
      value?: number;
    }
  ): Promise<void> {
    if (!METRICS_ENABLED) {
      return;
    }

    const kv = await getKV();
    if (!kv) {
      return;
    }

    const timestamp = Date.now();
    const payload = {
      type,
      timestamp,
      ...data,
    };

    try {
      const key = `mcp_metrics:${type}`;
      if (typeof kv.zadd === 'function') {
        await kv.zadd(key, { score: timestamp, member: JSON.stringify(payload) });
      }

      if (typeof kv.expire === 'function') {
        await kv.expire(key, METRICS_RETENTION_DAYS * 86400);
      }

      const countersKey = 'mcp_counters';
      if (typeof kv.hincrby === 'function') {
        if (data.userId) {
          await kv.hincrby(countersKey, `user:${data.userId}:${type}`, 1);
        }
        if (data.organizationId) {
          await kv.hincrby(countersKey, `org:${data.organizationId}:${type}`, 1);
        }
        if (data.sessionId) {
          await kv.hincrby(countersKey, `session:${data.sessionId}:${type}`, 1);
        }
      }
    } catch (error) {
      console.warn('[SessionManager] Failed to record metric:', error);
    }
  }

  /**
   * Aggregates recent metrics into hourly rollups
   */
  static async aggregateMetrics(): Promise<SessionMetricsAggregation | null> {
    if (!METRICS_ENABLED) {
      return null;
    }

    const kv = await getKV();
    if (!kv || typeof kv.zrangebyscore !== 'function') {
      return null;
    }

    const hourStart = Math.floor(Date.now() / 3600000) * 3600000;
    const hourEnd = hourStart + 3600000 - 1;
    const metricTypes: SessionMetricType[] = [
      'session_created',
      'session_validated',
      'session_extended',
      'session_deleted',
      'session_hijack_blocked',
      'request_count',
      'session_validation_failed',
    ];

    const rollup: SessionMetricsAggregation = {
      hourStart,
      hourEnd,
      totals: {} as Record<SessionMetricType, { count: number; avg: number | null; p50: number | null; p95: number | null }>,
    };

    for (const type of metricTypes) {
      const key = `mcp_metrics:${type}`;
      // eslint-disable-next-line no-await-in-loop -- bounded per-metric read
      const entries = await kv.zrangebyscore(key, hourStart, hourEnd);
      const values: number[] = [];

      for (const entry of entries || []) {
        if (typeof entry !== 'string') {
          continue;
        }
        try {
          const parsed = JSON.parse(entry) as { value?: number };
          if (typeof parsed.value === 'number') {
            values.push(parsed.value);
          }
        } catch (error) {
          // ignore malformed payloads
        }
      }

      rollup.totals[type] = {
        count: entries?.length || 0,
        avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
        p50: percentile(values, 0.5),
        p95: percentile(values, 0.95),
      };
    }

    const rollupKey = `mcp_metrics_hourly:${hourStart}`;
    await kv.setex(rollupKey, 31536000, rollup);

    return rollup;
  }

  /**
   * Records request count metrics
   */
  static async recordRequestCount(data: {
    sessionId?: string;
    userId?: string;
    organizationId?: string;
  }): Promise<void> {
    await this.recordMetric('request_count', data);
  }

  private static async scanKeys(matchPattern: string, count: number): Promise<string[]> {
    const kv = await getKV();
    if (!kv) {
      return [];
    }

    const keys: string[] = [];
    if (typeof kv.scanIterator === 'function') {
      for await (const key of kv.scanIterator({ match: matchPattern, count })) {
        keys.push(String(key));
      }
      return keys;
    }

    if (typeof kv.scan === 'function') {
      let cursor = '0';
      do {
        // eslint-disable-next-line no-await-in-loop -- bounded scan loop
        const [nextCursor, batch] = await kv.scan(cursor, { match: matchPattern, count });
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');
    }

    return keys;
  }

  /**
   * Lists all sessions scoped to an organization
   */
  static async listSessionsByOrganization(organizationId: string): Promise<SessionRecord[]> {
    const kv = await getKV();
    if (!kv) {
      return [];
    }

    try {
      const keys: string[] = [];

      if (typeof kv.scanIterator === 'function') {
        for await (const key of kv.scanIterator({ match: 'mcp_session:*', count: 1000 })) {
          keys.push(String(key));
        }
      } else if (typeof kv.scan === 'function') {
        let cursor = '0';
        do {
          // eslint-disable-next-line no-await-in-loop -- bounded scan loop
          const [nextCursor, batch] = await kv.scan(cursor, { match: 'mcp_session:*', count: 1000 });
          cursor = nextCursor;
          keys.push(...batch);
        } while (cursor !== '0');
      }

      if (keys.length === 0) {
        return [];
      }

      const sessions: SessionRecord[] = [];
      const chunkSize = 50;

      for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        // eslint-disable-next-line no-await-in-loop -- bounded batch fetch
        const values = typeof kv.mget === 'function'
          ? await kv.mget(...chunk)
          : await Promise.all(chunk.map((key) => kv.get(key)));

        values.forEach((value, index) => {
          if (!value) {
            return;
          }

          const parsedKey = this.parseSessionKey(chunk[index]);
          if (!parsedKey) {
            return;
          }

          let sessionData: SessionData;
          try {
            if (typeof value === 'string') {
              sessionData = JSON.parse(value) as SessionData;
            } else {
              sessionData = value as SessionData;
            }
          } catch (parseError) {
            console.warn('[SessionManager] Failed to parse session data:', parseError);
            return;
          }

          if (sessionData.organizationId !== organizationId) {
            return;
          }

          sessions.push({
            sessionId: parsedKey.sessionId,
            userId: sessionData.userId,
            organizationId: sessionData.organizationId,
            createdAt: sessionData.createdAt,
            connectionId: sessionData.connectionId,
            connectionName: sessionData.connectionName,
          });
        });
      }

      return sessions.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('[SessionManager] Failed to list sessions:', error);
      return [];
    }
  }

  private static parseSessionKey(key: string): { userId: string; sessionId: string } | null {
    const [prefix, userId, sessionId] = key.split(':');
    if (prefix !== 'mcp_session' || !userId || !sessionId) {
      return null;
    }

    return { userId, sessionId };
  }

  private static parseStateKey(key: string): { userId: string; sessionId: string } | null {
    const [prefix, userId, sessionId] = key.split(':');
    if (prefix !== 'mcp_session_state' || !userId || !sessionId) {
      return null;
    }

    return { userId, sessionId };
  }
}

export function setKVClientForTests(client?: any | null): void {
  kvClientOverride = client;
  kvClient = client ?? null;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  organizationId: string;
  createdAt: number;
  connectionId?: string;
  connectionName?: string;
}

export type SessionValidationResult = {
  valid: boolean;
  reason?: 'not_found' | 'user_mismatch' | 'error';
};

/**
 * Validates Redis/KV configuration at module load time
 * Provides clear error messages if environment is not properly configured
 */
function percentile(values: number[], p: number): number | null {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * p);
  return sorted[index] ?? null;
}

if (!isKVConfigured()) {
  console.warn(
    '[SessionManager] Warning: KV/Redis not configured. ' +
    'Session management will operate in development mode without persistence. ' +
    'For production, configure KV_REST_API_URL and KV_REST_API_TOKEN (Vercel KV), ' +
    'or KV_URL/REDIS_URL for Redis.'
  );
}
