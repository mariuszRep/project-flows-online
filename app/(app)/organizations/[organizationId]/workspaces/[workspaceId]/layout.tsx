import { notFound, redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { OrganizationWorkspaceProvider } from '@/hooks/use-workspace-context'
import { createClient } from '@/lib/supabase/server'
import { getOrganization, getWorkspace } from '@/features/workspaces/workspace-actions'
import { getWorkflow } from '@/features/workflows/workflow-actions'
import { WorkspaceClient } from '@/features/workspaces/components/workspace-client'

interface WorkspaceLayoutProps {
  children: ReactNode
  params: Promise<{
    organizationId: string
    workspaceId: string
    workflowId?: string
  }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { organizationId, workspaceId, workflowId } = await params

  // Validate UUID formats
  if (!UUID_REGEX.test(organizationId) || !UUID_REGEX.test(workspaceId)) {
    notFound()
  }

  // Get current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch organization and workspace data
  const organization = await getOrganization(organizationId)
  const workspace = await getWorkspace(workspaceId, organizationId)

  // Fetch workflow data if on a workflow detail page
  let workflowName: string | undefined
  if (workflowId && UUID_REGEX.test(workflowId)) {
    try {
      const workflowData = await getWorkflow(workflowId)
      workflowName = workflowData.workflow.name
    } catch {
      // Workflow not found or error - breadcrumb will fall back gracefully
    }
  }

  return (
    <OrganizationWorkspaceProvider
      organization={organization}
      workspace={workspace}
    >
      <WorkspaceClient 
        workspace={workspace} 
        organizationName={organization.name}
        workflowName={workflowName}
      >
        {children}
      </WorkspaceClient>
    </OrganizationWorkspaceProvider>
  )
}
