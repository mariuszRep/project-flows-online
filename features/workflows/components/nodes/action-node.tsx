'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Node, NodeHeader, NodeTitle, NodeContent } from '@/components/ai-elements/node'
import { Badge } from '@/components/ui/badge'
import { Zap } from 'lucide-react'
import type { WorkflowNode } from '@/types/workflow'

export interface ActionNodeData {
  label: string
  actionType?: string
  config?: Record<string, unknown>
}

export function ActionNode({ data }: NodeProps<WorkflowNode>) {
  const nodeData = data as unknown as ActionNodeData

  return (
    <Node 
      handles={{ target: true, source: true }}
      className="w-64 border-blue-500"
    >
      <NodeHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <NodeTitle>{nodeData.label}</NodeTitle>
          </div>
          <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
            Action
          </Badge>
        </div>
      </NodeHeader>

      {nodeData.actionType && (
        <NodeContent>
          <div className="text-sm">
            <span className="text-muted-foreground">Type: </span>
            <span className="font-medium">{nodeData.actionType}</span>
          </div>
        </NodeContent>
      )}
    </Node>
  )
}
