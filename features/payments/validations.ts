import { z } from 'zod'

/**
 * Validation schema for creating a checkout session
 * Supports configurable price and quantity for future extensibility
 */
export const createCheckoutSessionSchema = z.object({
  priceId: z
    .string()
    .trim()
    .min(1, 'Price ID is required')
    .max(255, 'Price ID is too long')
    .optional(),
  quantity: z
    .number()
    .int()
    .positive('Quantity must be at least 1')
    .default(1),
})

/**
 * Validation schema for payment method operations
 */
export const paymentMethodSchema = z.object({
  paymentMethodId: z
    .string()
    .trim()
    .min(1, 'Payment method ID is required'),
})

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>
