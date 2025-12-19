"use client"

import * as React from "react"
import {
  Folder,
  Frame,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Workflow,
} from "lucide-react"
import { useRouter, useParams, usePathname } from "next/navigation"

import { NavMain } from "@/components/layout/nav-main"
import { NavProjects } from "@/components/layout/nav-projects"
import { NavUser } from "@/components/layout/nav-user"
import { NavSwitcher } from "@/components/layout/nav-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useWorkspace } from "@/hooks/use-workspace"
import { getOrganizationWorkspaces } from "@/features/workspaces/workspace-actions"
import type { Workspace } from "@/types/database"

const projects = [
  {
    name: "Design Engineering",
    url: "#",
    icon: Frame,
  },
  {
    name: "Sales & Marketing",
    url: "#",
    icon: PieChart,
  },
  {
    name: "Travel",
    url: "#",
    icon: Map,
  },
]

export type WorkspaceSection = 'overview' | 'workflows' | 'settings'

interface WorkspaceSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeSection?: WorkspaceSection
}

export function WorkspaceSidebar({ activeSection, ...props }: WorkspaceSidebarProps) {
  const { user, organization } = useWorkspace()
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([])
  const [loading, setLoading] = React.useState(true)
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()

  const organizationId = params?.organizationId as string | undefined
  const workspaceId = params?.workspaceId as string | undefined

  const baseWorkspacePath = organizationId && workspaceId
    ? `/organizations/${organizationId}/workspaces/${workspaceId}`
    : undefined

  const navItems = [
    {
      title: "Overview",
      url: baseWorkspacePath ?? '#',
      icon: SquareTerminal,
      isActive: !!baseWorkspacePath && pathname?.startsWith(baseWorkspacePath) && !pathname?.includes('/workflows'),
    },
    {
      title: "Workflows",
      url: baseWorkspacePath ? `${baseWorkspacePath}/workflows` : '#',
      icon: Workflow,
      isActive: pathname?.includes('/workflows') || activeSection === 'workflows',
    },
    {
      title: "Settings",
      url: organizationId ? `/organizations/${organizationId}/settings/workspaces` : '#',
      icon: Settings2,
      isActive: pathname?.includes('/settings') || activeSection === 'settings',
    },
  ]

  React.useEffect(() => {
    async function fetchWorkspaces() {
      if (!organization?.id) {
        setLoading(false)
        return
      }

      const result = await getOrganizationWorkspaces(organization.id)

      if (result.success && result.workspaces) {
        setWorkspaces(result.workspaces)
      }

      setLoading(false)
    }

    fetchWorkspaces()
  }, [organization?.id])

  const handleWorkspaceSwitch = (workspace: { id: string; name: string }) => {
    if (organizationId) {
      router.push(`/organizations/${organizationId}/workspaces/${workspace.id}`)
    }
  }

  const userData = user
    ? {
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      avatar: user.user_metadata?.avatar_url || '',
    }
    : {
      name: 'Guest',
      email: 'guest@example.com',
      avatar: '',
    }

  const manageUrl = organizationId
    ? `/organizations/${organizationId}/settings/workspaces`
    : '/organizations'

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading workspaces...</div>
        ) : (
          <NavSwitcher
            items={workspaces}
            selectedId={workspaceId}
            onSelect={handleWorkspaceSwitch}
            icon={Folder}
            label="Workspace"
            manageUrl={manageUrl}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
