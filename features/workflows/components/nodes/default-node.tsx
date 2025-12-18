'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Node, NodeHeader, NodeTitle, NodeContent } from '@/components/ai-elements/node'
import { Badge } from '@/components/ui/badge'
import type { WorkflowNode } from '@/types/workflow'

export interface DefaultNodeData {
  label: string
  description?: string
  type?: string
  badge?: string
}

export function DefaultNode({ data, selected }: NodeProps<WorkflowNode>) {
  const nodeData = data as unknown as DefaultNodeData

  return (
    <Node 
      handles={{ target: true, source: true }}
      className="w-64"
    >
      <NodeHeader>
        <div className="flex items-center justify-between w-full">
          <NodeTitle>{nodeData.label}</NodeTitle>
          {nodeData.badge && (
            <Badge variant="secondary" className="text-xs">
              {nodeData.badge}
            </Badge>
          )}
        </div>
      </NodeHeader>

      {nodeData.description && (
        <NodeContent>
          <p className="text-sm text-muted-foreground">{nodeData.description}</p>
        </NodeContent>
      )}
    </Node>
  )
}
