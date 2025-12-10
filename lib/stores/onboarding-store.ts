import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OnboardingProgressService } from '@/services/onboarding-progress-service'
import { createClient } from '@/lib/supabase/client'

interface OnboardingState {
  // Form data
  organizationName: string
  workspaceName: string
  organizationId: string | null

  // Plan selection fields
  selectedPlanId: string | null
  selectedPlanName: string | null
  selectedPlanInterval: string | null
  selectedPriceId: string | null

  // Verification status
  emailVerified: boolean
  paymentCompleted: boolean

  // Modal control
  isWizardModalOpen: boolean

  // Current step (0: Welcome, 1: Select Plan, 2: Create Account, 3: Verify Email, 4: Create Org, 5: Payment, 6: Create Workspace)
  currentStep: number

  // Actions
  setOrganizationName: (name: string) => void
  setWorkspaceName: (name: string) => void
  setOrganizationId: (id: string) => void
  setSelectedPlan: (planId: string, planName: string, interval: string, priceId: string) => void
  setEmailVerified: (verified: boolean) => void
  setPaymentCompleted: (completed: boolean) => void
  openWizardModal: () => void
  closeWizardModal: () => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: number) => void
  reset: () => void

  // Database sync actions
  loadFromDatabase: () => Promise<void>
  syncToDatabase: () => Promise<void>
  clearFromDatabase: () => Promise<void>
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      // Initial state
      organizationName: '',
      workspaceName: '',
      organizationId: null,
      selectedPlanId: null,
      selectedPlanName: null,
      selectedPlanInterval: null,
      selectedPriceId: null,
      emailVerified: false,
      paymentCompleted: false,
      isWizardModalOpen: false,
      currentStep: 0,

      // Actions
      setOrganizationName: (name) => set({ organizationName: name }),
      setWorkspaceName: (name) => set({ workspaceName: name }),
      setOrganizationId: (id) => set({ organizationId: id }),
      setSelectedPlan: (planId, planName, interval, priceId) =>
        set({
          selectedPlanId: planId,
          selectedPlanName: planName,
          selectedPlanInterval: interval,
          selectedPriceId: priceId
        }),
      setEmailVerified: (verified) => set({ emailVerified: verified }),
      setPaymentCompleted: (completed) => set({ paymentCompleted: completed }),
      openWizardModal: () => set({ isWizardModalOpen: true }),
      closeWizardModal: () => set({ isWizardModalOpen: false }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
      previousStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
      goToStep: (step) => set({ currentStep: step }),
      reset: () => set({
        organizationName: '',
        workspaceName: '',
        organizationId: null,
        selectedPlanId: null,
        selectedPlanName: null,
        selectedPlanInterval: null,
        selectedPriceId: null,
        emailVerified: false,
        paymentCompleted: false,
        isWizardModalOpen: false,
        currentStep: 0,
      }),

      // Database sync actions
      loadFromDatabase: async () => {
        try {
          const supabase = createClient()
          const service = new OnboardingProgressService(supabase)
          const progress = await service.getOnboardingProgress()

          if (progress) {
            set({
              currentStep: progress.wizard_step - 1, // Convert 1-based to 0-based
              selectedPlanId: progress.selected_plan_id,
              selectedPlanName: progress.selected_plan_name,
              selectedPlanInterval: progress.selected_plan_interval,
              organizationId: progress.organization_id,
              emailVerified: progress.email_verified,
              paymentCompleted: progress.payment_completed,
            })
          }
        } catch (error) {
          console.error('Failed to load onboarding progress from database:', error)
        }
      },

      syncToDatabase: async () => {
        try {
          const state = useOnboardingStore.getState()
          const supabase = createClient()
          const service = new OnboardingProgressService(supabase)

          await service.upsertOnboardingProgress({
            wizard_step: state.currentStep + 1, // Convert 0-based to 1-based
            selected_plan_id: state.selectedPlanId,
            selected_plan_name: state.selectedPlanName,
            selected_plan_interval: state.selectedPlanInterval,
            organization_id: state.organizationId,
            email_verified: state.emailVerified,
            payment_completed: state.paymentCompleted,
          })
        } catch (error) {
          console.error('Failed to sync onboarding progress to database:', error)
        }
      },

      clearFromDatabase: async () => {
        try {
          const supabase = createClient()
          const service = new OnboardingProgressService(supabase)
          await service.deleteOnboardingProgress()
        } catch (error) {
          console.error('Failed to clear onboarding progress from database:', error)
        }
      },
    }),
    {
      name: 'onboarding-storage',
    }
  )
)
