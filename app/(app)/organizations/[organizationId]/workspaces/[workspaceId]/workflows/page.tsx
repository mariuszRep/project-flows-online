import { WorkflowManager } from '@/features/workflows/components/workflow-manager'
import { getWorkflows } from '@/features/workflows/workflow-actions'

export default async function WorkflowsPage({
  params,
}: {
  params: Promise<{ organizationId: string; workspaceId: string }>
}) {
  const { organizationId, workspaceId } = await params

  // Fetch workflows using cached action
  const workflows = await getWorkflows(organizationId)

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-6 p-4 pt-0 max-w-7xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
        <p className="text-muted-foreground">
          Manage and organize workflows for this workspace.
        </p>
      </div>
      <WorkflowManager
        organizationId={organizationId}
        workspaceId={workspaceId}
        workflows={workflows}
      />
    </div>
  )
}
