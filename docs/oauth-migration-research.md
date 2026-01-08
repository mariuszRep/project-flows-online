# OAuth 2.1 Migration Research and Planning

**Document Version:** 1.0
**Date:** January 8, 2026
**Author:** Project Flows Development Team
**Status:** Research Complete - Decision Pending

## Executive Summary

This document presents comprehensive research on migrating from the current token-based MCP authentication system to OAuth 2.1 with Supabase's OAuth 2.1 Server capabilities. The research evaluates Supabase's recently launched OAuth 2.1 Server (public beta, November 26, 2025), Model Context Protocol (MCP) OAuth 2.1 requirements, and relevant OAuth 2.1 standards.

### Key Findings

- **Supabase OAuth 2.1 Server**: Currently in public beta with full MCP authentication support, including dynamic client registration, PKCE, OpenID Connect, and automatic Row Level Security integration
- **MCP Compliance**: The current token-based system does NOT meet MCP OAuth 2.1 specification requirements (MUST implement OAuth 2.1 per MCP spec)
- **Standards Support**: Supabase implements RFC 7591 (Dynamic Client Registration), RFC 8414 (Authorization Server Metadata), OAuth 2.1 with mandatory PKCE, and OpenID Connect
- **Production Status**: Beta phase (free during beta), no specific GA timeline announced, recent launch (2+ months old)
- **Migration Complexity**: Moderate to high - requires database schema changes, authentication flow redesign, Claude Desktop configuration updates, and coordinated client updates

### Recommendation

**WAIT AND MONITOR** with pragmatic enhancements to current system.

**Rationale:**
1. Supabase OAuth 2.1 Server is only 2 months into public beta without confirmed GA timeline
2. Current system works reliably for first-party Claude Desktop integration
3. No immediate third-party MCP client ecosystem requiring OAuth 2.1 compliance
4. Beta status presents production risk with potential breaking changes
5. Migration would be breaking change requiring coordinated updates across all Claude Desktop instances

**Suggested Path Forward:**
1. Monitor Supabase OAuth 2.1 Server maturity and GA announcement
2. Enhance current system with better session management and token security
3. Plan migration for Q2-Q3 2026 when OAuth Server reaches GA
4. Begin prototyping OAuth integration in development environment
5. Reassess quarterly based on Supabase roadmap and third-party client demand

---

## Table of Contents

1. [Current Authentication System Analysis](#current-authentication-system-analysis)
2. [Supabase OAuth 2.1 Server Capabilities](#supabase-oauth-21-server-capabilities)
3. [MCP OAuth 2.1 Requirements](#mcp-oauth-21-requirements)
4. [OAuth 2.1 Standards (RFC 7591, RFC 8707)](#oauth-21-standards)
5. [Feature Comparison Matrix](#feature-comparison-matrix)
6. [Production Readiness Assessment](#production-readiness-assessment)
7. [Migration Effort Estimation](#migration-effort-estimation)
8. [Risk Analysis](#risk-analysis)
9. [Timeline and Milestones](#timeline-and-milestones)
10. [Decision Criteria](#decision-criteria)
11. [References and Documentation](#references-and-documentation)

---

## Current Authentication System Analysis

### Architecture Overview

The current system implements a **token-based authentication** mechanism designed specifically for first-party Claude Desktop MCP connections.

### Key Components

#### 1. Connection Validator (`lib/mcp/connection-validator.ts`)
- Validates connection tokens against SHA-256 hashed tokens stored in database
- Queries `mcp_connections` table with token hash lookup
- Enforces expiration checks (`expires_at > now()`)
- Enforces revocation checks (`revoked_at IS NULL`)
- Validates organization membership via `permissions` table
- Updates `last_used_at` and `is_connected` status on each validation

#### 2. Auth Context (`lib/mcp/auth-context.ts`)
- Provides clean API for accessing validated connection throughout request lifecycle
- Extracts Bearer token from Authorization header
- Returns connection context: `userId`, `organizationId`, `connectionId`, `name`
- Implements basic scope system (currently returns `['mcp:execute']`)

#### 3. MCP Route Handler (`app/api/mcp/route.ts`)
- Multi-step security validation:
  1. Origin validation (DNS rebinding protection)
  2. Protocol version negotiation (supports 2025-03-26, 2025-06-18, 2025-11-25)
  3. Connection token authentication via AuthContext
  4. MCP session management with Redis persistence
- Handles POST (JSON-RPC), GET (SSE streams), DELETE (disconnect) methods
- Implements CORS with reflected origin
- Creates stateless MCP server per request
- Session state management with Redis (`SessionManager`)

#### 4. Database Schema (`supabase/migrations/20260106110000_add_mcp_connections.sql`)
```sql
CREATE TABLE public.mcp_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  organization_id UUID NOT NULL REFERENCES organizations,
  token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hashed
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT false
);
```

### Security Features

1. **Token Hashing**: SHA-256 hash storage prevents token exposure in database breaches
2. **Organization Membership Validation**: Real-time permission checks prevent revoked members from using old tokens
3. **Expiration Enforcement**: Tokens have defined lifetimes
4. **Revocation Support**: Immediate token invalidation via `revoked_at`
5. **Origin Validation**: DNS rebinding protection
6. **Row Level Security**: RLS policies restrict access to organization members

### Current System Strengths

- **Simple User Experience**: Single long-lived token generation, copy-paste into Claude Desktop
- **Low Latency**: Direct SHA-256 hash lookup, no external OAuth flows
- **First-Party Optimization**: Designed for controlled Claude Desktop integration
- **Reliable**: Production-tested with session management
- **Fine-Grained Control**: Organization-scoped permissions with RLS

### Current System Limitations

1. **No MCP OAuth 2.1 Compliance**: Does not meet MCP specification requirements
2. **No Dynamic Client Registration**: Manual token generation required
3. **No Standard OAuth Flows**: Cannot integrate with third-party OAuth clients
4. **Limited Token Metadata**: No JWT structure, no standard claims
5. **No Audience Restriction**: Tokens valid for all resources (no RFC 8707 support)
6. **No PKCE**: Missing Proof Key for Code Exchange
7. **No Refresh Tokens**: Long-lived tokens without rotation
8. **No Consent Flow**: No user authorization approval step
9. **No Discovery Endpoints**: No `.well-known/oauth-authorization-server`
10. **Third-Party Ecosystem Barrier**: External MCP clients cannot authenticate

### Files Requiring Modification for OAuth 2.1 Migration

- `lib/mcp/connection-validator.ts` → JWT validation with audience checking
- `lib/mcp/auth-context.ts` → Extract claims from JWT access tokens
- `app/api/mcp/route.ts` → Add OAuth authorization endpoint handlers
- `supabase/migrations/` → New schema for `oauth_clients` table
- Database: Replace `mcp_connections` with `oauth_clients` and `oauth_authorization_codes`

---

## Supabase OAuth 2.1 Server Capabilities

### Overview

Supabase Auth now acts as an **OAuth 2.1 and OpenID Connect (OIDC) identity provider** with comprehensive MCP authentication support. The feature launched in **public beta on November 26, 2025** and is free during the beta period.

**Official Documentation:** [https://supabase.com/docs/guides/auth/oauth-server](https://supabase.com/docs/guides/auth/oauth-server)

### Protocol Support

#### OAuth 2.1
- **Authorization Code Flow with PKCE** (mandatory, OAuth 2.1 spec requirement)
- **Refresh Token Rotation**: Automatic token refresh with rotation support
- **Token Introspection**: Validate token status
- **Token Revocation**: Immediate token invalidation

#### OpenID Connect (OIDC)
- **ID Tokens**: JWT tokens with `openid` scope
- **UserInfo Endpoint**: `/oauth/v2/userinfo` for user profile data
- **OIDC Discovery**: `/.well-known/openid-configuration`
- **Standard Scopes**: `openid`, `email`, `profile`, `phone`

#### Standards Compliance
- **RFC 8414** - OAuth 2.0 Authorization Server Metadata
- **RFC 7591** - OAuth 2.0 Dynamic Client Registration Protocol
- **RFC 7636** - Proof Key for Code Exchange (PKCE)
- **OpenID Connect Core 1.0**

### Key Features

#### 1. Dynamic Client Registration (RFC 7591)
```http
POST https://<project-ref>.supabase.co/auth/v1/oauth/register
Content-Type: application/json

{
  "client_name": "My MCP Client",
  "redirect_uris": ["http://localhost:8080/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"  // Public client
}
```

**Enables:**
- Automatic MCP client registration without user intervention
- No pre-configured client IDs required
- Self-service client onboarding

**Configuration:**
- Enable in **Authentication > OAuth Server** dashboard
- Supports rate limiting and redirect URI validation
- Optional user approval requirements

#### 2. Authorization Flow with PKCE

**Step 1: Discovery**
```http
GET https://<project-ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1
```

Returns OAuth server metadata including endpoint URLs, supported flows, and capabilities.

**Step 2: Authorization Request**
```http
GET https://<project-ref>.supabase.co/auth/v1/authorize?
  response_type=code&
  client_id=<client_id>&
  redirect_uri=<redirect_uri>&
  scope=openid email profile&
  state=<random_state>&
  code_challenge=<sha256_base64url_hash>&
  code_challenge_method=S256
```

**Step 3: Token Exchange**
```http
POST https://<project-ref>.supabase.co/auth/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<authorization_code>&
client_id=<client_id>&
redirect_uri=<redirect_uri>&
code_verifier=<original_verifier>
```

**Security Features:**
- Authorization codes valid for 10 minutes
- Single-use codes (cannot be replayed)
- PKCE prevents code interception attacks
- State parameter prevents CSRF

#### 3. Token Management

**Access Tokens:**
- Standard Supabase JWTs with additional claims
- Contains: `user_id`, `role`, `client_id`, `aud` (audience), `exp`, `iat`
- Existing Row Level Security policies automatically apply
- Bearer token authentication: `Authorization: Bearer <access_token>`

**Refresh Tokens:**
- Long-lived tokens for obtaining new access tokens
- Automatic rotation on refresh
- Securely stored, not exposed to client-side code

**Token Introspection:**
```http
POST https://<project-ref>.supabase.co/auth/v1/introspect
```

**Token Revocation:**
```http
POST https://<project-ref>.supabase.co/auth/v1/revoke
```

#### 4. Row Level Security Integration

**Automatic RLS Application:**
- OAuth tokens inherit Supabase user permissions
- RLS policies can include `client_id` claim for client-specific access control
- Fine-grained authorization: user + client + organization scoping

**Example RLS Policy:**
```sql
CREATE POLICY "oauth_client_access" ON workflows
  FOR SELECT USING (
    organization_id IN (
      SELECT org_id FROM permissions
      WHERE principal_id = auth.uid()
      AND deleted_at IS NULL
    )
    AND (
      -- Allow full access if not an OAuth client
      (auth.jwt() -> 'client_id') IS NULL
      OR
      -- Restrict OAuth clients to specific resources
      id IN (SELECT workflow_id FROM oauth_client_permissions WHERE client_id = (auth.jwt() ->> 'client_id'))
    )
  );
```

#### 5. MCP-Specific Features

**MCP Server URL Pattern:**
```
https://<project-ref>.supabase.co/auth/v1
```

**MCP Discovery Endpoint:**
```
https://<project-ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1
```

**Benefits for MCP:**
- Existing user authentication (no separate auth system)
- Standards compliance for third-party MCP clients
- Automatic client discovery
- Dynamic client registration
- Explicit user authorization with consent screen
- Token lifecycle management

### Metadata Endpoints

#### OAuth Authorization Server Metadata (RFC 8414)
```
GET /.well-known/oauth-authorization-server/auth/v1
```

**Returns:**
```json
{
  "issuer": "https://<project-ref>.supabase.co/auth/v1",
  "authorization_endpoint": "https://<project-ref>.supabase.co/auth/v1/authorize",
  "token_endpoint": "https://<project-ref>.supabase.co/auth/v1/token",
  "registration_endpoint": "https://<project-ref>.supabase.co/auth/v1/oauth/register",
  "jwks_uri": "https://<project-ref>.supabase.co/auth/v1/jwks",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none", "client_secret_post"]
}
```

#### OpenID Connect Discovery
```
GET /.well-known/openid-configuration
```

Provides OIDC-specific endpoints and capabilities.

### Current Limitations (Beta)

1. **No Resource Indicators (RFC 8707)**: Audience claim configuration not documented
2. **Beta Status**: Potential breaking changes, limited production guarantees
3. **No GA Timeline**: No public roadmap for general availability
4. **Limited Documentation**: Some advanced features underdocumented
5. **Community Feedback Needed**: GitHub Discussion #38022 for feature requests

### Configuration Steps

1. **Enable OAuth Server**: Authentication > OAuth Server in Supabase Dashboard
2. **Register OAuth Client**: Manual registration or enable dynamic registration
3. **Configure Redirect URIs**: Allowlist localhost and production domains
4. **Test Discovery**: Verify `.well-known` endpoints return valid JSON
5. **Implement Authorization Flow**: Build consent screen UI

---

## MCP OAuth 2.1 Requirements

### Specification Overview

The Model Context Protocol defines **optional** OAuth 2.1 authorization for HTTP-based transports. STDIO transports should use environment-based credentials instead.

**Official Specification:** [https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)

### Standards Compliance (MUST)

MCP implementations **MUST** implement:
1. **OAuth 2.1 IETF DRAFT** - Latest OAuth specification
2. **RFC 8414** - OAuth 2.0 Authorization Server Metadata
3. **RFC 7591** - OAuth 2.0 Dynamic Client Registration Protocol (SHOULD)

### Authentication Requirements

#### Authorization Header (MUST)
```http
Authorization: Bearer <access-token>
```

**Requirements:**
- Access tokens **MUST** be sent in Authorization header for every request
- Access tokens **MUST NOT** be included in URI query strings
- Tokens required even if requests are part of the same logical session

#### Token Validation (MUST)

**Resource Servers MUST:**
- Validate access tokens per OAuth 2.1 Section 5.2
- Return **HTTP 401 Unauthorized** for invalid/expired tokens
- Return **HTTP 403 Forbidden** for insufficient scopes/permissions
- Return **HTTP 400 Bad Request** for malformed requests

**WWW-Authenticate Header:**
```http
WWW-Authenticate: Bearer realm="MCP", error="invalid_token", error_description="Token expired"
```

### Server Metadata Discovery (MUST for Clients, SHOULD for Servers)

#### Discovery Process

1. **Primary Method**: Attempt metadata discovery at:
   ```
   GET /.well-known/oauth-authorization-server
   ```

2. **Fallback Method**: If metadata unavailable, use default endpoints:
   - Authorization: `{base_url}/authorize`
   - Token: `{base_url}/token`
   - Registration: `{base_url}/register`

3. **Base URL Determination**:
   - Remove path component from MCP server URL
   - Example: `https://api.example.com/v1/mcp` → `https://api.example.com`

**Servers SHOULD** implement RFC 8414 metadata endpoint to reduce manual client configuration.

### PKCE Requirements (REQUIRED)

**PKCE is REQUIRED for all clients** per OAuth 2.1:

**Code Verifier Generation:**
```python
import secrets
import base64

code_verifier = base64.urlsafe_b64encode(
    secrets.token_bytes(32)
).decode('utf-8').rstrip('=')
```

**Code Challenge Generation (S256 method):**
```python
import hashlib

code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode('utf-8')).digest()
).decode('utf-8').rstrip('=')
```

**Security Benefits:**
- Prevents authorization code interception attacks
- Essential for public OAuth clients (e.g., desktop apps, mobile apps)
- Mitigates malicious app attacks

### Dynamic Client Registration (SHOULD)

**Servers SHOULD support RFC 7591** to enable:
- Automatic client ID acquisition without user interaction
- Registration without prior knowledge of all possible servers
- Seamless multi-server connections for MCP clients

**If not supported**, servers **MUST** provide alternative methods:
- Hardcoded well-known client IDs, OR
- Manual registration UI for users

**Benefits for MCP Ecosystem:**
- Reduces friction for third-party MCP client integration
- Enables zero-configuration server connections
- Supports diverse client implementations (Claude Desktop, custom agents, etc.)

### OAuth Grant Types (SHOULD Support)

#### 1. Authorization Code Grant
**Use Case:** Client acts on behalf of end user

**Example:** Claude Desktop connecting to SaaS-hosted MCP server

**Flow:**
1. Client redirects user to authorization endpoint
2. User approves requested scopes
3. Client receives authorization code
4. Client exchanges code for access + refresh tokens

#### 2. Client Credentials Grant
**Use Case:** Client is another application (no user impersonation)

**Example:** Agent checking inventory system with application credentials

**Flow:**
1. Client authenticates with client ID + secret
2. Receives access token scoped to client permissions

### Security Requirements (MUST)

#### 1. HTTPS Only
- All authorization endpoints **MUST** be served over HTTPS
- HTTP allowed only for localhost redirect URIs during development

#### 2. Redirect URI Validation
- Servers **MUST** validate redirect URIs to prevent open redirects
- **MUST** be exact match with registered redirect URIs
- **MUST** be localhost or HTTPS URLs only

#### 3. Token Storage
- Clients **MUST** securely store tokens per OAuth 2.0 best practices
- Refresh tokens **MUST** be stored more securely than access tokens
- Tokens **SHOULD NOT** be logged or exposed in error messages

#### 4. Token Lifecycle
- Servers **SHOULD** enforce token expiration and rotation
- Servers **SHOULD** limit token lifetimes based on security requirements
- Servers **SHOULD** support token revocation

#### 5. Third-Party Token Delegation
If delegating to third-party auth servers, servers **MUST**:
- Maintain secure mapping between third-party and MCP tokens
- Validate third-party token status before honoring MCP tokens
- Handle token expiration and renewal

### Authorization Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Client (e.g., Claude Desktop)                           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ 1. Discover OAuth endpoints
                    │    GET /.well-known/oauth-authorization-server
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ Authorization Server (Supabase Auth)                        │
│ - Returns metadata (endpoints, supported flows)             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ 2. Dynamic client registration (optional)
                    │    POST /register
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ Authorization Server                                         │
│ - Registers client, returns client_id                       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ 3. Request authorization
                    │    GET /authorize?response_type=code&
                    │        client_id=...&redirect_uri=...&
                    │        code_challenge=...&code_challenge_method=S256
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ User                                                         │
│ - Reviews requested scopes                                  │
│ - Approves or denies access                                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ 4. Authorization code returned
                    │    Redirect to redirect_uri?code=...&state=...
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ MCP Client                                                   │
│ - Receives authorization code                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ 5. Exchange code for tokens
                    │    POST /token
                    │    grant_type=authorization_code&code=...&
                    │    code_verifier=...
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ Authorization Server                                         │
│ - Validates code_verifier against code_challenge            │
│ - Issues access_token + refresh_token                       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ 6. Make API requests
                    │    Authorization: Bearer <access_token>
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ MCP Server (Resource Server)                                │
│ - Validates access token                                    │
│ - Enforces RLS policies with token claims                   │
│ - Returns requested data                                    │
└─────────────────────────────────────────────────────────────┘
```

### Comparison: Current System vs MCP Spec

| Requirement | Current System | MCP Spec | Compliant? |
|------------|----------------|----------|------------|
| OAuth 2.1 Implementation | ❌ Custom tokens | ✅ MUST implement | ❌ **NO** |
| Authorization Header | ✅ Bearer tokens | ✅ MUST use | ✅ YES |
| Token in Query String | ✅ Not used | ❌ MUST NOT use | ✅ YES |
| Server Metadata Discovery | ❌ Not implemented | ✅ SHOULD (MUST for clients) | ❌ **NO** |
| PKCE | ❌ Not implemented | ✅ REQUIRED | ❌ **NO** |
| Dynamic Client Registration | ❌ Manual token generation | ✅ SHOULD support | ❌ **NO** |
| Token Validation | ✅ SHA-256 hash lookup | ✅ OAuth 2.1 Section 5.2 | ⚠️ Partial |
| HTTP 401 for Invalid Token | ✅ Implemented | ✅ MUST return | ✅ YES |
| HTTP 403 for Insufficient Perms | ✅ Implemented | ✅ MUST return | ✅ YES |
| HTTPS Only | ✅ Production enforced | ✅ MUST use | ✅ YES |
| Token Expiration | ✅ Implemented | ✅ SHOULD enforce | ✅ YES |
| Token Revocation | ✅ Implemented | ✅ SHOULD support | ✅ YES |

**Compliance Summary:** The current system meets approximately 50% of MCP OAuth 2.1 requirements. The missing critical components are OAuth 2.1 protocol implementation, PKCE, dynamic client registration, and server metadata discovery.

---

## OAuth 2.1 Standards

### RFC 7591: OAuth 2.0 Dynamic Client Registration Protocol

**Published:** July 2015
**Status:** Standards Track
**Official Document:** [https://datatracker.ietf.org/doc/html/rfc7591](https://datatracker.ietf.org/doc/html/rfc7591)

#### Purpose

Defines mechanisms for dynamically registering OAuth 2.0 clients with authorization servers without manual administrator intervention.

#### Registration Flow

**1. Client Registration Request**
```http
POST /register HTTP/1.1
Host: auth.example.com
Content-Type: application/json
Accept: application/json

{
  "client_name": "My AI Agent",
  "client_uri": "https://agent.example.com",
  "redirect_uris": [
    "https://agent.example.com/callback",
    "http://localhost:8080/callback"
  ],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "client_secret_post",
  "scope": "read write"
}
```

**2. Server Registration Response**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "client_id": "s6BhdRkqt3",
  "client_secret": "cf136dc3c1fd29a9b48d5c7f6c1b8e8c",
  "client_id_issued_at": 1640995200,
  "client_secret_expires_at": 1672531200,
  "client_name": "My AI Agent",
  "client_uri": "https://agent.example.com",
  "redirect_uris": [
    "https://agent.example.com/callback",
    "http://localhost:8080/callback"
  ],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "client_secret_post"
}
```

#### Common Client Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `client_name` | String | Human-readable client name |
| `client_uri` | URL | Client information/homepage URL |
| `logo_uri` | URL | Client logo for consent screens |
| `redirect_uris` | Array[URL] | Allowed redirect URIs for authorization |
| `grant_types` | Array[String] | OAuth grant types client will use |
| `response_types` | Array[String] | OAuth response types (e.g., "code") |
| `scope` | String | Space-delimited requested scopes |
| `token_endpoint_auth_method` | String | Authentication method ("none", "client_secret_post", "client_secret_basic", "private_key_jwt") |
| `jwks_uri` | URL | URL to client's public key set (for JWT auth) |
| `contacts` | Array[Email] | Contact emails for client administrators |

#### Security Considerations

1. **Redirect URI Validation**: Servers MUST validate redirect URIs match registered values
2. **Scope Limitations**: Servers MAY restrict dynamically registered clients to subset of available scopes
3. **Client Authentication**: Public clients (e.g., mobile apps) use `token_endpoint_auth_method: "none"`
4. **Rate Limiting**: Servers SHOULD implement rate limiting to prevent abuse
5. **Client Credentials Rotation**: Servers MAY issue time-limited client secrets

#### Benefits for MCP

- **Zero-Configuration Integration**: MCP clients auto-register with new servers
- **Reduced User Friction**: No manual client ID generation/copying
- **Ecosystem Growth**: Easy third-party client development
- **Standardized Onboarding**: Consistent experience across MCP servers

#### Supabase Implementation

Supabase supports RFC 7591 with:
- Dashboard toggle: **Authentication > OAuth Server > Enable Dynamic Registration**
- Automatic client ID generation
- Redirect URI validation (HTTPS or localhost only)
- Rate limiting and monitoring
- Optional user approval workflow

---

### RFC 8707: Resource Indicators for OAuth 2.0

**Published:** February 2020
**Status:** Standards Track
**Official Document:** [https://www.rfc-editor.org/rfc/rfc8707.html](https://www.rfc-editor.org/rfc/rfc8707.html)

#### Purpose

Enables clients to explicitly signal to authorization servers about the identity of protected resources where requested access tokens will be used, allowing servers to apply appropriate audience restrictions.

#### The `resource` Parameter

**Authorization Request:**
```http
GET /authorize?
  response_type=code&
  client_id=s6BhdRkqt3&
  redirect_uri=https://client.example.com/callback&
  resource=https://api1.example.com&
  resource=https://api2.example.com&
  scope=read write
```

**Token Request:**
```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=SplxlOBeZQQYbYS6WxSbIA&
client_id=s6BhdRkqt3&
redirect_uri=https://client.example.com/callback&
resource=https://api1.example.com
```

#### Audience Claim (`aud`) in JWT

**Access Token (JWT) with Audience Restriction:**
```json
{
  "iss": "https://auth.example.com",
  "sub": "user123",
  "aud": "https://api1.example.com",
  "exp": 1735862400,
  "iat": 1735776000,
  "scope": "read write",
  "client_id": "s6BhdRkqt3"
}
```

**Single Audience:**
```json
{
  "aud": "https://api1.example.com"
}
```

**Multiple Audiences (Array):**
```json
{
  "aud": [
    "https://api1.example.com",
    "https://api2.example.com"
  ]
}
```

#### Resource Server Token Validation

Resource servers **MUST** validate:
1. Token signature (via JWKS)
2. Token expiration (`exp` claim)
3. **Audience claim matches server identifier:**
   ```javascript
   const tokenAudience = jwt.aud;
   const serverIdentifier = "https://api1.example.com";

   if (Array.isArray(tokenAudience)) {
     if (!tokenAudience.includes(serverIdentifier)) {
       throw new Error("Invalid audience");
     }
   } else if (tokenAudience !== serverIdentifier) {
     throw new Error("Invalid audience");
   }
   ```

#### Security Benefits

##### 1. Prevents Confused Deputy Attack
**Scenario without RFC 8707:**
1. Client requests token for API1
2. Authorization server issues generic token with no audience restriction
3. Attacker steals token
4. Attacker uses token successfully at API2, API3, etc.

**Scenario with RFC 8707:**
1. Client requests token with `resource=https://api1.example.com`
2. Authorization server issues token with `aud: "https://api1.example.com"`
3. Attacker steals token
4. API2 validates token, sees `aud: "https://api1.example.com"`, rejects request

##### 2. Principle of Least Privilege
- Tokens scoped to specific resource servers
- Limits blast radius of token compromise
- Enables fine-grained authorization policies

##### 3. Multi-Tenant Isolation
- Resource parameter can identify specific tenant resources
- Authorization server issues tenant-scoped tokens
- Prevents cross-tenant data access

#### Multiple Resource Servers

**Authorization Request:**
```http
GET /authorize?
  response_type=code&
  client_id=s6BhdRkqt3&
  redirect_uri=https://client.example.com/callback&
  resource=https://workflows.example.com&
  resource=https://templates.example.com&
  scope=workflow:read template:write
```

**Token Response (Multiple Audiences):**
```json
{
  "aud": [
    "https://workflows.example.com",
    "https://templates.example.com"
  ],
  "scope": "workflow:read template:write"
}
```

#### Supabase Implementation Status

**Current Status:** Not explicitly documented in Supabase OAuth 2.1 Server guides.

**Potential Implementation:**
- Supabase access tokens are JWTs with `aud` claim
- May default to project URL as audience
- Custom audience configuration not documented (as of January 2026)

**Recommendation:** Test Supabase JWT structure to verify:
```javascript
// Decode Supabase OAuth access token
const decoded = jwt.decode(accessToken);
console.log(decoded.aud); // Check audience claim value
```

**Workaround if Not Supported:**
- Implement audience validation in resource server middleware
- Use `client_id` claim for client-specific access control
- Request feature support via GitHub Discussion #38022

#### MCP Relevance

MCP servers act as **resource servers** in OAuth 2.1 architecture. RFC 8707 enables:

1. **Multi-Server Security**: Tokens scoped to specific MCP servers
2. **Client-Server Binding**: Access token valid only for intended MCP server
3. **Enterprise Compliance**: Meets security requirements for least privilege

**Example MCP Scenario:**
- User connects Claude Desktop to 3 MCP servers: `server1.com`, `server2.com`, `server3.com`
- Each connection issues audience-restricted tokens
- Token for `server1.com` cannot be used at `server2.com` or `server3.com`
- Reduces risk of lateral movement in multi-server environments

---

## Feature Comparison Matrix

### Authentication & Authorization

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **Protocol Compliance** | Custom token-based | OAuth 2.1 + OIDC | MCP spec compliance | 🔴 Critical |
| **Token Format** | Random string (SHA-256 hashed) | JWT with standard claims | Interoperability | 🔴 Critical |
| **Authentication Flow** | Direct token validation | Authorization code + PKCE | User consent, security | 🔴 Critical |
| **Token Lifetime** | Long-lived (manual expiration) | Short-lived access + refresh tokens | Security, rotation | 🟡 High |
| **Token Storage** | Database (SHA-256 hash) | JWT (stateless), refresh tokens in DB | Performance, validation | 🟢 Medium |
| **Authorization Header** | ✅ Bearer token | ✅ Bearer token | No change | ✅ Same |
| **Revocation** | ✅ `revoked_at` column | ✅ Token revocation endpoint | Immediate invalidation | ✅ Same |
| **Expiration** | ✅ `expires_at` check | ✅ JWT `exp` claim | Time-bound access | ✅ Same |
| **Refresh Mechanism** | ❌ Manual token regeneration | ✅ Refresh token flow | UX improvement | 🟡 High |

### Discovery & Registration

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **Server Metadata Discovery** | ❌ None | ✅ `/.well-known/oauth-authorization-server` | MCP client auto-config | 🔴 Critical |
| **Dynamic Client Registration** | ❌ Manual token generation | ✅ RFC 7591 support | Third-party integration | 🔴 Critical |
| **Client Credentials** | ❌ N/A | ✅ Client ID + optional secret | Standards compliance | 🔴 Critical |
| **Redirect URI Validation** | ❌ N/A | ✅ Automatic validation | Security, open redirect prevention | 🟡 High |
| **Onboarding UX** | Manual: Generate token → Copy → Paste | Automatic: OAuth flow + consent screen | Easier third-party adoption | 🟢 Medium |

### Security Features

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **PKCE (Proof Key for Code Exchange)** | ❌ Not applicable | ✅ Required (OAuth 2.1) | Prevents code interception | 🔴 Critical |
| **Audience Restriction (RFC 8707)** | ❌ Not implemented | ⚠️ Partial (aud claim exists) | Confused deputy prevention | 🟡 High |
| **Scope-Based Access Control** | ⚠️ Hardcoded `['mcp:execute']` | ✅ OAuth scopes (`openid`, `email`, `profile`, custom) | Fine-grained permissions | 🟡 High |
| **Consent Screen** | ❌ None | ✅ User approval required | Explicit authorization | 🟡 High |
| **Token in Query String** | ✅ Not used | ✅ Forbidden | URL logging security | ✅ Same |
| **Origin Validation** | ✅ DNS rebinding protection | ✅ HTTPS + redirect URI validation | CSRF, open redirect prevention | ✅ Enhanced |
| **Organization Membership Check** | ✅ Real-time permission validation | ✅ JWT claims + RLS | User access revocation | ✅ Same |
| **Session Management** | ✅ Redis-based MCP sessions | ✅ Compatible (orthogonal to auth) | State persistence | ✅ Same |

### Token Claims & Metadata

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **User Identification** | `user_id` (from connection context) | `sub` claim (JWT standard) | Standards compliance | 🟢 Medium |
| **Organization Scoping** | `organization_id` (from connection context) | Custom claim or scope | Multi-tenancy | 🟡 High |
| **Client Identification** | `connectionId` (internal) | `client_id` claim (JWT) | Client-specific RLS | 🟡 High |
| **Token Issuer** | ❌ None | `iss` claim (Supabase project URL) | Trust verification | 🟢 Medium |
| **Expiration Timestamp** | `expires_at` (database column) | `exp` claim (JWT) | Standard validation | ✅ Same |
| **Issued At Timestamp** | `created_at` (database column) | `iat` claim (JWT) | Token age verification | 🟢 Medium |
| **Audience** | ❌ None | `aud` claim (project URL or custom) | Resource server validation | 🟡 High |
| **Scope** | Implicit (all MCP operations) | `scope` claim (space-delimited string) | Fine-grained authorization | 🟡 High |

### Row Level Security (RLS)

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **User-Level RLS** | ✅ `auth.uid()` from connection | ✅ `auth.uid()` from JWT | User data isolation | ✅ Same |
| **Organization-Level RLS** | ✅ Organization membership check | ✅ JWT claims + RLS | Tenant isolation | ✅ Same |
| **Client-Level RLS** | ❌ Not implemented | ✅ `auth.jwt() ->> 'client_id'` | Client-specific permissions | 🟡 High |
| **RLS Policy Compatibility** | ✅ Existing policies work | ✅ Automatic compatibility | No policy rewrite needed | ✅ Same |

### User Experience

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **Initial Setup** | Generate token → Copy → Paste into Claude Desktop | OAuth flow: Click authorize → Consent screen → Redirect | More steps, standard flow | 🟢 Medium |
| **Token Rotation** | Manual regeneration required | Automatic refresh token rotation | Better security, less manual work | 🟡 High |
| **Token Revocation** | Dashboard UI or API call | Dashboard UI, API call, or user consent management | Standard experience | ✅ Same |
| **Multi-Client Support** | Multiple connection records | Multiple OAuth client registrations | Third-party ecosystem enablement | 🔴 Critical |
| **Claude Desktop Config** | Single token string | OAuth client ID + authorization flow | More complex initial setup | 🟢 Medium |

### Developer Experience

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **Token Validation Code** | SHA-256 hash + DB lookup | JWT verification + JWKS | More complex, standards-based | 🟢 Medium |
| **Third-Party Library Support** | ❌ Custom implementation | ✅ Standard OAuth 2.1 libraries | Reduced custom code | 🟡 High |
| **Debugging** | Database queries + logs | JWT decoding + token introspection | Better observability | 🟢 Medium |
| **Testing** | Mock DB connections | Mock OAuth flows or test tokens | Standard testing patterns | 🟢 Medium |
| **Documentation** | Custom docs | Standard OAuth 2.1 guides | Industry familiarity | 🟡 High |

### Performance

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **Token Validation Latency** | SHA-256 + single DB query (~10-50ms) | JWT signature verification (~1-5ms) + JWKS fetch (cached) | Faster validation | 🟡 High |
| **Database Load** | 1 query per validation + permission check | No DB query for token validation (JWT stateless) | Reduced DB load | 🟡 High |
| **Caching** | Token hash lookup (DB-level caching) | JWKS public keys cached (client-side) | Better caching story | 🟢 Medium |
| **Revocation Check** | Included in validation query | Requires separate introspection endpoint call | Trade-off: stateless vs real-time revocation | 🟡 High |

### Ecosystem Compatibility

| Feature | Current Token System | OAuth 2.1 with Supabase | Impact | Priority |
|---------|---------------------|------------------------|--------|----------|
| **MCP Specification Compliance** | ❌ Non-compliant | ✅ Fully compliant | Third-party client support | 🔴 Critical |
| **Third-Party MCP Clients** | ❌ Cannot integrate | ✅ Standard OAuth flow | Ecosystem growth | 🔴 Critical |
| **Enterprise SSO** | ❌ Not supported | ✅ OIDC-compatible | Enterprise adoption | 🟡 High |
| **Industry Standards** | ❌ Custom | ✅ OAuth 2.1, OIDC, RFCs 7591, 8414 | Interoperability | 🔴 Critical |
| **Future-Proofing** | ⚠️ Limited to first-party use | ✅ Standards-based extensibility | Long-term maintainability | 🟡 High |

### Summary

**Gains with OAuth 2.1 Migration:**
- ✅ MCP specification compliance
- ✅ Third-party client ecosystem support
- ✅ Standards-based security (PKCE, audience restriction, scopes)
- ✅ Better developer experience (standard libraries, documentation)
- ✅ Improved performance (stateless JWT validation)
- ✅ Enterprise SSO capabilities (OIDC)
- ✅ Automatic client discovery and registration

**Losses/Trade-offs with OAuth 2.1 Migration:**
- ⚠️ More complex initial setup for users (OAuth flow vs copy-paste token)
- ⚠️ Breaking change for existing Claude Desktop instances
- ⚠️ Dependency on Supabase OAuth Server beta stability
- ⚠️ Real-time revocation requires introspection endpoint calls (vs inline DB check)
- ⚠️ Additional middleware for JWT validation and audience checking

**Priority Legend:**
- 🔴 **Critical**: Required for MCP compliance and third-party ecosystem
- 🟡 **High**: Significant security or UX improvement
- 🟢 **Medium**: Nice-to-have or marginal improvement
- ✅ **Same**: No change or equivalent functionality

---

## Production Readiness Assessment

### Supabase OAuth 2.1 Server Status

#### Current Status (January 2026)

**Beta Phase:**
- **Public Launch:** November 26, 2025
- **Duration in Beta:** 2+ months
- **Pricing:** Free during beta period across all Supabase plans
- **Feature Completeness:** Core OAuth 2.1 and OIDC features implemented

**Official Statements:**
> "OAuth 2.1 server is currently in beta and free to use during the beta period on all Supabase plans."
>
> — Supabase Documentation

**No Public GA Timeline:** No official announcement for general availability or production-ready status.

#### Feature Maturity

| Feature Area | Status | Confidence Level |
|-------------|--------|------------------|
| **OAuth 2.1 Core Flows** | ✅ Implemented | 🟢 High |
| **Authorization Code + PKCE** | ✅ Implemented | 🟢 High |
| **Dynamic Client Registration (RFC 7591)** | ✅ Implemented | 🟢 High |
| **Server Metadata Discovery (RFC 8414)** | ✅ Implemented | 🟢 High |
| **OpenID Connect Support** | ✅ Implemented | 🟢 High |
| **Token Introspection** | ✅ Implemented | 🟢 High |
| **Token Revocation** | ✅ Implemented | 🟢 High |
| **MCP Authentication** | ✅ Documented | 🟡 Medium |
| **Resource Indicators (RFC 8707)** | ⚠️ Partial/Undocumented | 🟡 Medium |
| **Row Level Security Integration** | ✅ Implemented | 🟢 High |
| **JWKS Endpoint** | ✅ Implemented | 🟢 High |
| **Refresh Token Rotation** | ✅ Implemented | 🟢 High |

#### Documentation Quality

**Strengths:**
- Comprehensive getting started guide
- MCP-specific authentication guide (dedicated page)
- OAuth flow examples with code snippets
- Security best practices documented
- Token security and RLS guide

**Gaps:**
- Limited advanced configuration documentation
- RFC 8707 (Resource Indicators) not explicitly documented
- No migration guide from custom auth to OAuth 2.1
- Troubleshooting section limited (common issues only)
- No API reference for all OAuth endpoints

**Documentation Quality Score:** 7.5/10

#### Community Feedback & Adoption

**GitHub Discussion #38022:**
- Open forum for feature requests and feedback
- Active Supabase team participation
- Community sharing use cases

**Search Results Analysis:**
- Very recent documentation updates (1-3 days old as of January 2026)
- Active blog posts and announcements
- Growing third-party integrations (FastMCP framework)

**Adoption Indicators:**
- ✅ Featured in Supabase blog and changelog
- ✅ Integration guides for common frameworks
- ⚠️ Limited production case studies (beta phase)
- ⚠️ No known large-scale deployments publicly documented

#### Known Issues & Limitations

**Documented Limitations:**
1. **Beta Status:** Potential for breaking changes without prior notice
2. **Free Tier:** Pricing unknown post-GA (currently free)
3. **Rate Limiting:** Dynamic registration rate limits not publicly documented
4. **Client Secret Rotation:** Automatic rotation policies unclear
5. **Multi-Organization Support:** Configuration for complex org structures not detailed

**Potential Undocumented Issues:**
- Edge cases in MCP client integration
- Performance at scale (high token issuance rates)
- Monitoring and observability features
- SLA and support commitments

#### Production Risk Assessment

##### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Breaking API Changes** | 🟡 Medium | 🔴 High | Pin to specific API version, monitor changelog |
| **Undiscovered Bugs** | 🟡 Medium | 🟡 Medium | Extensive testing in staging, gradual rollout |
| **Performance Issues at Scale** | 🟢 Low | 🟡 Medium | Load testing, caching strategies |
| **Security Vulnerabilities** | 🟢 Low | 🔴 High | Regular security reviews, follow Supabase updates |
| **Integration Issues with MCP Clients** | 🟡 Medium | 🟡 Medium | Comprehensive compatibility testing |

##### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Pricing Changes Post-GA** | 🟡 Medium | 🟢 Low | Budget for potential OAuth-specific costs |
| **Feature Removal/Deprecation** | 🟢 Low | 🟡 Medium | Track roadmap, engage with Supabase team |
| **Support Limitations (Beta)** | 🟡 Medium | 🟡 Medium | Build internal expertise, community engagement |
| **Migration Path Uncertainty** | 🟡 Medium | 🟡 Medium | Document all customizations, plan rollback |

##### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Breaking Existing Claude Desktop Instances** | 🔴 High | 🔴 High | Phased migration, dual-auth support period |
| **Increased Support Burden** | 🔴 High | 🟡 Medium | Updated docs, troubleshooting guides, training |
| **Token Management Complexity** | 🟡 Medium | 🟡 Medium | Automated token rotation, clear UX |
| **Debugging Difficulty** | 🟡 Medium | 🟢 Low | Enhanced logging, token introspection tools |

#### Comparison with Production-Ready Alternatives

| Feature | Supabase OAuth (Beta) | Auth0 | Okta | AWS Cognito |
|---------|----------------------|-------|------|-------------|
| **Production Status** | Beta | GA | GA | GA |
| **MCP Documentation** | ✅ Dedicated guide | ❌ None | ❌ None | ❌ None |
| **Dynamic Client Registration** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Limited |
| **PKCE** | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| **OpenID Connect** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **RLS Integration** | ✅ Native | ❌ Manual | ❌ Manual | ❌ Manual |
| **Pricing** | Free (beta) | Paid | Paid | Paid |
| **Supabase Integration** | ✅ Native | ⚠️ Custom | ⚠️ Custom | ⚠️ Custom |

**Supabase Advantage:** Native integration with existing Supabase infrastructure, RLS compatibility, MCP-specific documentation.

**Production Alternatives Advantage:** Battle-tested in production, SLAs, enterprise support, extensive documentation.

#### Recommendation Timeline

##### ❌ Do Not Recommend (Now - Q1 2026)
**Reasons:**
- Only 2 months into public beta
- No GA timeline announced
- High risk of breaking changes
- Limited production case studies
- Existing system works reliably for first-party use

##### ⚠️ Consider with Caution (Q2 2026)
**Conditions:**
- Supabase announces GA target date
- No major reported issues in beta
- Third-party MCP client demand increases
- Prototype testing shows stable integration

##### ✅ Recommended (Q3 2026+)
**Conditions:**
- Supabase OAuth 2.1 Server reaches GA
- Production case studies published
- Stable API with versioning guarantees
- Clear migration path documented
- Third-party MCP ecosystem requires compliance

#### Monitoring and Decision Points

**Monthly Review Checklist:**
- [ ] Check Supabase changelog for OAuth 2.1 updates
- [ ] Monitor GitHub Discussion #38022 for announcements
- [ ] Review community feedback on Twitter, Discord, Reddit
- [ ] Test beta features in development environment
- [ ] Track third-party MCP client ecosystem growth
- [ ] Evaluate user requests for OAuth-based integrations

**Go/No-Go Decision Criteria (Quarterly Evaluation):**
1. **Technical Maturity:** No critical bugs reported in past 60 days
2. **Documentation Completeness:** Migration guide and advanced features documented
3. **Community Validation:** At least 5 public production case studies
4. **Supabase Commitment:** GA announcement or clear roadmap to GA
5. **Business Need:** Third-party integrations or enterprise requirements demanding OAuth 2.1

---

## Migration Effort Estimation

### Scope Overview

Migration from token-based authentication to OAuth 2.1 requires changes across:
- **Backend:** Database schema, authentication middleware, token validation
- **Frontend:** User interfaces for OAuth consent (optional), client management
- **Infrastructure:** OAuth endpoints, JWKS caching, token introspection
- **Client-Side:** Claude Desktop configuration, third-party MCP clients
- **Documentation:** User guides, developer documentation, troubleshooting
- **Testing:** End-to-end OAuth flows, security testing, performance testing

### Backend Changes

#### 1. Database Schema Migration

**Files:**
- `supabase/migrations/YYYYMMDD_oauth_migration.sql`

**Changes:**

**Create `oauth_clients` Table:**
```sql
CREATE TABLE public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT, -- NULL for public clients
  client_name TEXT NOT NULL,
  client_uri TEXT,
  logo_uri TEXT,
  redirect_uris JSONB NOT NULL, -- Array of allowed redirect URIs
  grant_types JSONB DEFAULT '["authorization_code", "refresh_token"]',
  response_types JSONB DEFAULT '["code"]',
  token_endpoint_auth_method TEXT DEFAULT 'none',
  scope TEXT,

  -- Supabase-specific fields
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dynamic registration metadata
  dynamically_registered BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_oauth_clients_client_id ON oauth_clients(client_id);
CREATE INDEX idx_oauth_clients_user_org ON oauth_clients(user_id, organization_id);
```

**Migrate Existing `mcp_connections` to `oauth_clients`:**
```sql
-- Migration script to convert existing connections to OAuth clients
INSERT INTO oauth_clients (
  client_id,
  client_name,
  redirect_uris,
  user_id,
  organization_id,
  created_at,
  dynamically_registered
)
SELECT
  -- Generate OAuth-compatible client ID from existing connection
  'connection_' || id::TEXT AS client_id,
  name AS client_name,
  -- Default localhost redirect for Claude Desktop
  '["http://localhost:8080/callback", "http://127.0.0.1:8080/callback"]'::JSONB AS redirect_uris,
  user_id,
  organization_id,
  created_at,
  false AS dynamically_registered
FROM mcp_connections
WHERE revoked_at IS NULL;
```

**Deprecation Strategy:**
- Keep `mcp_connections` table for backward compatibility (dual-auth period)
- Add `migration_status` column: `pending`, `migrated`, `legacy`
- Schedule table drop after all clients migrated

**Effort:** 2-3 days
- Schema design and review
- Migration script development
- Rollback plan documentation
- Testing migration on staging data

#### 2. JWT Validation Middleware

**Files:**
- `lib/mcp/jwt-validator.ts` (new)
- `lib/mcp/connection-validator.ts` (refactor)

**New JWT Validator:**
```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

export class JWTValidator {
  private static jwksCache: ReturnType<typeof createRemoteJWKSet>;

  /**
   * Initialize JWKS client with caching
   */
  static initialize() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const jwksUrl = `${supabaseUrl}/auth/v1/jwks`;

    this.jwksCache = createRemoteJWKSet(new URL(jwksUrl), {
      cacheMaxAge: 3600000, // 1 hour
      cooldownDuration: 30000 // 30 seconds
    });
  }

  /**
   * Validate JWT access token issued by Supabase OAuth Server
   */
  static async validateAccessToken(token: string): Promise<OAuthContext> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const expectedIssuer = `${supabaseUrl}/auth/v1`;
    const expectedAudience = process.env.OAUTH_AUDIENCE || supabaseUrl;

    const { payload } = await jwtVerify(token, this.jwksCache, {
      issuer: expectedIssuer,
      audience: expectedAudience,
      algorithms: ['RS256']
    });

    // Validate required claims
    if (!payload.sub || !payload.client_id) {
      throw new Error('Missing required JWT claims');
    }

    // Validate organization membership (real-time check)
    const supabase = createServiceRoleClient();
    const { data: permissions } = await supabase
      .from('permissions')
      .select('org_id')
      .eq('principal_id', payload.sub)
      .eq('principal_type', 'user')
      .is('deleted_at', null);

    if (!permissions || permissions.length === 0) {
      throw new Error('User has no active organization permissions');
    }

    return {
      userId: payload.sub as string,
      clientId: payload.client_id as string,
      organizationId: permissions[0].org_id,
      scope: (payload.scope as string)?.split(' ') || [],
      expiresAt: payload.exp!,
      issuedAt: payload.iat!
    };
  }

  /**
   * Validate audience claim matches expected resource server
   */
  static validateAudience(payload: any, expectedAudience: string): boolean {
    const aud = payload.aud;

    if (Array.isArray(aud)) {
      return aud.includes(expectedAudience);
    }

    return aud === expectedAudience;
  }
}
```

**Refactor Connection Validator for Dual-Auth Support:**
```typescript
export class ConnectionValidator {
  /**
   * Unified token validation supporting both legacy tokens and OAuth JWTs
   */
  static async validateToken(token: string): Promise<ConnectionContext> {
    // Attempt JWT validation first
    if (token.includes('.')) { // JWT format check
      try {
        const oauthContext = await JWTValidator.validateAccessToken(token);
        return {
          connectionId: oauthContext.clientId,
          userId: oauthContext.userId,
          organizationId: oauthContext.organizationId,
          name: `OAuth Client ${oauthContext.clientId}`,
          authType: 'oauth',
          scopes: oauthContext.scope
        };
      } catch (error) {
        console.warn('JWT validation failed, falling back to legacy token:', error);
      }
    }

    // Fallback to legacy token validation
    return this.validateLegacyToken(token);
  }

  private static async validateLegacyToken(token: string): Promise<ConnectionContext> {
    // Existing SHA-256 hash validation logic
    // ...
  }
}
```

**Effort:** 3-4 days
- JWT validation implementation
- JWKS caching strategy
- Audience claim validation
- Dual-auth backward compatibility
- Unit and integration tests

#### 3. OAuth Authorization Endpoints

**Files:**
- `app/api/oauth/authorize/route.ts` (new)
- `app/api/oauth/token/route.ts` (new)
- `app/api/oauth/register/route.ts` (new)
- `app/api/oauth/introspect/route.ts` (new)
- `app/api/oauth/revoke/route.ts` (new)

**Note:** Most endpoints may be handled by Supabase Auth directly. Custom implementation needed only for:
- **Custom consent screen** (if not using Supabase default)
- **Custom authorization logic** (additional validation, logging)
- **Client-specific policies** (e.g., restrict certain clients to specific resources)

**Supabase-Hosted Endpoints:**
- `https://<project-ref>.supabase.co/auth/v1/authorize`
- `https://<project-ref>.supabase.co/auth/v1/token`
- `https://<project-ref>.supabase.co/auth/v1/oauth/register`

**Custom Consent Screen (Optional):**
```typescript
// app/api/oauth/authorize/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');

  // Fetch client metadata
  const client = await getOAuthClient(clientId);

  // Render consent screen with client details
  return new Response(renderConsentScreen(client, scope, state), {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

**Effort:** 2-3 days (if using Supabase endpoints) OR 5-7 days (if building custom)
- Endpoint design and implementation
- Integration with Supabase Auth
- PKCE validation logic
- Testing authorization flows
- Error handling and logging

#### 4. RLS Policy Updates

**Files:**
- `supabase/migrations/YYYYMMDD_rls_oauth_support.sql`

**Client-Specific RLS Policies:**
```sql
-- Allow OAuth clients to access only approved workflows
CREATE POLICY "oauth_client_workflow_access" ON workflows
  FOR SELECT USING (
    -- Check if request is from OAuth client
    CASE
      WHEN (auth.jwt() -> 'client_id') IS NOT NULL THEN
        -- OAuth client access: check approval
        id IN (
          SELECT workflow_id
          FROM oauth_client_workflow_permissions
          WHERE client_id = (auth.jwt() ->> 'client_id')
        )
      ELSE
        -- Regular user access: check organization membership
        organization_id IN (
          SELECT org_id FROM permissions
          WHERE principal_id = auth.uid()
          AND deleted_at IS NULL
        )
    END
  );
```

**Effort:** 1-2 days
- Review existing RLS policies
- Add client_id claim checks
- Test policy enforcement
- Document policy patterns

#### 5. Session Management Updates

**Files:**
- `lib/mcp/session-manager.ts` (refactor)

**Changes:**
- Associate sessions with OAuth client IDs (in addition to connection IDs)
- Store OAuth-specific metadata (scope, token expiration)
- Handle token refresh in background

**Effort:** 1-2 days

### Frontend Changes

#### 1. OAuth Client Management UI

**Files:**
- `app/(authenticated)/settings/oauth-clients/page.tsx` (new)
- `components/oauth/client-list.tsx` (new)
- `components/oauth/client-form.tsx` (new)

**Features:**
- List registered OAuth clients (manual + dynamic)
- Create new OAuth client (manual registration)
- Edit client metadata (name, redirect URIs)
- Revoke client access
- View client credentials (client ID, secret for confidential clients)
- Approve/reject dynamically registered clients (if approval required)

**Effort:** 3-4 days
- UI design and component development
- API integration
- Form validation
- Client credentials display (security considerations)

#### 2. User Consent Screen (Optional)

**Files:**
- `app/oauth/consent/page.tsx` (new)
- `components/oauth/consent-form.tsx` (new)

**Features:**
- Display client name, logo, and description
- Show requested scopes with explanations
- Allow user to approve or deny
- Show "what this app can access" details
- Option to remember consent

**Effort:** 2-3 days (if building custom, 0 days if using Supabase default)

#### 3. Migration UI for Existing Connections

**Files:**
- `app/(authenticated)/settings/mcp-connections/migrate.tsx` (new)
- `components/mcp/migration-banner.tsx` (new)

**Features:**
- Banner prompting users to migrate to OAuth
- Migration wizard guiding users through OAuth setup
- List of connections requiring migration
- Automatic migration for Claude Desktop (if possible)

**Effort:** 2-3 days

### Client-Side Changes

#### 1. Claude Desktop Configuration

**Current Configuration:**
```json
{
  "mcpServers": {
    "project-flows": {
      "url": "https://example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer mcp_1234567890abcdef..."
      }
    }
  }
}
```

**OAuth Configuration:**
```json
{
  "mcpServers": {
    "project-flows": {
      "url": "https://example.com/api/mcp",
      "authorization": {
        "type": "oauth2",
        "authorizationEndpoint": "https://example.com/auth/v1/authorize",
        "tokenEndpoint": "https://example.com/auth/v1/token",
        "clientId": "claude-desktop-123",
        "redirectUri": "http://localhost:8080/callback",
        "scope": "openid email profile mcp:execute",
        "usePKCE": true
      }
    }
  }
}
```

**Impact:**
- All existing Claude Desktop instances require configuration updates
- Users must re-authorize via OAuth flow
- Potential for user confusion and support requests

**Effort:** 0 days (configuration only, but high user impact)

#### 2. Third-Party MCP Client Support

**New Capability:**
- Third-party developers can build MCP clients that authenticate with your server
- Clients use dynamic client registration (RFC 7591) for zero-config setup
- Standard OAuth 2.1 libraries work out of the box

**Effort:** 0 days (enabled by migration, not additional work)

### Documentation Changes

#### 1. User Documentation

**Files:**
- `docs/oauth-setup-guide.md` (new)
- `docs/migration-guide.md` (new)
- `docs/troubleshooting-oauth.md` (new)
- Update existing MCP connection guides

**Content:**
- Step-by-step OAuth setup for Claude Desktop
- Migration instructions for existing token users
- OAuth client management guide
- Troubleshooting common issues (authorization failures, token expiration, etc.)

**Effort:** 2-3 days

#### 2. Developer Documentation

**Files:**
- `docs/oauth-implementation.md` (new)
- `docs/api-reference-oauth.md` (new)
- Update existing API documentation

**Content:**
- OAuth 2.1 architecture overview
- JWT validation and audience checking
- RLS patterns for OAuth clients
- Dynamic client registration guide
- Third-party MCP client integration guide
- Code examples (token validation, client registration, etc.)

**Effort:** 2-3 days

### Testing

#### 1. Unit Tests

**Coverage:**
- JWT validation logic
- PKCE code generation and validation
- Audience claim validation
- OAuth client CRUD operations
- RLS policy enforcement

**Effort:** 3-4 days

#### 2. Integration Tests

**Coverage:**
- End-to-end OAuth authorization flow
- Token exchange and refresh
- Dynamic client registration
- Token revocation and expiration
- Session management with OAuth tokens
- Dual-auth period (legacy tokens + OAuth)

**Effort:** 4-5 days

#### 3. Security Testing

**Coverage:**
- Authorization code replay attacks
- PKCE validation bypass attempts
- Audience claim spoofing
- Open redirect vulnerabilities
- Token introspection authorization
- Client credential exposure

**Effort:** 2-3 days

#### 4. Performance Testing

**Coverage:**
- JWKS fetch and caching performance
- JWT validation latency vs SHA-256 hash lookup
- OAuth flow latency (authorization + token exchange)
- Database load under high token issuance rates

**Effort:** 2-3 days

### Deployment & Rollout

#### 1. Phased Deployment Strategy

**Phase 1: Development Environment (Week 1-2)**
- Deploy OAuth endpoints and JWT validation
- Enable Supabase OAuth 2.1 Server in dev project
- Internal testing with test OAuth clients

**Phase 2: Staging Environment (Week 3-4)**
- Full OAuth migration in staging
- Dual-auth support (legacy tokens + OAuth)
- User acceptance testing
- Performance benchmarking

**Phase 3: Production Gradual Rollout (Week 5-8)**
- Enable OAuth endpoints in production
- Dual-auth period (4-8 weeks)
- Gradual user migration (opt-in first, then prompted)
- Monitor error rates and support requests
- Rollback plan ready

**Phase 4: Legacy Token Deprecation (Week 9-12)**
- Announce deprecation timeline (e.g., 90 days)
- Send email notifications to users with legacy tokens
- Display in-app banners prompting migration
- Final cutoff date: disable legacy token validation

**Effort:** 8-12 weeks (includes dual-auth period)

#### 2. Monitoring & Observability

**Metrics to Track:**
- OAuth authorization success/failure rates
- Token validation latency (JWT vs legacy)
- JWKS cache hit rates
- Dynamic client registration rates
- Token refresh rates
- Error rates (401, 403 responses)
- User migration progress

**Tools:**
- Application logs (structured logging for OAuth events)
- APM (Application Performance Monitoring)
- Error tracking (Sentry, Datadog, etc.)
- Database query performance monitoring

**Effort:** 1-2 days (setup) + ongoing monitoring

### Summary: Total Effort Estimation

| Task Category | Effort (Days) | Dependencies |
|--------------|---------------|--------------|
| **Backend Changes** | | |
| Database schema migration | 2-3 | None |
| JWT validation middleware | 3-4 | Schema migration |
| OAuth authorization endpoints | 2-3 (Supabase) / 5-7 (custom) | JWT middleware |
| RLS policy updates | 1-2 | Schema migration |
| Session management updates | 1-2 | JWT middleware |
| **Subtotal Backend** | **9-14 days** | |
| **Frontend Changes** | | |
| OAuth client management UI | 3-4 | Backend APIs |
| User consent screen (optional) | 0-3 | Backend APIs |
| Migration UI for existing connections | 2-3 | Backend APIs, frontend UI |
| **Subtotal Frontend** | **5-10 days** | |
| **Documentation** | | |
| User documentation | 2-3 | Feature complete |
| Developer documentation | 2-3 | Feature complete |
| **Subtotal Documentation** | **4-6 days** | |
| **Testing** | | |
| Unit tests | 3-4 | Code complete |
| Integration tests | 4-5 | Feature complete |
| Security testing | 2-3 | Feature complete |
| Performance testing | 2-3 | Staging deployment |
| **Subtotal Testing** | **11-15 days** | |
| **Deployment & Rollout** | | |
| Dev environment deployment | 2-3 | Code complete |
| Staging environment deployment | 2-3 | Testing complete |
| Production gradual rollout | 10-15 | Staging validated |
| Monitoring setup | 1-2 | Production deployment |
| **Subtotal Deployment** | **15-23 days** | |
| **TOTAL EFFORT** | **44-68 days** | |

**Estimated Calendar Time:**
- **With dedicated engineer:** 9-14 weeks (2-3.5 months)
- **With team of 2 engineers:** 5-8 weeks (1-2 months)
- **With team of 3 engineers:** 3-5 weeks (0.75-1.25 months)

**Recommended Team Composition:**
- 1-2 Backend Engineers (OAuth flows, JWT validation, RLS)
- 1 Frontend Engineer (OAuth UI, consent screen)
- 1 QA Engineer (testing strategy, security testing)
- 1 Technical Writer (documentation)
- 1 DevOps Engineer (deployment, monitoring)

**Buffer:** Add 20-30% for unexpected issues, Supabase beta quirks, and user migration challenges.

**Realistic Estimate:** 12-16 weeks (3-4 months) calendar time for full migration including dual-auth period and user migration.

---

## Risk Analysis

### Breaking Changes for Existing Clients

**Risk:** All existing Claude Desktop instances using legacy tokens will stop working once legacy token validation is disabled.

**Impact:** 🔴 High
- User disruption and frustration
- Support request spike
- Potential user churn if migration is difficult

**Likelihood:** 🔴 Certain (100%) if full migration without dual-auth period

**Mitigation Strategies:**
1. **Extended Dual-Auth Period:** Support both legacy tokens and OAuth for 8-12 weeks
2. **Proactive Communication:**
   - Email notifications 90 days, 60 days, 30 days, 7 days before cutoff
   - In-app banners with migration instructions
   - Blog post and documentation updates
3. **Guided Migration UI:** Step-by-step wizard in dashboard
4. **Automatic Migration (if feasible):** Generate OAuth client for each connection and email user with new config
5. **Support Resources:** FAQ, troubleshooting guide, live chat support during migration window
6. **Gradual Rollout:** Opt-in beta period for early adopters to validate migration process

### Supabase Beta Stability Risks

**Risk:** Supabase OAuth 2.1 Server is in beta with no GA timeline. Potential for breaking changes, performance issues, or feature removal.

**Impact:** 🔴 High
- Production downtime if breaking changes occur
- User authentication failures
- Security vulnerabilities in beta software
- Wasted development effort if feature is significantly changed or deprecated

**Likelihood:** 🟡 Medium (30-40%) given beta status

**Mitigation Strategies:**
1. **Wait for GA:** Delay migration until Supabase announces general availability
2. **Vendor Diversification:** Design OAuth implementation to be portable to other providers (Auth0, Okta, AWS Cognito)
3. **Feature Flags:** Implement OAuth behind feature flag for instant rollback
4. **Monitoring:** Close monitoring of Supabase changelog, GitHub issues, and community feedback
5. **Contingency Plan:** Maintain legacy token system as fallback
6. **SLA Review:** Understand beta support commitments and limitations
7. **Prototype Testing:** Extensive testing in development environment to identify issues early

### Performance Degradation

**Risk:** JWT validation with JWKS fetching may introduce latency compared to SHA-256 hash database lookup.

**Impact:** 🟡 Medium
- Increased API response times
- Degraded user experience
- Potential timeout issues for long-running MCP operations

**Likelihood:** 🟢 Low (10-20%) with proper caching

**Mitigation Strategies:**
1. **JWKS Caching:** Aggressive caching of JWKS public keys (1-hour TTL, stale-while-revalidate)
2. **Performance Benchmarking:** Compare JWT validation vs legacy token validation latency
3. **CDN for JWKS:** Serve JWKS endpoint via CDN for global low-latency access
4. **Local JWKS Cache:** In-memory cache with background refresh
5. **Fallback Mechanism:** If JWKS fetch fails, use cached keys with extended validation
6. **Load Testing:** Simulate high token validation rates to identify bottlenecks

**Expected Performance:**
- **Legacy Token Validation:** 10-50ms (SHA-256 + DB query)
- **JWT Validation (cold cache):** 50-200ms (JWKS fetch + signature verification)
- **JWT Validation (warm cache):** 1-10ms (signature verification only)

**Net Impact:** Likely performance improvement after JWKS cache warm-up.

### Token Revocation Latency

**Risk:** JWT validation is stateless. Real-time token revocation requires calling Supabase token introspection endpoint, adding latency and network dependency.

**Impact:** 🟡 Medium
- Delayed revocation in security incidents
- Increased latency on every request if introspection required
- Network failure impacts authentication

**Likelihood:** 🟡 Medium (40-50%) depending on revocation requirements

**Mitigation Strategies:**
1. **Short-Lived Access Tokens:** Default 1-hour expiration limits revocation window
2. **Introspection Caching:** Cache introspection results for 5-10 minutes (trade-off: revocation delay vs performance)
3. **Async Revocation:** Background job to invalidate sessions associated with revoked tokens
4. **Critical Revocation Handling:** Force introspection for high-security operations (e.g., payment processing, data deletion)
5. **Revocation List:** Maintain local revoked token list for critical tokens (admins, high-privilege users)

**Alternative Approach:**
- Use Supabase realtime subscriptions to receive revocation events and update local cache

### Third-Party Client Security

**Risk:** Dynamic client registration allows any application to register as an OAuth client. Malicious clients could abuse API access or phish users.

**Impact:** 🔴 High
- Malicious data access
- User credential phishing
- API rate limit abuse
- Reputation damage

**Likelihood:** 🟡 Medium (30-40%) without proper controls

**Mitigation Strategies:**
1. **Redirect URI Validation:** Strict HTTPS + localhost-only whitelist
2. **Manual Approval Workflow:** Require admin approval for dynamically registered clients
3. **Client Monitoring:** Track client activity, flag suspicious patterns
4. **Rate Limiting:** Per-client rate limits on API requests and token issuance
5. **Scope Restrictions:** Dynamically registered clients get minimal scopes by default
6. **User Education:** Consent screen shows client details and warnings for untrusted clients
7. **Client Reputation System:** Community feedback on third-party clients
8. **Revocation UI:** Easy user access to revoke client permissions

### Migration Complexity and User Confusion

**Risk:** OAuth setup is more complex than copying a token. Users may struggle with authorization flow, redirect URIs, and client configuration.

**Impact:** 🟡 Medium
- Increased support requests
- User frustration and negative feedback
- Incomplete migrations leaving users unable to access MCP

**Likelihood:** 🔴 High (60-70%) for non-technical users

**Mitigation Strategies:**
1. **Step-by-Step Documentation:** Visual guides with screenshots for each step
2. **Video Tutorials:** Screen recordings of OAuth setup process
3. **Auto-Configuration:** Generate Claude Desktop config snippet in dashboard
4. **Migration Wizard:** Interactive UI guiding users through OAuth setup
5. **Support Resources:** Live chat, email support, community forum
6. **Simplified UX:** Pre-fill redirect URIs, scopes, and client IDs where possible
7. **Rollback Option:** Temporary "use legacy token" option during migration period

### Compliance and Regulatory Risks

**Risk:** OAuth 2.1 introduces new data flows (authorization codes, redirect URIs, consent screens) that may require GDPR, SOC 2, or other compliance reviews.

**Impact:** 🟡 Medium
- Delayed deployment pending compliance reviews
- Potential fines for non-compliance
- Required changes to privacy policy, terms of service

**Likelihood:** 🟢 Low (20-30%) if existing OAuth compliance already in place

**Mitigation Strategies:**
1. **Compliance Review:** Engage legal/compliance team early in planning
2. **Privacy Policy Updates:** Document OAuth data flows, token storage, and user consent
3. **Data Retention Policies:** Define retention periods for authorization codes, tokens, and client metadata
4. **Audit Logging:** Log all OAuth events for compliance audits
5. **Third-Party Client Agreements:** Terms of service for dynamically registered clients
6. **User Consent Management:** GDPR-compliant consent screens and revocation workflows

### Rollback Complexity

**Risk:** Reverting from OAuth back to legacy tokens is complex if database schema changes are irreversible or user data is lost.

**Impact:** 🟡 Medium
- Extended downtime during rollback
- Data loss (OAuth clients, consent records)
- User re-onboarding required

**Likelihood:** 🟡 Medium (30-40%) if beta issues are discovered post-deployment

**Mitigation Strategies:**
1. **Dual-Auth Period:** Never fully deprecate legacy tokens until OAuth stability is proven
2. **Database Backups:** Frequent backups before and during migration
3. **Reversible Migrations:** Design schema changes to be reversible
4. **Feature Flags:** Instant toggle to disable OAuth validation and re-enable legacy tokens
5. **Rollback Playbook:** Documented step-by-step rollback procedure
6. **Staged Rollout:** Gradual user migration allows partial rollback if issues arise

### Cost Implications

**Risk:** Supabase OAuth 2.1 Server is free during beta. Post-GA pricing may introduce unexpected costs, especially at scale.

**Impact:** 🟢 Low (business risk, not technical)
- Increased infrastructure costs
- Budget reallocation required

**Likelihood:** 🟡 Medium (40-50%) that OAuth will have usage-based pricing post-GA

**Mitigation Strategies:**
1. **Pricing Inquiry:** Contact Supabase sales to understand pricing roadmap
2. **Budget Planning:** Allocate budget for potential OAuth-specific costs
3. **Cost Monitoring:** Track token issuance rates, JWKS requests, and introspection calls
4. **Optimization:** Reduce unnecessary token refreshes, optimize JWKS caching
5. **Alternative Providers:** Evaluate cost-effective alternatives (Auth0, Okta, self-hosted solutions) if Supabase pricing is prohibitive

---

## Timeline and Milestones

### Recommended Migration Timeline

#### Phase 0: Research and Decision (4 weeks) ✅ COMPLETE

**Objective:** Evaluate OAuth 2.1 migration feasibility, maturity, and migration strategy.

**Deliverables:**
- ✅ Comprehensive research document (this document)
- ✅ Feature comparison matrix
- ✅ Risk analysis
- ✅ Migration effort estimation
- ✅ Executive recommendation

**Status:** COMPLETE (January 2026)

---

#### Phase 1: Monitoring and Prototyping (Q1 2026 - Ongoing)

**Objective:** Monitor Supabase OAuth 2.1 Server maturity and build proof-of-concept integration in development environment.

**Week 1-4 (January 2026):**
- [ ] Set up monitoring for Supabase changelog and GitHub Discussion #38022
- [ ] Subscribe to Supabase announcements and community channels
- [ ] Create prototype project in Supabase with OAuth 2.1 enabled
- [ ] Test basic OAuth flow: authorization, token exchange, token validation

**Week 5-8 (February 2026):**
- [ ] Implement proof-of-concept JWT validation in development environment
- [ ] Test dynamic client registration (RFC 7591)
- [ ] Test PKCE flow end-to-end
- [ ] Document findings and edge cases

**Week 9-12 (March 2026):**
- [ ] Prototype MCP client integration (Claude Desktop or custom client)
- [ ] Test audience claim validation (RFC 8707)
- [ ] Performance benchmarking: JWT validation vs legacy token validation
- [ ] Quarterly reassessment: Go/No-Go decision criteria evaluation

**Milestone:** Prototype validated, quarterly decision point reached.

---

#### Phase 2: Planning and Design (Q2 2026 - Conditional on GA Announcement)

**Trigger:** Supabase announces OAuth 2.1 Server GA or clear roadmap to GA.

**Week 1-2:**
- [ ] Kick-off meeting with engineering, product, and support teams
- [ ] Finalize migration architecture and technical design
- [ ] Database schema design review
- [ ] API endpoint design review
- [ ] UX design for OAuth client management UI and consent screen

**Week 3-4:**
- [ ] Create detailed implementation tickets (Jira, GitHub Issues, etc.)
- [ ] Assign engineering resources (backend, frontend, DevOps)
- [ ] Set up development and staging environments with OAuth enabled
- [ ] Create rollback and contingency plans

**Week 5-6:**
- [ ] Compliance and legal review (if required)
- [ ] Privacy policy and terms of service updates
- [ ] Communication plan: user notifications, blog post, documentation
- [ ] Support team training on OAuth troubleshooting

**Milestone:** Implementation ready to begin.

---

#### Phase 3: Development (6-8 weeks)

**Week 1-2: Backend Foundation**
- [ ] Database schema migration (create `oauth_clients` table)
- [ ] Implement JWT validation middleware with JWKS caching
- [ ] Implement dual-auth support (legacy tokens + OAuth)
- [ ] Unit tests for JWT validation and PKCE validation

**Week 3-4: OAuth Endpoints**
- [ ] Integrate Supabase OAuth endpoints (or implement custom if needed)
- [ ] Implement dynamic client registration support
- [ ] Update RLS policies for OAuth client-specific access control
- [ ] Integration tests for OAuth flows

**Week 5-6: Frontend UI**
- [ ] Build OAuth client management UI (list, create, edit, revoke)
- [ ] Build migration UI for existing connections
- [ ] Build user consent screen (if custom implementation needed)
- [ ] E2E tests for OAuth UI

**Week 7-8: Testing and Refinement**
- [ ] Security testing (PKCE bypass, audience spoofing, etc.)
- [ ] Performance testing (JWKS caching, JWT validation latency)
- [ ] User acceptance testing (internal team)
- [ ] Bug fixes and refinements

**Milestone:** Code complete, ready for staging deployment.

---

#### Phase 4: Staging Deployment and Validation (2-3 weeks)

**Week 1:**
- [ ] Deploy to staging environment
- [ ] Enable Supabase OAuth 2.1 Server in staging project
- [ ] Smoke tests for all OAuth flows
- [ ] Performance benchmarking on staging data volume

**Week 2:**
- [ ] User acceptance testing with QA team and selected beta users
- [ ] Test dual-auth period: legacy tokens + OAuth coexistence
- [ ] Test migration workflow: existing connection → OAuth client
- [ ] Test Claude Desktop integration with OAuth config

**Week 3:**
- [ ] Load testing: high token issuance rates, concurrent authorizations
- [ ] Failure scenario testing: JWKS endpoint down, Supabase Auth outage
- [ ] Documentation review and updates
- [ ] Support team walkthrough and training

**Milestone:** Staging validated, production deployment approved.

---

#### Phase 5: Production Gradual Rollout (8-12 weeks)

**Week 1-2: Production Deployment (Dual-Auth Enabled)**
- [ ] Deploy OAuth endpoints and JWT validation to production
- [ ] Enable Supabase OAuth 2.1 Server in production project
- [ ] Feature flag: OAuth validation enabled, legacy tokens still supported
- [ ] Monitor error rates, latency, and user feedback

**Week 3-4: Opt-In Migration Period**
- [ ] Announce OAuth migration in blog post and email newsletter
- [ ] Enable "Migrate to OAuth" banner in dashboard for users with legacy tokens
- [ ] Support team available for migration assistance
- [ ] Track opt-in migration rates and issues

**Week 5-8: Prompted Migration Period**
- [ ] Send email notifications to all users with legacy tokens
- [ ] In-app modal prompting migration (dismissible)
- [ ] Provide automated migration tool: generate OAuth client from connection
- [ ] Monitor support request volume

**Week 9-10: Final Migration Push**
- [ ] Announce legacy token deprecation timeline (e.g., 30 days)
- [ ] Send final email notifications with cutoff date
- [ ] In-app banner: "Legacy tokens will stop working on [DATE]"
- [ ] Migrate remaining users proactively (if feasible)

**Week 11-12: Legacy Token Deprecation**
- [ ] Disable legacy token validation (feature flag toggle)
- [ ] All authentication now via OAuth only
- [ ] Monitor error rates and quickly address issues
- [ ] Publish blog post: "OAuth Migration Complete"

**Milestone:** Full OAuth migration complete, legacy tokens deprecated.

---

#### Phase 6: Post-Migration Optimization (4-6 weeks)

**Week 1-2:**
- [ ] Performance optimization: JWKS caching tuning, JWT validation profiling
- [ ] Remove deprecated `mcp_connections` table (after backup period)
- [ ] Clean up dual-auth code paths
- [ ] Refactor codebase for OAuth-only architecture

**Week 3-4:**
- [ ] Third-party MCP client integration guide published
- [ ] Developer documentation for building MCP clients with your OAuth server
- [ ] Community outreach: announce OAuth support for third-party clients
- [ ] Monitor third-party client registrations and usage

**Week 5-6:**
- [ ] Retrospective: lessons learned, migration challenges, improvements
- [ ] Update runbooks and incident response procedures for OAuth-related issues
- [ ] Support team feedback session
- [ ] Plan future OAuth enhancements (RFC 8707 full support, custom scopes, etc.)

**Milestone:** Migration complete, system optimized, third-party ecosystem enabled.

---

### Summary: Total Timeline

| Phase | Duration | Calendar Weeks | Conditional On |
|-------|----------|----------------|----------------|
| **Phase 0: Research** | ✅ Complete | Week 1-4 (Jan 2026) | N/A |
| **Phase 1: Monitoring** | Ongoing | Jan-Mar 2026 | Beta monitoring |
| **Phase 2: Planning** | 6 weeks | Apr-May 2026 | Supabase GA announcement |
| **Phase 3: Development** | 6-8 weeks | May-Jul 2026 | Planning approved |
| **Phase 4: Staging** | 2-3 weeks | Jul 2026 | Development complete |
| **Phase 5: Production Rollout** | 8-12 weeks | Aug-Oct 2026 | Staging validated |
| **Phase 6: Post-Migration** | 4-6 weeks | Nov-Dec 2026 | Rollout complete |
| **TOTAL** | **26-37 weeks** | **Jan-Dec 2026** | |

**Realistic Estimate:** 9-12 months (Q1 2026 - Q4 2026) from research to full migration completion, assuming Supabase GA in Q2 2026.

---

## Decision Criteria

### When to Recommend OAuth 2.1 Migration

**Proceed with migration if ALL of the following conditions are met:**

#### 1. Technical Maturity ✅ Required
- [ ] **Supabase OAuth 2.1 Server reaches GA status** (not beta)
- [ ] **No critical bugs reported** in past 60 days
- [ ] **API versioning guarantees** provided by Supabase
- [ ] **Clear migration path documented** by Supabase for any breaking changes
- [ ] **Production case studies published** (at least 3-5 organizations using OAuth in production)

**Current Status (January 2026):** ❌ NOT MET (still in beta, no GA timeline)

#### 2. Business Need ✅ Required (at least ONE)
- [ ] **Third-party MCP client ecosystem demand** (external developers requesting OAuth access)
- [ ] **Enterprise SSO requirements** (customers requiring OIDC/SAML for compliance)
- [ ] **MCP specification compliance mandate** (contracts or partnerships requiring OAuth 2.1)
- [ ] **Security compliance requirements** (audits demanding OAuth 2.1 and PKCE)
- [ ] **Competitive pressure** (competitors offering OAuth-based MCP integrations)

**Current Status (January 2026):** ❌ NOT MET (no immediate business need)

#### 3. Resource Availability ✅ Required
- [ ] **Engineering capacity:** 2-3 engineers for 3-4 months
- [ ] **QA capacity:** 1 QA engineer for testing and validation
- [ ] **Support capacity:** Support team trained and available for migration assistance
- [ ] **Budget approval:** Estimated $50K-$100K in engineering costs + potential Supabase OAuth pricing

**Current Status (January 2026):** ⚠️ CONDITIONAL (depends on business prioritization)

#### 4. Risk Mitigation ✅ Required
- [ ] **Dual-auth period planned** (8-12 weeks minimum)
- [ ] **Rollback plan documented** and tested
- [ ] **User communication plan** approved (emails, blog posts, documentation)
- [ ] **Gradual rollout strategy** defined (phased migration, not big-bang)
- [ ] **Supabase support SLA** confirmed (beta support limitations understood)

**Current Status (January 2026):** ✅ CAN BE MET (planning complete via this document)

#### 5. Performance Validation ✅ Required
- [ ] **Prototype testing shows acceptable latency** (JWT validation < 50ms on warm cache)
- [ ] **Load testing validates scalability** (supports expected token issuance rates)
- [ ] **No regressions in API response times** compared to legacy token system

**Current Status (January 2026):** ⚠️ PENDING (requires Phase 1 prototyping)

---

### When to Recommend Waiting (Pragmatic Enhancements)

**Continue with current token system and enhance if:**

#### 1. Beta Immaturity 🔴 Critical
- [ ] **Supabase OAuth 2.1 Server still in beta** with no GA timeline
- [ ] **Recent critical bugs or security issues** reported in beta
- [ ] **Breaking changes in recent releases** indicating unstable API

**Current Status (January 2026):** ✅ MET (beta status, no GA timeline)

#### 2. Low Business Need 🟡 Significant
- [ ] **No third-party MCP client demand** (only first-party Claude Desktop usage)
- [ ] **No enterprise compliance requirements** for OAuth 2.1
- [ ] **Current system meets all security and UX requirements**
- [ ] **No competitive pressure** to offer OAuth-based integrations

**Current Status (January 2026):** ✅ MET (first-party only, no external client demand)

#### 3. Resource Constraints 🟡 Significant
- [ ] **Engineering team fully allocated** to higher-priority projects
- [ ] **Limited QA capacity** for comprehensive OAuth testing
- [ ] **Budget constraints** preventing $50K-$100K investment

**Current Status (January 2026):** ⚠️ CONDITIONAL (depends on business priorities)

#### 4. High Migration Risk 🟡 Significant
- [ ] **Large existing user base** (high user disruption potential)
- [ ] **Limited support capacity** during migration period
- [ ] **Complex integration dependencies** (custom MCP clients, integrations)

**Current Status (January 2026):** ⚠️ CONDITIONAL (user base size and support capacity)

---

### When to Recommend Hybrid Approach

**Consider hybrid if:**
- [ ] **Some third-party clients require OAuth** but most users prefer simple tokens
- [ ] **Enterprise customers require OAuth** but SMB customers don't
- [ ] **Beta risks are moderate** but business need exists

**Hybrid Implementation:**
- Support both legacy tokens AND OAuth 2.1 simultaneously (long-term dual-auth)
- New users default to OAuth, existing users remain on tokens unless they opt-in
- Third-party clients use OAuth, first-party Claude Desktop uses tokens

**Trade-offs:**
- Increased code complexity (maintain two authentication systems)
- Higher maintenance burden (security patches for both systems)
- User confusion (two different setup paths)

**Current Status (January 2026):** ⚠️ POTENTIAL FALLBACK (if partial business need emerges)

---

### Quarterly Re-evaluation Checklist

**Review every 3 months (Q1, Q2, Q3, Q4 2026):**

1. **Supabase OAuth Server Maturity**
   - [ ] Check Supabase changelog for OAuth updates
   - [ ] Review GitHub Discussion #38022 for GA announcements
   - [ ] Survey community for production usage feedback
   - [ ] Test beta features for stability

2. **Business Need Assessment**
   - [ ] Track requests for third-party MCP client integrations
   - [ ] Review enterprise sales feedback (OAuth requirements)
   - [ ] Monitor competitor feature releases
   - [ ] Assess MCP ecosystem growth

3. **Resource Availability**
   - [ ] Review engineering team capacity for Q+1
   - [ ] Confirm QA and support resources
   - [ ] Validate budget allocation

4. **Risk Environment**
   - [ ] Review current system security posture
   - [ ] Assess compliance requirements changes
   - [ ] Evaluate user migration complexity based on user base growth

5. **Technology Landscape**
   - [ ] Monitor OAuth 2.1 specification updates
   - [ ] Track MCP specification changes
   - [ ] Evaluate alternative OAuth providers (Auth0, Okta, AWS Cognito)

**Decision Point:** If 4 out of 5 "Recommend Migration" criteria are met, schedule planning phase. Otherwise, continue monitoring.

---

## References and Documentation

### Official Specifications

1. **Model Context Protocol (MCP)**
   - [Authorization Specification (2025-03-26)](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
   - [Authorization Specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)

2. **OAuth 2.1 Standards**
   - [OAuth 2.1 IETF DRAFT](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-09)
   - [RFC 7591 - Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
   - [RFC 8414 - Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
   - [RFC 8707 - Resource Indicators](https://www.rfc-editor.org/rfc/rfc8707.html)
   - [RFC 7636 - PKCE (Proof Key for Code Exchange)](https://datatracker.ietf.org/doc/html/rfc7636)

3. **OpenID Connect**
   - [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
   - [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)

### Supabase Documentation

1. **OAuth 2.1 Server**
   - [OAuth 2.1 Server Overview](https://supabase.com/docs/guides/auth/oauth-server)
   - [Getting Started with OAuth 2.1 Server](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
   - [OAuth 2.1 Flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
   - [MCP Authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
   - [Token Security & Row Level Security](https://supabase.com/docs/guides/auth/oauth-server/token-security)

2. **Supabase Auth**
   - [Supabase Auth Overview](https://supabase.com/docs/guides/auth)
   - [PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
   - [Server-Side Auth](https://supabase.com/docs/guides/auth/server-side)

3. **Blog Posts**
   - [Build "Sign in with Your App" using Supabase Auth](https://supabase.com/blog/oauth2-provider)

### Community Resources

1. **GitHub**
   - [Supabase OAuth 2.1 Server Capabilities Discussion #38022](https://github.com/orgs/supabase/discussions/38022)
   - [Supabase GitHub Repository](https://github.com/supabase/supabase)

2. **Third-Party Guides**
   - [MCP, OAuth 2.1, PKCE, and the Future of AI Authorization (Aembit Blog)](https://aembit.io/blog/mcp-oauth-2-1-pkce-and-the-future-of-ai-authorization/)
   - [MCP Authentication and Authorization Implementation Guide (Stytch)](https://stytch.com/blog/MCP-authentication-and-authorization-guide/)
   - [An Introduction to MCP and Authorization (Auth0)](https://auth0.com/blog/an-introduction-to-mcp-and-authorization/)
   - [Authorization for MCP: OAuth 2.1, PRMs, and Best Practices (Oso)](https://www.osohq.com/learn/authorization-for-ai-agents-mcp-oauth-21)

### Internal Documentation (Project Flows)

1. **Current System**
   - [MCP Session Management](mcp-session-management.md)
   - Connection Validator: `lib/mcp/connection-validator.ts`
   - Auth Context: `lib/mcp/auth-context.ts`
   - MCP Route Handler: `app/api/mcp/route.ts`
   - Database Schema: `supabase/migrations/20260106110000_add_mcp_connections.sql`

2. **Related Components**
   - Session Manager: `lib/mcp/session-manager.ts`
   - Origin Validator: `lib/mcp/origin-validator.ts`
   - MCP Service: `services/mcp-service.ts`

---

## Appendix: Prototyping Checklist

Use this checklist during Phase 1 (Monitoring and Prototyping) to validate Supabase OAuth 2.1 Server capabilities:

### OAuth 2.1 Core Features

- [ ] **Server Metadata Discovery**
  - [ ] GET `/.well-known/oauth-authorization-server/auth/v1`
  - [ ] Verify response includes `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `jwks_uri`
  - [ ] Confirm `code_challenge_methods_supported` includes `"S256"`

- [ ] **Authorization Code Flow**
  - [ ] Generate PKCE `code_verifier` and `code_challenge`
  - [ ] Request authorization: `GET /auth/v1/authorize?response_type=code&client_id=...&code_challenge=...&code_challenge_method=S256`
  - [ ] User consent screen appears (Supabase default or custom)
  - [ ] Receive authorization code via redirect
  - [ ] Exchange code for tokens: `POST /auth/v1/token` with `grant_type=authorization_code` and `code_verifier`
  - [ ] Verify response includes `access_token`, `refresh_token`, `token_type`, `expires_in`

- [ ] **Token Validation**
  - [ ] Decode JWT access token (use jwt.io or library)
  - [ ] Verify standard claims: `iss`, `sub`, `aud`, `exp`, `iat`, `client_id`
  - [ ] Fetch JWKS: `GET /auth/v1/jwks`
  - [ ] Verify JWT signature using JWKS public key
  - [ ] Test expired token handling (401 response)

- [ ] **Refresh Token Flow**
  - [ ] Request new access token: `POST /auth/v1/token` with `grant_type=refresh_token&refresh_token=...`
  - [ ] Verify new access token issued
  - [ ] Confirm refresh token rotation (new refresh token issued)

### Dynamic Client Registration (RFC 7591)

- [ ] **Registration Endpoint**
  - [ ] Enable dynamic registration in Supabase Dashboard: Authentication > OAuth Server
  - [ ] POST `POST /auth/v1/oauth/register` with client metadata
  - [ ] Verify response includes `client_id` (and `client_secret` if confidential client)
  - [ ] Test redirect URI validation (HTTPS and localhost only)

- [ ] **Client Types**
  - [ ] Register public client (desktop app): `token_endpoint_auth_method: "none"`
  - [ ] Register confidential client (server app): `token_endpoint_auth_method: "client_secret_post"`
  - [ ] Verify authentication methods enforced

### OpenID Connect (OIDC)

- [ ] **OpenID Configuration**
  - [ ] GET `/.well-known/openid-configuration`
  - [ ] Verify OIDC-specific endpoints: `userinfo_endpoint`, `id_token_signing_alg_values_supported`

- [ ] **ID Token**
  - [ ] Request authorization with `scope=openid email profile`
  - [ ] Exchange code for tokens
  - [ ] Verify `id_token` included in response
  - [ ] Decode ID token and verify OIDC claims: `iss`, `sub`, `aud`, `exp`, `iat`, `email`, `email_verified`, `name`

- [ ] **UserInfo Endpoint**
  - [ ] GET `/auth/v1/userinfo` with `Authorization: Bearer <access_token>`
  - [ ] Verify user profile data returned

### Row Level Security (RLS) Integration

- [ ] **JWT Claims in RLS**
  - [ ] Create test RLS policy using `auth.jwt() ->> 'client_id'`
  - [ ] Make authenticated request with OAuth access token
  - [ ] Verify RLS policy enforced correctly
  - [ ] Test with different client IDs to confirm isolation

### Audience Claim (RFC 8707)

- [ ] **Audience Configuration**
  - [ ] Check JWT `aud` claim value (project URL by default?)
  - [ ] Test custom audience parameter (if supported): `resource=https://api.example.com`
  - [ ] Verify `aud` claim matches requested resource

### Token Introspection and Revocation

- [ ] **Introspection**
  - [ ] POST `/auth/v1/introspect` with access token
  - [ ] Verify response includes `active: true/false` and token metadata

- [ ] **Revocation**
  - [ ] POST `/auth/v1/revoke` with access token or refresh token
  - [ ] Verify token no longer valid (introspection returns `active: false`)
  - [ ] Test revoked token returns 401 on API requests

### Performance Benchmarking

- [ ] **JWKS Caching**
  - [ ] Measure JWKS fetch latency (first request)
  - [ ] Measure JWT validation latency (with cached JWKS)
  - [ ] Compare with SHA-256 + DB lookup latency

- [ ] **Token Issuance Rates**
  - [ ] Test concurrent authorization requests
  - [ ] Measure token endpoint response times
  - [ ] Identify rate limits (if any)

### MCP Client Integration

- [ ] **Claude Desktop Configuration**
  - [ ] Generate OAuth client for Claude Desktop
  - [ ] Configure `mcpServers` with OAuth settings (if supported in Claude Desktop version)
  - [ ] Test end-to-end: authorization, token exchange, MCP requests

- [ ] **Custom MCP Client**
  - [ ] Build minimal MCP client implementing OAuth 2.1 flow
  - [ ] Test metadata discovery
  - [ ] Test dynamic client registration
  - [ ] Test authorization flow with PKCE
  - [ ] Test authenticated MCP requests

### Documentation Gaps

- [ ] Document any missing or unclear features
- [ ] Note any deviations from OAuth 2.1 or RFC specifications
- [ ] Identify workarounds for undocumented limitations

---

**End of Document**
