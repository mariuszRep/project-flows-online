'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from '@/components/ui/react-flow/base-node'
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
    <BaseNode className="w-64 border-green-500">
      <BaseNodeHeader>
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-green-500" />
          <BaseNodeHeaderTitle>{nodeData.label}</BaseNodeHeaderTitle>
        </div>
        <Badge variant="outline" className="text-xs border-green-500 text-green-500">
          Trigger
        </Badge>
      </BaseNodeHeader>

      {nodeData.triggerType && (
        <BaseNodeContent>
          <div className="text-sm">
            <span className="text-muted-foreground">Type: </span>
            <span className="font-medium">{nodeData.triggerType}</span>
          </div>
        </BaseNodeContent>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !border-green-600"
      />
    </BaseNode>
  )
}
