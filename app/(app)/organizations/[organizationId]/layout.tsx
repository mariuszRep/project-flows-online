import { notFound, redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PermissionsService } from '@/services/permission-service'
import { InvitationService } from '@/services/invitation-service'

interface OrganizationLayoutProps {
  children: ReactNode
  params: Promise<{ organizationId: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function OrganizationLayout({
  children,
  params,
}: OrganizationLayoutProps) {
  const { organizationId } = await params

  // Validate UUID format
  if (!UUID_REGEX.test(organizationId)) {
    notFound()
  }

  // Get authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Initialize services
  const permissionsService = new PermissionsService(supabase)
  const invitationService = new InvitationService(supabase)

  // Check if user has permission (membership) for this organization
  const hasAccess = await permissionsService.checkOrgAccess(user.id, organizationId)

  // If no permission exists, user is not a member
  if (!hasAccess) {
    notFound()
  }

  // Check if there's a pending invitation for this user and organization
  const hasPendingInvite = await invitationService.hasPendingInvitation(user.id, organizationId)

  // If pending invitation exists, redirect to organizations list
  // User must accept the invitation first
  if (hasPendingInvite) {
    redirect('/organizations')
  }

  return <>{children}</>
}
