import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/features/auth/components/onboarding-wizard'
import { InvitationAcceptance } from '@/features/auth/components/invitation-acceptance'
import { OnboardingProgressService } from '@/services/onboarding-progress-service'

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

  // Determine initial step based on database progress, then query parameters
  let initialStep: 'signup' | 'verify-email' | 'create-organization' | 'payment' | 'create-workspace' = 'signup'

  // Check if user has already completed onboarding
  if (user) {
    // Check for organizations and workspaces
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .maybeSingle()

    // If user has both org and workspace, onboarding is complete
    if (orgs && workspaces) {
      // Clean up any stale onboarding progress
      try {
        const service = new OnboardingProgressService(supabase)
        await service.deleteOnboardingProgress()
      } catch (error) {
        console.error('Failed to clean up onboarding progress:', error)
      }
      redirect('/portal')
    }

    // Load saved progress from database
    try {
      const service = new OnboardingProgressService(supabase)
      const progress = await service.getOnboardingProgress()

      if (progress) {
        // Map wizard_step to step name
        const stepMap: Record<number, 'signup' | 'verify-email' | 'create-organization' | 'payment' | 'create-workspace'> = {
          1: 'signup',
          2: 'verify-email',
          3: 'create-organization',
          4: 'payment',
          5: 'create-workspace',
        }
        initialStep = stepMap[progress.wizard_step] || 'signup'

        // Check if payment is already completed by looking at subscription status
        if (initialStep === 'payment' && progress.organization_id) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('org_id', progress.organization_id)
            .eq('status', 'active')
            .maybeSingle()

          if (subscription) {
            // Payment already completed, move to workspace creation
            initialStep = 'create-workspace'
            // Update database to reflect this
            await service.upsertOnboardingProgress({
              wizard_step: 5,
              payment_completed: true,
            })
          }
        }

        // Override with query parameters if present (for redirects from email verification, payment, etc.)
        if (params.step) {
          initialStep = params.step as any
        } else if (params.payment_success === 'true') {
          initialStep = 'create-workspace'
          // Update database to reflect payment completion
          await service.upsertOnboardingProgress({
            wizard_step: 5,
            payment_completed: true,
          })
        }
      } else {
        // No saved progress, determine from user state
        if (params.step) {
          initialStep = params.step as any
        } else if (params.payment_success === 'true') {
          initialStep = 'create-workspace'
        } else if (params.verified === 'true' || user.email_confirmed_at) {
          initialStep = 'create-organization'
        } else if (!user.email_confirmed_at) {
          initialStep = 'verify-email'
        }
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error)
      // Fallback to query params/user state
      if (params.step) {
        initialStep = params.step as any
      } else if (params.payment_success === 'true') {
        initialStep = 'create-workspace'
      } else if (user.email_confirmed_at) {
        initialStep = 'create-organization'
      } else {
        initialStep = 'verify-email'
      }
    }
  } else {
    // Not authenticated, start at signup
    if (params.step) {
      initialStep = params.step as any
    }
  }

  // If user has an invitation, show invitation acceptance flow
  if (invitationDetails) {
    return <InvitationAcceptance invitationDetails={invitationDetails} />
  }

  return <OnboardingWizard initialStep={initialStep} userEmail={user?.email || ''} />
}
