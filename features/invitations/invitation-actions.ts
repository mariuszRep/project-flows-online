'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InvitationService } from '@/services/invitation-service'
import type {
  SendInvitationParams,
  AssignWorkspacePermissionsParams,
  InvitedUserDetails,
} from '@/services/invitation-service'
import { revalidatePath } from 'next/cache'

/**
 * Send an invitation to a user with organization role
 */
export async function sendInvitation(
  params: Omit<SendInvitationParams, 'inviterId'>
): Promise<{
  success: boolean
  data?: { userId: string; invitationId: string; expiresAt: string; isExistingUser: boolean }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create invitation service instance with admin client for auth operations
    const invitationService = new InvitationService(adminClient)

    // Send invitation
    const result = await invitationService.sendInvitationWithOrgRole({
      ...params,
      inviterId: user.id,
    })

    // Revalidate organization page
    revalidatePath(`/organizations/${params.orgId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error sending invitation:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send invitation'
    return { success: false, error: errorMessage }
  }
}

/**
 * Assign workspace permissions to a user
 */
export async function assignWorkspacePermissions(
  params: AssignWorkspacePermissionsParams
): Promise<{
  success: boolean
  data?: { count: number }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create invitation service instance with admin client
    const invitationService = new InvitationService(adminClient)

    // Assign permissions
    const result = await invitationService.assignWorkspacePermissions(
      params,
      user.id
    )

    // Revalidate workspace settings pages
    params.workspacePermissions.forEach(wp => {
      revalidatePath(`/workspaces/${wp.workspaceId}/settings`)
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error assigning workspace permissions:', error)
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to assign workspace permissions'
    return { success: false, error: errorMessage }
  }
}

/**
 * Get invited user details
 */
export async function getInvitedUserDetails(
  invitationId: string
): Promise<{
  success: boolean
  data?: InvitedUserDetails
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user (for authentication check)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create invitation service instance with admin client
    const invitationService = new InvitationService(adminClient)

    // Get user details
    const details = await invitationService.getInvitedUserDetails(invitationId)

    if (!details) {
      return { success: false, error: 'Invitation not found' }
    }

    return {
      success: true,
      data: details,
    }
  } catch (error) {
    console.error('Error getting invited user details:', error)
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to get invited user details'
    return { success: false, error: errorMessage }
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  invitationId: string
): Promise<{
  success: boolean
  data?: { userId: string; alreadyAccepted: boolean }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create invitation service instance with admin client
    const invitationService = new InvitationService(adminClient)

    // Accept invitation
    const result = await invitationService.acceptInvitation(invitationId)

    // Note: No revalidatePath needed here because the calling page redirects
    // immediately after acceptance, which causes a fresh page load with updated data.
    // Adding revalidatePath during render causes Next.js errors in Next.js 15+.

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to accept invitation'
    return { success: false, error: errorMessage }
  }
}

/**
 * Decline an invitation (user-facing action)
 */
export async function declineInvitation(
  invitationId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Update invitation status to 'declined'
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('user_id', user.id) // Ensure user can only decline their own invitations

    if (updateError) {
      throw new Error(`Failed to decline invitation: ${updateError.message}`)
    }

    revalidatePath('/organizations')
    return { success: true }
  } catch (error) {
    console.error('Error declining invitation:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to decline invitation'
    return { success: false, error: errorMessage }
  }
}

/**
 * Revoke an invitation (admin action)
 */
export async function revokeInvitation(
  invitationId: string,
  organizationId: string
): Promise<{
  success: boolean
  data?: { userId: string; invitationId: string }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create invitation service instance with admin client
    const invitationService = new InvitationService(adminClient)

    // Revoke invitation
    const result = await invitationService.revokeInvitation(invitationId, organizationId)

    // Revalidate organization page
    revalidatePath(`/organizations/${organizationId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error revoking invitation:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to revoke invitation'
    return { success: false, error: errorMessage }
  }
}

/**
 * Bulk revoke multiple invitations
 */
export async function bulkRevokeInvitations(
  invitationIds: string[],
  organizationId: string
): Promise<{
  success: boolean
  data?: { count: number; errors: string[] }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create invitation service instance with admin client
    const invitationService = new InvitationService(adminClient)

    let successCount = 0
    const errors: string[] = []

    // Revoke each invitation
    for (const invitationId of invitationIds) {
      try {
        await invitationService.revokeInvitation(invitationId, organizationId)
        successCount++
      } catch (error) {
        console.error(`Error revoking invitation ${invitationId}:`, error)
        errors.push(
          `${invitationId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Revalidate organization page
    revalidatePath(`/organizations/${organizationId}`)

    return {
      success: true,
      data: { count: successCount, errors },
    }
  } catch (error) {
    console.error('Error in bulk revoke invitations:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to bulk revoke invitations'
    return { success: false, error: errorMessage }
  }
}

export interface InvitationWithDetails {
  id: string
  email: string
  status: string
  userId: string
  orgRole: string
  workspaceCount: number
  expiresAt: string
  createdAt: string
}

/**
 * Get all invitations for an organization with full details including user emails
 */
export async function getOrganizationInvitations(
  organizationId: string
): Promise<{
  success: boolean
  data?: InvitationWithDetails[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user (for authentication check)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Fetch all permissions for this organization
    const { data: permissions, error: permissionsError } = await supabase
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
      console.error('Error fetching permissions:', permissionsError)
      return { success: false, error: 'Failed to fetch permissions' }
    }

    console.log('Found permissions:', permissions?.length)

    // Get unique user IDs
    const userIds = [...new Set(permissions?.map(p => p.principal_id) || [])]

    if (userIds.length === 0) {
      return { success: true, data: [] }
    }

    // Fetch invitations for these users
    const { data: invitationsData } = await supabase
      .from('invitations')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    if (!invitationsData || invitationsData.length === 0) {
      return { success: true, data: [] }
    }

    // Fetch user emails via admin API
    const invitationsWithDetails: InvitationWithDetails[] = []

    for (const invitation of invitationsData) {
      // Find the organization permission for this user
      const permission = permissions?.find(p => p.principal_id === invitation.user_id)

      // Skip if no permission found (shouldn't happen but safeguard)
      if (!permission) {
        continue
      }

      // Only include invitations that match this organization
      // An invitation matches if the org permission was created within 10 seconds of the invitation
      const invitationCreatedAt = new Date(invitation.created_at).getTime()
      const permissionCreatedAt = new Date(permission.created_at).getTime()
      const timeDiff = Math.abs(invitationCreatedAt - permissionCreatedAt)

      // If permission was created more than 10 seconds apart from invitation, skip it
      // This means the invitation was for a different organization
      if (timeDiff > 10000) {
        continue
      }

      const roles = permission?.roles as unknown as { name: string; description: string | null }

      // Get workspace count
      const { count } = await supabase
        .from('permissions')
        .select('id', { count: 'exact', head: true })
        .eq('principal_id', invitation.user_id)
        .eq('object_type', 'workspace')
        .eq('org_id', organizationId)

      // Fetch user email from auth.users via admin API using service role client
      const { data: userData } = await adminClient.auth.admin.getUserById(invitation.user_id)
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

    return {
      success: true,
      data: invitationsWithDetails,
    }
  } catch (error) {
    console.error('Error getting organization invitations:', error)
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to get organization invitations'
    return { success: false, error: errorMessage }
  }
}
