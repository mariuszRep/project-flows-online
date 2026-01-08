/**
 * Session state and metrics types for MCP session lifecycle tracking
 */

export type SessionMetricType =
  | 'session_created'
  | 'session_validated'
  | 'session_extended'
  | 'session_deleted'
  | 'session_hijack_blocked'
  | 'request_count'
  | 'session_validation_failed';

export interface ConversationMessage {
  role: string;
  content: string;
  createdAt?: number;
}

export interface ConversationState {
  messages: ConversationMessage[];
}

export interface WorkflowState {
  nodeId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  variables?: Record<string, unknown>;
}

export interface UserPreferences {
  language?: string;
  timezone?: string;
}

export interface SessionState {
  conversation?: ConversationState;
  workflow?: WorkflowState;
  preferences?: UserPreferences;
  temporary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  lastActivityAt?: number;
  requestCount?: number;
  [key: string]: unknown;
}

export interface SessionMetricSummary {
  count: number;
  avg: number | null;
  p50: number | null;
  p95: number | null;
}

export interface SessionMetricsAggregation {
  hourStart: number;
  hourEnd: number;
  totals: Record<SessionMetricType, SessionMetricSummary>;
}
