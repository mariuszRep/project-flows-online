import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  sendInvitationSchema,
  workspacePermissionSchema,
  assignWorkspacePermissionsSchema,
  acceptInvitationSchema,
  type SendInvitationParams,
  type WorkspacePermission,
  type AssignWorkspacePermissionsParams,
  type AcceptInvitationParams,
} from '@/features/invitations/validations'

export type {
  SendInvitationParams,
  WorkspacePermission,
  AssignWorkspacePermissionsParams,
  AcceptInvitationParams,
}

export interface InvitedUserDetails {
  email: string
  userId: string
  invitationId: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expiresAt: string
  orgId: string
  orgName: string | null
  orgRoleName: string | null
  workspacePermissions: Array<{
    workspaceId: string
    workspaceName: string | null
    roleName: string | null
  }>
}

/**
 * Service for managing user invitations
 * Handles invitation creation, acceptance, and permission assignment
 */
export class InvitationService {
  constructor(private readonly supabase: SupabaseClient<Database>) { }

  /**
   * Send an invitation to a user with organization role
   * Handles both new users (creates account + sends invite email) and existing users (sends magic link to new org)
   */
  async sendInvitationWithOrgRole(params: SendInvitationParams) {
    // Validate input
    const validated = sendInvitationSchema.parse(params)
    const { email, orgRoleId, orgId, inviterId, redirectUrl } = validated

    // Calculate expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    let userId: string = ''
    let isExistingUser = false

    // Step 1: Check if user already exists
    // We use a secure RPC function to check for existing users by email (case-insensitive)
    const { data: rpcUser, error: rpcError } = await (this.supabase as any)
      .rpc('get_user_by_email', { email })
      .single()

    if (rpcUser && rpcUser.id) {
      // User already exists - send magic link via Supabase's email system
      userId = rpcUser.id
      isExistingUser = true

      // Use Supabase's built-in OTP/magic link email (similar to password reset)
      // This will send through Supabase's email system (Mailpit in local dev)
      const { error: otpError } = await this.supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback?next=/organizations`,
        },
      })

      if (otpError) {
        console.error('Failed to send magic link via Supabase:', otpError)
        throw new Error(`Failed to send invitation email: ${otpError.message}`)
      }
    } else {
      // User doesn't exist - create account and send magic link
      // We use createUser + signInWithOtp instead of inviteUserByEmail because:
      // 1. inviteUserByEmail can have issues with redirect URLs in some envs (localhost)
      // 2. We want a consistent "Magic Link" experience which we know works reliably
      try {
        const { data: authData, error: createError } = await this.supabase.auth.admin.createUser({
          email,
          email_confirm: true, // Auto-confirm so they can sign in properly via magic link
          user_metadata: {
            invited_by: inviterId,
          }
        })

        if (createError) {
          // If error is "User already registered", treat as existing user
          if (createError.message.includes('already been registered') || createError.status === 422) {
            // We need to find the user ID. Since public.users check failed, we try listUsers as last resort
            // or just fail if we can't find them.
            const { data: existingUsers } = await this.supabase.auth.admin.listUsers()
            const foundUser = existingUsers?.users?.find(u => u.email === email)

            if (foundUser) {
              userId = foundUser.id
              isExistingUser = true

              // Use Supabase's built-in OTP/magic link email
              const { error: otpError } = await this.supabase.auth.signInWithOtp({
                email: email,
                options: {
                  emailRedirectTo: redirectUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/auth/callback?next=/organizations`,
                },
              })

              if (otpError) {
                console.error('Failed to send magic link via Supabase:', otpError)
                // Don't throw here, we've already set isExistingUser and userId
              }
            } else {
              throw createError
            }
          } else {
            throw new Error(`Failed to create user: ${createError.message}`)
          }
        } else if (!authData?.user?.id) {
          throw new Error('Failed to create user account')
        } else {
          userId = authData.user.id

          // Now send the magic link to the newly created user
          const { error: otpError } = await this.supabase.auth.signInWithOtp({
            email: email,
            options: {
              // Ensure we use the full site URL for the redirect
              emailRedirectTo: redirectUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback?next=/organizations`,
            },
          })

          if (otpError) {
            console.error('Failed to send magic link to new user:', otpError)
            // We created the user but failed to email them. We should probably throw
            throw new Error(`Failed to send invitation email: ${otpError.message}`)
          }
        }
      } catch (error) {
        // Re-throw if it's not handled above
        if (isExistingUser) {
          // If we recovered and found the user, continue
        } else {
          throw error
        }
      }
    }

    // Step 2: Create invitation record
    // For existing users, mark as 'pending' - they need to click the magic link
    // For new users, also 'pending' until they accept the email invitation
    const { data: invitation, error: invitationError } = await this.supabase
      .from('invitations')
      .insert({
        user_id: userId,
        org_id: orgId,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_by: inviterId,
      })
      .select()
      .single()

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }

    // Step 3: Create organization permission
    const { error: permissionError } = await this.supabase
      .from('permissions')
      .insert({
        principal_type: 'user',
        principal_id: userId,
        object_type: 'organization',
        object_id: orgId,
        org_id: orgId,
        role_id: orgRoleId,
        created_by: inviterId,
        updated_by: inviterId,
      })

    if (permissionError) {
      // Rollback: Delete invitation if permission creation fails
      await this.supabase.from('invitations').delete().eq('id', invitation.id)
      throw new Error(`Failed to create organization permission: ${permissionError.message}`)
    }

    return {
      userId,
      invitationId: invitation.id,
      expiresAt: invitation.expires_at,
      isExistingUser,
    }
  }

  /**
   * Assign workspace permissions to a user
   * Creates permission records for multiple workspaces in a transaction
   */
  async assignWorkspacePermissions(params: AssignWorkspacePermissionsParams, inviterId: string) {
    // Validate input
    const validated = assignWorkspacePermissionsSchema.parse(params)
    const { userId, workspacePermissions } = validated

    if (workspacePermissions.length === 0) {
      return { count: 0 }
    }

    // Fetch workspace details to get org_ids
    const workspaceIds = workspacePermissions.map(wp => wp.workspaceId)
    const { data: workspaces, error: workspaceError } = await this.supabase
      .from('workspaces')
      .select('id, organization_id')
      .in('id', workspaceIds)

    if (workspaceError) {
      throw new Error(`Failed to fetch workspace details: ${workspaceError.message}`)
    }

    // Create a map of workspace ID to org ID
    const workspaceOrgMap = new Map(
      workspaces?.map(w => [w.id, w.organization_id]) || []
    )

    // Create permission records for all workspaces
    const permissionRecords = workspacePermissions.map(wp => ({
      principal_type: 'user' as const,
      principal_id: userId,
      object_type: 'workspace' as const,
      object_id: wp.workspaceId,
      org_id: workspaceOrgMap.get(wp.workspaceId) || '',
      role_id: wp.roleId,
      created_by: inviterId,
      updated_by: inviterId,
    }))

    const { data, error } = await this.supabase
      .from('permissions')
      .insert(permissionRecords)
      .select()

    if (error) {
      throw new Error(`Failed to assign workspace permissions: ${error.message}`)
    }

    return { count: data?.length || 0 }
  }

  /**
   * Get invited user details including organization and workspace permissions
   */
  async getInvitedUserDetails(invitationId: string): Promise<InvitedUserDetails | null> {
    // Validate input
    acceptInvitationSchema.parse({ invitationId })

    // Get invitation with user email
    const { data: invitation, error: invitationError } = await this.supabase
      .from('invitations')
      .select(`
        id,
        user_id,
        status,
        expires_at
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      return null
    }

    // Get user email from auth.users
    const { data: { user }, error: userError } = await this.supabase.auth.admin.getUserById(
      invitation.user_id
    )

    if (userError || !user) {
      return null
    }

    // Get organization permission
    const { data: orgPermissions } = await this.supabase
      .from('users_permissions')
      .select('*')
      .eq('user_id', invitation.user_id)
      .eq('object_type', 'organization')
      .limit(1)
      .single()

    // Get organization name
    let orgName: string | null = null
    if (orgPermissions?.object_id) {
      const { data: org } = await this.supabase
        .from('organizations')
        .select('name')
        .eq('id', orgPermissions.object_id)
        .single()
      orgName = org?.name || null
    }

    // Get workspace permissions
    const { data: workspacePerms } = await this.supabase
      .from('users_permissions')
      .select('*')
      .eq('user_id', invitation.user_id)
      .eq('object_type', 'workspace')

    // Get workspace names
    const workspaceIds = workspacePerms?.map(wp => wp.object_id).filter(Boolean) || []
    let workspaceNames: Map<string, string> = new Map()

    if (workspaceIds.length > 0) {
      const { data: workspaces } = await this.supabase
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds as string[])

      workspaceNames = new Map(workspaces?.map(w => [w.id, w.name]) || [])
    }

    return {
      email: user.email || '',
      userId: invitation.user_id,
      invitationId: invitation.id,
      status: invitation.status as 'pending' | 'accepted' | 'declined' | 'expired',
      expiresAt: invitation.expires_at,
      orgId: orgPermissions?.object_id || '',
      orgName,
      orgRoleName: orgPermissions?.role_name || null,
      workspacePermissions:
        workspacePerms?.map(wp => ({
          workspaceId: wp.object_id || '',
          workspaceName: workspaceNames.get(wp.object_id || '') || null,
          roleName: wp.role_name || null,
        })) || [],
    }
  }

  /**
   * Get all pending invitations for a specific user
   * Includes organization details
   */
  async getPendingInvitations(userId: string) {
    const { data, error } = await this.supabase
      .from('invitations')
      .select(`
        id,
        org_id,
        expires_at,
        status,
        organizations(id, name, created_at)
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (error) {
      console.error('Error fetching pending invitations:', error)
      throw new Error('Failed to fetch pending invitations')
    }

    // Map to a friendlier structure if needed, or return raw data
    // The current page implementation expects the raw structure with nested organizations
    return data || []
  }

  /**
   * Check if a user has a pending invitation for a specific organization
   * Used for layout-level access validation
   */
  async hasPendingInvitation(userId: string, orgId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to check pending invitation: ${error.message}`)
    }

    return !!data
  }

  /**
   * Accept an invitation and update status
   * Validates invitation exists and is not expired
   */
  async acceptInvitation(invitationId: string) {
    // Validate input
    acceptInvitationSchema.parse({ invitationId })

    // Get invitation
    const { data: invitation, error: getError } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (getError || !invitation) {
      throw new Error('Invitation not found')
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)

    if (now > expiresAt) {
      // Update status to expired
      await this.supabase
        .from('invitations')
        .update({
          status: 'expired',
          updated_at: now.toISOString(),
        })
        .eq('id', invitationId)

      throw new Error('Invitation has expired')
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return {
        userId: invitation.user_id,
        alreadyAccepted: true,
      }
    }

    // Update status to accepted
    const { error: updateError } = await this.supabase
      .from('invitations')
      .update({
        status: 'accepted',
        updated_at: now.toISOString(),
      })
      .eq('id', invitationId)

    if (updateError) {
      throw new Error(`Failed to accept invitation: ${updateError.message}`)
    }

    return {
      userId: invitation.user_id,
      alreadyAccepted: false,
    }
  }

  /**
   * Revoke an invitation and remove only the permissions created by this invitation
   * This will delete the invitation and only the permissions created by the inviter
   * within a reasonable time window of the invitation creation
   */
  async revokeInvitation(invitationId: string, organizationId: string) {
    // Validate input
    acceptInvitationSchema.parse({ invitationId })

    // Get invitation with full details
    const { data: invitation, error: getError } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (getError || !invitation) {
      throw new Error('Invitation not found')
    }

    const userId = invitation.user_id
    const inviterId = invitation.created_by
    const invitationCreatedAt = new Date(invitation.created_at)

    // Calculate a time window: 10 seconds before and after the invitation was created
    // This accounts for any timing differences during the transaction
    const timeWindowStart = new Date(invitationCreatedAt.getTime() - 10000)
    const timeWindowEnd = new Date(invitationCreatedAt.getTime() + 10000)

    // Delete only permissions that were:
    // 1. Created for this user
    // 2. In this organization
    // 3. Created by the same inviter
    // 4. Created within the time window of the invitation
    const { error: permissionsError } = await this.supabase
      .from('permissions')
      .delete()
      .eq('principal_id', userId)
      .eq('org_id', organizationId)
      .eq('created_by', inviterId)
      .gte('created_at', timeWindowStart.toISOString())
      .lte('created_at', timeWindowEnd.toISOString())

    if (permissionsError) {
      throw new Error(`Failed to delete permissions: ${permissionsError.message}`)
    }

    // Delete the invitation
    const { error: deleteError } = await this.supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      throw new Error(`Failed to delete invitation: ${deleteError.message}`)
    }

    return {
      userId,
      invitationId,
    }
  }

  /**
   * Decline an invitation (user-facing action)
   * Updates invitation status to 'declined'
   */
  async declineInvitation(invitationId: string, userId: string) {
    // Update invitation status to 'declined'
    const { error } = await this.supabase
      .from('invitations')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('user_id', userId) // Ensure user can only decline their own invitations

    if (error) {
      throw new Error(`Failed to decline invitation: ${error.message}`)
    }

    return { invitationId }
  }

  /**
   * Get all invitations for an organization with full details
   * Includes user emails, roles, and workspace counts
   */
  async getOrganizationInvitations(organizationId: string): Promise<Array<{
    id: string
    email: string
    status: string
    userId: string
    orgRole: string
    workspaceCount: number
    expiresAt: string
    createdAt: string
  }>> {
    // Fetch all permissions for this organization
    const { data: permissions, error: permissionsError } = await this.supabase
      .from('permissions')
      .select(`
        id,
        principal_id,
        role_id,
        created_at,
        roles!inner(
          name,
          description
        )
      `)
      .eq('object_type', 'organization')
      .eq('object_id', organizationId)
      .eq('principal_type', 'user')

    if (permissionsError) {
      throw new Error(`Failed to fetch permissions: ${permissionsError.message}`)
    }

    // Get unique user IDs
    const userIds = [...new Set(permissions?.map(p => p.principal_id) || [])]

    if (userIds.length === 0) {
      return []
    }

    // Fetch invitations for these users
    const { data: invitationsData } = await this.supabase
      .from('invitations')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    if (!invitationsData || invitationsData.length === 0) {
      return []
    }

    // Fetch user emails and build detailed invitation list
    const invitationsWithDetails = []

    for (const invitation of invitationsData) {
      // Find the organization permission for this user
      const permission = permissions?.find(p => p.principal_id === invitation.user_id)

      // Skip if no permission found
      if (!permission) {
        continue
      }

      // Only include invitations that match this organization
      // An invitation matches if the org permission was created within 10 seconds of the invitation
      const invitationCreatedAt = new Date(invitation.created_at).getTime()
      const permissionCreatedAt = new Date(permission.created_at).getTime()
      const timeDiff = Math.abs(invitationCreatedAt - permissionCreatedAt)

      // If permission was created more than 10 seconds apart from invitation, skip it
      if (timeDiff > 10000) {
        continue
      }

      const roles = permission?.roles as unknown as { name: string; description: string | null }

      // Get workspace count
      const { count } = await this.supabase
        .from('permissions')
        .select('id', { count: 'exact', head: true })
        .eq('principal_id', invitation.user_id)
        .eq('object_type', 'workspace')
        .eq('org_id', organizationId)

      // Fetch user email from auth.users via admin API
      const { data: userData } = await this.supabase.auth.admin.getUserById(invitation.user_id)
      const userEmail = userData?.user?.email || 'Unknown'

      invitationsWithDetails.push({
        id: invitation.id,
        email: userEmail,
        status: invitation.status,
        userId: invitation.user_id,
        orgRole: roles?.name || 'Unknown',
        workspaceCount: count || 0,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
      })
    }

    return invitationsWithDetails
  }
}
