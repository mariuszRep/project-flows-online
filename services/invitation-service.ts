import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { sendOrganizationInvitationEmail } from '@/lib/email/send-organization-invitation'
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
  status: 'pending' | 'accepted' | 'expired'
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

    // Fetch organization and role details for email
    const { data: organization } = await this.supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const { data: role } = await this.supabase
      .from('roles')
      .select('name, description')
      .eq('id', orgRoleId)
      .single()

    const { data: inviter } = await this.supabase.auth.admin.getUserById(inviterId)

    // Step 1: Check if user already exists
    // Step 1: Check if user already exists
    // We use a secure RPC function to check for existing users by email (case-insensitive)
    const { data: rpcUser, error: rpcError } = await (this.supabase as any)
      .rpc('get_user_by_email', { email })
      .single()

    if (rpcUser && rpcUser.id) {
      // User already exists - generate magic link and send email
      userId = rpcUser.id
      isExistingUser = true

      // Generate magic link that redirects to the new organization
      // Existing users should go to the organization page
      const { data: magicLinkData, error: magicLinkError } = await this.supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: redirectUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/organizations/${orgId}`,
        },
      })

      if (magicLinkError || !magicLinkData?.properties?.action_link) {
        console.error('Failed to generate magic link:', magicLinkError)
      } else {
        // Send email with magic link to existing user
        await sendOrganizationInvitationEmail({
          to: email,
          organizationName: organization?.name || 'the organization',
          inviterName: inviter?.user?.user_metadata?.name,
          inviterEmail: inviter?.user?.email || 'unknown',
          magicLink: magicLinkData.properties.action_link,
          roleName: role?.name || 'member',
          roleDescription: role?.description,
        })
      }
    } else {
      // User doesn't exist - create via invite (Supabase sends the email automatically)
      try {
        const { data: authData, error: authError } = await this.supabase.auth.admin.inviteUserByEmail(
          email,
          {
            redirectTo: redirectUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/onboarding`,
          }
        )

        if (authError) {
          // If error is "User already registered", treat as existing user
          // This is a fallback in case the public.users check failed for some reason
          if (authError.message.includes('already been registered') || authError.status === 422) {
            // We need to find the user ID. Since public.users check failed, we try listUsers as last resort
            // or just fail if we can't find them.
            const { data: existingUsers } = await this.supabase.auth.admin.listUsers()
            const foundUser = existingUsers?.users?.find(u => u.email === email)

            if (foundUser) {
              userId = foundUser.id
              isExistingUser = true

              // Re-run the magic link logic for existing user
              const { data: magicLinkData, error: magicLinkError } = await this.supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
                options: {
                  redirectTo: redirectUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback?next=/organizations/${orgId}`,
                },
              })

              if (!magicLinkError && magicLinkData?.properties?.action_link) {
                await sendOrganizationInvitationEmail({
                  to: email,
                  organizationName: organization?.name || 'the organization',
                  inviterName: inviter?.user?.user_metadata?.name,
                  inviterEmail: inviter?.user?.email || 'unknown',
                  magicLink: magicLinkData.properties.action_link,
                  roleName: role?.name || 'member',
                  roleDescription: role?.description,
                })
              }
            } else {
              throw authError
            }
          } else {
            throw new Error(`Failed to invite user: ${authError.message}`)
          }
        } else if (!authData?.user?.id) {
          throw new Error('Failed to create user account')
        } else {
          userId = authData.user.id
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
      status: invitation.status as 'pending' | 'accepted' | 'expired',
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
}
