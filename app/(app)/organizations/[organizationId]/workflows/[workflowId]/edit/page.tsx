import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkflowEdit } from '@/features/workflows/components/workflow-edit'

interface PageProps {
  params: Promise<{ organizationId: string; workflowId: string }>
}

export default async function EditWorkflowPage({ params }: PageProps) {
  const { organizationId, workflowId } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  // Verify organization access via permissions
  const { data: permission } = await supabase
    .from('permissions')
    .select('org_id')
    .eq('org_id', organizationId)
    .eq('principal_id', user.id)
    .eq('principal_type', 'user')
    .eq('object_type', 'organization')
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (!permission) {
    notFound()
  }

  // Verify workflow exists and belongs to organization
  const { data: workflow } = await supabase
    .from('workflows')
    .select('id, organization_id')
    .eq('id', workflowId)
    .eq('organization_id', organizationId)
    .single()

  if (!workflow) {
    notFound()
  }

  return <WorkflowEdit workflowId={workflowId} organizationId={organizationId} />
}
