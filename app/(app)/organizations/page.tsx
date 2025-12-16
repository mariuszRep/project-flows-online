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

  // Fetch all invitations for this user with LEFT JOIN to get organization details
  // This will show ONLY organizations where user has a pending invitation
  const { data: invitationsData } = await supabase
    .from('invitations')
    .select(`
      id,
      org_id,
      expires_at,
      status,
      organizations!inner(id, name, created_at)
    `)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  console.log('DEBUG: Invitations with organizations:', invitationsData)

  // Map invitations to organization format
  const organizations = invitationsData?.map(inv => {
    const org = (inv.organizations as any)

    return {
      id: org.id,
      name: org.name,
      created_at: org.created_at,
      roleName: undefined,
      roleDescription: undefined,
      invitation: {
        invitationId: inv.id,
        expiresAt: inv.expires_at,
      },
    }
  }) || []

  // Remove duplicates and sort
  const uniqueOrganizations = Array.from(
    new Map(organizations.map(org => [org.id, org])).values()
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Get member and workspace counts for all organizations
  const orgIds = uniqueOrganizations.map(org => org.id)

  const { data: memberCounts } = await supabase
    .from('permissions')
    .select('org_id')
    .eq('object_type', 'organization')
    .in('org_id', orgIds)

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

  // Prepare organization data for client component
  const organizationsData = uniqueOrganizations.map((org) => {
    return {
      id: org.id,
      name: org.name,
      memberCount: memberCountMap.get(org.id) || 0,
      workspaceCount: workspaceCountMap.get(org.id) || 0,
      invitation: org.invitation ? {
        invitationId: org.invitation.invitationId,
        roleName: org.roleName,
        roleDescription: org.roleDescription,
        expiresAt: org.invitation.expiresAt,
      } : undefined,
    }
  })

  return (
    <OrganizationListClient organizations={organizationsData} />
  )
}
