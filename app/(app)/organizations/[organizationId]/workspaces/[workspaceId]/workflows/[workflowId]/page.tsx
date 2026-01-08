import { notFound } from 'next/navigation'
import { WorkflowEditor } from '@/features/workflows/components/workflow-editor'
import { getWorkflow } from '@/features/workflows/workflow-actions'

interface EditWorkflowPageProps {
  params: Promise<{
    organizationId: string
    workspaceId: string
    workflowId: string
  }>
}

export default async function EditWorkflowPage({ params }: EditWorkflowPageProps) {
  const { organizationId, workspaceId, workflowId } = await params

  // Fetch workflow with nodes and edges using cached action
  let workflowData
  try {
    workflowData = await getWorkflow(workflowId)
  } catch (error) {
    console.error('Failed to fetch workflow:', error)
    notFound()
  }

  const initialData = {
    workflow: {
      name: workflowData.workflow.name,
      description: workflowData.workflow.description,
      status: workflowData.workflow.status,
    },
    nodes: workflowData.nodes,
    edges: workflowData.edges,
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-4rem)] p-2 pt-0">

      <WorkflowEditor
        organizationId={organizationId}
        workspaceId={workspaceId}
        workflowId={workflowId}
        initialData={initialData}
      />
    </div>
  )
}
