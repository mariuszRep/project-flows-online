import Stripe from 'stripe'

import { getSiteUrl } from '@/lib/utils'

/**
 * Payment Service - Business logic layer for Stripe payments
 * Initializes Stripe SDK and handles checkout session creation
 */

/**
 * Initialize Stripe instance with secret key
 */
function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  })
}

export interface CheckoutSessionResult {
  url?: string
  error?: string
}

/**
 * Create a Stripe Checkout Session for testing API connectivity
 */
export async function createCheckoutSession(): Promise<CheckoutSessionResult> {
  try {
    const stripe = getStripeInstance()
    const baseUrl = getSiteUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Product',
              description: 'This is a test payment to verify Stripe integration',
            },
            unit_amount: 1000, // $10.00
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/test`,
    })

    if (!session.url) {
      return { error: 'Failed to create checkout session URL' }
    }

    return { url: session.url }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { error: `Failed to create checkout session: ${message}` }
  }
}
