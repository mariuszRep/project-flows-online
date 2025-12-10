import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type OnboardingProgress = Database['public']['Tables']['onboarding_progress']['Row']

export type UpdateOnboardingProgressParams = Database['public']['Tables']['onboarding_progress']['Update']

/**
 * Service for managing onboarding progress tracking
 * Handles CRUD operations for onboarding_progress table
 */
export class OnboardingProgressService {
  constructor(private readonly supabase: SupabaseClient<Database>) { }

  /**
   * Get onboarding progress for the current user
   */
  async getOnboardingProgress(): Promise<OnboardingProgress | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()

      if (!user) {
        return null
      }

      const { data, error } = await this.supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      return data as OnboardingProgress | null
    } catch (error) {
      console.error('Error fetching onboarding progress:', error)
      return null
    }
  }

  /**
   * Create or update onboarding progress (upsert operation)
   */
  async upsertOnboardingProgress(params: UpdateOnboardingProgressParams): Promise<OnboardingProgress | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()

      if (!user) {
        return null
      }

      const { data, error } = await this.supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          ...params,
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('Failed to upsert onboarding progress')
      }

      return data as OnboardingProgress
    } catch (error) {
      console.error('Error upserting onboarding progress:', JSON.stringify(error, null, 2))
      throw error
    }
  }

  /**
   * Update specific fields in onboarding progress
   */
  async updateOnboardingProgress(params: UpdateOnboardingProgressParams): Promise<OnboardingProgress | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()

      if (!user) {
        return null
      }

      const { data, error } = await this.supabase
        .from('onboarding_progress')
        .update(params)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('No onboarding progress found to update')
      }

      return data as OnboardingProgress
    } catch (error) {
      console.error('Error updating onboarding progress:', error)
      throw error
    }
  }

  /**
   * Delete onboarding progress record (typically after successful completion)
   */
  async deleteOnboardingProgress(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()

      if (!user) {
        return
      }

      const { error } = await this.supabase
        .from('onboarding_progress')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error deleting onboarding progress:', error)
      throw error
    }
  }

  /**
   * Check if user has active onboarding progress
   */
  async hasActiveOnboardingProgress(): Promise<boolean> {
    const progress = await this.getOnboardingProgress()
    return progress !== null && !progress.payment_completed
  }
}
