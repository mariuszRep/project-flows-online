import { notFound, redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'

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

  // Check if user has permission (membership) for this organization
  const { data: permission } = await supabase
    .from('permissions')
    .select('id')
    .eq('principal_id', user.id)
    .eq('org_id', organizationId)
    .eq('object_type', 'organization')
    .maybeSingle()

  // If no permission exists, user is not a member
  if (!permission) {
    notFound()
  }

  // Check if there's a pending invitation for this user and organization
  const { data: pendingInvitation } = await supabase
    .from('invitations')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', organizationId)
    .eq('status', 'pending')
    .maybeSingle()

  // If pending invitation exists, redirect to organizations list
  // User must accept the invitation first
  if (pendingInvitation) {
    redirect('/organizations')
  }

  return <>{children}</>
}
