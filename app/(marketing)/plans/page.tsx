import { fetchStripePricing } from '@/config/stripe'
import { PricingClient } from './pricing-client'

export const metadata = {
  title: 'Plans - Choose Your Plan',
  description: 'Choose the perfect plan for your team. Start with a free trial on any plan.',
}

export default async function PricingPage() {
  // Fetch both monthly and annual pricing from Stripe API
  const monthlyPlans = await fetchStripePricing('month')
  const annualPlans = await fetchStripePricing('year')

  return (
    <div id="plans" className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Simple, transparent plans
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for your team. Start with a 14-day free trial on any plan.
        </p>
      </div>

      {/* Client-side pricing with interval toggle */}
      <PricingClient monthlyPlans={monthlyPlans} annualPlans={annualPlans} />

      {/* FAQ or Additional Info */}
      <div className="mt-16 text-center space-y-4">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto space-y-4 text-left">
          <details className="group rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">
              Can I switch plans later?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. Changes will be
              prorated based on your current billing cycle.
            </p>
          </details>

          <details className="group rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">
              What payment methods do you accept?
            </summary>
            <p className="mt-2 text-muted-foreground">
              We accept all major credit cards (Visa, Mastercard, American Express) via
              Stripe. All payments are secure and encrypted.
            </p>
          </details>

          <details className="group rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">
              Can I cancel anytime?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Absolutely! You can cancel your subscription at any time from your billing
              settings. Your subscription will remain active until the end of your current
              billing period.
            </p>
          </details>

          <details className="group rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">
              Do you offer annual billing?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Not yet, but we're working on adding annual billing options with a discount.
              Stay tuned!
            </p>
          </details>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-16 text-center space-y-4">
        <h2 className="text-2xl font-bold">Still have questions?</h2>
        <p className="text-muted-foreground">
          Contact our sales team for custom enterprise solutions
        </p>
        <a
          href="mailto:sales@yourcompany.com"
          className="inline-block text-primary hover:underline font-medium"
        >
          sales@yourcompany.com
        </a>
      </div>
    </div>
  )
}
