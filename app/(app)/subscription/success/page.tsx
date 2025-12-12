import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { session_id } = await searchParams

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-green-100 dark:bg-green-950 p-6">
            <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Subscription Successful!</h1>
            <p className="text-muted-foreground">
              Your subscription has been created successfully
            </p>
          </div>
        </div>

        {session_id && (
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-medium">Session Details:</h3>
            <div className="text-sm">
              <p className="text-muted-foreground">Session ID:</p>
              <p className="font-mono text-xs break-all">{session_id}</p>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h3 className="font-medium">What's Next?</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Your subscription is now active</li>
            <li>Webhook events are being processed in the background</li>
            <li>Check your Stripe dashboard to see the subscription</li>
            <li>You can manage your subscription through your customer portal</li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/organization">Go to Dashboard</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4 space-y-2">
          <h3 className="font-medium text-blue-900 dark:text-blue-100">Development Notes:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Subscription is linked to your organization via metadata</li>
            <li>Webhooks will handle subscription lifecycle events</li>
            <li>Test mode: No real charges are made</li>
            <li>Monitor webhook events in your terminal running stripe listen</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
