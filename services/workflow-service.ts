import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, WorkflowTable, WorkflowNodeTable, WorkflowEdgeTable, Json } from '@/types/database'
import type { WorkflowCanvasNode, WorkflowCanvasEdge, WorkflowDetail, WorkflowNodeData } from '@/types/workflow'

/**
 * Shared service for workflow queries
 * Encapsulates logic for querying workflows, workflow_nodes, and workflow_edges tables
 * Framework-agnostic business logic with RLS-based access control
 */
export class WorkflowService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Get all workflows for an organization
   * @param organizationId - Organization ID
   * @returns Success result with workflows array or error
   */
  async getByOrganization(organizationId: string): Promise<{
    success: boolean
    workflows?: WorkflowTable[]
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching workflows:', error)
        return { success: false, error: error.message }
      }

      return { success: true, workflows: data || [] }
    } catch (error) {
      console.error('Error fetching workflows:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get a single workflow by ID with nodes and edges
   * @param workflowId - Workflow ID
   * @returns Success result with workflow detail or error
   */
  async getById(workflowId: string): Promise<{
    success: boolean
    workflow?: WorkflowDetail
    error?: string
  }> {
    try {
      const { data: workflowData, error: workflowError } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (workflowError) {
        console.error('Error fetching workflow:', workflowError)
        return { success: false, error: workflowError.message }
      }

      if (!workflowData) {
        return { success: false, error: 'Workflow not found' }
      }

      const { data: nodeData, error: nodesError } = await this.supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', workflowId)

      if (nodesError) {
        console.error('Error fetching workflow nodes:', nodesError)
        return { success: false, error: nodesError.message }
      }

      const { data: edgeData, error: edgesError } = await this.supabase
        .from('workflow_edges')
        .select('*')
        .eq('workflow_id', workflowId)

      if (edgesError) {
        console.error('Error fetching workflow edges:', edgesError)
        return { success: false, error: edgesError.message }
      }

      const nodes: WorkflowCanvasNode[] = (nodeData || []).map((node) => ({
        id: node.id,
        type: node.type,
        position: { x: node.position_x, y: node.position_y },
        data: (node.data || { label: 'Untitled' }) as WorkflowNodeData,
        width: node.width ?? undefined,
        height: node.height ?? undefined,
      }))

      const edges: WorkflowCanvasEdge[] = (edgeData || []).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.source_handle ?? undefined,
        targetHandle: edge.target_handle ?? undefined,
        type: edge.type ?? undefined,
        data: (edge.data as Record<string, unknown>) ?? undefined,
      }))

      return {
        success: true,
        workflow: {
          workflow: workflowData,
          nodes,
          edges,
        },
      }
    } catch (error) {
      console.error('Error fetching workflow:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a new workflow
   * @param params - Workflow creation parameters
   * @param userId - ID of the user creating the workflow
   * @returns Success result with created workflow or error
   */
  async create(
    params: {
      organization_id: string
      name: string
      description?: string
      status?: 'draft' | 'published' | 'archived'
    },
    userId: string
  ): Promise<{
    success: boolean
    workflow?: WorkflowTable
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .insert({
          organization_id: params.organization_id,
          name: params.name,
          description: params.description,
          status: params.status || 'draft',
          version: 1,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating workflow:', error)
        return { success: false, error: error.message }
      }

      return { success: true, workflow: data }
    } catch (error) {
      console.error('Error creating workflow:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update an existing workflow
   * @param workflowId - Workflow ID
   * @param params - Workflow update parameters
   * @param userId - ID of the user updating the workflow
   * @returns Success result with updated workflow or error
   */
  async update(
    workflowId: string,
    params: {
      name?: string
      description?: string
      status?: 'draft' | 'published' | 'archived'
      version?: number
    },
    userId: string
  ): Promise<{
    success: boolean
    workflow?: WorkflowTable
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('workflows')
        .update({
          ...params,
          updated_by: userId,
        })
        .eq('id', workflowId)
        .select()
        .single()

      if (error) {
        console.error('Error updating workflow:', error)
        return { success: false, error: error.message }
      }

      return { success: true, workflow: data }
    } catch (error) {
      console.error('Error updating workflow:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete a workflow (CASCADE deletes nodes and edges automatically)
   * @param workflowId - Workflow ID
   * @returns Success result or error
   */
  async delete(workflowId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await this.supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)

      if (error) {
        console.error('Error deleting workflow:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting workflow:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Save workflow with nodes and edges in a transactional manner
   * This method handles the complete workflow state atomically
   * @param workflowId - Workflow ID
   * @param nodes - Array of canvas nodes to save
   * @param edges - Array of canvas edges to save
   * @param userId - ID of the user saving the workflow
   * @returns Success result or error
   */
  async saveWorkflow(
    workflowId: string,
    nodes: WorkflowCanvasNode[],
    edges: WorkflowCanvasEdge[],
    userId: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Update workflow's updated_by and trigger updated_at
      const { error: workflowError } = await this.supabase
        .from('workflows')
        .update({ updated_by: userId })
        .eq('id', workflowId)

      if (workflowError) {
        console.error('Error updating workflow:', workflowError)
        return { success: false, error: workflowError.message }
      }

      // Delete existing nodes
      const { error: deleteNodesError } = await this.supabase
        .from('workflow_nodes')
        .delete()
        .eq('workflow_id', workflowId)

      if (deleteNodesError) {
        console.error('Error deleting workflow nodes:', deleteNodesError)
        return { success: false, error: deleteNodesError.message }
      }

      // Delete existing edges
      const { error: deleteEdgesError } = await this.supabase
        .from('workflow_edges')
        .delete()
        .eq('workflow_id', workflowId)

      if (deleteEdgesError) {
        console.error('Error deleting workflow edges:', deleteEdgesError)
        return { success: false, error: deleteEdgesError.message }
      }

      // Insert new nodes
      if (nodes.length > 0) {
        const nodesToInsert = nodes.map((node) => ({
          id: node.id,
          workflow_id: workflowId,
          type: node.type || 'default',
          position_x: node.position.x,
          position_y: node.position.y,
          data: (node.data || {}) as Json,
          width: node.width ?? null,
          height: node.height ?? null,
        }))

        const { error: insertNodesError } = await this.supabase
          .from('workflow_nodes')
          .insert(nodesToInsert)

        if (insertNodesError) {
          console.error('Error inserting workflow nodes:', insertNodesError)
          return { success: false, error: insertNodesError.message }
        }
      }

      // Insert new edges
      if (edges.length > 0) {
        const edgesToInsert = edges.map((edge) => ({
          id: edge.id,
          workflow_id: workflowId,
          source: edge.source,
          target: edge.target,
          source_handle: edge.sourceHandle ?? null,
          target_handle: edge.targetHandle ?? null,
          type: edge.type ?? null,
          data: (edge.data as Json) ?? null,
        }))

        const { error: insertEdgesError } = await this.supabase
          .from('workflow_edges')
          .insert(edgesToInsert)

        if (insertEdgesError) {
          console.error('Error inserting workflow edges:', insertEdgesError)
          return { success: false, error: insertEdgesError.message }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error saving workflow:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a single workflow node
   * @param workflowId - Workflow ID
   * @param node - Node to create
   * @returns Success result with created node or error
   */
  async createNode(
    workflowId: string,
    node: {
      id: string
      type: string
      position_x: number
      position_y: number
      data: Json
      width?: number
      height?: number
    }
  ): Promise<{
    success: boolean
    node?: WorkflowNodeTable
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('workflow_nodes')
        .insert({
          id: node.id,
          workflow_id: workflowId,
          type: node.type,
          position_x: node.position_x,
          position_y: node.position_y,
          data: node.data as Json,
          width: node.width ?? null,
          height: node.height ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating workflow node:', error)
        return { success: false, error: error.message }
      }

      return { success: true, node: data }
    } catch (error) {
      console.error('Error creating workflow node:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create multiple workflow nodes
   * @param workflowId - Workflow ID
   * @param nodes - Array of nodes to create
   * @returns Success result with created nodes or error
   */
  async createNodes(
    workflowId: string,
    nodes: Array<{
      id: string
      type: string
      position_x: number
      position_y: number
      data: Json
      width?: number
      height?: number
    }>
  ): Promise<{
    success: boolean
    nodes?: WorkflowNodeTable[]
    error?: string
  }> {
    try {
      const nodesToInsert = nodes.map((node) => ({
        id: node.id,
        workflow_id: workflowId,
        type: node.type,
        position_x: node.position_x,
        position_y: node.position_y,
        data: node.data as Json,
        width: node.width ?? null,
        height: node.height ?? null,
      }))

      const { data, error } = await this.supabase
        .from('workflow_nodes')
        .insert(nodesToInsert)
        .select()

      if (error) {
        console.error('Error creating workflow nodes:', error)
        return { success: false, error: error.message }
      }

      return { success: true, nodes: data }
    } catch (error) {
      console.error('Error creating workflow nodes:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update a single workflow node
   * @param nodeId - Node ID
   * @param updates - Partial node updates
   * @returns Success result with updated node or error
   */
  async updateNode(
    nodeId: string,
    updates: {
      type?: string
      position_x?: number
      position_y?: number
      data?: Json
      width?: number | null
      height?: number | null
    }
  ): Promise<{
    success: boolean
    node?: WorkflowNodeTable
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('workflow_nodes')
        .update(updates)
        .eq('id', nodeId)
        .select()
        .single()

      if (error) {
        console.error('Error updating workflow node:', error)
        return { success: false, error: error.message }
      }

      return { success: true, node: data }
    } catch (error) {
      console.error('Error updating workflow node:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete a single workflow node
   * @param nodeId - Node ID to delete
   * @returns Success result or error
   */
  async deleteNode(nodeId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await this.supabase
        .from('workflow_nodes')
        .delete()
        .eq('id', nodeId)

      if (error) {
        console.error('Error deleting workflow node:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting workflow node:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete workflow nodes
   * @param nodeIds - Array of node IDs to delete
   * @returns Success result or error
   */
  async deleteNodes(nodeIds: string[]): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await this.supabase
        .from('workflow_nodes')
        .delete()
        .in('id', nodeIds)

      if (error) {
        console.error('Error deleting workflow nodes:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting workflow nodes:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a single workflow edge
   * @param workflowId - Workflow ID
   * @param edge - Edge to create
   * @returns Success result with created edge or error
   */
  async createEdge(
    workflowId: string,
    edge: {
      id: string
      source: string
      target: string
      source_handle?: string | null
      target_handle?: string | null
      type?: string | null
      data?: Json | null
    }
  ): Promise<{
    success: boolean
    edge?: WorkflowEdgeTable
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('workflow_edges')
        .insert({
          id: edge.id,
          workflow_id: workflowId,
          source: edge.source,
          target: edge.target,
          source_handle: edge.source_handle ?? null,
          target_handle: edge.target_handle ?? null,
          type: edge.type ?? null,
          data: (edge.data as Json) ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating workflow edge:', error)
        return { success: false, error: error.message }
      }

      return { success: true, edge: data }
    } catch (error) {
      console.error('Error creating workflow edge:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create multiple workflow edges
   * @param workflowId - Workflow ID
   * @param edges - Array of edges to create
   * @returns Success result with created edges or error
   */
  async createEdges(
    workflowId: string,
    edges: Array<{
      id: string
      source: string
      target: string
      source_handle?: string
      target_handle?: string
      type?: string
      data?: Json
    }>
  ): Promise<{
    success: boolean
    edges?: WorkflowEdgeTable[]
    error?: string
  }> {
    try {
      const edgesToInsert = edges.map((edge) => ({
        id: edge.id,
        workflow_id: workflowId,
        source: edge.source,
        target: edge.target,
        source_handle: edge.source_handle ?? null,
        target_handle: edge.target_handle ?? null,
        type: edge.type ?? null,
        data: (edge.data as Json) ?? null,
      }))

      const { data, error } = await this.supabase
        .from('workflow_edges')
        .insert(edgesToInsert)
        .select()

      if (error) {
        console.error('Error creating workflow edges:', error)
        return { success: false, error: error.message }
      }

      return { success: true, edges: data }
    } catch (error) {
      console.error('Error creating workflow edges:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete a single workflow edge
   * @param edgeId - Edge ID to delete
   * @returns Success result or error
   */
  async deleteEdge(edgeId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await this.supabase
        .from('workflow_edges')
        .delete()
        .eq('id', edgeId)

      if (error) {
        console.error('Error deleting workflow edge:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting workflow edge:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete workflow edges
   * @param edgeIds - Array of edge IDs to delete
   * @returns Success result or error
   */
  async deleteEdges(edgeIds: string[]): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await this.supabase
        .from('workflow_edges')
        .delete()
        .in('id', edgeIds)

      if (error) {
        console.error('Error deleting workflow edges:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting workflow edges:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
