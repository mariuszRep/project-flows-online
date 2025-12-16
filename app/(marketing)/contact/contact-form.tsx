'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitContactForm } from '@/features/marketing/contact-actions'

export function ContactForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const result = await submitContactForm(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.success) {
        setMessage(result.success)
        // Clear form on success
        const form = document.getElementById('contact-form') as HTMLFormElement
        if (form) form.reset()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl font-bold">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have questions or want to learn more about [Company Name]? We're here to help and 
            typically respond within 24 hours.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form id="contact-form" action={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Your full name"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      placeholder="How can we help you?"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      placeholder="Tell us more about your question or inquiry..."
                      required
                      disabled={isLoading}
                      minLength={10}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 10 characters, maximum 1000 characters
                    </p>
                  </div>

                  {error && (
                    <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  {message && (
                    <div className="text-sm text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                      {message}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Quick Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1">Email</h4>
                  <a 
                    href="mailto:[Support Email]" 
                    className="text-primary hover:underline text-sm"
                  >
                    [Support Email]
                  </a>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-1">Sales</h4>
                  <a 
                    href="mailto:[Sales Email]" 
                    className="text-primary hover:underline text-sm"
                  >
                    [Sales Email]
                  </a>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Phone</h4>
                  <a 
                    href="tel:[Company Phone]" 
                    className="text-primary hover:underline text-sm"
                  >
                    [Company Phone]
                  </a>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Address</h4>
                  <p className="text-sm text-muted-foreground">
                    [Company Address]<br />
                    [City, State, ZIP]<br />
                    [Country]
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Social Media */}
            <Card>
              <CardHeader>
                <CardTitle>Follow Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="[LinkedIn URL]" target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="[Twitter URL]" target="_blank" rel="noopener noreferrer">
                    Twitter
                  </a>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="[GitHub URL]" target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Support Information */}
            <Card>
              <CardHeader>
                <CardTitle>Support Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM EST</p>
                  <p><strong>Saturday - Sunday:</strong> Closed</p>
                  <p><strong>Response Time:</strong> Within 24 hours</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    For urgent issues, please include "Urgent" in your subject line.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/docs" className="block text-sm text-primary hover:underline">
                  Documentation →
                </Link>
                <Link href="/faq" className="block text-sm text-primary hover:underline">
                  Frequently Asked Questions →
                </Link>
                <Link href="/plans" className="block text-sm text-primary hover:underline">
                  Pricing Plans →
                </Link>
                <Link href="/about" className="block text-sm text-primary hover:underline">
                  About Us →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <details className="group rounded-lg border p-4">
                    <summary className="cursor-pointer font-medium">
                      What's included in the free trial?
                    </summary>
                    <p className="mt-2 text-muted-foreground text-sm">
                      Our 14-day free trial includes access to all features available in our 
                      Professional plan, with no credit card required.
                    </p>
                  </details>

                  <details className="group rounded-lg border p-4">
                    <summary className="cursor-pointer font-medium">
                      Can I change plans anytime?
                    </summary>
                    <p className="mt-2 text-muted-foreground text-sm">
                      Yes! You can upgrade or downgrade your plan at any time. Changes are 
                      prorated based on your current billing cycle.
                    </p>
                  </details>

                  <details className="group rounded-lg border p-4">
                    <summary className="cursor-pointer font-medium">
                      Do you offer custom plans?
                    </summary>
                    <p className="mt-2 text-muted-foreground text-sm">
                      We offer custom enterprise plans for teams with specific needs. 
                      Contact our sales team to discuss your requirements.
                    </p>
                  </details>
                </div>

                <div className="space-y-4">
                  <details className="group rounded-lg border p-4">
                    <summary className="cursor-pointer font-medium">
                      What kind of support do you provide?
                    </summary>
                    <p className="mt-2 text-muted-foreground text-sm">
                      We offer email support for all plans, with priority support for Professional 
                      and Enterprise customers. Phone support is available for Enterprise plans.
                    </p>
                  </details>

                  <details className="group rounded-lg border p-4">
                    <summary className="cursor-pointer font-medium">
                      Is my data secure?
                    </summary>
                    <p className="mt-2 text-muted-foreground text-sm">
                      Absolutely! We use industry-standard encryption, regular security audits, 
                      and comply with GDPR and other privacy regulations.
                    </p>
                  </details>

                  <details className="group rounded-lg border p-4">
                    <summary className="cursor-pointer font-medium">
                      Can I export my data?
                    </summary>
                    <p className="mt-2 text-muted-foreground text-sm">
                      Yes, you can export all your data at any time from your account settings. 
                      We believe in data portability and your right to access your information.
                    </p>
                  </details>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
