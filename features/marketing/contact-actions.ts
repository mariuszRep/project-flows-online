'use server'

import { contactFormSchema } from './validations'

/**
 * Contact Actions - Next.js Server Actions
 * Handle contact form submissions and related operations
 */

export async function submitContactForm(formData: FormData) {
  const parsed = contactFormSchema.safeParse({
    name: (formData.get('name') as string) || '',
    email: (formData.get('email') as string) || '',
    subject: (formData.get('subject') as string) || '',
    message: (formData.get('message') as string) || '',
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Invalid form data'
    return { error: firstError }
  }

  const { name, email, subject, message } = parsed.data

  try {
    // Here you would typically:
    // 1. Send an email to your support team
    // 2. Store the message in a database
    // 3. Create a ticket in your support system
    // 4. Send confirmation email to the user
    // For now, we'll just log the submission (in production, use proper logging)
    console.log('Contact form submission:', {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
    })

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      success: "Thank you for your message! We'll get back to you within 24 hours.",
    }
  } catch (error) {
    console.error('Contact form submission error:', error)
    return {
      error: 'Something went wrong. Please try again or contact us directly at [Support Email].',
    }
  }
}
