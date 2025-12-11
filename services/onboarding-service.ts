import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  createOrganizationSchema,
  createWorkspaceSchema,
  type CreateOrganizationParams,
  type CreateWorkspaceParams,
} from '@/features/auth/onboarding-validations'

export type {
  CreateOrganizationParams,
  CreateWorkspaceParams,
}

export interface OrganizationWithPermission {
  id: string
  name: string
  created_at: string
}

export interface WorkspaceWithPermission {
  id: string
  name: string
  organization_id: string
  created_at: string
}

export interface OrganizationMembershipStatus {
  hasOrganizations: boolean
  organizationCount: number
}

/**
 * Service for managing onboarding flow
 * Handles organization and workspace creation with automatic permission assignment
 */
export class OnboardingService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Check if user's email is verified
   * @throws Error if email is not verified
   */
  async checkEmailVerification(): Promise<void> {
    const { data: { user }, error } = await this.supabase.auth.getUser()

    if (error || !user) {
      throw new Error('User not authenticated')
    }

    if (!user.email_confirmed_at) {
      throw new Error('Email verification required. Please verify your email before creating an organization.')
    }
  }

  /**
   * Create an organization and assign Owner role to the creator
   * Uses SECURITY DEFINER function to bypass RLS for INSERT with RETURNING
   * Requires email verification before allowing organization creation
   */
  async createOrganizationWithPermissions(
    params: CreateOrganizationParams
  ): Promise<OrganizationWithPermission> {
    // Check email verification first
    await this.checkEmailVerification()

    // Validate input
    const validated = createOrganizationSchema.parse(params)
    const { name } = validated

    // Create organization using RPC function (bypasses RLS)
    const { data: organization, error: orgError } = await this.supabase
      .rpc('create_organization', { org_name: name })
      .single()

    if (orgError || !organization) {
      console.error('Organization creation error:', orgError)
      throw new Error(`Failed to create organization: ${orgError?.message || 'Unknown error'}`)
    }

    return {
      id: organization.id,
      name: organization.name,
      created_at: organization.created_at,
    }
  }

  /**
   * Check if organization has active subscription
   * @param orgId - Organization ID
   * @throws Error if no active subscription found
   */
  async checkSubscriptionStatus(orgId: string): Promise<void> {
    const { data: subscription, error } = await this.supabase
      .from('subscriptions')
      .select('id, status')
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to check subscription status: ${error.message}`)
    }

    if (!subscription) {
      throw new Error('Active subscription required. Please complete payment before creating a workspace.')
    }

    const activeStatuses = ['active', 'trialing']
    if (!activeStatuses.includes(subscription.status)) {
      throw new Error(`Subscription status is ${subscription.status}. An active or trialing subscription is required.`)
    }
  }

  /**
   * Create a workspace and assign Owner role to the creator
   * Uses transaction to ensure atomicity
   * Requires active subscription before allowing workspace creation
   */
  async createWorkspaceWithPermissions(
    params: CreateWorkspaceParams
  ): Promise<WorkspaceWithPermission> {
    // Validate input
    const validated = createWorkspaceSchema.parse(params)
    const { name, orgId, userId } = validated

    // Check for active subscription
    await this.checkSubscriptionStatus(orgId)

    // Create workspace using the authenticated client
    const { data: workspace, error: workspaceError } = await this.supabase
      .from('workspaces')
      .insert({
        name,
        organization_id: orgId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single()

    if (workspaceError || !workspace) {
      throw new Error(
        `Failed to create workspace: ${workspaceError?.message || 'Unknown error'}`
      )
    }

    return {
      id: workspace.id,
      name: workspace.name,
      organization_id: workspace.organization_id,
      created_at: workspace.created_at,
    }
  }

  /**
   * Check if a user has any organization memberships
   * Queries the users_permissions view for organization access
   */
  async checkUserOrganizationMembership(): Promise<OrganizationMembershipStatus> {
    // Query users_permissions view for organization memberships
    const { data, error } = await this.supabase
      .from('users_permissions')
      .select('object_id', { count: 'exact', head: false })
      .eq('object_type', 'organization')

    if (error) {
      throw new Error(`Failed to check organization membership: ${error.message}`)
    }

    const organizationCount = data?.length || 0

    return {
      hasOrganizations: organizationCount > 0,
      organizationCount,
    }
  }
}
