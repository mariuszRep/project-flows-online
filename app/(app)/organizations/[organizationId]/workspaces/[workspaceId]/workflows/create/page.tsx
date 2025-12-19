import { WorkflowEditor } from '@/features/workflows/components/workflow-editor'

interface CreateWorkflowPageProps {
  params: Promise<{
    organizationId: string
    workspaceId: string
  }>
}

export default async function CreateWorkflowPage({ params }: CreateWorkflowPageProps) {
  const { organizationId, workspaceId } = await params

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-4 p-4 pt-0 max-w-7xl">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Create Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Design your workflow by adding and connecting nodes
        </p>
      </div>

      <WorkflowEditor organizationId={organizationId} workspaceId={workspaceId} />
    </div>
  )
}
