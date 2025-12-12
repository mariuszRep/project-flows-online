'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  AlertCircle,
  Mail,
  CreditCard,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SignupForm } from '@/features/auth/components/signup-form'
import {
  createOrganizationWithPermissions,
  createWorkspaceWithPermissions,
} from '@/features/auth/onboarding-actions'
import { OnboardingProgressService } from '@/services/onboarding-progress-service'

type OnboardingStep = 'signup' | 'verify-email' | 'create-organization' | 'payment' | 'create-workspace'

interface OnboardingWizardProps {
  initialStep?: OnboardingStep
  userEmail?: string
}

export function OnboardingWizard({ initialStep = 'signup', userEmail = '' }: OnboardingWizardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep)

  // Plan details from URL
  const planId = searchParams.get('plan_id')
  const planName = searchParams.get('plan_name')
  const interval = searchParams.get('interval')
  const priceId = searchParams.get('price_id')

  // Step state from session storage
  const [organizationName, setOrganizationName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // Validation errors
  const [errors, setErrors] = useState<{
    organizationName?: string
    workspaceName?: string
  }>({})

  // Save plan details to session storage on mount if they exist in URL
  useEffect(() => {
    if (planId) sessionStorage.setItem('onboarding_plan_id', planId)
    if (planName) sessionStorage.setItem('onboarding_plan_name', planName)
    if (interval) sessionStorage.setItem('onboarding_interval', interval)
    if (priceId) sessionStorage.setItem('onboarding_price_id', priceId)
  }, [planId, planName, interval, priceId])

  // Load state from database and session storage on mount
  useEffect(() => {
    const loadProgress = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Load from database if authenticated
        try {
          const service = new OnboardingProgressService(supabase)
          const progress = await service.getOnboardingProgress()

          if (progress) {
            // Restore state from database
            if (progress.organization_id) setOrganizationId(progress.organization_id)
            // Also save to session storage for consistency (selected_plan_id contains Stripe priceId)
            if (progress.selected_plan_id) sessionStorage.setItem('onboarding_price_id', progress.selected_plan_id)
            if (progress.selected_plan_name) sessionStorage.setItem('onboarding_plan_name', progress.selected_plan_name)
            if (progress.selected_plan_interval) sessionStorage.setItem('onboarding_interval', progress.selected_plan_interval)
            if (progress.organization_id) sessionStorage.setItem('onboarding_org_id', progress.organization_id)

            // If we're on create-organization step but org already exists, skip to payment
            if (currentStep === 'create-organization' && progress.organization_id) {
              console.log('Organization already exists, skipping to payment')
              setCurrentStep('payment')
            }
          }
        } catch (error) {
          console.error('Failed to load onboarding progress from database:', error)
        }

        // Check if organization already exists in database
        if (currentStep === 'create-organization') {
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id, name')
            .limit(1)
            .maybeSingle()

          if (existingOrg) {
            console.log('Found existing organization, skipping to payment')
            setOrganizationId(existingOrg.id)
            sessionStorage.setItem('onboarding_org_id', existingOrg.id)
            sessionStorage.setItem('onboarding_org_name', existingOrg.name)
            setCurrentStep('payment')
          }
        }
      }

      // Also check session storage (for unauthenticated or as backup)
      const savedOrgName = sessionStorage.getItem('onboarding_org_name')
      const savedOrgId = sessionStorage.getItem('onboarding_org_id')
      const savedWorkspaceName = sessionStorage.getItem('onboarding_workspace_name')

      if (savedOrgName) setOrganizationName(savedOrgName)
      if (savedOrgId && !organizationId) setOrganizationId(savedOrgId)
      if (savedWorkspaceName) setWorkspaceName(savedWorkspaceName)
    }

    loadProgress()
  }, [])

  // Email verification polling
  useEffect(() => {
    if (currentStep === 'verify-email') {
      const interval = setInterval(async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.email_confirmed_at) {
          toast.success('Email verified!')

          // Save progress to database
          try {
            const service = new OnboardingProgressService(supabase)
            await service.upsertOnboardingProgress({
              wizard_step: 3, // create-organization step
              selected_plan_id: sessionStorage.getItem('onboarding_price_id'), // Store Stripe priceId
              selected_plan_name: sessionStorage.getItem('onboarding_plan_name'),
              selected_plan_interval: sessionStorage.getItem('onboarding_interval'),
              email_verified: true,
            })
          } catch (dbError) {
            console.error('Failed to save email verification to database:', dbError)
          }

          setCurrentStep('create-organization')
          clearInterval(interval)
        }
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [currentStep])

  // Handle signup success
  const handleSignupSuccess = async () => {
    setCurrentStep('verify-email')

    // Save initial progress to database
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const service = new OnboardingProgressService(supabase)
        await service.upsertOnboardingProgress({
          wizard_step: 2, // verify-email step
          selected_plan_id: sessionStorage.getItem('onboarding_price_id'), // Store Stripe priceId
          selected_plan_name: sessionStorage.getItem('onboarding_plan_name'),
          selected_plan_interval: sessionStorage.getItem('onboarding_interval'),
          email_verified: false,
        })
      }
    } catch (dbError) {
      console.error('Failed to save initial progress to database:', dbError)
      // Don't block the flow if database save fails
    }
  }

  // Resend verification email
  const handleResendVerification = async () => {
    const email = sessionStorage.getItem('onboarding_email')
    if (!email) {
      toast.error('Email not found. Please sign up again.')
      return
    }

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

  // Handle organization creation
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
        sessionStorage.setItem('onboarding_org_id', result.data.id)
        sessionStorage.setItem('onboarding_org_name', result.data.name)

        // Save progress to database
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const service = new OnboardingProgressService(supabase)
            await service.upsertOnboardingProgress({
              wizard_step: 4, // payment step
              selected_plan_id: sessionStorage.getItem('onboarding_price_id'), // Store Stripe priceId
              selected_plan_name: sessionStorage.getItem('onboarding_plan_name'),
              selected_plan_interval: sessionStorage.getItem('onboarding_interval'),
              organization_id: result.data.id,
              email_verified: !!user.email_confirmed_at,
            })
          }
        } catch (dbError) {
          console.error('Failed to save progress to database:', dbError)
          // Don't block the flow if database save fails
        }

        toast.success('Organization created!', {
          description: `${result.data.name} is ready`,
        })
        setCurrentStep('payment')
      } else {
        toast.error('Failed to create organization', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      toast.error('Failed to create organization')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle payment
  const handlePayment = async () => {
    // Try to get data from database first, then session storage, then URL params
    let savedPriceId = priceId
    let savedOrgId = organizationId

    // Load from database if authenticated
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const service = new OnboardingProgressService(supabase)
        const progress = await service.getOnboardingProgress()
        if (progress) {
          savedPriceId = progress.selected_plan_id || savedPriceId
          savedOrgId = progress.organization_id || savedOrgId
        }
      }
    } catch (dbError) {
      console.error('Failed to load from database, falling back to session storage:', dbError)
    }

    // Fallback to session storage
    savedPriceId = savedPriceId || sessionStorage.getItem('onboarding_price_id')
    savedOrgId = savedOrgId || sessionStorage.getItem('onboarding_org_id')

    console.log('Payment handler - checking requirements:', {
      savedPriceId,
      savedOrgId,
      priceIdFromURL: priceId,
      orgIdFromState: organizationId,
    })

    if (!savedOrgId || !savedPriceId) {
      toast.error('Missing required information', {
        description: `Organization: ${savedOrgId ? 'OK' : 'Missing'}, Price: ${savedPriceId ? 'OK' : 'Missing'}`
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: savedPriceId,
          orgId: savedOrgId,
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

  // Handle workspace creation
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

        // Delete onboarding progress from database (onboarding complete)
        try {
          const supabase = createClient()
          const service = new OnboardingProgressService(supabase)
          await service.deleteOnboardingProgress()
        } catch (dbError) {
          console.error('Failed to delete onboarding progress from database:', dbError)
          // Don't block the flow if database cleanup fails
        }

        // Clear session storage
        sessionStorage.removeItem('onboarding_email')
        sessionStorage.removeItem('onboarding_org_name')
        sessionStorage.removeItem('onboarding_org_id')
        sessionStorage.removeItem('onboarding_workspace_name')
        sessionStorage.removeItem('onboarding_plan_id')
        sessionStorage.removeItem('onboarding_plan_name')
        sessionStorage.removeItem('onboarding_interval')
        sessionStorage.removeItem('onboarding_price_id')

        // Redirect to organizations list
        router.push('/organization')
      } else {
        toast.error('Failed to create workspace', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      toast.error('Failed to create workspace')
    } finally {
      setIsLoading(false)
    }
  }

  // Get step number for progress indicator
  const getStepNumber = (step: OnboardingStep): number => {
    const steps: OnboardingStep[] = ['signup', 'verify-email', 'create-organization', 'payment', 'create-workspace']
    return steps.indexOf(step)
  }

  const currentStepNumber = getStepNumber(currentStep)

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto">
        {[0, 1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center shrink-0">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                step < currentStepNumber
                  ? 'border-primary bg-primary text-primary-foreground'
                  : step === currentStepNumber
                  ? 'border-primary bg-background text-primary'
                  : 'border-muted-foreground/30 bg-background text-muted-foreground'
              }`}
            >
              {step < currentStepNumber ? <Check className="h-5 w-5" /> : <span>{step + 1}</span>}
            </div>
            {step < 4 && (
              <div
                className={`h-0.5 w-12 transition-colors ${
                  step < currentStepNumber ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step: Signup */}
      {currentStep === 'signup' && (
        <SignupForm
          onSuccess={handleSignupSuccess}
          showPlanBadge={!!planName}
          planName={planName || undefined}
          showFooter={true}
        />
      )}

      {/* Step: Verify Email */}
      {currentStep === 'verify-email' && (
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
                We've sent a verification email to <strong>{sessionStorage.getItem('onboarding_email') || userEmail}</strong>. Please check your inbox and click the
                verification link.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Waiting for email verification... Click the link in your email to continue.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleResendVerification} disabled={isLoading}>
              Resend Email
            </Button>
            <Button variant="ghost" onClick={() => setCurrentStep('create-organization')} disabled={isLoading}>
              Skip for now
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step: Create Organization */}
      {currentStep === 'create-organization' && (
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
            <Button variant="outline" onClick={() => setCurrentStep('verify-email')} disabled={isLoading}>
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

      {/* Step: Payment */}
      {currentStep === 'payment' && (
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
                <span className="font-medium">
                  {planName || sessionStorage.getItem('onboarding_plan_name') || 'Selected Plan'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Billing</span>
                <span className="font-medium capitalize">
                  {interval || sessionStorage.getItem('onboarding_interval') || 'monthly'}
                </span>
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
            <Button variant="outline" onClick={() => setCurrentStep('create-organization')} disabled={isLoading}>
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

      {/* Step: Create Workspace */}
      {currentStep === 'create-workspace' && (
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
            <Button variant="outline" onClick={() => setCurrentStep('payment')} disabled={isLoading}>
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
