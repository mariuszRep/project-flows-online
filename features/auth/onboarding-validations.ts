import { z } from 'zod'

/**
 * Validation schema for creating an organization during onboarding
 */
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters')
    .trim(),
  userId: z.string().uuid('Invalid user ID'),
})

/**
 * Validation schema for creating a workspace during onboarding
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be less than 100 characters')
    .trim(),
  orgId: z.string().uuid('Invalid organization ID'),
  userId: z.string().uuid('Invalid user ID'),
})

export type CreateOrganizationParams = z.infer<typeof createOrganizationSchema>
export type CreateWorkspaceParams = z.infer<typeof createWorkspaceSchema>
