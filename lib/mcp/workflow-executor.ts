import { createServiceRoleClient } from '@/lib/supabase/server';
import type { AuthContext } from './auth-context';
import type { ActionParams, FunctionResult, ActionContext, SanitizedParams } from '@/types/actions';
import { DAGTraverser, type WorkflowNode, type WorkflowEdge } from './dag-traverser';
import { ActionRegistry } from './action-registry';
import { sanitizeActionParams } from './param-sanitizer';

/**
 * Workflow Execution Engine
 * Executes workflows by traversing nodes in topological order
 */
export class WorkflowExecutor {
  private actionRegistry: ActionRegistry;
  private static sanitizationAttempts = 0;
  private static readonly sanitizationAlertThreshold = (() => {
    const parsed = Number.parseInt(
      process.env.MCP_SANITIZATION_ALERT_THRESHOLD || '3',
      10
    );
    return Number.isFinite(parsed) ? parsed : 3;
  })();

  constructor() {
    this.actionRegistry = new ActionRegistry();
  }

  /**
   * Executes a workflow with given parameters
   *
   * @param workflowId - The workflow to execute
   * @param params - Input parameters for the workflow
   * @param authContext - Auth context for organization/user scoping
   * @returns Execution result
   */
  async executeWorkflow(
    workflowId: string,
    params: ActionParams,
    authContext: AuthContext
  ): Promise<FunctionResult> {
    const executionStart = Date.now();

    try {
      console.log(`[WorkflowExecutor] Starting execution of workflow ${workflowId}`);
      // Security boundary: strip credential fields before any action executes.
      const sanitizedWorkflowParams = this.sanitizeParams(params);

      // Step 1: Load workflow nodes and edges
      const { nodes, edges } = await this.loadWorkflowGraph(workflowId, authContext);

      if (nodes.length === 0) {
        return {
          success: false,
          error: 'Workflow has no nodes',
        };
      }

      // Step 2: Build DAG and get execution order
      const traverser = new DAGTraverser();
      traverser.buildGraph(nodes, edges);

      if (!traverser.validateDAG()) {
        return {
          success: false,
          error: 'Workflow contains a cycle',
        };
      }

      const executionOrder = traverser.topologicalSort();
      console.log(`[WorkflowExecutor] Execution order: ${executionOrder.join(' → ')}`);

      // Step 3: Execute nodes in topological order
      const nodeOutputs = new Map<string, any>();
      let finalResult: FunctionResult = { success: true, data: {} };

      for (const nodeId of executionOrder) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        // Skip start and end nodes (they don't have actions)
        if (node.type === 'start' || node.type === 'end') {
          nodeOutputs.set(nodeId, sanitizedWorkflowParams);
          continue;
        }

        // Execute action node
        const result = await this.executeNode(
          node,
          sanitizedWorkflowParams,
          nodeOutputs,
          authContext,
          workflowId
        );

        nodeOutputs.set(nodeId, result.data);

        if (!result.success) {
          console.error(`[WorkflowExecutor] Node ${nodeId} failed:`, result.error);
          return result;
        }

        // Store as potential final result
        finalResult = result;
      }

      const executionTime = Date.now() - executionStart;
      console.log(`[WorkflowExecutor] Workflow ${workflowId} completed in ${executionTime}ms`);

      return {
        success: true,
        data: {
          ...finalResult.data,
          _execution: {
            workflowId,
            executionTimeMs: executionTime,
            nodesExecuted: executionOrder.length,
          },
        },
      };
    } catch (error) {
      console.error(`[WorkflowExecutor] Execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Workflow execution failed',
      };
    }
  }

  /**
   * Loads workflow graph (nodes and edges) from database
   */
  private async loadWorkflowGraph(
    workflowId: string,
    authContext: AuthContext
  ): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
    const supabase = createServiceRoleClient();
    const organizationId = authContext.getOrganizationId();

    // Load workflow to verify ownership
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, organization_id')
      .eq('id', workflowId)
      .eq('organization_id', organizationId)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found or access denied');
    }

    // Load nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId);

    if (nodesError) {
      throw new Error(`Failed to load workflow nodes: ${nodesError.message}`);
    }

    // Load edges
    const { data: edges, error: edgesError } = await supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId);

    if (edgesError) {
      throw new Error(`Failed to load workflow edges: ${edgesError.message}`);
    }

    return {
      nodes: (nodes || []) as WorkflowNode[],
      edges: (edges || []) as WorkflowEdge[],
    };
  }

  /**
   * Executes a single workflow node
   */
  private async executeNode(
    node: WorkflowNode,
    workflowParams: ActionParams,
    nodeOutputs: Map<string, any>,
    authContext: AuthContext,
    workflowId: string
  ): Promise<FunctionResult> {
    const actionId = node.data?.action_id || node.data?.actionId;

    if (!actionId) {
      return {
        success: false,
        error: `Node ${node.id} has no action_id defined`,
      };
    }

    try {
      // Load the action function
      const action = await this.actionRegistry.loadAction(actionId);

      // Prepare parameters for this node
      // Merge workflow params with outputs from previous nodes
      const nodeParams = {
        ...workflowParams,
        ...node.data?.parameters,
        _previousOutputs: Object.fromEntries(nodeOutputs),
      };
      const sanitizedNodeParams = this.sanitizeParams(nodeParams);

      // Create action context
      const context: ActionContext = {
        workflowId,
        nodeId: node.id,
        organizationId: authContext.getOrganizationId(),
        userId: authContext.getUserId(),
      };

      // Execute the action
      console.log(`[WorkflowExecutor] Executing node ${node.id} with action ${actionId}`);
      const result = await action(sanitizedNodeParams, context);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Action execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Critical security boundary: sanitize workflow params to prevent user
   * credentials from being forwarded to external services by actions.
   */
  private sanitizeParams(params: ActionParams): SanitizedParams {
    const { sanitized, removedKeys } = sanitizeActionParams(params);

    if (removedKeys.length > 0) {
      WorkflowExecutor.sanitizationAttempts += 1;
      console.warn(
        `[WorkflowExecutor][Security] Removed sensitive params: ${removedKeys.join(', ')}`
      );

      if (WorkflowExecutor.sanitizationAttempts >= WorkflowExecutor.sanitizationAlertThreshold) {
        console.warn(
          `[WorkflowExecutor][Security] Elevated sensitive param stripping volume (${WorkflowExecutor.sanitizationAttempts}). ` +
          'Investigate potential token passthrough attempts.'
        );
      }
    }

    return sanitized;
  }
}
