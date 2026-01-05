'use client'

import * as React from 'react'
import { type NodeProps } from '@xyflow/react'
import {
  WorkflowNodeBase,
  WorkflowNodeHeader,
  WorkflowNodeTitle,
  WorkflowNodeDescription,
  WorkflowNodeContent,
  WorkflowNodeFooter,
} from '@/components/workflow-node-base'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string
  description?: string
  content?: string
  footer?: string
  handles?: {
    target?: boolean
    source?: boolean
  }
}

export function WorkflowNode({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData
  const showTarget = nodeData.handles?.target !== false
  const showSource = nodeData.handles?.source !== false

  return (
    <WorkflowNodeBase
      handles={{
        target: showTarget,
        source: showSource,
      }}
      className={`min-w-[250px] ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      <WorkflowNodeHeader className="pb-3 bg-secondary/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <WorkflowNodeTitle className="text-sm font-medium">{nodeData.label}</WorkflowNodeTitle>
            {nodeData.description && (
              <WorkflowNodeDescription className="text-xs mt-1">
                {nodeData.description}
              </WorkflowNodeDescription>
            )}
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <Edit className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </WorkflowNodeHeader>

      {nodeData.content && (
        <WorkflowNodeContent className="pb-3">
          <p className="text-xs text-muted-foreground">{nodeData.content}</p>
        </WorkflowNodeContent>
      )}

      {nodeData.footer && (
        <WorkflowNodeFooter className="pt-0 bg-transparent border-t-0">
          <p className="text-xs text-muted-foreground">{nodeData.footer}</p>
        </WorkflowNodeFooter>
      )}
    </WorkflowNodeBase>
  )
}
