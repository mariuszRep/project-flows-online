import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionTestForm } from '@/features/subscriptions/components/subscription-test-form'

export default async function SubscriptionTestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Stripe Subscription Test</h1>
          <p className="text-muted-foreground">
            Test the Stripe subscription integration by creating a subscription checkout session
          </p>
        </div>

        <SubscriptionTestForm />

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h3 className="font-medium">Testing Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click the button to create a subscription checkout session</li>
            <li>You'll be redirected to Stripe's hosted checkout page</li>
            <li>Use test card: 4242 4242 4242 4242</li>
            <li>Use any future expiry date and any 3-digit CVC</li>
            <li>Complete the test subscription</li>
            <li>You'll be redirected to the success page</li>
          </ol>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4 space-y-2">
          <h3 className="font-medium text-blue-900 dark:text-blue-100">How It Works:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Your subscription is linked to your organization</li>
            <li>Customer and subscription metadata include your org_id</li>
            <li>Webhooks will notify your app of subscription events</li>
            <li>You can track subscription status in Stripe dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
