'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrganizationService } from '@/services/organization-service'
import { createSubscriptionCheckoutSession } from '@/services/subscription-service'

/**
 * Subscription Actions - Next.js Server Actions
 * Thin wrappers around service layer that handle framework-specific concerns
 */

/**
 * Create a Stripe Subscription Checkout Session and redirect to checkout
 * Uses the first organization for the current user and links it to the subscription
 */
export async function createTestSubscriptionCheckout() {
  // Get authenticated user
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to create a subscription' }
  }

  // Get user's organizations
  const orgService = new OrganizationService(supabase)
  const organizations = await orgService.getUserOrganizations()

  if (organizations.length === 0) {
    return { error: 'You must have an organization to create a subscription' }
  }

  // Use the first organization
  const organization = organizations[0]

  // Use test price ID (you can make this configurable later)
  const testPriceId = process.env.STRIPE_TEST_PRICE_ID || 'price_1234567890'

  const result = await createSubscriptionCheckoutSession({
    priceId: testPriceId,
    orgId: organization.id,
    orgName: organization.name,
    userEmail: user.email || '',
  })

  if (result.error) {
    return { error: result.error }
  }

  if (result.url) {
    // redirect() throws NEXT_REDIRECT - let it propagate naturally
    redirect(result.url)
  }

  return { error: 'No checkout URL returned' }
}
