import { WorkspaceClient } from '@/features/workspaces/components/workspace-client'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Page({ params }: { params: Promise<{ organizationId: string; workspaceId: string }> }) {
  const { organizationId, workspaceId } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*, organizations(name)')
    .eq('id', workspaceId)
    .single()

  if (!workspace) {
    notFound()
  }

  // Cast the organization join result safely
  const organizationName = (workspace.organizations as unknown as { name: string })?.name || 'Organization'

  return (
    <WorkspaceClient 
      workspace={workspace} 
      organizationName={organizationName}
    />
  )
}
