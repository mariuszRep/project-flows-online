'use server'

import { createClient } from '@/lib/supabase/server'
import { OrganizationService } from '@/services/organization-service'
import { createOrganizationSchema, updateOrganizationSchema } from './validations'
import type { Organization } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { getFirstWorkspaceForOrg } from '@/features/workspaces/workspace-actions'

export async function createOrganization(name: string): Promise<{
  success: boolean
  organization?: Pick<Organization, 'id' | 'name' | 'created_at'>
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
    const validation = createOrganizationSchema.safeParse({ name })
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Create organization using service
    const organizationService = new OrganizationService(supabase)
    const organization = await organizationService.createOrganization(validation.data)

    // Revalidate settings pages
    revalidatePath('/settings')
    revalidatePath(`/organization/${organization.id}`)

    return { success: true, organization }
  } catch (error) {
    console.error('Unexpected error creating organization:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

export async function getUserOrganizations(): Promise<{
  success: boolean
  organizations?: Organization[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Fetch organizations using service
    const organizationService = new OrganizationService(supabase)
    const organizations = await organizationService.getUserOrganizations()

    return { success: true, organizations }
  } catch (error) {
    console.error('Unexpected error fetching organizations:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

export async function updateOrganization(organizationId: string, name: string): Promise<{
  success: boolean
  organization?: Organization
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
    const validation = updateOrganizationSchema.safeParse({ name })
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    // Update organization using service
    const organizationService = new OrganizationService(supabase)
    const organization = await organizationService.updateOrganization(
      organizationId,
      validation.data,
      user.id
    )

    // Revalidate settings pages
    revalidatePath('/settings')
    revalidatePath(`/organization/${organizationId}`)

    return { success: true, organization }
  } catch (error) {
    console.error('Unexpected error updating organization:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

export async function deleteOrganization(organizationId: string): Promise<{
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

    // Delete organization using service
    const organizationService = new OrganizationService(supabase)
    await organizationService.deleteOrganization(organizationId)

    // Revalidate settings pages
    revalidatePath('/settings')
    revalidatePath(`/organization/${organizationId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting organization:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

export async function getOrganizationDefaultWorkspace(organizationId: string): Promise<{
  success: boolean
  workspaceId?: string
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const workspaceId = await getFirstWorkspaceForOrg(organizationId)

    return { success: true, workspaceId }
  } catch (error) {
    console.error('Unexpected error getting workspace:', error)
    return { success: false, error: 'No workspace found for this organization' }
  }
}
