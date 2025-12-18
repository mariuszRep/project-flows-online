'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from '@/components/ui/react-flow/base-node'
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
    <BaseNode className="w-64">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !border-primary-foreground"
      />

      <BaseNodeHeader>
        <BaseNodeHeaderTitle>{nodeData.label}</BaseNodeHeaderTitle>
        {nodeData.badge && (
          <Badge variant="secondary" className="text-xs">
            {nodeData.badge}
          </Badge>
        )}
      </BaseNodeHeader>

      {nodeData.description && (
        <BaseNodeContent>
          <p className="text-sm text-muted-foreground">{nodeData.description}</p>
        </BaseNodeContent>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-primary-foreground"
      />
    </BaseNode>
  )
}
