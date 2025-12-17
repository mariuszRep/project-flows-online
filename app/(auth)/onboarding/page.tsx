import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/features/auth/components/onboarding-wizard'

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

  // Determine initial step based on what exists in the database (RLS-protected)
  let initialStep: 'signup' | 'verify-email' | 'create-organization' | 'payment' | 'create-workspace' = 'signup'

  if (user) {
    // Check email verification first
    if (!user.email_confirmed_at && params.verified !== 'true') {
      initialStep = 'verify-email'
    } else {
      // RLS ensures we only get resources the user has access to
      const { data: organization } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .maybeSingle()

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .limit(1)
        .maybeSingle()

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .maybeSingle()

      // Determine step based on what's missing
      if (!organization) {
        initialStep = 'create-organization'
      } else if (!subscription) {
        initialStep = 'payment'
      } else if (!workspace) {
        initialStep = 'create-workspace'
      } else {
        // All requirements met, redirect to organizations
        redirect('/organizations')
      }

      // Override with query parameters if present (for redirects from payment success)
      if (params.step) {
        initialStep = params.step as any
      } else if (params.payment_success === 'true') {
        initialStep = 'create-workspace'
      } else if (params.verified === 'true' && !organization) {
        // Ensure we're at create-organization step after email verification
        initialStep = 'create-organization'
      }
    }
  } else {
    // Not authenticated, start at signup
    if (params.step) {
      initialStep = params.step as any
    }
  }

  return <OnboardingWizard initialStep={initialStep} userEmail={user?.email || ''} />
}
