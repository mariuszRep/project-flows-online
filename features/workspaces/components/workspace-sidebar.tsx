"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Folder,
  Frame,
  GitBranch,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"
import { useRouter, useParams } from "next/navigation"

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

// This is sample data.
const data = {
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Workflows",
      url: "#",
      icon: GitBranch,
      items: [
        {
          title: "All Workflows",
          url: "#",
        },
        {
          title: "Create New",
          url: "#",
        },
        {
          title: "Templates",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
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
  ],
}

export type WorkspaceSection = 'playground' | 'models' | 'documentation' | 'settings' | 'workflows'

interface WorkspaceSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeSection?: WorkspaceSection
  onSectionChange?: (section: WorkspaceSection) => void
}

export function WorkspaceSidebar({ activeSection, onSectionChange, ...props }: WorkspaceSidebarProps) {
  const { user, organization } = useWorkspace()
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([])
  const [loading, setLoading] = React.useState(true)
  const router = useRouter()
  const params = useParams()

  const organizationId = params?.organizationId as string | undefined
  const workspaceId = params?.workspaceId as string | undefined

  // Update nav data with active state and click handlers
  const updatedNavMain = data.navMain.map(item => {
    const sectionName = item.title.toLowerCase() as WorkspaceSection
    return {
      ...item,
      isActive: activeSection === sectionName,
      onClick: (e: React.MouseEvent) => {
        if (onSectionChange) {
          e.preventDefault()
          onSectionChange(sectionName)
        }
      },
      // Keep submenu items but make them trigger section change if needed, or keeping them as dummy links for now
      items: item.items.map(subItem => ({
        ...subItem,
        url: '#', // Ensure they don't navigate away for now
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()

          // Special handling for Workflows items
          if (item.title === 'Workflows') {
            if (subItem.title === 'All Workflows') {
              if (organizationId) {
                router.push(`/organizations/${organizationId}/workflows`)
              }
            } else if (subItem.title === 'Create New') {
              if (organizationId) {
                router.push(`/organizations/${organizationId}/workflows/create`)
              }
            }
          } else {
            // Default behavior: just change section
            if (onSectionChange) {
              onSectionChange(sectionName)
            }
          }
        }
      }))
    }
  })

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
        <NavMain items={updatedNavMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
