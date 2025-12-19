import { z } from 'zod'

/**
 * Validation schema for workflow name
 */
export const workflowNameSchema = z
  .string()
  .trim()
  .min(1, 'Workflow name is required')
  .max(100, 'Workflow name is too long')

/**
 * Validation schema for workflow description
 */
export const workflowDescriptionSchema = z
  .string()
  .max(500, 'Workflow description is too long')
  .optional()
  .nullable()

/**
 * Validation schema for workflow status
 */
export const workflowStatusSchema = z.enum(['draft', 'published', 'archived'])

/**
 * Validation schema for creating a workflow
 */
export const createWorkflowSchema = z.object({
  name: workflowNameSchema,
  description: workflowDescriptionSchema,
  organizationId: z.string().uuid('Invalid organization ID'),
})

/**
 * Validation schema for updating a workflow
 */
export const updateWorkflowSchema = z.object({
  name: workflowNameSchema.optional(),
  description: workflowDescriptionSchema,
  status: workflowStatusSchema.optional(),
})

/**
 * Validation schema for saving workflow canvas (nodes and edges)
 */
export const saveWorkflowCanvasSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  nodes: z.array(z.any()), // XYFlow Node type
  edges: z.array(z.any()), // XYFlow Edge type
})

/**
 * Validation schema for creating a single workflow node
 */
export const createNodeSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  id: z.string().min(1, 'Node ID is required'),
  type: z.string().min(1, 'Node type is required'),
  position_x: z.number(),
  position_y: z.number(),
  data: z.record(z.string(), z.any()),
  width: z.number().optional(),
  height: z.number().optional(),
})

/**
 * Validation schema for updating a single workflow node
 */
export const updateNodeSchema = z.object({
  nodeId: z.string().min(1, 'Node ID is required'),
  type: z.string().min(1, 'Node type is required').optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  data: z.record(z.string(), z.any()).optional(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
})

/**
 * Validation schema for deleting a single workflow node
 */
export const deleteNodeSchema = z.object({
  nodeId: z.string().min(1, 'Node ID is required'),
})

/**
 * Validation schema for creating a single workflow edge
 */
export const createEdgeSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  id: z.string().min(1, 'Edge ID is required'),
  source: z.string().min(1, 'Source node is required'),
  target: z.string().min(1, 'Target node is required'),
  source_handle: z.string().optional().nullable(),
  target_handle: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  data: z.record(z.string(), z.any()).optional().nullable(),
})

/**
 * Validation schema for deleting a single workflow edge
 */
export const deleteEdgeSchema = z.object({
  edgeId: z.string().min(1, 'Edge ID is required'),
})

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>
export type SaveWorkflowCanvasInput = z.infer<typeof saveWorkflowCanvasSchema>
export type CreateNodeInput = z.infer<typeof createNodeSchema>
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>
export type DeleteNodeInput = z.infer<typeof deleteNodeSchema>
export type CreateEdgeInput = z.infer<typeof createEdgeSchema>
export type DeleteEdgeInput = z.infer<typeof deleteEdgeSchema>
