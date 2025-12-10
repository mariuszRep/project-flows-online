'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { acceptInvitation } from '@/features/invitations/invitation-actions'
import {
  createOrganizationWithPermissions,
  createWorkspaceWithPermissions,
} from '@/features/onboarding/onboarding-actions'
import { signUp } from '@/features/auth/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Check,
  Building2,
  FolderKanban,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  UserCheck,
  Mail,
  CreditCard,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface InvitationDetails {
  invitationId: string
  organizationId: string
  organizationName: string
  roleName: string
  roleDescription: string | null
  workspaceCount: number
}

interface OnboardingFlowProps {
  userEmail: string
  invitationDetails: InvitationDetails | null
}

export function OnboardingFlow({ userEmail, invitationDetails }: OnboardingFlowProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Zustand store for organic user flow
  const {
    organizationName,
    workspaceName,
    organizationId,
    currentStep,
    selectedPlanId,
    selectedPlanName,
    selectedPlanInterval,
    selectedPriceId,
    emailVerified,
    setOrganizationName,
    setWorkspaceName,
    setOrganizationId,
    setEmailVerified,
    nextStep,
    previousStep,
    goToStep,
    clearFromDatabase,
  } = useOnboardingStore()

  // Validation errors
  const [errors, setErrors] = useState<{ organizationName?: string; workspaceName?: string; email?: string; password?: string }>({})

  // Account creation state
  const [email, setEmail] = useState(userEmail || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Email verification polling
  useEffect(() => {
    if (currentStep === 3 && !emailVerified) {
      const interval = setInterval(async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.email_confirmed_at) {
          setEmailVerified(true)
          toast.success('Email verified!')
          nextStep()
          clearInterval(interval)
        }
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [currentStep, emailVerified, setEmailVerified, nextStep])

  // Check for authentication when reaching Step 4 (Create Organization)
  useEffect(() => {
    if (currentStep === 4) {
      const checkAuth = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          toast.error('Authentication required', {
            description: 'Please log in to continue setting up your organization.'
          })
          router.push('/login')
        }
      }
      checkAuth()
    }
  }, [currentStep, router])

  // Invitation acceptance flow
  const handleAcceptInvitation = async () => {
    if (!invitationDetails) return

    setIsLoading(true)
    try {
      const result = await acceptInvitation(invitationDetails.invitationId)

      if (result.success) {
        toast.success('Invitation accepted!', {
          description: `Welcome to ${invitationDetails.organizationName}`,
        })

        // Redirect based on workspace access
        if (invitationDetails.workspaceCount > 0) {
          router.push(`/organization/${invitationDetails.organizationId}`)
        } else {
          router.push(`/organization/${invitationDetails.organizationId}/settings`)
        }
      } else {
        toast.error('Failed to accept invitation', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Account creation
  const handleCreateAccount = async () => {
    setErrors({})

    if (!email.trim()) {
      setErrors({ email: 'Email is required' })
      return
    }

    if (!password || password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' })
      return
    }

    if (password !== confirmPassword) {
      setErrors({ password: 'Passwords do not match' })
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)

      const result = await signUp(formData)

      if (result.error) {
        toast.error('Failed to create account', {
          description: result.error,
        })
      } else {
        toast.success('Account created!', {
          description: 'Check your email to verify your account',
        })
        nextStep()
      }
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error('Failed to create account', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Resend verification email
  const handleResendVerification = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        toast.error('Failed to resend email', {
          description: error.message,
        })
      } else {
        toast.success('Verification email sent!')
      }
    } catch (error) {
      console.error('Error resending verification:', error)
      toast.error('Failed to resend email')
    } finally {
      setIsLoading(false)
    }
  }

  // Organization creation
  const handleCreateOrganization = async () => {
    setErrors({})

    if (!organizationName.trim()) {
      setErrors({ organizationName: 'Organization name is required' })
      return
    }

    if (organizationName.trim().length > 100) {
      setErrors({ organizationName: 'Organization name must be less than 100 characters' })
      return
    }

    setIsLoading(true)
    try {
      const result = await createOrganizationWithPermissions(organizationName.trim())

      if (result.success && result.data) {
        setOrganizationId(result.data.id)
        toast.success('Organization created!', {
          description: `${result.data.name} is ready`,
        })
        nextStep()
      } else {
        toast.error('Failed to create organization', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      toast.error('Failed to create organization', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Payment handling
  const handlePayment = async () => {
    if (!organizationId || !selectedPriceId) {
      toast.error('Missing required information')
      return
    }

    setIsLoading(true)
    try {
      // Call subscription service to create checkout session
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: selectedPriceId,
          orgId: organizationId,
          isOnboarding: true,
        }),
      })

      const result = await response.json()

      if (result.url) {
        window.location.href = result.url
      } else {
        toast.error('Failed to create checkout session', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      toast.error('Failed to create checkout session')
    } finally {
      setIsLoading(false)
    }
  }

  // Workspace creation
  const handleCreateWorkspace = async () => {
    setErrors({})

    if (!workspaceName.trim()) {
      setErrors({ workspaceName: 'Workspace name is required' })
      return
    }

    if (workspaceName.trim().length > 100) {
      setErrors({ workspaceName: 'Workspace name must be less than 100 characters' })
      return
    }

    if (!organizationId) {
      toast.error('Organization ID is missing')
      return
    }

    setIsLoading(true)
    try {
      const result = await createWorkspaceWithPermissions(workspaceName.trim(), organizationId)

      if (result.success && result.data) {
        toast.success('Workspace created!', {
          description: `${result.data.name} is ready to use`,
        })

        // Clear onboarding progress from database after successful completion
        await clearFromDatabase()

        // Redirect to portal
        router.push('/portal')
      } else {
        toast.error('Failed to create workspace', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      toast.error('Failed to create workspace', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render invitation acceptance flow
  if (invitationDetails) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <CardTitle>You've Been Invited!</CardTitle>
          </div>
          <CardDescription>Accept your invitation to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Organization</span>
              <span className="font-medium">{invitationDetails.organizationName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Role</span>
              <Badge variant="secondary" className="capitalize">
                {invitationDetails.roleName}
              </Badge>
            </div>
            {invitationDetails.roleDescription && (
              <p className="text-sm text-muted-foreground">{invitationDetails.roleDescription}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Workspace Access</span>
              <span className="font-medium">
                {invitationDetails.workspaceCount} workspace{invitationDetails.workspaceCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {invitationDetails.workspaceCount === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No workspace access</AlertTitle>
              <AlertDescription>
                You don't have access to any workspaces yet. Contact your admin to get workspace access.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleAcceptInvitation} disabled={isLoading} className="w-full">
            {isLoading ? 'Accepting...' : 'Accept Invitation'}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Email verification polling
  useEffect(() => {
    if (currentStep === 1 && !emailVerified) {
      const interval = setInterval(async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.email_confirmed_at) {
          setEmailVerified(true)
          toast.success('Email verified!')
          nextStep()
          clearInterval(interval)
        }
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [currentStep, emailVerified, setEmailVerified, nextStep])

  // Check for authentication when reaching Step 2 (Create Organization)
  useEffect(() => {
    if (currentStep === 2) {
      const checkAuth = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          toast.error('Authentication required', {
            description: 'Please log in to continue setting up your organization.'
          })
          router.push('/login')
        }
      }
      checkAuth()
    }
  }, [currentStep, router])

  // Render organic user wizard flow
  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto">
        {[0, 1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center shrink-0">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${step < currentStep
                ? 'border-primary bg-primary text-primary-foreground'
                : step === currentStep
                  ? 'border-primary bg-background text-primary'
                  : 'border-muted-foreground/30 bg-background text-muted-foreground'
                }`}
            >
              {step < currentStep ? <Check className="h-5 w-5" /> : <span>{step + 1}</span>}
            </div>
            {step < 4 && (
              <div
                className={`h-0.5 w-12 transition-colors ${step < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Create Account */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-6 w-6 text-primary" />
                <CardTitle>Create Your Account</CardTitle>
              </div>
              {selectedPlanName && (
                <Badge variant="secondary" className="text-xs">
                  {selectedPlanName} Plan
                </Badge>
              )}
            </div>
            <CardDescription>Enter your details to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                minLength={6}
                className={errors.password ? 'border-red-500' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                minLength={6}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => router.push('/#plans')} disabled={isLoading}>
                Change Plan
              </Button>
              <Button onClick={handleCreateAccount} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Account'}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-primary hover:underline font-medium"
              >
                Log in
              </button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Step 1: Verify Email */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-6 w-6 text-primary" />
              <CardTitle>Verify Your Email</CardTitle>
            </div>
            <CardDescription>Check your inbox to confirm your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Required</AlertTitle>
              <AlertDescription>
                We've sent a verification email to <strong>{email}</strong>. Please check your inbox and click the
                verification link.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Waiting for email verification... Click the link in your email to continue.
              <br />
              <span className="text-xs">You may be asked to log in again.</span>
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleResendVerification} disabled={isLoading}>
              Resend Email
            </Button>
            <Button variant="ghost" onClick={() => goToStep(2)} disabled={isLoading}>
              Skip for now
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Create Organization */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <CardTitle>Create Your Organization</CardTitle>
            </div>
            <CardDescription>This will be the top-level container for your workspaces</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="e.g., Acme Inc, My Company"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateOrganization()
                  }
                }}
                disabled={isLoading}
                className={errors.organizationName ? 'border-red-500' : ''}
              />
              {errors.organizationName && (
                <p className="text-sm text-red-500">{errors.organizationName}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={previousStep} disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleCreateOrganization} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Continue'}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Payment */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-6 w-6 text-primary" />
              <CardTitle>Complete Payment</CardTitle>
            </div>
            <CardDescription>Subscribe to your selected plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="font-medium">{selectedPlanName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Billing</span>
                <span className="font-medium capitalize">{selectedPlanInterval}</span>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Secure Checkout</AlertTitle>
              <AlertDescription>
                You'll be redirected to Stripe to complete your payment securely.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={previousStep} disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handlePayment} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Proceed to Payment'}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Create Workspace */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban className="h-6 w-6 text-primary" />
              <CardTitle>Create Your First Workspace</CardTitle>
            </div>
            <CardDescription>Workspaces help you organize your projects and teams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                placeholder="e.g., Main, Development, Marketing"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateWorkspace()
                  }
                }}
                disabled={isLoading}
                className={errors.workspaceName ? 'border-red-500' : ''}
              />
              {errors.workspaceName && (
                <p className="text-sm text-red-500">{errors.workspaceName}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={previousStep} disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Complete Setup'}
              {!isLoading && <Check className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
