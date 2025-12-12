
import { SubscriptionData } from '@/services/subscription-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { CustomerPortalButton } from './customer-portal-button'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SubscriptionDetailsProps {
  subscription: SubscriptionData | null
  planName?: string
}

export function SubscriptionDetails({ subscription, planName }: SubscriptionDetailsProps) {
  if (!subscription) {
    return (
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
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'canceled':
        return 'secondary'
      case 'past_due':
        return 'destructive'
      case 'expired':
        return 'outline'
      case 'trialing':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'active' || status === 'trialing') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const formattedPeriodEnd = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
  }).format(new Date(subscription.current_period_end))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>Your subscription status and details</CardDescription>
          </div>
          <Badge variant={getStatusVariant(subscription.status)}>
            {subscription.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Plan</p>
            <p className="text-lg font-semibold">{planName || 'Unknown Plan'}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(subscription.status)}
              <p className="text-lg font-semibold capitalize">{subscription.status}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Current Period End</p>
            <p className="text-lg font-semibold mt-1">{formattedPeriodEnd}</p>
          </div>

          {subscription.cancel_at_period_end && (
            <div className="md:col-span-2">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Subscription Canceling</AlertTitle>
                <AlertDescription>
                  Your subscription will be canceled at the end of the current billing period on{' '}
                  {formattedPeriodEnd}. Access until {formattedPeriodEnd}.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <CustomerPortalButton />
      </CardFooter>
    </Card>
  )
}
