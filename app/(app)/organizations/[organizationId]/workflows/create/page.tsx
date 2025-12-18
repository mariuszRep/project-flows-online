import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkflowCreateForm } from '@/features/workflows/components/workflow-create-form'

interface PageProps {
  params: Promise<{ organizationId: string }>
}

export default async function CreateWorkflowPage({ params }: PageProps) {
  const { organizationId } = await params
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

  return <WorkflowCreateForm organizationId={organizationId} />
}
