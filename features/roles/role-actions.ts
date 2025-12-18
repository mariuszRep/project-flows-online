'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { RoleService } from '@/services/role-service'
import { handleRLSError } from '@/lib/errors'
import type { CreateRoleInput, UpdateRoleInput, Role } from '@/types/roles'

// =====================================================
// ROLE MANAGEMENT ACTIONS
// =====================================================

/**
 * Create a new role
 * @param data - Role creation input
 * @returns Success result with created role or error
 */
export async function createRole(data: CreateRoleInput): Promise<{
  success: boolean
  role?: Role
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create role - RLS handles authorization
    const roleService = new RoleService(supabase)
    const result = await roleService.createRole(data)

    if (result.success) {
      revalidatePath('/settings')
      revalidatePath(`/organizations/${data.org_id}`)
      return result
    }

    return { success: false, error: handleRLSError(result.error) }
  } catch (error) {
    console.error('Unexpected error creating role:', error)
    return { success: false, error: handleRLSError(error) }
  }
}

/**
 * Update an existing role
 * @param id - Role ID
 * @param data - Role update input
 * @returns Success result with updated role or error
 */
export async function updateRole(id: string, data: UpdateRoleInput): Promise<{
  success: boolean
  role?: Role
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Update role - RLS handles authorization
    const roleService = new RoleService(supabase)
    const existingRole = await roleService.getRoleById(id)

    if (!existingRole.success) {
      return { success: false, error: handleRLSError(existingRole.error) }
    }

    if (!existingRole.role) {
      return { success: false, error: 'Role not found' }
    }

    const result = await roleService.updateRole(id, data)

    if (result.success && existingRole.role.org_id) {
      revalidatePath('/settings')
      revalidatePath(`/organizations/${existingRole.role.org_id}`)
      return result
    }

    if (!result.success) {
      return { success: false, error: handleRLSError(result.error) }
    }

    return result
  } catch (error) {
    console.error('Unexpected error updating role:', error)
    return { success: false, error: handleRLSError(error) }
  }
}

/**
 * Delete a role (soft delete)
 * @param id - Role ID
 * @returns Success result or error
 */
export async function deleteRole(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Delete role - RLS handles authorization
    const roleService = new RoleService(supabase)
    const existingRole = await roleService.getRoleById(id)

    if (!existingRole.success) {
      return { success: false, error: handleRLSError(existingRole.error) }
    }

    if (!existingRole.role) {
      return { success: false, error: 'Role not found' }
    }

    const inUseResult = await roleService.isRoleInUse(id)

    if (!inUseResult.success) {
      return { success: false, error: handleRLSError(inUseResult.error) }
    }

    if (inUseResult.inUse) {
      return { success: false, error: 'Cannot delete role that is currently assigned to users' }
    }

    const result = await roleService.deleteRole(id)

    if (result.success && result.orgId) {
      revalidatePath('/settings')
      revalidatePath(`/organizations/${result.orgId}`)
      return result
    }

    if (!result.success) {
      return { success: false, error: handleRLSError(result.error) }
    }

    return result
  } catch (error) {
    return { success: false, error: handleRLSError(error) }
  }
}

/**
 * Get all roles (system-wide and org-specific)
 * @param orgId - Optional organization ID to filter roles
 * @returns Success result with roles array or error
 */
export async function getAllRoles(orgId?: string): Promise<{
  success: boolean
  roles?: Role[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Use role service to fetch roles
    const roleService = new RoleService(supabase)
    const result = await roleService.getRoles(orgId)

    if (!result.success) {
      return { success: false, error: 'Failed to fetch roles' }
    }

    return { success: true, roles: result.roles }
  } catch (error) {
    console.error('Unexpected error fetching roles:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
