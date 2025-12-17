import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  ObjectType,
  UsersPermissionsView,
  PrincipalType,
  PermissionAction,
  Permission,
  Role,
} from '@/types/database'
import type {
  AssignRoleParams,
  CheckPermissionParams,
  PermissionWithDetails,
} from '@/types/permissions'

/**
 * Shared service for permission queries
 * Encapsulates logic for querying permissions and the users_permissions materialized view
 */
export class PermissionsService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Get users with permissions for a specific organization
   */
  async getOrganizationMembers(orgId: string): Promise<UsersPermissionsView[]> {
    const { data, error } = await this.supabase
      .from('users_permissions')
      .select('*')
      .eq('org_id', orgId)
      .eq('object_type', 'organization')

    if (error) {
      throw new Error(`Failed to fetch organization members: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get users with permissions for a specific workspace
   */
  async getWorkspaceMembers(workspaceId: string): Promise<UsersPermissionsView[]> {
    const { data, error } = await this.supabase
      .from('users_permissions')
      .select('*')
      .eq('object_id', workspaceId)
      .eq('object_type', 'workspace')
      .order('user_id', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch workspace members: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get all objects of a specific type that a user has access to
   */
  async getUserObjects(objectType: ObjectType): Promise<UsersPermissionsView[]> {
    const { data, error } = await this.supabase
      .from('users_permissions')
      .select('*')
      .eq('object_type', objectType)

    if (error) {
      throw new Error(`Failed to fetch user ${objectType}s: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get all organizations a user belongs to
   */
  async getUserOrganizations(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('users_permissions')
      .select('object_id')
      .eq('object_type', 'organization')

    if (error) {
      throw new Error(`Failed to fetch user organizations: ${error.message}`)
    }

    return data?.map(d => d.object_id!).filter(Boolean) || []
  }

  /**
   * Check if a user has a specific role on an object
   */
  async hasRole(
    objectType: ObjectType,
    objectId: string,
    roleName: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('users_permissions')
      .select('role_name')
      .eq('object_type', objectType)
      .eq('object_id', objectId)
      .eq('role_name', roleName)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to check user role: ${error.message}`)
    }

    return !!data
  }

  /**
   * Get user's role permissions for a specific object
   */
  async getUserRolePermissions(
    objectType: ObjectType,
    objectId: string
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('users_permissions')
      .select('role_permissions')
      .eq('object_type', objectType)
      .eq('object_id', objectId)

    if (error) {
      throw new Error(`Failed to fetch user role permissions: ${error.message}`)
    }

    // Combine all permissions from all roles the user has on this object
    const allPermissions = data
      ?.flatMap(d => d.role_permissions as string[] || [])
      || []

    // Return unique permissions
    return Array.from(new Set(allPermissions))
  }

  /**
   * Check if a user has access to an organization
   * Used for layout-level access validation
   */
  async checkOrgAccess(userId: string, orgId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('id')
      .eq('principal_id', userId)
      .eq('org_id', orgId)
      .eq('object_type', 'organization')
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to check organization access: ${error.message}`)
    }

    return !!data
  }

  /**
   * Check if a permission already exists
   * @param params - Permission parameters to check
   * @returns Success result with permission if found or null
   */
  async checkDuplicatePermission(params: AssignRoleParams): Promise<{
    success: boolean
    permission?: Permission | null
    error?: string
  }> {
    try {
      let query = this.supabase
        .from('permissions')
        .select('id')
        .eq('org_id', params.org_id)
        .eq('principal_type', params.principal_type)
        .eq('principal_id', params.principal_id)
        .eq('role_id', params.role_id)
        .eq('object_type', params.object_type)
        .is('deleted_at', null)

      // Use .is() for null values, .eq() for non-null values
      if (params.object_id === null) {
        query = query.is('object_id', null)
      } else {
        query = query.eq('object_id', params.object_id)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        console.error('Error checking duplicate permission:', error)
        return { success: false, error: error.message }
      }

      return { success: true, permission: data as Permission | null }
    } catch (error) {
      console.error('Error checking duplicate permission:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a new permission
   * @param params - Permission creation parameters
   * @param userId - ID of the user creating the permission
   * @returns Success result with created permission or error
   */
  async createPermission(
    params: AssignRoleParams,
    userId: string
  ): Promise<{
    success: boolean
    permission?: Permission
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('permissions')
        .insert({
          org_id: params.org_id,
          principal_type: params.principal_type,
          principal_id: params.principal_id,
          role_id: params.role_id,
          object_type: params.object_type,
          object_id: params.object_id,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating permission:', error)
        return { success: false, error: error.message }
      }

      return { success: true, permission: data as Permission }
    } catch (error) {
      console.error('Error creating permission:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Soft delete a permission by setting deleted_at timestamp
   * @param permissionId - Permission ID to delete
   * @param userId - ID of the user performing the deletion
   * @returns Success result or error
   */
  async softDeletePermission(
    permissionId: string,
    userId: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await this.supabase
        .from('permissions')
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', permissionId)
        .is('deleted_at', null)

      if (error) {
        console.error('Error soft deleting permission:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error soft deleting permission:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get permissions for a specific object with role and user details
   * @param objectType - Type of object
   * @param objectId - ID of the object
   * @returns Success result with permissions array or error
   */
  async getPermissionsWithDetails(
    objectType: ObjectType,
    objectId: string
  ): Promise<{
    success: boolean
    permissions?: PermissionWithDetails[]
    error?: string
  }> {
    try {
      // Fetch permissions with role details
      const { data, error } = await this.supabase
        .from('permissions')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('object_type', objectType)
        .eq('object_id', objectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching permissions:', error)
        return { success: false, error: error.message }
      }

      // Fetch user details for user principals
      const userIds =
        data?.filter(p => p.principal_type === 'user').map(p => p.principal_id).filter(Boolean) || []

      let userDetails: { [key: string]: { email: string; name?: string } } = {}

      if (userIds.length > 0) {
        const { data: users } = await this.supabase
          .from('users')
          .select('id, email, raw_user_meta_data')
          .in('id', userIds as string[])

        if (users) {
          userDetails = users.reduce(
            (acc, u) => {
              if (u.id) {
                const metadata = u.raw_user_meta_data as any
                acc[u.id] = {
                  email: u.email,
                  name: metadata?.name || metadata?.full_name,
                }
              }
              return acc
            },
            {} as { [key: string]: { email: string; name?: string } }
          )
        }
      }

      // Combine permission data with user details
      const permissionsWithDetails: PermissionWithDetails[] = data.map(p => ({
        ...p,
        user_email:
          p.principal_type === 'user' ? userDetails[p.principal_id]?.email : undefined,
        user_name:
          p.principal_type === 'user' ? userDetails[p.principal_id]?.name : undefined,
      }))

      return { success: true, permissions: permissionsWithDetails }
    } catch (error) {
      console.error('Error fetching permissions with details:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get all permissions for an organization with role and user details
   * @param orgId - Organization ID
   * @returns Success result with permissions array or error
   */
  async getAllOrgPermissionsWithDetails(orgId: string): Promise<{
    success: boolean
    permissions?: PermissionWithDetails[]
    error?: string
  }> {
    try {
      // Fetch ALL permissions for this organization (any object type)
      const { data, error } = await this.supabase
        .from('permissions')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching organization permissions:', error)
        return { success: false, error: error.message }
      }

      // Fetch user details for user principals
      const userIds =
        data?.filter(p => p.principal_type === 'user').map(p => p.principal_id).filter(Boolean) || []

      let userDetails: { [key: string]: { email: string; name?: string } } = {}

      if (userIds.length > 0) {
        const { data: users } = await this.supabase
          .from('users')
          .select('id, email, raw_user_meta_data')
          .in('id', userIds as string[])

        if (users) {
          userDetails = users.reduce(
            (acc, u) => {
              if (u.id) {
                const metadata = u.raw_user_meta_data as any
                acc[u.id] = {
                  email: u.email,
                  name: metadata?.name || metadata?.full_name,
                }
              }
              return acc
            },
            {} as { [key: string]: { email: string; name?: string } }
          )
        }
      }

      // Combine permission data with user details
      const permissionsWithDetails: PermissionWithDetails[] = data.map(p => ({
        ...p,
        user_email:
          p.principal_type === 'user' ? userDetails[p.principal_id]?.email : undefined,
        user_name:
          p.principal_type === 'user' ? userDetails[p.principal_id]?.name : undefined,
      }))

      return { success: true, permissions: permissionsWithDetails }
    } catch (error) {
      console.error('Error fetching organization permissions:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get organization members with user details
   * Returns formatted member data with email and name
   * @param orgId - Organization ID
   * @returns Success result with members array or error
   */
  async getOrgMembersWithDetails(orgId: string): Promise<{
    success: boolean
    members?: Array<{
      org_id: string
      user_id: string
      role_id: string
      role_name: string
      email?: string
      name?: string
    }>
    error?: string
  }> {
    try {
      // Fetch organization members from materialized view
      const { data: members, error } = await this.supabase
        .from('users_permissions')
        .select('*')
        .eq('org_id', orgId)
        .eq('object_type', 'organization')

      if (error) {
        console.error('Error fetching organization members:', error)
        return { success: false, error: error.message }
      }

      if (!members || members.length === 0) {
        return { success: true, members: [] }
      }

      // Fetch user details from users table
      const userIds = members.map(m => m.user_id).filter(Boolean) as string[]
      const { data: users } = await this.supabase
        .from('users')
        .select('id, email, raw_user_meta_data')
        .in('id', userIds)

      // Create a map of user details
      let userDetailsMap: { [key: string]: { email: string; name?: string } } = {}
      if (users) {
        userDetailsMap = users.reduce(
          (acc, u) => {
            if (u.id) {
              const metadata = u.raw_user_meta_data as any
              acc[u.id] = {
                email: u.email,
                name: metadata?.name || metadata?.full_name,
              }
            }
            return acc
          },
          {} as { [key: string]: { email: string; name?: string } }
        )
      }

      // Combine member data with user details
      const membersWithDetails = members.map(m => ({
        org_id: m.object_id!,
        user_id: m.user_id!,
        role_id: m.role_id!,
        role_name: m.role_name!,
        email: userDetailsMap[m.user_id!]?.email,
        name: userDetailsMap[m.user_id!]?.name,
      }))

      return { success: true, members: membersWithDetails }
    } catch (error) {
      console.error('Error fetching organization members:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get workspace members formatted for action return
   * @param workspaceId - Workspace ID
   * @returns Success result with members array or error
   */
  async getWorkspaceMembersFormatted(workspaceId: string): Promise<{
    success: boolean
    members?: Array<{
      workspace_id: string
      user_id: string
      role_id: string
      role_name: string
    }>
    error?: string
  }> {
    try {
      // Fetch workspace members from materialized view
      const { data, error } = await this.supabase
        .from('users_permissions')
        .select('*')
        .eq('object_id', workspaceId)
        .eq('object_type', 'workspace')
        .order('user_id', { ascending: true })

      if (error) {
        console.error('Error fetching workspace members:', error)
        return { success: false, error: error.message }
      }

      // Map the results to the expected format
      const members =
        data?.map(m => ({
          workspace_id: m.object_id!,
          user_id: m.user_id!,
          role_id: m.role_id!,
          role_name: m.role_name!,
        })) || []

      return { success: true, members }
    } catch (error) {
      console.error('Error fetching workspace members:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check if a user has a specific permission
   * @param params - Permission check parameters
   * @returns Success result with hasPermission boolean or error
   */
  async checkUserPermission(params: CheckPermissionParams): Promise<{
    success: boolean
    hasPermission?: boolean
    error?: string
  }> {
    try {
      // Get user's permissions for this object
      const { data: permissions, error: permError } = await this.supabase
        .from('permissions')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('principal_type', 'user')
        .eq('principal_id', params.user_id)
        .eq('object_type', params.object_type)
        .eq('object_id', params.object_id)
        .is('deleted_at', null)

      if (permError) {
        console.error('Error checking permission:', permError)
        return { success: false, error: permError.message }
      }

      // Check if any role includes the requested action
      const hasPermission =
        permissions?.some(p => {
          const role = p.role as unknown as Role
          const rolePermissions = role?.permissions as PermissionAction[]
          return rolePermissions?.includes(params.action)
        }) || false

      return { success: true, hasPermission }
    } catch (error) {
      console.error('Error checking user permission:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get organizations with details where user has access
   * @returns Success result with organizations array or error
   */
  async getUserOrganizationsWithDetails(): Promise<{
    success: boolean
    organizations?: Array<{ id: string; name: string }>
    error?: string
  }> {
    try {
      // Get organizations where user has access
      const { data: orgMemberships } = await this.supabase
        .from('users_permissions')
        .select('object_id')
        .eq('object_type', 'organization')

      if (!orgMemberships || orgMemberships.length === 0) {
        return { success: true, organizations: [] }
      }

      const orgIds = orgMemberships.map(m => m.object_id!)

      // Fetch organization details
      const { data, error } = await this.supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching organizations:', error)
        return { success: false, error: error.message }
      }

      return { success: true, organizations: data || [] }
    } catch (error) {
      console.error('Error fetching user organizations:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get workspaces for an organization
   * @param orgId - Organization ID
   * @returns Success result with workspaces array or error
   */
  async getOrgWorkspaces(orgId: string): Promise<{
    success: boolean
    workspaces?: Array<{ id: string; name: string }>
    error?: string
  }> {
    try {
      // Fetch workspaces for the organization
      const { data, error } = await this.supabase
        .from('workspaces')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching workspaces:', error)
        return { success: false, error: error.message }
      }

      return { success: true, workspaces: data || [] }
    } catch (error) {
      console.error('Error fetching organization workspaces:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
