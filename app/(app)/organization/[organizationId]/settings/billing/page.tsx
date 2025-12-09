import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionByOrgId } from '@/services/subscription-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { CustomerPortalButton } from '@/features/subscriptions/components/customer-portal-button'

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

        {subscription ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>Your subscription status and details</CardDescription>
                </div>
                <Badge
                  variant={
                    subscription.status === 'active'
                      ? 'default'
                      : subscription.status === 'trialing'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {subscription.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {subscription.status === 'active' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <p className="text-lg font-semibold capitalize">{subscription.status}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Period</p>
                  <p className="text-lg font-semibold mt-1">
                    {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>

                {subscription.cancel_at_period_end && (
                  <div className="md:col-span-2">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Subscription Canceling</AlertTitle>
                      <AlertDescription>
                        Your subscription will be canceled at the end of the current billing period
                        on {new Date(subscription.current_period_end).toLocaleDateString()}.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <CustomerPortalButton />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>
                Subscribe to a plan to unlock premium features and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You don't have an active subscription. Choose a plan to get started with premium
                  features including advanced analytics, priority support, and team collaboration
                  tools.
                </p>
                <Button asChild>
                  <Link href="/plans">View Plans</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
