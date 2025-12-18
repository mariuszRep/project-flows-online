'use client'

import * as React from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SidebarLayout } from '@/components/layout/sidebar-layout'
import { WorkspaceSidebar, type WorkspaceSection } from '@/features/workspaces/components/workspace-sidebar'
import { WorkflowsView } from '@/features/workflows/components/workflows-view'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import type { Workspace } from '@/types/database'

interface WorkspaceClientProps {
  workspace: Workspace
  organizationName: string
}

export function WorkspaceClient({ workspace, organizationName }: WorkspaceClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeSection, setActiveSection] = React.useState<WorkspaceSection>('playground')
  
  // Track if we're currently updating to prevent loops
  const isUpdatingRef = React.useRef(false)
  const prevSearchParamsRef = React.useRef<URLSearchParams | null>(null)

  React.useEffect(() => {
    // Skip if we're in the middle of a programmatic update
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false
      return
    }

    const searchParamsString = searchParams?.toString()
    const prevSearchParamsString = prevSearchParamsRef.current?.toString()
    const urlChanged = searchParamsString !== prevSearchParamsString

    prevSearchParamsRef.current = searchParams

    if (urlChanged) {
      const sectionParam = searchParams?.get('section') as WorkspaceSection | null
      if (sectionParam) {
        setActiveSection(sectionParam)
      }
    }
  }, [searchParams])

  const handleSectionChange = (section: WorkspaceSection) => {
    const currentSection = searchParams?.get('section')

    if (currentSection === section) {
      return
    }

    setActiveSection(section)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('section', section)
    const queryString = params.toString()
    
    isUpdatingRef.current = true
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  const renderContent = () => {
    // Render workflows section
    if (activeSection === 'workflows') {
      return (
        <WorkflowsView
          organizationId={workspace.organization_id}
        />
      )
    }

    // Default placeholder for other sections
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min">
          <div className="p-8 flex items-center justify-center h-full text-muted-foreground">
            {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} View
          </div>
        </div>
      </div>
    )
  }

  return (
    <SidebarLayout
      sidebar={
        <WorkspaceSidebar 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      }
      header={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/organizations/${workspace.organization_id}`}>
                {organizationName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">
                {workspace.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="capitalize">{activeSection}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      {renderContent()}
    </SidebarLayout>
  )
}
