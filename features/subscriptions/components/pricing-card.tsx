'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type PricingPlan, formatPrice } from '@/config/stripe'
import { createSubscriptionCheckoutWithPrice } from '../subscription-actions'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

interface PricingCardProps {
  plan: PricingPlan
  currentPlanId?: string
  className?: string
}

/**
 * Pricing Card Component
 * Displays subscription plan details with features and subscribe button
 * Uses shadcn/ui Card primitives for consistent styling
 */
export function PricingCard({ plan, currentPlanId, className }: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isCurrentPlan = currentPlanId === plan.id
  const { user } = useAuth()
  const router = useRouter()

  const handleSubscribe = async () => {
    if (isCurrentPlan) return

    setIsLoading(true)
    setError(null)

    try {
      // If user is not authenticated, redirect to onboarding with plan details in URL
      if (!user) {
        const params = new URLSearchParams({
          plan_id: plan.id,
          plan_name: plan.name,
          interval: plan.interval,
          price_id: plan.priceId,
        })
        router.push(`/onboarding?${params.toString()}`)
        setIsLoading(false)
        return
      }

      // Check if authenticated user has any organizations
      const supabase = createClient()
      const { data: permissions } = await supabase
        .from('users_permissions')
        .select('object_id')
        .eq('object_type', 'organization')
        .limit(1)

      // If no organizations, redirect to onboarding with plan details in URL
      if (!permissions || permissions.length === 0) {
        const params = new URLSearchParams({
          plan_id: plan.id,
          plan_name: plan.name,
          interval: plan.interval,
          price_id: plan.priceId,
        })
        router.push(`/onboarding?${params.toString()}`)
        setIsLoading(false)
        return
      }

      // User has organizations, proceed with normal checkout
      const result = await createSubscriptionCheckoutWithPrice(plan.priceId)

      if (result?.error) {
        setError(result.error)
      }
      // If successful, the Server Action will redirect to Stripe Checkout
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session')
    } finally {
      setIsLoading(false)
    }
  }

  const cardClasses = [
    'h-full flex flex-col',
    plan.highlighted ? 'border-primary shadow-lg relative' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Card className={cardClasses}>
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary">Most Popular</Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 flex-1">
        {/* Price */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{formatPrice(plan.price, plan.currency)}</span>
            <span className="text-muted-foreground">/{plan.interval}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleSubscribe}
          disabled={isLoading || isCurrentPlan}
          className="w-full"
          variant={plan.highlighted ? 'default' : 'outline'}
          size="lg"
        >
          {isLoading
            ? 'Loading...'
            : isCurrentPlan
            ? 'Current Plan'
            : plan.cta}
        </Button>
      </CardFooter>
    </Card>
  )
}
