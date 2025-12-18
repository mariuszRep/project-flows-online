import { z } from 'zod'

// Shared schemas
export const workflowIdSchema = z.string().uuid('Invalid workflow ID')
export const nodeIdSchema = z.string().uuid('Invalid node ID')
export const edgeIdSchema = z.string().uuid('Invalid edge ID')
export const organizationIdSchema = z.string().uuid('Invalid organization ID')

// Workflow schemas
export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  organization_id: organizationIdSchema,
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

export const updateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

// Node schemas
export const createNodeSchema = z.object({
  workflow_id: workflowIdSchema,
  type: z.string().min(1, 'Type is required'),
  position_x: z.number(),
  position_y: z.number(),
  data: z.record(z.string(), z.any()),
  width: z.number().optional(),
  height: z.number().optional(),
})

export const updateNodeSchema = z.object({
  type: z.string().min(1, 'Type is required').optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  data: z.record(z.string(), z.any()).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

export const updateNodePositionSchema = z.object({
  id: nodeIdSchema,
  position_x: z.number(),
  position_y: z.number(),
})

export const updateNodePositionsSchema = z.array(updateNodePositionSchema)

// Edge schemas
export const createEdgeSchema = z.object({
  workflow_id: workflowIdSchema,
  source_node_id: nodeIdSchema,
  target_node_id: nodeIdSchema,
  type: z.string().optional(),
  label: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
})

export const updateEdgeSchema = z.object({
  type: z.string().optional(),
  label: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
})

export const duplicateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
})

// Inferred types
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>
export type CreateNodeInput = z.infer<typeof createNodeSchema>
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>
export type UpdateNodePositionsInput = z.infer<typeof updateNodePositionsSchema>
export type CreateEdgeInput = z.infer<typeof createEdgeSchema>
export type UpdateEdgeInput = z.infer<typeof updateEdgeSchema>
export type DuplicateWorkflowInput = z.infer<typeof duplicateWorkflowSchema>
