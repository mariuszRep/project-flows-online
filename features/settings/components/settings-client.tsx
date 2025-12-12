'use client'

import * as React from 'react'
import { Folder, Shield } from 'lucide-react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SidebarLayout } from '@/components/layout/sidebar-layout'
import { SettingsSidebar, type SettingsSection, type AccessSubsection } from '@/features/settings/components/settings-sidebar'
import { WorkspaceManager } from '@/features/workspaces/components/workspace-manager'
import { PermissionsList } from '@/features/permissions/components/permissions-list'
import { RolesList } from '@/features/roles/components/roles-list'
import { InvitationsList } from '@/features/invitations/components/invitations-list'
import { getUserOrganizations } from '@/features/organizations/organization-actions'
import type { Organization } from '@/types/database'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface SettingsClientProps {
  organizations: Organization[]
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function SettingsClient({ organizations: initialOrganizations, user }: SettingsClientProps) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlOrgId = params?.organizationId as string | undefined

  const [activeSection, setActiveSection] = React.useState<SettingsSection>('workspaces')
  const [activeSubsection, setActiveSubsection] = React.useState<AccessSubsection>('permissions')
  const [organizations, setOrganizations] = React.useState<Organization[]>(initialOrganizations)
  const [selectedOrgId, setSelectedOrgId] = React.useState<string | null>(
    urlOrgId || (initialOrganizations.length > 0 ? initialOrganizations[0].id : null)
  )

  // Track if we're currently updating to prevent loops
  const isUpdatingRef = React.useRef(false)
  const prevUrlOrgIdRef = React.useRef<string | undefined>(undefined)
  const prevSearchParamsRef = React.useRef<URLSearchParams | null>(null)

  const selectedOrg = organizations.find(org => org.id === selectedOrgId)

  // Check if we're on an organization-specific settings page
  const isOrgSpecificPage = pathname.includes('/organization/')

  // Single effect to sync all URL params and props with state
  React.useEffect(() => {
    // Skip if we're in the middle of a programmatic update
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false
      return
    }

    // Check if URL params actually changed
    const searchParamsString = searchParams?.toString()
    const prevSearchParamsString = prevSearchParamsRef.current?.toString()
    const urlChanged = searchParamsString !== prevSearchParamsString
    const orgIdChanged = urlOrgId !== prevUrlOrgIdRef.current

    // Update refs
    prevUrlOrgIdRef.current = urlOrgId
    prevSearchParamsRef.current = searchParams

    // Sync organizations from props
    if (JSON.stringify(organizations) !== JSON.stringify(initialOrganizations)) {
      setOrganizations(initialOrganizations)
    }

    // Sync selected org ID from URL or props (only if URL changed)
    if (orgIdChanged) {
      const targetOrgId = urlOrgId || (initialOrganizations.length > 0 ? initialOrganizations[0].id : null)
      setSelectedOrgId(targetOrgId)
    }

    // Sync URL params with state only when URL actually changes
    if (urlChanged) {
      const sectionParam = searchParams?.get('section') as SettingsSection | null
      const subsectionParam = searchParams?.get('subsection') as AccessSubsection | null

      if (sectionParam && (sectionParam === 'access' || sectionParam === 'workspaces')) {
        setActiveSection(sectionParam)
      }

      if (subsectionParam && (subsectionParam === 'permissions' || subsectionParam === 'roles' || subsectionParam === 'invitations')) {
        setActiveSubsection(subsectionParam)
      }
    }
  }, [urlOrgId, initialOrganizations, searchParams])

  const handleOrganizationsChange = async () => {
    const result = await getUserOrganizations()
    if (result.success && result.organizations) {
      const orgs = result.organizations
      setOrganizations(orgs)
      setSelectedOrgId((prev) => {
        if (prev && orgs.some((org) => org.id === prev)) {
          return prev
        }
        return orgs[0]?.id ?? null
      })
    }
  }

  const handleOrganizationChange = (org: { id: string; name: string }) => {
    setSelectedOrgId(org.id)

    // If we're on an org-specific page, update the URL
    if (isOrgSpecificPage) {
      const params = new URLSearchParams(searchParams?.toString() || '')
      const queryString = params.toString()
      const newPath = `/organization/${org.id}${queryString ? `?${queryString}` : ''}`
      router.push(newPath)
    }
  }

  const handleSectionChange = (section: SettingsSection) => {
    const currentSection = searchParams?.get('section')
    const currentSubsection = searchParams?.get('subsection')

    // Only update if the section is actually changing
    if (currentSection === section) {
      return
    }

    setActiveSection(section)
    const paramsCopy = new URLSearchParams(searchParams?.toString() || '')
    paramsCopy.set('section', section)

    // If switching to access section, set default subsection
    if (section === 'access') {
      paramsCopy.set('subsection', activeSubsection)
    } else {
      paramsCopy.delete('subsection')
    }

    const queryString = paramsCopy.toString()
    isUpdatingRef.current = true
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  const handleSubsectionChange = (subsection: AccessSubsection) => {
    const currentSection = searchParams?.get('section')
    const currentSubsection = searchParams?.get('subsection')

    // Only update if the subsection is actually changing
    if (currentSection === 'access' && currentSubsection === subsection) {
      return
    }

    setActiveSubsection(subsection)
    const paramsCopy = new URLSearchParams(searchParams?.toString() || '')
    paramsCopy.set('section', 'access')
    paramsCopy.set('subsection', subsection)
    const queryString = paramsCopy.toString()
    isUpdatingRef.current = true
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  const renderEmptyState = (title: string, description: string, icon: 'workspaces' | 'permissions') => {
    const Icon = icon === 'workspaces' ? Folder : Shield
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-10 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/5">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-2 text-sm max-w-sm">{description}</p>
        <p className="text-muted-foreground mt-4 text-xs">
          Use the organization switcher to select an organization.
        </p>
      </div>
    )
  }

  const accessContent = React.useMemo(() => {
    if (!selectedOrgId) {
      return renderEmptyState(
        'Select an organization to manage access',
        'Pick an organization from the sidebar to view and update member access.',
        'permissions'
      )
    }

    switch (activeSubsection) {
      case 'permissions':
        return <PermissionsList organizationId={selectedOrgId} />
      case 'roles':
        return <RolesList organizationId={selectedOrgId} />
      case 'invitations':
        return <InvitationsList organizationId={selectedOrgId} />
      default:
        return null
    }
  }, [selectedOrgId, activeSubsection])

  const workspaceContent = React.useMemo(() => {
    if (selectedOrgId && selectedOrg) {
      return (
        <WorkspaceManager
          organizationId={selectedOrgId}
          organizationName={selectedOrg.name}
        />
      )
    }
    return renderEmptyState(
      'Select an organization to manage workspaces',
      'Choose an organization from the sidebar to create, edit, or remove workspaces.',
      'workspaces'
    )
  }, [selectedOrgId, selectedOrg])

  return (
    <SidebarLayout
      sidebar={
        <SettingsSidebar
          organizations={organizations}
          selectedOrgId={selectedOrgId}
          onSelectOrg={handleOrganizationChange}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          activeSubsection={activeSubsection}
          onSubsectionChange={handleSubsectionChange}
          user={user}
          navigationDisabled={!selectedOrgId}
        />
      }
      header={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/organization">
                Organization
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/organization/${selectedOrgId}`}>
                {selectedOrg?.name || 'Select Organization'}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {activeSection === 'access' ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      handleSectionChange('access')
                    }}
                  >
                    Access
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="capitalize">{activeSubsection}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="capitalize">{activeSection}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {activeSection === 'workspaces' ? (
          workspaceContent
        ) : activeSection === 'access' ? (
          accessContent
        ) : null}
      </div>
    </SidebarLayout>
  )
}
