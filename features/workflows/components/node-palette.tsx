'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Search, Play, Zap, GitBranch, Square } from 'lucide-react'
import { useWorkflowFlow } from '@/hooks/use-workflow-flow'
import type { WorkflowNode } from '@/types/workflow'

interface NodeTemplate {
  type: string
  label: string
  description: string
  icon: React.ReactNode
  category: string
  data: Record<string, unknown>
}

const nodeTemplates: NodeTemplate[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Start the workflow',
    icon: <Play className="h-4 w-4" />,
    category: 'Triggers',
    data: {
      label: 'New Trigger',
      triggerType: 'manual',
    },
  },
  {
    type: 'action',
    label: 'Action',
    description: 'Perform an action',
    icon: <Zap className="h-4 w-4" />,
    category: 'Actions',
    data: {
      label: 'New Action',
      actionType: 'http',
    },
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch based on condition',
    icon: <GitBranch className="h-4 w-4" />,
    category: 'Logic',
    data: {
      label: 'New Condition',
      condition: 'value > 0',
    },
  },
  {
    type: 'default',
    label: 'Default Node',
    description: 'Generic workflow node',
    icon: <Square className="h-4 w-4" />,
    category: 'General',
    data: {
      label: 'New Node',
      description: 'Add description',
    },
  },
]

export function NodePalette() {
  const [searchQuery, setSearchQuery] = useState('')
  const { addNode, nodes } = useWorkflowFlow()

  const filteredTemplates = nodeTemplates.filter(
    (template) =>
      template.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddNode = (template: NodeTemplate) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: template.type,
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
      data: template.data,
    }

    addNode(newNode)
  }

  const categories = Array.from(new Set(filteredTemplates.map((t) => t.category)))

  return (
    <Card className="h-full w-80 border-r">
      <CardHeader className="border-b">
        <CardTitle>Node Palette</CardTitle>
        <CardDescription>Drag or click to add nodes</CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-4 p-4">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  {category}
                </h3>
                <div className="space-y-2">
                  {filteredTemplates
                    .filter((t) => t.category === category)
                    .map((template) => (
                      <Button
                        key={template.type}
                        variant="outline"
                        className="h-auto w-full justify-start p-3"
                        onClick={() => handleAddNode(template)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{template.icon}</div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{template.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {template.description}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                </div>
              </div>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No nodes found
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="text-xs text-muted-foreground">
            <strong>{nodes.length}</strong> node{nodes.length !== 1 ? 's' : ''} in
            workflow
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
