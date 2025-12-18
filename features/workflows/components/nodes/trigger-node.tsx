'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Node, NodeHeader, NodeTitle, NodeContent } from '@/components/ai-elements/node'
import { Badge } from '@/components/ui/badge'
import { Play } from 'lucide-react'
import type { WorkflowNode } from '@/types/workflow'

export interface TriggerNodeData {
  label: string
  triggerType?: string
  config?: Record<string, unknown>
}

export function TriggerNode({ data }: NodeProps<WorkflowNode>) {
  const nodeData = data as unknown as TriggerNodeData

  return (
    <Node 
      handles={{ target: false, source: true }}
      className="w-64 border-green-500"
    >
      <NodeHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-green-500" />
            <NodeTitle>{nodeData.label}</NodeTitle>
          </div>
          <Badge variant="outline" className="text-xs border-green-500 text-green-500">
            Trigger
          </Badge>
        </div>
      </NodeHeader>

      {nodeData.triggerType && (
        <NodeContent>
          <div className="text-sm">
            <span className="text-muted-foreground">Type: </span>
            <span className="font-medium">{nodeData.triggerType}</span>
          </div>
        </NodeContent>
      )}
    </Node>
  )
}
