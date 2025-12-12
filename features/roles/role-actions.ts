'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { RoleService } from '@/services/role-service'
import type { CreateRoleInput, UpdateRoleInput, Role } from '@/types/roles'

// =====================================================
// RLS ERROR HANDLER
// =====================================================

/**
 * Utility to convert PostgreSQL RLS policy violations into user-friendly error messages
 */
function handleRLSError(error: any): string {
  if (!error) return 'An unexpected error occurred'

  const errorMessage = error.message || ''
  const errorCode = error.code || ''

  // RLS policy violation
  if (errorCode === '42501' || errorMessage.includes('policy')) {
    return 'You do not have permission to perform this action'
  }

  // Foreign key violation
  if (errorCode === '23503') {
    return 'This operation would violate data relationships'
  }

  // Unique constraint violation
  if (errorCode === '23505') {
    return 'This record already exists'
  }

  // Not null violation
  if (errorCode === '23502') {
    return 'Required field is missing'
  }

  // Check constraint violation
  if (errorCode === '23514') {
    return 'Data validation failed'
  }

  // Generic fallback
  return error.message || 'An unexpected error occurred'
}

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
      revalidatePath(`/organization/${data.org_id}`)
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

    // Get role org_id for path revalidation
    const { data: role } = await supabase
      .from('roles')
      .select('org_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    // Update role - RLS handles authorization
    const roleService = new RoleService(supabase)
    const result = await roleService.updateRole(id, data)

    if (result.success && role?.org_id) {
      revalidatePath('/settings')
      revalidatePath(`/organization/${role.org_id}`)
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

    // Get role org_id for path revalidation
    const { data: role } = await supabase
      .from('roles')
      .select('org_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    // Check if role is in use (business logic constraint, not authorization)
    const { data: permissionsCheck, error: checkError } = await supabase
      .from('permissions')
      .select('id')
      .eq('role_id', id)
      .is('deleted_at', null)
      .limit(1)

    if (checkError) {
      return { success: false, error: handleRLSError(checkError) }
    }

    if (permissionsCheck && permissionsCheck.length > 0) {
      return { success: false, error: 'Cannot delete role that is currently assigned to users' }
    }

    // Delete role - RLS handles authorization
    const roleService = new RoleService(supabase)
    const result = await roleService.deleteRole(id)

    if (result.success && role?.org_id) {
      revalidatePath('/settings')
      revalidatePath(`/organization/${role.org_id}`)
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
 * @returns Success result with roles array or error
 */
export async function getAllRoles(): Promise<{
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

    // Fetch all active roles (system-wide and org-specific)
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching roles:', error)
      return { success: false, error: 'Failed to fetch roles' }
    }

    return { success: true, roles: data || [] }
  } catch (error) {
    console.error('Unexpected error fetching roles:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
