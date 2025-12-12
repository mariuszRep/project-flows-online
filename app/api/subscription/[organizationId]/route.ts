import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionByOrgId } from '@/services/subscription-service'
import { fetchStripePricing } from '@/config/stripe'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const { organizationId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch subscription data
    const subscription = await getSubscriptionByOrgId(organizationId)

    // Fetch pricing plans to get the plan name
    let planName = ''
    if (subscription?.stripe_price_id) {
      const plans = await fetchStripePricing()
      const plan = plans.find((p) => p.priceId === subscription.stripe_price_id)
      planName = plan?.name || 'Unknown Plan'
    }

    return NextResponse.json({
      subscription,
      planName,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription data' },
      { status: 500 }
    )
  }
}
