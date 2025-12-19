import type {
  WorkflowEdgeTable,
  WorkflowNodeTable,
  WorkflowTable,
} from '@/types/database'
import type { Edge as XYFlowEdge, Node as XYFlowNode } from '@xyflow/react'

export interface Workflow extends WorkflowTable {
  workflow_nodes: WorkflowNode[]
  workflow_edges: WorkflowEdge[]
}

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

export interface WorkflowNode extends Omit<WorkflowNodeTable, 'position_x' | 'position_y' | 'data'> {
  position: { x: number; y: number }
  data: WorkflowNodeData
}

export interface WorkflowEdge extends Omit<WorkflowEdgeTable, 'data'> {
  data?: Record<string, unknown> | null
}

export type WorkflowCanvasNode = XYFlowNode<WorkflowNodeData>
export type WorkflowCanvasEdge = XYFlowEdge

export interface WorkflowFormData {
  name: string
  description?: string
  status?: WorkflowTable['status']
}

export interface WorkflowCanvasData {
  workflowId: string
  nodes: WorkflowCanvasNode[]
  edges: WorkflowCanvasEdge[]
}

export interface WorkflowDetail {
  workflow: WorkflowTable
  nodes: WorkflowCanvasNode[]
  edges: WorkflowCanvasEdge[]
}
