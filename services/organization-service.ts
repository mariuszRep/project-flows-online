import { SupabaseClient } from '@supabase/supabase-js'
import type { Organization } from '@/types/database'
import type { CreateOrganizationInput, UpdateOrganizationInput } from '@/features/organizations/validations'

export class OrganizationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new organization using RPC function (bypasses RLS)
   */
  async createOrganization(
    data: CreateOrganizationInput
  ): Promise<{ id: string; name: string; created_at: string }> {
    const { data: result, error } = await this.supabase
      .rpc('create_organization', { org_name: data.name })
      .single()

    if (error || !result) {
      console.error('Error creating organization:', error)
      throw new Error('Failed to create organization')
    }

    return result as { id: string; name: string; created_at: string }
  }

  /**
   * Get all organizations for the current user (RLS handles filtering)
   */
  async getUserOrganizations(): Promise<Organization[]> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching organizations:', error)
      throw new Error('Failed to fetch organizations')
    }

    return data || []
  }

  /**
   * Update an organization (RLS handles permission checking)
   */
  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationInput,
    userId: string
  ): Promise<Organization> {
    const { data: result, error } = await this.supabase
      .from('organizations')
      .update({
        name: data.name,
        updated_by: userId,
      })
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      throw new Error('Failed to update organization')
    }

    return result
  }

  /**
   * Delete an organization (RLS handles permission checking)
   */
  async deleteOrganization(organizationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (error) {
      console.error('Error deleting organization:', error)
      throw new Error('Failed to delete organization')
    }
  }

  /**
   * Get a single organization by ID
   * Used for fetching basic organization details
   */
  async getById(organizationId: string): Promise<{ id: string; name: string } | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (error) {
      console.error('Error fetching organization:', error)
      return null
    }

    return data
  }

  /**
   * Get combined organizations with invitations for a user
   * Merges member organizations and pending invitations, enriched with stats
   */
  async getCombinedOrganizationsWithInvitations(userId: string) {
    // Get member organizations
    const memberOrganizations = await this.getUserOrganizations()

    // Get pending invitations
    const { data: pendingInvitations, error: invitationsError } = await this.supabase
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

    if (invitationsError) {
      console.error('Error fetching pending invitations:', invitationsError)
      throw new Error('Failed to fetch pending invitations')
    }

    // Create a map for quick lookup of member organizations
    const memberOrgMap = new Map(memberOrganizations.map(org => [org.id, org]))

    // Create a map for quick lookup of pending invitations, prioritizing the invitation info
    const invitationOrgMap = new Map()

    // Collect org IDs that need to be fetched directly
    const orgIdsToFetch = new Set<string>()

    for (const inv of pendingInvitations || []) {
      let orgDetails = inv.organizations as any

      // Fallback: If join failed (e.g. RLS issue) but we have the org in memberOrganizations
      if (!orgDetails && inv.org_id && memberOrgMap.has(inv.org_id)) {
        const memberOrg = memberOrgMap.get(inv.org_id)
        if (memberOrg) {
          orgDetails = {
            id: memberOrg.id,
            name: memberOrg.name,
            created_at: memberOrg.created_at,
          }
        }
      }

      // Collect org IDs that need direct fetching
      if (!orgDetails && inv.org_id) {
        orgIdsToFetch.add(inv.org_id)
      }

      if (orgDetails) {
        invitationOrgMap.set(orgDetails.id, {
          id: orgDetails.id,
          name: orgDetails.name,
          created_at: orgDetails.created_at,
          invitation: {
            invitationId: inv.id,
            expiresAt: inv.expires_at,
          },
        })
      }
    }

    // Batch fetch organizations that weren't found via join or member map
    if (orgIdsToFetch.size > 0) {
      const { data: directOrgs } = await this.supabase
        .from('organizations')
        .select('id, name, created_at')
        .in('id', Array.from(orgIdsToFetch))

      const directOrgMap = new Map(directOrgs?.map(org => [org.id, org]) || [])

      // Process invitations that needed direct org fetching
      for (const inv of pendingInvitations || []) {
        if (inv.org_id && !invitationOrgMap.has(inv.org_id)) {
          const directOrg = directOrgMap.get(inv.org_id)
          if (directOrg) {
            invitationOrgMap.set(directOrg.id, {
              id: directOrg.id,
              name: directOrg.name,
              created_at: directOrg.created_at,
              invitation: {
                invitationId: inv.id,
                expiresAt: inv.expires_at,
              },
            })
          }
        }
      }
    }

    // Combine both lists, giving precedence to invitations if an organization has both
    const combinedOrganizations: any[] = []
    const processedOrgIds = new Set<string>()

    // Add organizations with pending invitations first
    for (const [orgId, org] of invitationOrgMap) {
      combinedOrganizations.push(org)
      processedOrgIds.add(orgId)
    }

    // Add member organizations that don't have pending invitations
    for (const org of memberOrganizations) {
      if (!processedOrgIds.has(org.id)) {
        combinedOrganizations.push({
          id: org.id,
          name: org.name,
          created_at: org.created_at,
        })
        processedOrgIds.add(org.id)
      }
    }

    // Sort by created_at in descending order (newest first)
    combinedOrganizations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Get member and workspace counts for all combined organizations
    const orgIds = combinedOrganizations.map(org => org.id)

    if (orgIds.length === 0) {
      return []
    }

    const { data: memberCounts } = await this.supabase
      .from('permissions')
      .select('org_id')
      .eq('object_type', 'organization')
      .in('org_id', orgIds)

    const { data: workspaceCounts } = await this.supabase
      .from('workspaces')
      .select('organization_id')
      .in('organization_id', orgIds)

    // Create count maps
    const memberCountMap = new Map<string, number>()
    memberCounts?.forEach(m => {
      memberCountMap.set(m.org_id, (memberCountMap.get(m.org_id) || 0) + 1)
    })

    const workspaceCountMap = new Map<string, number>()
    workspaceCounts?.forEach(w => {
      workspaceCountMap.set(w.organization_id, (workspaceCountMap.get(w.organization_id) || 0) + 1)
    })

    // Prepare organization data with stats
    return combinedOrganizations.map((org) => {
      const isMember = memberOrgMap.has(org.id)
      const invitationInfo = org.invitation

      return {
        id: org.id,
        name: org.name,
        memberCount: memberCountMap.get(org.id) || 0,
        workspaceCount: workspaceCountMap.get(org.id) || 0,
        isMember,
        invitation: invitationInfo ? {
          invitationId: invitationInfo.invitationId,
          roleName: undefined,
          roleDescription: undefined,
          expiresAt: invitationInfo.expiresAt,
        } : undefined,
      }
    })
  }
}
