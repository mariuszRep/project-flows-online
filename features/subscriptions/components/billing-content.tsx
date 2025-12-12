'use client'

import * as React from 'react'
import { SubscriptionDetails } from './subscription-details'
import type { SubscriptionData } from '@/services/subscription-service'

interface BillingContentProps {
  organizationId: string
}

export function BillingContent({ organizationId }: BillingContentProps) {
  const [subscription, setSubscription] = React.useState<SubscriptionData | null>(null)
  const [planName, setPlanName] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Fetch subscription data
        const subResponse = await fetch(`/api/subscription/${organizationId}`)
        if (subResponse.ok) {
          const subData = await subResponse.json()
          setSubscription(subData.subscription)
          setPlanName(subData.planName || '')
        }
      } catch (error) {
        console.error('Error fetching billing data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading billing information...</div>
      </div>
    )
  }

  return <SubscriptionDetails subscription={subscription} planName={planName} />
}
