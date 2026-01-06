/**
 * MCP (Model Context Protocol) type definitions
 *
 * This file contains minimal type definitions for MCP.
 * Most types are provided by @modelcontextprotocol/sdk
 */

/**
 * Result type for MCP tool execution
 */
export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * JWT claims interface for validated authentication tokens
 * Used throughout MCP request lifecycle for authorization
 */
export interface JWTClaims {
  sub: string;
  aud: string | string[];
  exp: number;
  organization_id?: string;
  scopes?: string[];
  [key: string]: any;
}
