'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Settings,
  GitBranch,
  CheckCircle,
  type LucideIcon
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

export function WorkflowNodePalette({ isExpanded: controlledExpanded, onExpandedChange }: WorkflowNodePaletteProps = {}) {
  const [internalExpanded, setInternalExpanded] = React.useState(false)
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded

  const handleToggle = () => {
    const newValue = !isExpanded
    if (onExpandedChange) {
      onExpandedChange(newValue)
    } else {
      setInternalExpanded(newValue)
    }
  }

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className={`absolute left-0 top-0 h-full bg-background border-r flex flex-col z-10 transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-16'
      }`}
    >
      {/* Toggle Button */}
      <div className="p-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="w-full h-10"
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Header (only visible when expanded) */}
      {isExpanded && (
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Node Palette</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Drag nodes onto the canvas
          </p>
        </div>
      )}

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-2">
        <TooltipProvider>
          <div className="space-y-2">
            {nodeTypes.map((node) => {
              const Icon = node.icon

              if (isExpanded) {
                // Expanded state: Show full cards
                return (
                  <Card
                    key={node.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node.type)}
                    className="cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm">{node.label}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {node.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )
              } else {
                // Collapsed state: Show icon buttons with tooltips
                return (
                  <Tooltip key={node.type}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.type)}
                        className="w-full h-12 cursor-grab active:cursor-grabbing hover:bg-accent"
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">{node.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {node.description}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )
              }
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
