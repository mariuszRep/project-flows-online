'use client'

import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { OnboardingFlow } from './onboarding-flow'

interface OnboardingFlowWrapperProps {
  userEmail: string
  invitationDetails: any
  verified?: boolean
  paymentSuccess?: boolean
}

export function OnboardingFlowWrapper({
  userEmail,
  invitationDetails,
  verified,
  paymentSuccess,
}: OnboardingFlowWrapperProps) {
  const {
    setEmailVerified,
    setPaymentCompleted,
    goToStep,
    currentStep,
    loadFromDatabase,
    syncToDatabase,
    clearFromDatabase
  } = useOnboardingStore()

  const [hasLoaded, setHasLoaded] = useState(false)

  // Load onboarding progress from database on mount
  useEffect(() => {
    if (!invitationDetails) {
      const load = async () => {
        await loadFromDatabase()
        setHasLoaded(true)
      }
      load()
    } else {
      setHasLoaded(true)
    }
  }, [loadFromDatabase, invitationDetails])

  // Sync progress to database when it changes
  useEffect(() => {
    if (!invitationDetails && hasLoaded) {
      syncToDatabase()
    }
  }, [currentStep, syncToDatabase, invitationDetails, hasLoaded])

  useEffect(() => {
    // Handle verified query parameter
    // Only run this after data is loaded to respect existing progress
    if (hasLoaded && verified && currentStep < 2) {
      setEmailVerified(true)
      goToStep(2) // Go to Create Organization step
    }
  }, [verified, setEmailVerified, goToStep, currentStep, hasLoaded])

  useEffect(() => {
    // Handle payment_success query parameter
    // Only run this after data is loaded to respect existing progress
    if (hasLoaded && paymentSuccess && currentStep < 4) {
      setPaymentCompleted(true)
      goToStep(4) // Go to Create Workspace step
    }
  }, [paymentSuccess, setPaymentCompleted, goToStep, currentStep, hasLoaded])

  if (!hasLoaded && !invitationDetails) {
    return null // Or a loading spinner
  }

  return <OnboardingFlow userEmail={userEmail} invitationDetails={invitationDetails} />
}
