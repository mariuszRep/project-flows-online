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
