'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, UserCheck } from 'lucide-react'
import { signUp } from '@/features/auth/auth-actions'
import { toast } from 'sonner'
import { OAuthButtons } from './oauth-buttons'

interface SignupFormProps {
  onSuccess?: () => void
  showPlanBadge?: boolean
  planName?: string
  showFooter?: boolean
}

export function SignupForm({
  onSuccess,
  showPlanBadge = false,
  planName,
  showFooter = false
}: SignupFormProps = {}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      // Store email in session storage for onboarding flow
      if (onSuccess) {
        sessionStorage.setItem('onboarding_email', email)
      }

      const result = await signUp(formData)
      if (result.error) {
        setError(result.error)
        if (onSuccess) {
          toast.error('Failed to create account', {
            description: result.error,
          })
        }
      } else {
        setMessage('Account created! Check your email to confirm your account.')
        if (onSuccess) {
          toast.success('Account created!', {
            description: 'Check your email to verify your account',
          })
          onSuccess()
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      if (onSuccess) {
        toast.error('Failed to create account')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <CardTitle>Create an account</CardTitle>
          </div>
          <CardDescription>
            Enter your details to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthButtons showDivider={false} />

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OR
              </span>
            </div>
          </div>

          <form id="signup-form" action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 dark:text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div className="text-sm text-green-500 dark:text-green-400">
                {message}
              </div>
            )}
          </form>
        </CardContent>

        {/* Footer always renders to show at least the Sign Up button if not in footer mode, 
          but here we assume standard vertically stacked layout requested by user. 
          If showFooter is false, we might hide the Change Plan button but we still need the Sign Up button.
          However, the user requirement implies a specific layout structure. 
          We will keep the footer structure consistent. */}
        <CardFooter className="flex flex-col gap-4">
          <div className="flex justify-between w-full">
            {showFooter && (
              <Button variant="outline" onClick={() => router.push('/#plans')} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Plan
              </Button>
            )}
            <Button type="submit" form="signup-form" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign Up'}
              {!isLoading && onSuccess && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="text-center text-sm text-muted-foreground w-full mt-4">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="text-primary hover:underline font-medium"
        >
          Log in
        </button>
      </div>
    </div >
  )
}
