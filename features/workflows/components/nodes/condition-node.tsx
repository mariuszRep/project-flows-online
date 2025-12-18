'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Node, NodeHeader, NodeTitle, NodeContent } from '@/components/ai-elements/node'
import { Badge } from '@/components/ui/badge'
import { GitBranch } from 'lucide-react'
import type { WorkflowNode } from '@/types/workflow'

export interface ConditionNodeData {
  label: string
  condition?: string
  trueLabel?: string
  falseLabel?: string
}

export function ConditionNode({ data }: NodeProps<WorkflowNode>) {
  const nodeData = data as unknown as ConditionNodeData

  return (
    <Node 
      handles={{ target: true, source: true }}
      className="w-64 border-yellow-500"
    >
      <NodeHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-yellow-500" />
            <NodeTitle>{nodeData.label}</NodeTitle>
          </div>
          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
            Condition
          </Badge>
        </div>
      </NodeHeader>

      {nodeData.condition && (
        <NodeContent>
          <div className="text-sm">
            <span className="text-muted-foreground">If: </span>
            <span className="font-medium">{nodeData.condition}</span>
          </div>
        </NodeContent>
      )}

      <div className="relative">
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="!bg-green-500 !border-green-600 !-left-4"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="!bg-red-500 !border-red-600 !-right-4"
        />
      </div>
    </Node>
  )
}
