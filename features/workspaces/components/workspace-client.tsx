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

type BreadcrumbItemType = { label: string; href?: string }

interface WorkspaceBreadcrumbContextValue {
  extraBreadcrumbs: BreadcrumbItemType[]
  setExtraBreadcrumbs: (crumbs: BreadcrumbItemType[]) => void
  resetExtraBreadcrumbs: () => void
}

const WorkspaceBreadcrumbContext = React.createContext<WorkspaceBreadcrumbContextValue | null>(null)

const getWorkflowIdFromPath = (pathname: string | null): string | undefined => {
  const match = pathname?.match(/\/workflows\/([^/]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

interface WorkspaceClientProps {
  workspace: Workspace
  organizationName: string
  workflowName?: string
  children: React.ReactNode
}

const deriveBreadcrumbs = (pathname: string | null, workflowName?: string): BreadcrumbItemType[] => {
  const crumbs: BreadcrumbItemType[] = []

  if (pathname?.includes('/workflows/create')) {
    crumbs.push({ label: 'New Workflow' })
  } else if (pathname?.includes('/workflows/')) {
    if (workflowName) {
      crumbs.push({ label: workflowName })
    }
  }

  return crumbs
}

export function useWorkspaceBreadcrumbs() {
  const ctx = React.useContext(WorkspaceBreadcrumbContext)
  if (!ctx) {
    throw new Error('useWorkspaceBreadcrumbs must be used within WorkspaceClient')
  }
  return ctx
}

export function WorkspaceClient({ workspace, organizationName, workflowName, children }: WorkspaceClientProps) {
  const pathname = usePathname()
  const workflowIdFromPath = React.useMemo(() => getWorkflowIdFromPath(pathname), [pathname])

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

  const [extraBreadcrumbs, setExtraBreadcrumbsState] = React.useState<BreadcrumbItemType[]>(
    () => deriveBreadcrumbs(pathname, workflowName)
  )
  const [isManualBreadcrumb, setIsManualBreadcrumb] = React.useState(false)

  React.useEffect(() => {
    if (!isManualBreadcrumb) {
      setExtraBreadcrumbsState(deriveBreadcrumbs(pathname, workflowName))
    }
  }, [pathname, workflowName, isManualBreadcrumb])

  const setExtraBreadcrumbs = React.useCallback((crumbs: BreadcrumbItemType[]) => {
    setExtraBreadcrumbsState(crumbs)
    setIsManualBreadcrumb(true)
  }, [])

  const resetExtraBreadcrumbs = React.useCallback(() => {
    setExtraBreadcrumbsState(deriveBreadcrumbs(pathname, workflowName))
    setIsManualBreadcrumb(false)
  }, [pathname, workflowName])

  React.useEffect(() => {
    if (isManualBreadcrumb) return
    if (extraBreadcrumbs.length > 0) return
    if (!workflowIdFromPath || typeof window === 'undefined') return

    const storedName = sessionStorage.getItem(`workflowName:${workflowIdFromPath}`)
    if (storedName) {
      setExtraBreadcrumbsState([{ label: storedName }])
    }
  }, [extraBreadcrumbs.length, isManualBreadcrumb, workflowIdFromPath])

  const sectionHref = React.useMemo(() => {
    if (activeSection === 'workflows' && extraBreadcrumbs.length > 0) {
      return `/organizations/${workspace.organization_id}/workspaces/${workspace.id}/workflows`
    }

    return undefined
  }, [activeSection, extraBreadcrumbs.length, workspace.id, workspace.organization_id])

  return (
    <WorkspaceBreadcrumbContext.Provider
      value={{ extraBreadcrumbs, setExtraBreadcrumbs, resetExtraBreadcrumbs }}
    >
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
    </WorkspaceBreadcrumbContext.Provider>
  )
}
