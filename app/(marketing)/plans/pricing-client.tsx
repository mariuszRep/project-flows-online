'use client'

import { useState } from 'react'
import { PricingCard } from '@/features/subscriptions/components/pricing-card'
import {
  BillingIntervalToggle,
  type BillingInterval,
} from '@/features/subscriptions/components/billing-interval-toggle'
import { type PricingPlan } from '@/config/stripe'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { OnboardingFlow } from '@/features/auth/components/onboarding-flow'
import { useAuth } from '@/hooks/use-auth'

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
  const { isWizardModalOpen, closeWizardModal } = useOnboardingStore()
  const { user } = useAuth()

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
        <div className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto">
          {currentPlans.map((plan) => (
            <div key={plan.priceId} className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.334rem)] flex">
              <PricingCard plan={plan} className="w-full" />
            </div>
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

      {/* Onboarding Wizard Modal */}
      <Dialog open={isWizardModalOpen} onOpenChange={closeWizardModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <OnboardingFlow userEmail={user?.email || ''} invitationDetails={null} />
        </DialogContent>
      </Dialog>
    </>
  )
}
