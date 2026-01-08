'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { WorkflowService } from '@/services/workflow-service'
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  saveWorkflowCanvasSchema,
  createNodeSchema,
  updateNodeSchema,
  deleteNodeSchema,
  createEdgeSchema,
  deleteEdgeSchema
} from './validations'
import type { WorkflowTable, WorkflowNodeTable, WorkflowEdgeTable } from '@/types/database'
import type { WorkflowDetail, WorkflowCanvasNode, WorkflowCanvasEdge } from '@/types/workflow'

// =====================================================
// CACHE FUNCTIONS FOR SERVER COMPONENTS
// =====================================================

/**
 * Cache the workflow fetch to deduplicate across Server Components
 */
export const getWorkflow = cache(async (workflowId: string): Promise<WorkflowDetail> => {
  const supabase = await createClient()
  const workflowService = new WorkflowService(supabase)

  const result = await workflowService.getById(workflowId)

  if (!result.success || !result.workflow) {
    throw new Error(result.error || 'Workflow not found')
  }

  return result.workflow
})

/**
 * Cache the workflows list fetch to deduplicate across Server Components
 */
export const getWorkflows = cache(async (organizationId: string): Promise<WorkflowTable[]> => {
  const supabase = await createClient()
  const workflowService = new WorkflowService(supabase)

  const result = await workflowService.getByOrganization(organizationId)

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch workflows')
  }

  return result.workflows || []
})

// =====================================================
// WORKFLOW MUTATION ACTIONS
// =====================================================

/**
 * Create a new workflow
 */
export async function createWorkflow(
  name: string,
  description: string | null | undefined,
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  workflow?: WorkflowTable
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = createWorkflowSchema.safeParse({
      name,
      description,
      organizationId,
    })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Create workflow using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.create(
      {
        organization_id: validation.data.organizationId,
        name: validation.data.name,
        description: validation.data.description || undefined,
        status: 'draft',
      },
      user.id
    )

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate the path to refresh data
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows`)

    return { success: true, workflow: result.workflow }
  } catch (error) {
    console.error('Unexpected error creating workflow:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Update workflow metadata (name, description, status)
 */
export async function updateWorkflow(
  workflowId: string,
  name: string | undefined,
  description: string | null | undefined,
  status: 'draft' | 'published' | 'archived' | undefined,
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  workflow?: WorkflowTable
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = updateWorkflowSchema.safeParse({
      name,
      description,
      status,
    })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Update workflow using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.update(
      workflowId,
      {
        name: validation.data.name,
        description: validation.data.description || undefined,
        status: validation.data.status,
      },
      user.id
    )

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows`)
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflowId}`)

    return { success: true, workflow: result.workflow }
  } catch (error) {
    console.error('Unexpected error updating workflow:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Save workflow canvas (nodes and edges) transactionally
 */
export async function saveWorkflowCanvas(
  workflowId: string,
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = saveWorkflowCanvasSchema.safeParse({
      workflowId,
      nodes,
      edges,
    })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Save workflow canvas using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.saveWorkflow(
      validation.data.workflowId,
      validation.data.nodes,
      validation.data.edges,
      user.id
    )

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows`)
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflowId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error saving workflow canvas:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Create workflow with nodes and edges in one operation
 */
export async function saveWorkflow(input: {
  organizationId: string
  workspaceId: string
  name: string
  description?: string
  nodes: WorkflowCanvasNode[]
  edges: WorkflowCanvasEdge[]
}): Promise<{
  success: boolean
  workflowId?: string
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = createWorkflowSchema.safeParse({
      name: input.name,
      description: input.description,
      organizationId: input.organizationId,
    })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    const workflowService = new WorkflowService(supabase)

    // Create workflow
    const createResult = await workflowService.create(
      {
        organization_id: validation.data.organizationId,
        name: validation.data.name,
        description: validation.data.description || undefined,
        status: 'draft',
      },
      user.id
    )

    if (!createResult.success || !createResult.workflow) {
      return { success: false, error: createResult.error }
    }

    const workflowId = createResult.workflow.id

    // Save nodes and edges if provided
    if (input.nodes.length > 0 || input.edges.length > 0) {
      const saveResult = await workflowService.saveWorkflow(
        workflowId,
        input.nodes,
        input.edges,
        user.id
      )

      if (!saveResult.success) {
        return { success: false, error: saveResult.error }
      }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${input.organizationId}/workspaces/${input.workspaceId}/workflows`)

    return { success: true, workflowId }
  } catch (error) {
    console.error('Unexpected error saving workflow:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Update workflow with nodes and edges in one operation
 */
export async function updateWorkflowWithCanvas(
  workflowId: string,
  input: {
    name: string
    description?: string
    nodes: WorkflowCanvasNode[]
    edges: WorkflowCanvasEdge[]
  },
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const workflowService = new WorkflowService(supabase)

    // Update workflow metadata
    const updateResult = await workflowService.update(
      workflowId,
      {
        name: input.name,
        description: input.description,
      },
      user.id
    )

    if (!updateResult.success) {
      return { success: false, error: updateResult.error }
    }

    // Save nodes and edges
    const saveResult = await workflowService.saveWorkflow(
      workflowId,
      input.nodes,
      input.edges,
      user.id
    )

    if (!saveResult.success) {
      return { success: false, error: saveResult.error }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows`)
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflowId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating workflow:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(
  workflowId: string,
  organizationId: string,
  workspaceId: string
): Promise<void> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Delete workflow using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.delete(workflowId)

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete workflow')
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows`)
  } catch (error) {
    console.error('Unexpected error deleting workflow:', error)
    throw error
  }

  // Redirect after successful deletion
  redirect(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows`)
}

// =====================================================
// INDIVIDUAL NODE OPERATIONS
// =====================================================

/**
 * Create a single workflow node
 */
export async function createNode(
  workflowId: string,
  nodeId: string,
  type: string,
  position_x: number,
  position_y: number,
  data: Record<string, unknown>,
  width: number | undefined,
  height: number | undefined,
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  node?: WorkflowNodeTable
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = createNodeSchema.safeParse({
      workflowId,
      id: nodeId,
      type,
      position_x,
      position_y,
      data,
      width,
      height,
    })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Create node using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.createNode(validation.data.workflowId, {
      id: validation.data.id,
      type: validation.data.type,
      position_x: validation.data.position_x,
      position_y: validation.data.position_y,
      data: validation.data.data,
      width: validation.data.width,
      height: validation.data.height,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflowId}`)

    return { success: true, node: result.node }
  } catch (error) {
    console.error('Unexpected error creating node:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Update a single workflow node
 */
export async function updateNode(
  nodeId: string,
  workflowId: string,
  type: string | undefined,
  position_x: number | undefined,
  position_y: number | undefined,
  data: Record<string, unknown> | undefined,
  width: number | null | undefined,
  height: number | null | undefined,
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  node?: WorkflowNodeTable
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = updateNodeSchema.safeParse({
      nodeId,
      type,
      position_x,
      position_y,
      data,
      width,
      height,
    })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Update node using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.updateNode(validation.data.nodeId, {
      type: validation.data.type,
      position_x: validation.data.position_x,
      position_y: validation.data.position_y,
      data: validation.data.data,
      width: validation.data.width,
      height: validation.data.height,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflowId}`)

    return { success: true, node: result.node }
  } catch (error) {
    console.error('Unexpected error updating node:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Delete a single workflow node
 */
export async function deleteNode(
  nodeId: string,
  workflowId: string,
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = deleteNodeSchema.safeParse({ nodeId })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Delete node using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.deleteNode(validation.data.nodeId)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflowId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting node:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

// =====================================================
// INDIVIDUAL EDGE OPERATIONS
// =====================================================

/**
 * Create a single workflow edge
 */
export async function createEdge(
  workflowId: string,
  edgeId: string,
  source: string,
  target: string,
  source_handle: string | null | undefined,
  target_handle: string | null | undefined,
  type: string | null | undefined,
  data: Record<string, unknown> | null | undefined,
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  edge?: WorkflowEdgeTable
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = createEdgeSchema.safeParse({
      workflowId,
      id: edgeId,
      source,
      target,
      source_handle,
      target_handle,
      type,
      data,
    })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Create edge using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.createEdge(validation.data.workflowId, {
      id: validation.data.id,
      source: validation.data.source,
      target: validation.data.target,
      source_handle: validation.data.source_handle,
      target_handle: validation.data.target_handle,
      type: validation.data.type,
      data: validation.data.data,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflowId}`)

    return { success: true, edge: result.edge }
  } catch (error) {
    console.error('Unexpected error creating edge:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Delete a single workflow edge
 */
export async function deleteEdge(
  edgeId: string,
  workflowId: string,
  organizationId: string,
  workspaceId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validation = deleteEdgeSchema.safeParse({ edgeId })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Delete edge using service
    const workflowService = new WorkflowService(supabase)
    const result = await workflowService.deleteEdge(validation.data.edgeId)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Revalidate paths
    revalidatePath(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflowId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting edge:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

// =====================================================
// ACTION REGISTRY ACCESS
// =====================================================

/**
 * Get available actions from the action registry
 * Returns action metadata for UI display
 */
export async function getAvailableActions(): Promise<{
  success: boolean
  actions?: import('@/types/actions').ActionMetadata[]
  error?: string
}> {
  try {
    // Dynamically import the action metadata
    const { actionMetadata } = await import('@/actions')

    // Convert Record to Array
    const actions = Object.values(actionMetadata)

    return {
      success: true,
      actions,
    }
  } catch (error) {
    console.error('Error loading available actions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load actions',
    }
  }
}
