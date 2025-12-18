'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from '@/components/ui/react-flow/base-node'
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
    <BaseNode className="w-64 border-yellow-500">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-yellow-500 !border-yellow-600"
      />

      <BaseNodeHeader>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-yellow-500" />
          <BaseNodeHeaderTitle>{nodeData.label}</BaseNodeHeaderTitle>
        </div>
        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
          Condition
        </Badge>
      </BaseNodeHeader>

      {nodeData.condition && (
        <BaseNodeContent>
          <div className="text-sm">
            <span className="text-muted-foreground">If: </span>
            <span className="font-medium">{nodeData.condition}</span>
          </div>
        </BaseNodeContent>
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
    </BaseNode>
  )
}
