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
    <div className="flex flex-1 flex-col h-[calc(100vh-4rem)] p-2 pt-0">
      <WorkflowEditor organizationId={organizationId} workspaceId={workspaceId} />
    </div>
  )
}
