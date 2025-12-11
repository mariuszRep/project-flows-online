import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface OnboardingProgress {
  id: string
  user_id: string
  wizard_step: number
  selected_plan_id: string | null
  selected_plan_name: string | null
  selected_plan_interval: string | null
  organization_id: string | null
  payment_completed: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface OnboardingProgressUpdate {
  wizard_step?: number
  selected_plan_id?: string | null
  selected_plan_name?: string | null
  selected_plan_interval?: string | null
  organization_id?: string | null
  payment_completed?: boolean
  email_verified?: boolean
}

/**
 * Service for managing onboarding progress in database
 * Provides single source of truth for onboarding state
 */
export class OnboardingProgressService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Get current user's onboarding progress
   */
  async getOnboardingProgress(): Promise<OnboardingProgress | null> {
    const { data, error } = await this.supabase
      .from('onboarding_progress')
      .select('*')
      .single()

    if (error) {
      // Not found is okay - user hasn't started onboarding yet
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get onboarding progress: ${error.message}`)
    }

    return data
  }

  /**
   * Create or update onboarding progress
   */
  async upsertOnboardingProgress(
    progress: OnboardingProgressUpdate
  ): Promise<OnboardingProgress> {
    const { data: { user } } = await this.supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('onboarding_progress')
      .upsert(
        {
          user_id: user.id,
          ...progress,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save onboarding progress: ${error.message}`)
    }

    return data
  }

  /**
   * Delete onboarding progress (called after successful completion)
   */
  async deleteOnboardingProgress(): Promise<void> {
    const { error } = await this.supabase
      .from('onboarding_progress')
      .delete()
      .eq('user_id', (await this.supabase.auth.getUser()).data.user?.id || '')

    if (error) {
      throw new Error(`Failed to delete onboarding progress: ${error.message}`)
    }
  }
}
