import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkspaceManager } from '@/features/workspaces/components/workspace-manager'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface WorkspacesPageProps {
  params: Promise<{
    organizationId: string
  }>
}

export default async function WorkspacesPage({ params }: WorkspacesPageProps) {
  const { organizationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .single()

  if (!organization) {
    redirect('/organization')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/organization">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-2">
            {organization.name}
          </p>
        </div>
      </div>

      <WorkspaceManager 
        organizationId={organizationId} 
        organizationName={organization.name}
      />
    </div>
  )
}
