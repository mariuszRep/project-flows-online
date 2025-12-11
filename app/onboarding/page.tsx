import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/features/auth/components/onboarding-wizard'
import { InvitationAcceptance } from '@/features/auth/components/invitation-acceptance'

interface OnboardingPageProps {
  searchParams: Promise<{
    verified?: string
    payment_success?: string
    step?: string
    plan_id?: string
    price_id?: string
    plan_name?: string
    interval?: string
  }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient()
  const params = await searchParams

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('Auth check error:', authError)
  }

  // Check for pending invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, status, expires_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let invitationDetails = null

  if (invitation) {
    // Check if invitation is expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)

    if (now > expiresAt) {
      // Mark as expired
      await supabase.from('invitations').update({ status: 'expired' }).eq('id', invitation.id)
    } else {
      // Get invitation details with organization and role info
      const { data: permissions } = await supabase
        .from('permissions')
        .select('object_id, role_id, roles!inner(name, description)')
        .eq('object_type', 'organization')
        .limit(1)
        .maybeSingle()

      if (permissions) {
        // Get organization name
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', permissions.object_id)
          .single()

        // Get workspace permissions count
        const { count } = await supabase
          .from('permissions')
          .select('id', { count: 'exact', head: true })
          .eq('object_type', 'workspace')

        const roles = permissions.roles as unknown as { name: string; description: string | null }

        invitationDetails = {
          invitationId: invitation.id,
          organizationId: org?.id || '',
          organizationName: org?.name || 'Unknown Organization',
          roleName: roles?.name || 'Unknown',
          roleDescription: roles?.description || null,
          workspaceCount: count || 0,
        }
      }
    }
  }

  // Determine initial step based on query parameters
  let initialStep: 'signup' | 'verify-email' | 'create-organization' | 'payment' | 'create-workspace' = 'signup'

  if (params.step) {
    initialStep = params.step as any
  } else if (params.payment_success === 'true') {
    initialStep = 'create-workspace'
  } else if (params.verified === 'true' || user?.email_confirmed_at) {
    initialStep = 'create-organization'
  } else if (user && !user.email_confirmed_at) {
    initialStep = 'verify-email'
  }

  // If user has an invitation, show invitation acceptance flow
  if (invitationDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl">
          <InvitationAcceptance invitationDetails={invitationDetails} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <OnboardingWizard initialStep={initialStep} userEmail={user?.email || ''} />
      </div>
    </div>
  )
}
