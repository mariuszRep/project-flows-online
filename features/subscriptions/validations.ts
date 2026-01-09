import { z } from 'zod'

/**
 * Stripe price ID validation schema
 * - Must be a non-empty string
 * - Typically starts with "price_" for Stripe
 */
export const priceIdSchema = z
  .string()
  .trim()
  .min(1, 'Price ID is required')
  .max(255, 'Price ID is too long')

/**
 * Organization ID validation schema
 * - Must be a valid UUID
 */
export const orgIdSchema = z
  .string()
  .uuid('Invalid organization ID format')

/**
 * Create subscription checkout session validation schema
 */
export const createCheckoutSessionSchema = z.object({
  priceId: priceIdSchema,
  orgId: orgIdSchema,
  orgName: z.string().optional(),
  userEmail: z.string().email('Invalid email format'),
})

/**
 * Create customer portal session validation schema
 */
export const createPortalSessionSchema = z.object({
  orgId: orgIdSchema,
  returnUrl: z.string().url('Invalid return URL format'),
})

/**
 * Cancel subscription validation schema
 */
export const cancelSubscriptionSchema = z.object({
  subscriptionId: z
    .string()
    .min(1, 'Subscription ID is required')
    .startsWith('sub_', 'Invalid Stripe subscription ID format'),
})

/**
 * Resume subscription validation schema
 */
export const resumeSubscriptionSchema = z.object({
  subscriptionId: z
    .string()
    .min(1, 'Subscription ID is required')
    .startsWith('sub_', 'Invalid Stripe subscription ID format'),
})

/**
 * Update billing interval validation schema
 */
export const updateBillingIntervalSchema = z.object({
  subscriptionId: z
    .string()
    .min(1, 'Subscription ID is required')
    .startsWith('sub_', 'Invalid Stripe subscription ID format'),
  interval: z.enum(['month', 'year'], {
    message: 'Billing interval must be either "month" or "year"',
  }),
})

// Export types
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>
export type CreatePortalSessionInput = z.infer<typeof createPortalSessionSchema>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
export type ResumeSubscriptionInput = z.infer<typeof resumeSubscriptionSchema>
export type UpdateBillingIntervalInput = z.infer<typeof updateBillingIntervalSchema>
