import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrganizationCard } from '@/features/organizations/components/organization-card'
import { OrganizationListClient } from '@/features/organizations/components/organization-list-client'
import { Building2 } from 'lucide-react'

export default async function OrganizationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's organizations with member and workspace counts
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })

  // Get member counts for each organization
  const orgIds = organizations?.map(org => org.id) || []
  const { data: memberCounts } = await supabase
    .from('permissions')
    .select('org_id')
    .eq('object_type', 'organization')
    .in('org_id', orgIds)

  // Get workspace counts for each organization
  const { data: workspaceCounts } = await supabase
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

  // Fetch pending invitations for the user
  const { data: invitations } = await supabase
    .from('invitations')
    .select(`
      id,
      status,
      expires_at,
      user_id
    `)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Create invitation map by organization ID
  const invitationMap = new Map<string, { invitationId: string; roleName: string; roleDescription: string | null; expiresAt: string }>()
  
  for (const inv of invitations || []) {
    // Get organization permission for this invitation
    const { data: orgPerm } = await supabase
      .from('permissions')
      .select(`
        object_id,
        role_id,
        roles!inner(name, description)
      `)
      .eq('principal_id', inv.user_id)
      .eq('object_type', 'organization')
      .limit(1)
      .maybeSingle()

    if (orgPerm) {
      const roles = orgPerm.roles as unknown as { name: string; description: string | null }
      invitationMap.set(orgPerm.object_id, {
        invitationId: inv.id,
        roleName: roles?.name || 'Member',
        roleDescription: roles?.description,
        expiresAt: inv.expires_at,
      })
    }
  }

  // Get all organization IDs that user has invitations for
  const invitedOrgIds = Array.from(invitationMap.keys())
  
  // Get member and workspace counts for invited organizations (if any)
  if (invitedOrgIds.length > 0) {
    const { data: invitedMemberCounts } = await supabase
      .from('permissions')
      .select('org_id')
      .eq('object_type', 'organization')
      .in('org_id', invitedOrgIds)

    const { data: invitedWorkspaceCounts } = await supabase
      .from('workspaces')
      .select('organization_id')
      .in('organization_id', invitedOrgIds)

    // Add counts to maps
    invitedMemberCounts?.forEach(m => {
      memberCountMap.set(m.org_id, (memberCountMap.get(m.org_id) || 0) + 1)
    })

    invitedWorkspaceCounts?.forEach(w => {
      workspaceCountMap.set(w.organization_id, (workspaceCountMap.get(w.organization_id) || 0) + 1)
    })
  }

  // Use only the user's organizations (invitations will be attached via the map)
  const allOrgs = organizations || []

  // Prepare organization data for client component
  const organizationsData = allOrgs.map((org) => {
    const invitation = invitationMap.get(org.id)
    return {
      id: org.id,
      name: org.name,
      memberCount: memberCountMap.get(org.id) || 0,
      workspaceCount: workspaceCountMap.get(org.id) || 0,
      invitation: invitation ? {
        invitationId: invitation.invitationId,
        roleName: invitation.roleName,
        roleDescription: invitation.roleDescription,
        expiresAt: invitation.expiresAt,
      } : undefined,
    }
  })

  return (
    <OrganizationListClient organizations={organizationsData} />
  )
}
