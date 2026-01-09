import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'

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

      // Handle subscription checkout completion
      if (session.mode === 'subscription' && session.subscription) {
        try {
          console.log('🔄 Processing subscription checkout...')
          const stripe = getStripeInstance()
          const supabase = createServiceRoleClient()

          // Retrieve full subscription object with all fields
          console.log('📥 Retrieving subscription:', session.subscription)
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            {
              expand: ['default_payment_method']
            }
          )

          console.log('📋 Full subscription object:', JSON.stringify(subscription, null, 2))

          // Get org_id from subscription metadata (more reliable than customer metadata)
          const orgId = subscription.metadata?.org_id
          console.log('🔍 Found org_id in subscription metadata:', orgId)

          if (!orgId) {
            console.error('❌ No org_id found in subscription metadata:', subscription.metadata)
            break
          }

          // Retrieve customer for customer_id
          console.log('📥 Retrieving customer:', session.customer)
          const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer

          // Insert subscription record into database
          console.log('💾 Inserting subscription into database...')

          // Get period timestamps from subscription item
          const subscriptionItem = subscription.items.data[0]
          const currentPeriodStart = subscriptionItem.current_period_start
          const currentPeriodEnd = subscriptionItem.current_period_end

          console.log('📊 Subscription data:', {
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at
          })

          const { error: insertError } = await supabase
            .from('subscriptions')
            .insert({
              org_id: orgId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customer.id,
              stripe_price_id: subscription.items.data[0].price.id,
              status: subscription.status,
              current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
              current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end || false,
              canceled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
            })

          if (insertError) {
            console.error('❌ Error inserting subscription:', insertError)
          } else {
            console.log('✓ Subscription saved to database:', subscription.id)
          }
        } catch (error) {
          console.error('❌ Error processing subscription checkout:', error)
        }
      } else {
        console.log('⏭️  Skipping - not a subscription checkout or no subscription ID')
      }
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
      const currentPeriodEnd = subscription.items.data[0].current_period_end
      const currentPeriodStart = subscription.items.data[0].current_period_start

      console.log('🔄 Subscription updated:', {
        subscriptionId: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at,
        current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
        metadata: subscription.metadata,
      })

      // Log cancellation explicitly
      if (subscription.cancel_at_period_end) {
        console.log('⚠️  SUBSCRIPTION SCHEDULED FOR CANCELLATION:', {
          subscriptionId: subscription.id,
          willCancelAt: new Date(currentPeriodEnd * 1000).toISOString(),
          daysRemaining: Math.ceil((currentPeriodEnd * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
        })
      }

      // Update subscription in database
      const supabase = createServiceRoleClient()
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
          current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at
            ? new Date((subscription.canceled_at as number) * 1000).toISOString()
            : null,
        })
        .eq('stripe_subscription_id', subscription.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
      } else {
        console.log('✓ Subscription updated in database:', subscription.id)
      }
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

      // Delete subscription from database
      const supabase = createServiceRoleClient()
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('stripe_subscription_id', subscription.id)

      if (deleteError) {
        console.error('Error deleting subscription:', deleteError)
      } else {
        console.log('✓ Subscription deleted from database:', subscription.id)
      }
      break
    }

    // Invoice Events
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      console.log('✅ Invoice paid:', {
        invoiceId: invoice.id,
        customer: invoice.customer,
        subscription: (invoice as any).subscription,
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
        subscription: (invoice as any).subscription,
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
