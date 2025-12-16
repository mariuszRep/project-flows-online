'use server'

/**
 * Contact Actions - Next.js Server Actions
 * Handle contact form submissions and related operations
 */

export async function submitContactForm(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim()
  const message = (formData.get('message') as string)?.trim()

  // Basic validation
  if (!name || !email || !subject || !message) {
    return { error: 'All fields are required' }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address' }
  }

  // Message length validation
  if (message.length < 10) {
    return { error: 'Message must be at least 10 characters long' }
  }

  if (message.length > 1000) {
    return { error: 'Message must be less than 1000 characters' }
  }

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
      success: 'Thank you for your message! We\'ll get back to you within 24 hours.' 
    }
  } catch (error) {
    console.error('Contact form submission error:', error)
    return { 
      error: 'Something went wrong. Please try again or contact us directly at [Support Email].' 
    }
  }
}
