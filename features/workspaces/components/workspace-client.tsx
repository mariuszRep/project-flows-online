'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
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
  workflowName?: string
  children: React.ReactNode
}

export function WorkspaceClient({ workspace, organizationName, workflowName, children }: WorkspaceClientProps) {
  const pathname = usePathname()

  const activeSection: WorkspaceSection = React.useMemo(() => {
    if (pathname?.includes('/workflows')) {
      return 'workflows'
    }
    if (pathname?.includes('/settings')) {
      return 'settings'
    }
    return 'overview'
  }, [pathname])

  const sectionLabel = React.useMemo(() => {
    switch (activeSection) {
      case 'workflows':
        return 'Workflows'
      case 'settings':
        return 'Settings'
      case 'overview':
        return 'Overview'
    }
  }, [activeSection])

  // Derive extra breadcrumbs from pathname
  const extraBreadcrumbs = React.useMemo(() => {
    const crumbs: Array<{ label: string; href?: string }> = []
    
    if (pathname?.includes('/workflows/create')) {
      crumbs.push({ label: 'Create Workflow' })
    } else if (pathname?.includes('/workflows/') && workflowName) {
      crumbs.push({ label: workflowName })
    }
    
    return crumbs
  }, [pathname, workflowName])

  const sectionHref = React.useMemo(() => {
    if (activeSection === 'workflows' && extraBreadcrumbs.length > 0) {
      return `/organizations/${workspace.organization_id}/workspaces/${workspace.id}/workflows`
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
              <BreadcrumbLink href={`/organizations/${workspace.organization_id}/workspaces/${workspace.id}`}>
                {workspace.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {extraBreadcrumbs.length > 0 && sectionHref ? (
                <BreadcrumbLink href={sectionHref}>{sectionLabel}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{sectionLabel}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {extraBreadcrumbs.map((crumb, index) => {
              const isLast = index === extraBreadcrumbs.length - 1
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href ?? undefined}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      {children}
    </SidebarLayout>
  )
}
