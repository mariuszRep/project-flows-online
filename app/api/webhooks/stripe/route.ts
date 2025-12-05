import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

/**
 * Stripe Webhook Endpoint - Next.js App Router
 * Handles incoming webhook events from Stripe with signature verification
 *
 * Important: Uses request.text() to get raw body for signature verification
 * Stripe webhook signature verification requires the raw request body
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

export async function POST(request: NextRequest) {
  const stripe = getStripeInstance()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  try {
    // Get the raw body as text - required for signature verification
    const body = await request.text()

    // Get the signature from the header
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('No stripe-signature header found')
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    // Verify the webhook signature and construct the event
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    // Log the received event for testing
    console.log('✓ Webhook verified:', {
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
    })

    // Return success response
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    // Signature verification failed
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('✗ Webhook signature verification failed:', message)

    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }
}
