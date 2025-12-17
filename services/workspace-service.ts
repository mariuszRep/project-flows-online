import { SupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Organization, Workspace } from '@/types/database'
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '@/features/workspaces/validations'
import { createClient } from '@/lib/supabase/server'

export class WorkspaceService {
  constructor(private supabase: SupabaseClient) {}

  static async getUserWorkspace(supabaseClient?: SupabaseClient): Promise<Workspace | null> {
    const supabase = supabaseClient || await createClient()
    // RLS handles access control - if data is returned, user has access
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      return null
    }

    return data || null
  }

  /**
   * Get organization by ID (for cache functions)
   */
  async getOrganization(organizationId: string): Promise<Organization> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (error || !data) {
      notFound()
    }

    return data
  }

  /**
   * Get workspace by ID (for cache functions)
   */
  async getWorkspace(workspaceId: string, organizationId: string): Promise<Workspace> {
    const { data, error } = await this.supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !data) {
      notFound()
    }

    return data
  }

  /**
   * Get user's personal workspace for redirect
   */
  async getPersonalWorkspace(userId: string): Promise<{ organizationId: string; workspaceId: string }> {
    // Find personal organization
    const { data: org, error: orgError } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('created_by', userId)
      .eq('name', 'Personal')
      .single()

    if (orgError || !org) {
      throw new Error('Personal organization not found')
    }

    // Find personal workspace
    const { data: workspace, error: workspaceError } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('organization_id', org.id)
      .eq('name', 'Personal')
      .single()

    if (workspaceError || !workspace) {
      throw new Error('Personal workspace not found')
    }

    return {
      organizationId: org.id,
      workspaceId: workspace.id,
    }
  }

  /**
   * Get first workspace for an organization
   */
  async getFirstWorkspaceForOrg(organizationId: string): Promise<string> {
    const { data: workspace, error } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !workspace) {
      throw new Error('No workspace found for this organization')
    }

    return workspace.id
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    data: CreateWorkspaceInput,
    userId: string
  ): Promise<Workspace> {
    const { data: workspace, error } = await this.supabase
      .from('workspaces')
      .insert({
        name: data.name,
        organization_id: data.organizationId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workspace:', error)
      throw new Error('Failed to create workspace')
    }

    return workspace
  }

  /**
   * Get all workspaces for an organization (RLS handles filtering)
   */
  async getOrganizationWorkspaces(organizationId: string): Promise<Workspace[]> {
    const { data, error } = await this.supabase
      .from('workspaces')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching workspaces:', error)
      throw new Error('Failed to fetch workspaces')
    }

    return data || []
  }

  /**
   * Update a workspace (RLS handles permission checking)
   */
  async updateWorkspace(
    workspaceId: string,
    data: UpdateWorkspaceInput,
    userId: string
  ): Promise<Workspace> {
    const { data: workspace, error } = await this.supabase
      .from('workspaces')
      .update({
        name: data.name,
        updated_by: userId,
      })
      .eq('id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Error updating workspace:', error)
      throw new Error('Failed to update workspace')
    }

    return workspace
  }

  /**
   * Delete a workspace (RLS handles permission checking)
   * Returns true if the workspace was Personal (and thus not deleted)
   */
  async deleteWorkspace(workspaceId: string): Promise<{ isPersonal: boolean }> {
    // Check if this is a personal workspace
    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    if (workspace && workspace.name === 'Personal') {
      return { isPersonal: true }
    }

    // Delete workspace
    const { error } = await this.supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)

    if (error) {
      console.error('Error deleting workspace:', error)
      throw new Error('Failed to delete workspace')
    }

    return { isPersonal: false }
  }
}
