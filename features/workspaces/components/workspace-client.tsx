'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { SidebarLayout } from '@/components/layout/sidebar-layout'
import { WorkspaceSidebar, type WorkspaceSection } from '@/features/workspaces/components/workspace-sidebar'
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

    return undefined
  }, [activeSection, extraBreadcrumbs.length, workspace.id, workspace.organization_id])

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
