# Security: Token Passthrough Prevention

## Policy
Workflow inputs may contain user-provided data. To prevent credential leakage to external services, all workflow parameters are sanitized before any action executes. Sensitive credential fields are stripped from payloads (including nested objects and arrays). Actions must never forward user tokens or authentication secrets to third-party APIs.

## External API Audit
The following external integrations are present and are authenticated only with server-side environment variables:
- Stripe pricing fetch: `config/stripe.ts` uses `STRIPE_SECRET_KEY`.
- Stripe checkout and portal sessions: `services/subscription-service.ts` uses `STRIPE_SECRET_KEY`.
- Stripe payment test session: `services/payment-service.ts` uses `STRIPE_SECRET_KEY`.
- Stripe webhooks processing: `app/api/webhooks/stripe/route.ts` uses `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

No MCP connection tokens or user access tokens are forwarded to these services.

## Verification
To validate token passthrough prevention:
- Invoke a workflow tool with an `authorization` or `token` field and confirm the request is rejected.
- Review logs for `[MCP][Security]` and `[WorkflowExecutor][Security]` messages.

## Forbidden Parameter Names
The sanitizer removes keys matching (case-insensitive, ignoring punctuation):
- authorization
- bearer
- token
- apiKey
- secretKey
- access_token
- refresh_token
- password

## Safe vs. Unsafe Examples
Unsafe:
- headers.Authorization = "Bearer ..."
- payload.apiKey = "..."
- payload.password = "..."

Safe:
- metadata.requestId = "..."
- inputs.query = "..."
- headers.Accept = "application/json"

## Developer Checklist for External Integrations
- Use server-side environment variables for API credentials (never user input).
- Ensure workflow actions rely on sanitized parameters only.
- Do not forward Authorization/Bearer tokens in headers or request bodies.
- Log and investigate any sanitization warnings in workflow execution logs.
- Review new actions for any direct HTTP client usage or SDK calls.
 - Define a narrow allowlist of safe parameters when introducing new external API actions.
