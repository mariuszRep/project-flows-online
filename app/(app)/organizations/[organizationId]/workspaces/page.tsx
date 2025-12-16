import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrganizationService } from '@/services/organization-service'
import { WorkspaceManager } from '@/features/workspaces/components/workspace-manager'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Home } from 'lucide-react'
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
  const organizationService = new OrganizationService(supabase)
  const organization = await organizationService.getById(organizationId)

  if (!organization) {
    redirect('/organizations')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/organizations">Organizations</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{organization.name}</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Workspaces</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
        <p className="text-muted-foreground mt-2">
          {organization.name}
        </p>
      </div>

      <WorkspaceManager
        organizationId={organizationId}
        organizationName={organization.name}
      />
    </div>
  )
}
