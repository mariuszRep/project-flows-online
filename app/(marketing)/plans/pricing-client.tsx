'use client'

import { useState } from 'react'
import { PricingCard } from '@/features/subscriptions/components/pricing-card'
import {
  BillingIntervalToggle,
  type BillingInterval,
} from '@/features/subscriptions/components/billing-interval-toggle'
import { type PricingPlan } from '@/config/stripe'

interface PricingClientProps {
  monthlyPlans: PricingPlan[]
  annualPlans: PricingPlan[]
}

/**
 * Client-side pricing component with interval toggle
 * Handles switching between monthly and annual billing
 */
export function PricingClient({ monthlyPlans, annualPlans }: PricingClientProps) {
  const [interval, setInterval] = useState<BillingInterval>('month')

  const currentPlans = interval === 'month' ? monthlyPlans : annualPlans

  return (
    <>
      {/* Billing Interval Toggle */}
      <div className="flex justify-center mb-12">
        <BillingIntervalToggle
          defaultInterval="month"
          onIntervalChange={setInterval}
        />
      </div>

      {/* Pricing Cards */}
      {currentPlans.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {currentPlans.map((plan) => (
            <PricingCard key={plan.priceId} plan={plan} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <p>
            No {interval === 'month' ? 'monthly' : 'annual'} plans available.
            {interval === 'year' && monthlyPlans.length > 0 && (
              <> Try switching to monthly billing.</>
            )}
          </p>
        </div>
      )}
    </>
  )
}
