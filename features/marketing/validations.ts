import { z } from 'zod'

/**
 * Contact form submission schema
 */
export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name is too long'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address'),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(150, 'Subject is too long'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters long')
    .max(1000, 'Message must be less than 1000 characters'),
})

/**
 * Newsletter signup schema
 */
export const newsletterSignupSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address'),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>
export type NewsletterSignupInput = z.infer<typeof newsletterSignupSchema>
