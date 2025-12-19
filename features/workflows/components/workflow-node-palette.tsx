'use client'

import * as React from 'react'
import {
  PlayCircle,
  Settings,
  GitBranch,
  CheckCircle,
  GripVertical,
  Workflow,
  type LucideIcon
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

interface NodeType {
  type: 'start' | 'process' | 'decision' | 'end'
  icon: LucideIcon
  label: string
  description: string
}

const nodeTypes: NodeType[] = [
  {
    type: 'start',
    icon: PlayCircle,
    label: 'Start',
    description: 'Workflow entry point',
  },
  {
    type: 'process',
    icon: Settings,
    label: 'Process',
    description: 'Execute an action or task',
  },
  {
    type: 'decision',
    icon: GitBranch,
    label: 'Decision',
    description: 'Conditional branching',
  },
  {
    type: 'end',
    icon: CheckCircle,
    label: 'End',
    description: 'Workflow completion',
  },
]

interface WorkflowNodePaletteProps {
  onNodeDoubleClick?: (type: string) => void
}

export function WorkflowNodePalette({ onNodeDoubleClick }: WorkflowNodePaletteProps = {}) {
  const { state } = useSidebar()
  const isExpanded = state === 'expanded'

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Sidebar collapsible="icon" className="!absolute left-0 top-0 !h-full border-r bg-background">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0 bg-transparent hover:bg-transparent cursor-default">
              <div className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Workflow className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Workflow Editor</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Nodes</h3>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {nodeTypes.map((node) => {
                const Icon = node.icon

                return (
                  <SidebarMenuItem key={node.type}>
                    {isExpanded ? (
                      <SidebarMenuButton
                        className="h-auto py-2 px-3 border border-transparent shadow-none hover:bg-accent hover:text-accent-foreground group cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.type)}
                        onDoubleClick={() => onNodeDoubleClick?.(node.type)}
                      >
                        <Icon className="size-4 text-muted-foreground group-hover:text-foreground" />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="text-sm font-medium leading-none">{node.label}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{node.description}</span>
                        </div>
                        <GripVertical className="size-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        tooltip={{
                          children: (
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{node.label}</span>
                              <span className="text-xs text-muted-foreground">{node.description}</span>
                            </div>
                          )
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.type)}
                        onDoubleClick={() => onNodeDoubleClick?.(node.type)}
                        className="cursor-grab active:cursor-grabbing h-12 justify-center"
                      >
                        <Icon className="size-5" />
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
