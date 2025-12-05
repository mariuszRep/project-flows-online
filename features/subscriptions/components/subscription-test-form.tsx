'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createTestSubscriptionCheckout } from '@/features/subscriptions/subscription-actions'

export function SubscriptionTestForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await createTestSubscriptionCheckout()
      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Test Subscription Checkout</h2>
        <p className="text-sm text-muted-foreground">
          Click the button below to create a test subscription checkout session. You will be redirected to Stripe's hosted checkout page.
        </p>
        <p className="text-sm text-muted-foreground">
          This will create a subscription linked to your organization.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-500 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? 'Creating session...' : 'Subscribe Now'}
        </Button>
      </form>
    </div>
  )
}
