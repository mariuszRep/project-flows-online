import { SupabaseClient } from '@supabase/supabase-js'
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  CreateNodeInput,
  UpdateNodeInput,
  CreateEdgeInput,
  UpdateEdgeInput,
  WorkflowWithElements,
} from '@/types/workflow'
import { createClient } from '@/lib/supabase/server'

export class WorkflowService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all workflows for an organization (RLS handles filtering)
   */
  async getOrganizationWorkflows(organizationId: string): Promise<Workflow[]> {
    const { data, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching workflows:', error)
      throw new Error('Failed to fetch workflows')
    }

    return data || []
  }

  /**
   * Get a single workflow by ID
   */
  async getWorkflowById(workflowId: string): Promise<Workflow | null> {
    const { data, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (error) {
      console.error('Error fetching workflow:', error)
      return null
    }

    return data
  }

  /**
   * Get a workflow with all its nodes and edges
   */
  async getWorkflowWithElements(workflowId: string): Promise<WorkflowWithElements | null> {
    // Fetch workflow
    const workflow = await this.getWorkflowById(workflowId)
    if (!workflow) {
      return null
    }

    // Fetch nodes
    const { data: nodesData, error: nodesError } = await this.supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true })

    if (nodesError) {
      console.error('Error fetching workflow nodes:', nodesError)
      throw new Error('Failed to fetch workflow nodes')
    }

    // Fetch edges
    const { data: edgesData, error: edgesError } = await this.supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true })

    if (edgesError) {
      console.error('Error fetching workflow edges:', edgesError)
      throw new Error('Failed to fetch workflow edges')
    }

    // Transform database rows to React Flow compatible format
    const nodes: WorkflowNode[] = (nodesData || []).map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position_x, y: node.position_y },
      data: node.data ?? {},
      width: node.width ?? undefined,
      height: node.height ?? undefined,
    }))

    const edges: WorkflowEdge[] = (edgesData || []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.source_handle ?? undefined,
      targetHandle: edge.target_handle ?? undefined,
      type: edge.type ?? undefined,
      data: edge.data ?? undefined,
    }))

    return {
      ...workflow,
      nodes,
      edges,
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(input: CreateWorkflowInput, userId: string): Promise<Workflow> {
    const { data, error } = await this.supabase
      .from('workflows')
      .insert({
        name: input.name,
        description: input.description ?? null,
        organization_id: input.organization_id,
        status: input.status ?? 'draft',
        version: 1,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workflow:', error)
      throw new Error('Failed to create workflow')
    }

    return data
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    workflowId: string,
    input: UpdateWorkflowInput,
    userId: string
  ): Promise<Workflow> {
    const { data, error } = await this.supabase
      .from('workflows')
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        updated_by: userId,
      })
      .eq('id', workflowId)
      .select()
      .single()

    if (error) {
      console.error('Error updating workflow:', error)
      throw new Error('Failed to update workflow')
    }

    return data
  }

  /**
   * Delete a workflow (and cascade delete nodes and edges)
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    const { error } = await this.supabase.from('workflows').delete().eq('id', workflowId)

    if (error) {
      console.error('Error deleting workflow:', error)
      throw new Error('Failed to delete workflow')
    }
  }

  /**
   * Publish a workflow (change status to published and increment version)
   */
  async publishWorkflow(workflowId: string, userId: string): Promise<Workflow> {
    // Get current workflow to increment version
    const workflow = await this.getWorkflowById(workflowId)
    if (!workflow) {
      throw new Error('Workflow not found')
    }

    const { data, error } = await this.supabase
      .from('workflows')
      .update({
        status: 'published' as const,
        version: workflow.version + 1,
        updated_by: userId,
      })
      .eq('id', workflowId)
      .select()
      .single()

    if (error) {
      console.error('Error publishing workflow:', error)
      throw new Error('Failed to publish workflow')
    }

    return data
  }

  /**
   * Archive a workflow
   */
  async archiveWorkflow(workflowId: string, userId: string): Promise<Workflow> {
    const { data, error } = await this.supabase
      .from('workflows')
      .update({
        status: 'archived' as const,
        updated_by: userId,
      })
      .eq('id', workflowId)
      .select()
      .single()

    if (error) {
      console.error('Error archiving workflow:', error)
      throw new Error('Failed to archive workflow')
    }

    return data
  }

  // ========== NODE OPERATIONS ==========

  /**
   * Get all nodes for a workflow
   */
  async getWorkflowNodes(workflowId: string): Promise<WorkflowNode[]> {
    const { data, error } = await this.supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching workflow nodes:', error)
      throw new Error('Failed to fetch workflow nodes')
    }

    return (data || []).map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position_x, y: node.position_y },
      data: node.data ?? {},
      width: node.width ?? undefined,
      height: node.height ?? undefined,
    }))
  }

  /**
   * Create a new node
   */
  async createNode(input: CreateNodeInput): Promise<WorkflowNode> {
    const { data, error } = await this.supabase
      .from('workflow_nodes')
      .insert({
        workflow_id: input.workflow_id,
        type: input.type,
        position_x: input.position_x,
        position_y: input.position_y,
        data: input.data,
        width: input.width ?? null,
        height: input.height ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating node:', error)
      throw new Error('Failed to create node')
    }

    return {
      id: data.id,
      type: data.type,
      position: { x: data.position_x, y: data.position_y },
      data: data.data ?? {},
      width: data.width ?? undefined,
      height: data.height ?? undefined,
    }
  }

  /**
   * Update a node
   */
  async updateNode(nodeId: string, input: UpdateNodeInput): Promise<WorkflowNode> {
    const { data, error } = await this.supabase
      .from('workflow_nodes')
      .update({
        ...(input.type !== undefined && { type: input.type }),
        ...(input.position_x !== undefined && { position_x: input.position_x }),
        ...(input.position_y !== undefined && { position_y: input.position_y }),
        ...(input.data !== undefined && { data: input.data }),
        ...(input.width !== undefined && { width: input.width }),
        ...(input.height !== undefined && { height: input.height }),
      })
      .eq('id', nodeId)
      .select()
      .single()

    if (error) {
      console.error('Error updating node:', error)
      throw new Error('Failed to update node')
    }

    return {
      id: data.id,
      type: data.type,
      position: { x: data.position_x, y: data.position_y },
      data: data.data ?? {},
      width: data.width ?? undefined,
      height: data.height ?? undefined,
    }
  }

  /**
   * Delete a node
   */
  async deleteNode(nodeId: string): Promise<void> {
    const { error } = await this.supabase.from('workflow_nodes').delete().eq('id', nodeId)

    if (error) {
      console.error('Error deleting node:', error)
      throw new Error('Failed to delete node')
    }
  }

  /**
   * Batch update node positions
   */
  async updateNodePositions(
    updates: Array<{ id: string; position_x: number; position_y: number }>
  ): Promise<void> {
    // Supabase doesn't support batch updates natively, so we'll use multiple updates
    // In production, consider using an RPC function for better performance
    const promises = updates.map((update) =>
      this.supabase
        .from('workflow_nodes')
        .update({
          position_x: update.position_x,
          position_y: update.position_y,
        })
        .eq('id', update.id)
    )

    const results = await Promise.all(promises)
    const errors = results.filter((result) => result.error)

    if (errors.length > 0) {
      console.error('Error updating node positions:', errors)
      throw new Error('Failed to update node positions')
    }
  }

  // ========== EDGE OPERATIONS ==========

  /**
   * Get all edges for a workflow
   */
  async getWorkflowEdges(workflowId: string): Promise<WorkflowEdge[]> {
    const { data, error } = await this.supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching workflow edges:', error)
      throw new Error('Failed to fetch workflow edges')
    }

    return (data || []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.source_handle ?? undefined,
      targetHandle: edge.target_handle ?? undefined,
      type: edge.type ?? undefined,
      data: edge.data ?? undefined,
    }))
  }

  /**
   * Create a new edge
   */
  async createEdge(input: CreateEdgeInput): Promise<WorkflowEdge> {
    console.log('Creating edge with input:', input)
    
    const { data, error } = await this.supabase
      .from('workflow_edges')
      .insert({
        workflow_id: input.workflow_id,
        source: input.source_node_id,
        target: input.target_node_id,
        source_handle: input.source_handle ?? null,
        target_handle: input.target_handle ?? null,
        type: input.type ?? null,
        data: input.data ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating edge:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`Failed to create edge: ${error.message}`)
    }

    return {
      id: data.id,
      source: data.source,
      target: data.target,
      sourceHandle: data.source_handle ?? undefined,
      targetHandle: data.target_handle ?? undefined,
      type: data.type ?? undefined,
      data: data.data ?? undefined,
    }
  }

  /**
   * Update an edge
   */
  async updateEdge(edgeId: string, input: UpdateEdgeInput): Promise<WorkflowEdge> {
    const { data, error } = await this.supabase
      .from('workflow_edges')
      .update({
        ...(input.type !== undefined && { type: input.type }),
        ...(input.data !== undefined && { data: input.data }),
      })
      .eq('id', edgeId)
      .select()
      .single()

    if (error) {
      console.error('Error updating edge:', error)
      throw new Error('Failed to update edge')
    }

    return {
      id: data.id,
      source: data.source,
      target: data.target,
      sourceHandle: data.source_handle ?? undefined,
      targetHandle: data.target_handle ?? undefined,
      type: data.type ?? undefined,
      data: data.data ?? undefined,
    }
  }

  /**
   * Delete an edge
   */
  async deleteEdge(edgeId: string): Promise<void> {
    const { error } = await this.supabase.from('workflow_edges').delete().eq('id', edgeId)

    if (error) {
      console.error('Error deleting edge:', error)
      throw new Error('Failed to delete edge')
    }
  }

  /**
   * Validate workflow before publishing
   */
  async validateWorkflow(workflowId: string): Promise<{ valid: boolean; errors: string[] }> {
    const workflowWithElements = await this.getWorkflowWithElements(workflowId)
    if (!workflowWithElements) {
      return { valid: false, errors: ['Workflow not found'] }
    }

    const errors: string[] = []

    // Check if workflow has at least one node
    if (workflowWithElements.nodes.length === 0) {
      errors.push('Workflow must have at least one node')
    }

    // Check for orphaned nodes (nodes with no connections)
    const connectedNodeIds = new Set<string>()
    workflowWithElements.edges.forEach((edge) => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    const orphanedNodes = workflowWithElements.nodes.filter(
      (node) => !connectedNodeIds.has(node.id)
    )
    if (orphanedNodes.length > 0 && workflowWithElements.nodes.length > 1) {
      errors.push(`Found ${orphanedNodes.length} disconnected node(s)`)
    }

    // Check for invalid edges (edges pointing to non-existent nodes)
    const nodeIds = new Set(workflowWithElements.nodes.map((node) => node.id))
    const invalidEdges = workflowWithElements.edges.filter(
      (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
    )
    if (invalidEdges.length > 0) {
      errors.push(`Found ${invalidEdges.length} edge(s) with invalid node references`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Duplicate a workflow
   */
  async duplicateWorkflow(
    workflowId: string,
    newName: string,
    userId: string
  ): Promise<WorkflowWithElements> {
    const original = await this.getWorkflowWithElements(workflowId)
    if (!original) {
      throw new Error('Workflow not found')
    }

    // Create new workflow
    const newWorkflow = await this.createWorkflow(
      {
        name: newName,
        description: original.description ?? undefined,
        organization_id: original.organization_id,
        status: 'draft',
      },
      userId
    )

    // Create node ID mapping (old ID -> new ID)
    const nodeIdMap = new Map<string, string>()

    // Duplicate nodes
    const nodePromises = original.nodes.map(async (node) => {
      const newNode = await this.createNode({
        workflow_id: newWorkflow.id,
        type: node.type || 'default',
        position_x: node.position.x,
        position_y: node.position.y,
        data: node.data,
        width: node.width,
        height: node.height,
      })
      nodeIdMap.set(node.id, newNode.id)
      return newNode
    })

    const newNodes = await Promise.all(nodePromises)

    // Duplicate edges with updated node IDs
    const edgePromises = original.edges.map(async (edge) => {
      const newSourceId = nodeIdMap.get(edge.source)
      const newTargetId = nodeIdMap.get(edge.target)

      if (!newSourceId || !newTargetId) {
        console.error('Failed to map edge node IDs:', edge)
        return null
      }

      return this.createEdge({
        workflow_id: newWorkflow.id,
        source_node_id: newSourceId,
        target_node_id: newTargetId,
        source_handle: edge.sourceHandle,
        target_handle: edge.targetHandle,
        type: edge.type,
        data: edge.data,
      })
    })

    const newEdges = (await Promise.all(edgePromises)).filter(
      (edge): edge is WorkflowEdge => edge !== null
    )

    return {
      ...newWorkflow,
      nodes: newNodes,
      edges: newEdges,
    }
  }
}
