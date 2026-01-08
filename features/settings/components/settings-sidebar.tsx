'use client'

import * as React from 'react'
import { Building2, Folder, Shield, ChevronRight, UserCog, Users, Mail, Settings, User, CreditCard, Plug } from 'lucide-react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { NavSwitcher } from '@/components/layout/nav-switcher'
import { NavUser } from '@/components/layout/nav-user'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { Organization } from '@/types/database'

export type SettingsSection = 'workspaces' | 'access' | 'general' | 'account' | 'subscription' | 'mcp'
export type AccessSubsection = 'permissions' | 'roles' | 'invitations'
export type GeneralSubsection = 'profile'
export type SubscriptionSubsection = 'billing'
export type AccountSubsection = 'profile' | 'security'

interface SettingsSidebarProps extends React.ComponentProps<typeof Sidebar> {
  organizations: Organization[]
  selectedOrgId: string | null
  user: {
    name: string
    email: string
    avatar: string
  }
}

const accessSubsections: { value: AccessSubsection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: 'permissions',
    label: 'Permissions',
    icon: Shield,
  },
  {
    value: 'roles',
    label: 'Roles',
    icon: UserCog,
  },
  {
    value: 'invitations',
    label: 'Invitations',
    icon: Mail,
  },
]

const generalSubsections: { value: GeneralSubsection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: 'profile',
    label: 'Profile',
    icon: Building2,
  },
]

const subscriptionSubsections: { value: SubscriptionSubsection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: 'billing',
    label: 'Billing',
    icon: CreditCard,
  },
]

const accountSubsections: { value: AccountSubsection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: 'profile',
    label: 'Profile',
    icon: User,
  },
  {
    value: 'security',
    label: 'Security',
    icon: Shield,
  },
]

export function SettingsSidebar({
  organizations,
  selectedOrgId,
  user,
  ...sidebarProps
}: SettingsSidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const organizationId = params?.organizationId as string | undefined

  // State for controlling which sections are open
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    general: false,
    subscription: false,
    access: false,
    account: false,
  })

  // Determine active section and subsection from pathname
  const getActiveState = () => {
    if (!pathname || !organizationId) {
      return { section: null, subsection: null }
    }

    if (pathname.includes('/settings/general')) {
      return { section: 'general' as const, subsection: 'profile' as const }
    }
    if (pathname.includes('/settings/subscription/billing')) {
      return { section: 'subscription' as const, subsection: 'billing' as const }
    }
    if (pathname.includes('/settings/workspaces')) {
      return { section: 'workspaces' as const, subsection: null }
    }
    if (pathname.includes('/settings/access/permissions')) {
      return { section: 'access' as const, subsection: 'permissions' as const }
    }
    if (pathname.includes('/settings/access/roles')) {
      return { section: 'access' as const, subsection: 'roles' as const }
    }
    if (pathname.includes('/settings/access/invitations')) {
      return { section: 'access' as const, subsection: 'invitations' as const }
    }
    if (pathname.includes('/settings/account/profile')) {
      return { section: 'account' as const, subsection: 'profile' as const }
    }
    if (pathname.includes('/settings/account/security')) {
      return { section: 'account' as const, subsection: 'security' as const }
    }
    if (pathname.includes('/settings/mcp')) {
      return { section: 'mcp' as const, subsection: null }
    }

    return { section: null, subsection: null }
  }

  const { section: activeSection, subsection: activeSubsection } = getActiveState()

  // Auto-open the active section when pathname changes
  React.useEffect(() => {
    if (activeSection && ['general', 'subscription', 'access', 'account'].includes(activeSection)) {
      setOpenSections(prev => ({ ...prev, [activeSection]: true }))
    }
  }, [activeSection])

  const handleSelectOrg = (org: { id: string; name: string }) => {
    // Navigation handled by Link component in NavSwitcher
  }

  const navigationDisabled = !selectedOrgId

  return (
    <Sidebar collapsible="icon" {...sidebarProps}>
      <SidebarHeader>
        <NavSwitcher
          items={organizations}
          selectedId={selectedOrgId}
          onSelect={handleSelectOrg}
          icon={Building2}
          label="Organization"
          manageUrl="/organizations"
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarMenu>
            {/* General Section */}
            <Collapsible
              asChild
              open={openSections.general}
              onOpenChange={(open) => setOpenSections(prev => ({ ...prev, general: open }))}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="General"
                    disabled={navigationDisabled}
                  >
                    <Settings />
                    <span>General</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {generalSubsections.map((subsection) => (
                      <SidebarMenuSubItem key={subsection.value}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={activeSection === 'general' && activeSubsection === subsection.value}
                          className={navigationDisabled ? 'pointer-events-none opacity-50' : ''}
                        >
                          <Link href={organizationId ? `/organizations/${organizationId}/settings/general` : '#'}>
                            <subsection.icon className="h-4 w-4" />
                            <span>{subsection.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Subscription Section */}
            <Collapsible
              asChild
              open={openSections.subscription}
              onOpenChange={(open) => setOpenSections(prev => ({ ...prev, subscription: open }))}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Subscription"
                    disabled={navigationDisabled}
                  >
                    <CreditCard />
                    <span>Subscription</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {subscriptionSubsections.map((subsection) => (
                      <SidebarMenuSubItem key={subsection.value}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={activeSection === 'subscription' && activeSubsection === subsection.value}
                          className={navigationDisabled ? 'pointer-events-none opacity-50' : ''}
                        >
                          <Link href={organizationId ? `/organizations/${organizationId}/settings/subscription/${subsection.value}` : '#'}>
                            <subsection.icon className="h-4 w-4" />
                            <span>{subsection.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Workspaces Section */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Workspaces"
                isActive={activeSection === 'workspaces'}
                disabled={navigationDisabled}
              >
                <Link href={organizationId ? `/organizations/${organizationId}/settings/workspaces` : '#'}>
                  <Folder />
                  <span>Workspaces</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* MCP Section */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="MCP Connections"
                isActive={activeSection === 'mcp'}
                disabled={navigationDisabled}
              >
                <Link href={organizationId ? `/organizations/${organizationId}/settings/mcp` : '#'}>
                  <Plug />
                  <span>MCP</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Access Section with Collapsible Subsections */}
            <Collapsible
              asChild
              open={openSections.access}
              onOpenChange={(open) => setOpenSections(prev => ({ ...prev, access: open }))}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Access"
                    disabled={navigationDisabled}
                  >
                    <Users />
                    <span>Access</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {accessSubsections.map((subsection) => (
                      <SidebarMenuSubItem key={subsection.value}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={activeSection === 'access' && activeSubsection === subsection.value}
                          className={navigationDisabled ? 'pointer-events-none opacity-50' : ''}
                        >
                          <Link href={organizationId ? `/organizations/${organizationId}/settings/access/${subsection.value}` : '#'}>
                            <subsection.icon className="h-4 w-4" />
                            <span>{subsection.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Account Section */}
            <Collapsible
              asChild
              open={openSections.account}
              onOpenChange={(open) => setOpenSections(prev => ({ ...prev, account: open }))}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Account"
                    disabled={navigationDisabled}
                  >
                    <UserCog />
                    <span>Account</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {accountSubsections.map((subsection) => (
                      <SidebarMenuSubItem key={subsection.value}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={activeSection === 'account' && activeSubsection === subsection.value}
                          className={navigationDisabled ? 'pointer-events-none opacity-50' : ''}
                        >
                          <Link href={organizationId ? `/organizations/${organizationId}/settings/account/${subsection.value}` : '#'}>
                            <subsection.icon className="h-4 w-4" />
                            <span>{subsection.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
