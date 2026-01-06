# MCP Server Security Documentation

## Overview

This document describes the security measures implemented in the MCP (Model Context Protocol) server to protect against common attacks and ensure secure operation.

## Security Layers

### 1. DNS Rebinding Protection (Origin & Host Validation)

**What it prevents:** DNS rebinding attacks where an attacker tricks a browser into making requests from a malicious domain.

**Implementation:**
- Validates `Origin` header against `MCP_ALLOWED_ORIGINS` whitelist
- Validates `Host` header against `MCP_EXPECTED_HOST` or defaults to request host
- Rejects requests with missing or invalid headers
- Development mode allows localhost variations, production requires exact match

**Configuration:**
```env
MCP_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MCP_EXPECTED_HOST=localhost:3000  # Required in production
```

**Code:** `lib/mcp/origin-validator.ts`

### 2. Connection Token Authentication

**What it prevents:** Unauthorized access to organization data via MCP tools.

**Implementation:**
- Long-lived tokens (90 days) for desktop MCP clients
- Tokens hashed with SHA-256 before storage (never stored in plaintext)
- Per-request validation with expiry and revocation checks
- Organization membership verified on every request
- Automatic revocation when user loses org access

**Token Lifecycle:**
1. User generates token via settings UI
2. Token stored as SHA-256 hash in database
3. Every MCP request validates token hash, expiry, revocation, and org membership
4. Tokens auto-revoked when:
   - User removed from organization
   - User account deleted
   - User manually revokes token
   - Token expires (90 days)

**Code:** `lib/mcp/connection-validator.ts`, `services/mcp-connection-service.ts`

### 3. Organization Scoping

**What it prevents:** Cross-organization data leakage.

**Implementation:**
- `AuthContext` provides validated `organization_id` to all MCP tools
- Tools must filter queries by organization ID
- RLS policies on `mcp_connections` table
- Permission check on every request (not just token validation)

**Code:** `lib/mcp/auth-context.ts`

### 4. CORS Configuration

**What it prevents:** Unauthorized cross-origin requests, browser security bypasses.

**Implementation:**
- Reflects validated origin per-request (not comma-separated list)
- Includes `Authorization` in `Access-Control-Allow-Headers`
- Sets `Access-Control-Allow-Credentials: true`
- Proper preflight handling for OPTIONS requests

**Code:** `app/api/mcp/route.ts` (`getCorsHeaders()`)

### 5. Service Role Security

**What it prevents:** Abuse of elevated database access.

**Implementation:**
- Service role ONLY used for token validation (pre-authentication step)
- Similar pattern to webhook signature verification
- All user-initiated operations use RLS-enabled client
- Service role key never exposed to client bundles (server-only)

**Code:** `lib/mcp/connection-validator.ts` (lines 31-33)

### 6. Audit Logging

**What it provides:** Security visibility and compliance.

**Implementation:**
- `last_used_at` timestamp on every request
- `is_connected` status tracking
- Request logging with timestamp, method, origin, user_id, connection name
- Database triggers for automatic token revocation

**Code:** `app/api/mcp/route.ts` (line 58), `lib/mcp/connection-validator.ts` (lines 72-78)

## Security Best Practices Compliance

### MCP Specification Requirements

✅ **REQUIRED: Verify all inbound requests** - Every request validated via `AuthContext.fromRequest()`
✅ **REQUIRED: Token audience validation** - Token tied to user + organization
✅ **REQUIRED: No session-based auth** - Using Bearer tokens, not sessions
✅ **REQUIRED: Secure token generation** - `crypto.randomBytes(32)` + SHA-256
✅ **RECOMMENDED: Session ID user binding** - user_id + organization_id + connection_id

### Additional Protections

✅ **Defense in Depth** - Multiple security layers (origin, token, permissions, org scoping)
✅ **Fail-Secure Defaults** - Empty whitelist rejects all, missing host rejects
✅ **Principle of Least Privilege** - Service role only for auth, RLS for data access
✅ **Audit Trail** - All requests logged with full context

## Threat Model & Mitigations

| Threat | Mitigation | Status |
|--------|-----------|--------|
| DNS Rebinding | Origin + Host validation | ✅ Fixed |
| Token Theft | Hashed storage, HTTPS-only, revocation | ✅ |
| Stale Tokens (ex-members) | Permission check + auto-revoke | ✅ Fixed |
| Cross-Org Leakage | Organization scoping in all tools | ✅ |
| CORS Bypass | Proper origin reflection, credentials | ✅ Fixed |
| Service Role Abuse | Limited to auth only, never in client | ✅ |
| Brute Force | Rate limiting (TODO) | ⚠️ Future |

## Addressing Security Findings

### High - Token Validity After Membership Removal ✅ FIXED

**Original Issue:** Connection tokens remained valid even after user lost org access.

**Fix Applied:**
1. Added permission check to `connection-validator.ts` (lines 47-69)
2. Auto-revokes token if user no longer has org access
3. Database triggers auto-revoke tokens when permissions deleted
4. Database triggers auto-revoke tokens when user account deleted

**Migration:** `supabase/migrations/20260106_mcp_security_enhancements.sql`

### Medium - CORS Misconfiguration ✅ FIXED

**Original Issue:** Multiple origins in one header (invalid), missing Authorization header.

**Fix Applied:**
1. Changed to per-request origin reflection
2. Added `Authorization` to `Access-Control-Allow-Headers`
3. Added `Access-Control-Allow-Credentials: true`
4. Proper CORS headers on all responses (error and success)

**Code:** `app/api/mcp/route.ts` (`getCorsHeaders()`)

### Medium - DNS Rebinding Bypass ✅ FIXED

**Original Issue:** Missing `MCP_EXPECTED_HOST` allowed any host if env not set.

**Fix Applied:**
1. Defaults to request host if env not set (fail-safe)
2. Requires host header (rejects if missing)
3. Strict localhost matching for development
4. Exact match required in production
5. Security warnings logged for mismatches

**Code:** `lib/mcp/origin-validator.ts` (lines 27-60)

## Token Lifetime Considerations

**Current:** 90-day expiration

**Rationale:**
- Desktop MCP clients are long-running applications
- Users don't want to re-authenticate frequently
- Similar to GitHub Personal Access Tokens, Anthropic API keys

**Recommendations:**
- Keep 90 days for general use
- Add option for shorter-lived tokens (30 days) for sensitive orgs
- Add "Last Used" visibility in UI to detect stale tokens
- Consider token refresh mechanism if tools access highly sensitive data

**Future Enhancement:** Scoped tokens with granular permissions per tool.

## Service Role Key Protection

**Current Safeguards:**
1. Only used server-side in `lib/mcp/connection-validator.ts`
2. Never imported by client components
3. Next.js build process keeps server files separate
4. Vercel serverless functions isolate server code

**Monitoring Recommendations:**
1. Add Supabase audit logging for service role queries
2. Alert on unusual service role usage patterns
3. Rotate service role key periodically (quarterly)
4. Use Vercel environment variables, not .env files in production

**Validation:** Service role key is ONLY in:
- `.env.local` (local dev, gitignored)
- Vercel environment variables (production)
- `lib/supabase/server.ts` (server-only export)
- `lib/mcp/connection-validator.ts` (server-only usage)

## Production Deployment Checklist

- [ ] Set `MCP_ALLOWED_ORIGINS` to production domains only
- [ ] Set `MCP_EXPECTED_HOST` to production domain
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` if previously committed
- [ ] Enable HTTPS-only mode (no HTTP)
- [ ] Run security migration: `20260106_mcp_security_enhancements.sql`
- [ ] Review token lifetime policy for your org's needs
- [ ] Set up monitoring for failed authentication attempts
- [ ] Configure rate limiting (future enhancement)
- [ ] Test with actual MCP client before going live

## References

- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
- [OAuth 2.1 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
