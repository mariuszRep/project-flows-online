'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrganizationService } from '@/services/organization-service'
import {
  createSubscriptionCheckoutSession,
  createCustomerPortalSession as createPortalSession
} from '@/services/subscription-service'

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

/**
 * Create a Stripe Customer Portal Session for subscription management
 * Retrieves customer from subscriptions table and redirects to portal
 */
export async function createCustomerPortalSession() {
  // Get authenticated user
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to access the customer portal' }
  }

  // Get user's organizations
  const orgService = new OrganizationService(supabase)
  const organizations = await orgService.getUserOrganizations()

  if (organizations.length === 0) {
    return { error: 'You must have an organization to access the portal' }
  }

  // Use the first organization
  const organization = organizations[0]

  // Set return URL (for now, back to test page - will be billing settings in production)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const returnUrl = `${baseUrl}/portal`

  const result = await createPortalSession({
    orgId: organization.id,
    returnUrl,
  })

  if (result.error) {
    return { error: result.error }
  }

  if (result.url) {
    // redirect() throws NEXT_REDIRECT - let it propagate naturally
    redirect(result.url)
  }

  return { error: 'No portal URL returned' }
}

/**
 * Create a Stripe Subscription Checkout Session with custom price ID
 * Used by the pricing page to allow plan selection
 */
export async function createSubscriptionCheckoutWithPrice(priceId: string) {
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

  // Validate price ID is provided
  if (!priceId || priceId === '') {
    return { error: 'Invalid price ID. Please configure Stripe products first.' }
  }

  const result = await createSubscriptionCheckoutSession({
    priceId,
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
