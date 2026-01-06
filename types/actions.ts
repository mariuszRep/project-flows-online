/**
 * Type definitions for workflow action functions
 */

/**
 * Parameters passed to action functions (from workflow inputs or previous node outputs)
 */
export type ActionParams = Record<string, any>;

/**
 * Context provided to action functions during execution
 */
export interface ActionContext {
  workflowId: string;
  nodeId: string;
  organizationId: string;
  userId: string;
}

/**
 * Result returned by action functions
 */
export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Action function signature
 * All actions must conform to this type
 */
export type ActionFunction = (
  params: ActionParams,
  context: ActionContext
) => Promise<FunctionResult>;

/**
 * Action module structure (what gets imported from actions/*.ts files)
 */
export interface ActionModule {
  default: ActionFunction;
}
