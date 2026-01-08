# MCP Session State Management

## Session lifecycle overview

Client init -> AuthContext validated -> Session created or reused -> State loaded -> Workflow executes
     |                                                                              |
     +--------------------- request loop with state updates ------------------------+
                                   |
                         Session TTL extended on activity
                                   |
                       Cleanup job removes orphaned state

## State storage

- Session key: mcp_session:{userId}:{sessionId}
- State key: mcp_session_state:{userId}:{sessionId}
- Version key: mcp_session_state_version:{userId}:{sessionId}
- Default TTL: 24 hours (SESSION_TTL_SECONDS)
- Extension threshold: 1 hour remaining (SESSION_EXTENSION_THRESHOLD_SECONDS)

## Cleanup procedures

- Hourly cron: POST /api/cron/cleanup-sessions
- Auth: Authorization: Bearer ${CRON_SECRET}
- Scans for orphaned state keys and removes them in batches.
- Use cleanupUserSessions(userId) for explicit logout or revocation flows.

## Metrics definitions

Raw metrics are stored in Redis sorted sets by type with timestamp scores:
- session_created
- session_validated
- session_validation_failed
- session_extended
- session_deleted
- session_hijack_blocked
- request_count

Hourly rollups are written to mcp_metrics_hourly:{hourStart} with:
- count
- avg (based on value fields when present)
- p50
- p95

Retention:
- Raw metrics: METRICS_RETENTION_DAYS (default 90 days)
- Hourly rollups: 365 days
