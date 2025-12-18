import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  ReactFlowInstance,
  Viewport,
} from '@xyflow/react'

import type { Database } from '@/types/database'

export type WorkflowStatus = 'draft' | 'published' | 'archived'

// Database table types
export type WorkflowRow = Database['public']['Tables']['workflows']['Row']
export type WorkflowInsert = Database['public']['Tables']['workflows']['Insert']
export type WorkflowUpdate = Database['public']['Tables']['workflows']['Update']
export type Workflow = WorkflowRow

export type WorkflowNodeRow = Database['public']['Tables']['workflow_nodes']['Row']
export type WorkflowNodeInsert = Database['public']['Tables']['workflow_nodes']['Insert']
export type WorkflowNodeUpdate = Database['public']['Tables']['workflow_nodes']['Update']

export type WorkflowEdgeRow = Database['public']['Tables']['workflow_edges']['Row']
export type WorkflowEdgeInsert = Database['public']['Tables']['workflow_edges']['Insert']
export type WorkflowEdgeUpdate = Database['public']['Tables']['workflow_edges']['Update']

// React Flow element types
export type FlowNodeData = Record<string, unknown>
export type FlowEdgeData = Record<string, unknown>

export type WorkflowNode = Node<FlowNodeData> & { data: FlowNodeData }
export type WorkflowEdge = Edge<FlowEdgeData> & { data?: FlowEdgeData }

export type FlowViewport = Viewport
export type FlowInstance = ReactFlowInstance
export type FlowConnection = Connection
export type FlowNodeChange = NodeChange
export type FlowEdgeChange = EdgeChange

export interface FlowHistoryEntry {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface FlowSelection {
  nodes: string[]
  edges: string[]
}

// Flow state for Zustand store
export interface FlowState {
  workflow: Workflow | null
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport: FlowViewport
  selectedNodes: string[]
  selectedEdges: string[]
  history: {
    past: FlowHistoryEntry[]
    future: FlowHistoryEntry[]
  }
  isLoading: boolean
  error: string | null
  isSyncing: boolean
  lastSyncedAt: string | null
  instance?: FlowInstance | null
}

// Actions interface for Zustand store
export interface FlowActions {
  setWorkflow: (workflow: Workflow | null) => void
  loadWorkflow: (workflowId: string) => Promise<void>
  saveWorkflow: () => Promise<void>

  addNode: (node: WorkflowNode) => void
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void
  deleteNode: (nodeId: string) => void
  setNodes: (nodes: WorkflowNode[]) => void

  addEdge: (edge: WorkflowEdge) => void
  updateEdge: (edgeId: string, updates: Partial<WorkflowEdge>) => void
  deleteEdge: (edgeId: string) => void
  setEdges: (edges: WorkflowEdge[]) => void

  setSelectedNodes: (nodeIds: string[]) => void
  setSelectedEdges: (edgeIds: string[]) => void
  clearSelection: () => void

  setViewport: (viewport: FlowViewport) => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  syncWithServer: () => Promise<void>

  reset: () => void

  // Optional helpers for React Flow callbacks
  setInstance?: (instance: FlowInstance | null) => void
  onConnect?: (connection: FlowConnection | OnConnect) => void
  onNodesChange?: (changes: FlowNodeChange[]) => void
  onEdgesChange?: (changes: FlowEdgeChange[]) => void
}

// Service input types
export interface CreateWorkflowInput {
  name: string
  description?: string
  organization_id: string
  status?: WorkflowStatus
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  status?: WorkflowStatus
}

export interface CreateNodeInput {
  workflow_id: string
  type: string
  position_x: number
  position_y: number
  data: FlowNodeData
  width?: number
  height?: number
}

export interface UpdateNodeInput {
  type?: string
  position_x?: number
  position_y?: number
  data?: FlowNodeData
  width?: number
  height?: number
}

export interface CreateEdgeInput {
  workflow_id: string
  source_node_id: string
  target_node_id: string
  source_handle?: string | null
  target_handle?: string | null
  type?: string
  data?: FlowEdgeData
}

export interface UpdateEdgeInput {
  source_handle?: string | null
  target_handle?: string | null
  type?: string
  data?: FlowEdgeData
}

// Workflow with populated nodes and edges
export interface WorkflowWithElements extends Workflow {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

// AI Elements integration types
export interface WorkflowNodeHandles {
  source: boolean
  target: boolean
}

export interface AIElementNodeMeta {
  id: string
  title: string
  description?: string | null
  handles: WorkflowNodeHandles
  badge?: string
  actionLabel?: string
}

export interface AIElementEdgeMeta {
  variant?: 'default' | 'animated' | 'temporary'
  markerEndId?: string
  label?: string | null
}

export interface WorkflowCanvasConfig {
  fitViewOnInit?: boolean
  snapToGrid?: boolean
  toolbarPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  controlLabels?: {
    zoomIn?: string
    zoomOut?: string
    reset?: string
    fitView?: string
  }
}
