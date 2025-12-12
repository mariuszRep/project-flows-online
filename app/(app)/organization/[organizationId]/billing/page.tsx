import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionByOrgId } from '@/services/subscription-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { SubscriptionDetails } from '@/features/subscriptions/components/subscription-details'
import { fetchStripePricing } from '@/config/stripe'

interface BillingPageProps {
  params: Promise<{
    organizationId: string
  }>
  searchParams: Promise<{
    error?: string
  }>
}

export default async function BillingPage(props: BillingPageProps) {
  const params = await props.params
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch subscription data
  const subscription = await getSubscriptionByOrgId(params.organizationId)

  // Fetch pricing plans to get the plan name
  let planName = ''
  if (subscription?.stripe_price_id) {
    const plans = await fetchStripePricing()
    const plan = plans.find((p) => p.priceId === subscription.stripe_price_id)
    planName = plan?.name || 'Unknown Plan'
  }

  const subscriptionError = searchParams.error === 'subscription_required'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing settings
          </p>
        </div>

        {subscriptionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Subscription Required</AlertTitle>
            <AlertDescription>
              You need an active subscription to access that page. Please subscribe to a plan below.
            </AlertDescription>
          </Alert>
        )}

        <SubscriptionDetails subscription={subscription} planName={planName} />

        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>
              Test subscription-based access control for premium features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Routes under /organization/[organizationId] require an active subscription to
                access. The middleware automatically checks your subscription status and redirects
                you here if your subscription is not active.
              </p>
              <Button asChild variant="outline">
                <Link href={`/organization/${params.organizationId}/premium`}>
                  Test Premium Access
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
