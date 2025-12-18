'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from '@/components/ui/react-flow/base-node'
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
    <BaseNode className="w-64 border-blue-500">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !border-blue-600"
      />

      <BaseNodeHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <BaseNodeHeaderTitle>{nodeData.label}</BaseNodeHeaderTitle>
        </div>
        <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
          Action
        </Badge>
      </BaseNodeHeader>

      {nodeData.actionType && (
        <BaseNodeContent>
          <div className="text-sm">
            <span className="text-muted-foreground">Type: </span>
            <span className="font-medium">{nodeData.actionType}</span>
          </div>
        </BaseNodeContent>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !border-blue-600"
      />
    </BaseNode>
  )
}
