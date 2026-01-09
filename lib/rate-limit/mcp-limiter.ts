/**
 * MCP Rate Limiting with Upstash Redis
 *
 * Implements dual-layer rate limiting for MCP endpoints:
 * - IP-based limiting (20 req/min) for unauthenticated requests
 * - User-based limiting (100 req/min) for authenticated requests
 *
 * Features:
 * - Redis-based distributed rate limiting using Upstash
 * - Graceful fallback to in-memory limiting if Redis unavailable
 * - RFC 6585 compliant 429 responses with Retry-After headers
 * - Environment variable configuration for thresholds
 * - Analytics tracking for rate limit events
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Environment variable configuration with defaults
const IP_LIMIT = parseInt(process.env.MCP_IP_RATE_LIMIT || "20", 10);
const USER_LIMIT = parseInt(process.env.MCP_USER_RATE_LIMIT || "100", 10);
const RATE_LIMIT_WINDOW = "1 m"; // 1 minute window

// In-memory fallback cache for when Redis is unavailable
const inMemoryCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Get client IP address from request headers
 * Handles X-Forwarded-For and other proxy headers
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * In-memory rate limiter fallback
 * Used when Redis is unavailable
 */
function checkInMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const cached = inMemoryCache.get(key);

  if (!cached || cached.resetAt <= now) {
    // New window
    const resetAt = now + windowMs;
    inMemoryCache.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt,
    };
  }

  if (cached.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      limit,
      remaining: 0,
      reset: cached.resetAt,
    };
  }

  // Increment count
  cached.count += 1;
  inMemoryCache.set(key, cached);

  return {
    success: true,
    limit,
    remaining: limit - cached.count,
    reset: cached.resetAt,
  };
}

/**
 * Cleanup expired in-memory cache entries
 */
function cleanupInMemoryCache() {
  const now = Date.now();
  for (const [key, value] of inMemoryCache.entries()) {
    if (value.resetAt <= now) {
      inMemoryCache.delete(key);
    }
  }
}

// Cleanup every minute
setInterval(cleanupInMemoryCache, 60000);

/**
 * Create Redis client for rate limiting
 * Returns null if Redis is not configured
 */
function createRedisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn("[Rate Limit] Redis not configured, using in-memory fallback");
    return null;
  }

  try {
    return new Redis({
      url,
      token,
    });
  } catch (error) {
    console.error("[Rate Limit] Failed to create Redis client:", error);
    return null;
  }
}

// Initialize Redis client
const redis = createRedisClient();

/**
 * IP-based rate limiter (20 requests per minute)
 * Applied before authentication to prevent brute force attacks
 */
export const ipRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(IP_LIMIT, RATE_LIMIT_WINDOW),
      prefix: "mcp:ratelimit:ip",
      analytics: true,
    })
  : null;

/**
 * User-based rate limiter (100 requests per minute)
 * Applied after authentication using userId
 */
export const userRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(USER_LIMIT, RATE_LIMIT_WINDOW),
      prefix: "mcp:ratelimit:user",
      analytics: true,
    })
  : null;

/**
 * Rate limit result type
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Check IP-based rate limit
 * Falls back to in-memory limiting if Redis unavailable
 */
export async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  const identifier = `ip:${ip}`;

  if (!ipRateLimiter) {
    // Fallback to in-memory rate limiting
    return checkInMemoryRateLimit(identifier, IP_LIMIT, 60000);
  }

  try {
    const result = await ipRateLimiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    console.error("[Rate Limit] Redis error, falling back to in-memory:", error);
    // Fallback to in-memory on Redis errors
    return checkInMemoryRateLimit(identifier, IP_LIMIT, 60000);
  }
}

/**
 * Check user-based rate limit
 * Falls back to in-memory limiting if Redis unavailable
 */
export async function checkUserRateLimit(userId: string): Promise<RateLimitResult> {
  const identifier = `user:${userId}`;

  if (!userRateLimiter) {
    // Fallback to in-memory rate limiting
    return checkInMemoryRateLimit(identifier, USER_LIMIT, 60000);
  }

  try {
    const result = await userRateLimiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    console.error("[Rate Limit] Redis error, falling back to in-memory:", error);
    // Fallback to in-memory on Redis errors
    return checkInMemoryRateLimit(identifier, USER_LIMIT, 60000);
  }
}

/**
 * Add rate limit headers to response
 * Follows RFC 6585 and RateLimit header draft standard
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult
): void {
  headers["X-RateLimit-Limit"] = result.limit.toString();
  headers["X-RateLimit-Remaining"] = result.remaining.toString();
  headers["X-RateLimit-Reset"] = result.reset.toString();

  if (!result.success && result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString();
  }
}

/**
 * Track rate limit event for analytics
 */
export function trackRateLimitEvent(
  type: "ip" | "user",
  identifier: string,
  exceeded: boolean
): void {
  // This can be integrated with your analytics service
  if (exceeded) {
    console.warn(`[Rate Limit] ${type} rate limit exceeded: ${identifier}`);
  }
}
