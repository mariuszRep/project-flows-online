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

/**
 * Handle different webhook event types
 */
async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    // Checkout Session Events
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('💳 Checkout session completed:', {
        sessionId: session.id,
        mode: session.mode,
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
      })
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('⏰ Checkout session expired:', {
        sessionId: session.id,
        mode: session.mode,
      })
      break
    }

    // Subscription Events
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription
      console.log('🎉 Subscription created:', {
        subscriptionId: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
        metadata: subscription.metadata,
        items: subscription.items.data.map((item) => ({
          priceId: item.price.id,
          quantity: item.quantity,
        })),
      })
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      console.log('🔄 Subscription updated:', {
        subscriptionId: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
        metadata: subscription.metadata,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      console.log('❌ Subscription deleted:', {
        subscriptionId: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
        metadata: subscription.metadata,
      })
      break
    }

    // Invoice Events
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      console.log('✅ Invoice paid:', {
        invoiceId: invoice.id,
        customer: invoice.customer,
        subscription: invoice.subscription,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.log('⚠️ Invoice payment failed:', {
        invoiceId: invoice.id,
        customer: invoice.customer,
        subscription: invoice.subscription,
        amount: invoice.amount_due,
        currency: invoice.currency,
      })
      break
    }

    // Payment Intent Events (for one-time payments)
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('💰 Payment succeeded:', {
        paymentIntentId: paymentIntent.id,
        customer: paymentIntent.customer,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      })
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('❌ Payment failed:', {
        paymentIntentId: paymentIntent.id,
        customer: paymentIntent.customer,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      })
      break
    }

    // Customer Events
    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer
      console.log('👤 Customer created:', {
        customerId: customer.id,
        email: customer.email,
        metadata: customer.metadata,
      })
      break
    }

    case 'customer.updated': {
      const customer = event.data.object as Stripe.Customer
      console.log('👤 Customer updated:', {
        customerId: customer.id,
        email: customer.email,
        metadata: customer.metadata,
      })
      break
    }

    default:
      console.log('📫 Unhandled event type:', event.type)
  }
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

    // Handle different event types
    await handleWebhookEvent(event)

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
