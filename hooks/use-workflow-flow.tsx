'use client'

import React from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  FlowState,
  FlowActions,
} from '@/types/workflow'
import { WorkflowService } from '@/services/workflow-service'
import { createClient } from '@/lib/supabase/client'

// Initial state
const initialState: FlowState = {
  workflow: null,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodes: [],
  selectedEdges: [],
  history: {
    past: [],
    future: [],
  },
  isLoading: false,
  error: null,
  isSyncing: false,
  lastSyncedAt: null,
}

// Maximum history size to prevent memory issues
const MAX_HISTORY_SIZE = 50

/**
 * Zustand store for workflow flow state management
 * Handles client-side state for workflow visualization and editing
 */
export const useWorkflowFlow = create<FlowState & FlowActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========== WORKFLOW OPERATIONS ==========

      setWorkflow: (workflow) => {
        set({ workflow }, false, 'setWorkflow')
      },

      loadWorkflow: async (workflowId: string) => {
        console.log('loadWorkflow called with:', workflowId)
        set({ isLoading: true, error: null }, false, 'loadWorkflow/start')

        try {
          console.log('Creating Supabase client...')
          const supabase = createClient()
          console.log('Creating WorkflowService...')
          const service = new WorkflowService(supabase)

          console.log('Calling getWorkflowWithElements...')
          const workflowWithElements = await service.getWorkflowWithElements(workflowId)
          console.log('Got workflowWithElements:', workflowWithElements)

          if (!workflowWithElements) {
            throw new Error('Workflow not found')
          }

          set(
            {
              workflow: {
                id: workflowWithElements.id,
                name: workflowWithElements.name,
                description: workflowWithElements.description,
                organization_id: workflowWithElements.organization_id,
                created_by: workflowWithElements.created_by,
                updated_by: workflowWithElements.updated_by,
                created_at: workflowWithElements.created_at,
                updated_at: workflowWithElements.updated_at,
                status: workflowWithElements.status,
                version: workflowWithElements.version,
              },
              nodes: workflowWithElements.nodes,
              edges: workflowWithElements.edges,
              isLoading: false,
              lastSyncedAt: new Date().toISOString(),
              // Reset history when loading new workflow
              history: {
                past: [],
                future: [],
              },
            },
            false,
            'loadWorkflow/success'
          )
        } catch (error) {
          console.error('Error loading workflow:', error)
          set(
            {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load workflow',
            },
            false,
            'loadWorkflow/error'
          )
        }
      },

      saveWorkflow: async () => {
        const state = get()
        if (!state.workflow) {
          throw new Error('No workflow to save')
        }

        set({ isSyncing: true }, false, 'saveWorkflow/start')

        try {
          await get().syncWithServer()
          set(
            {
              isSyncing: false,
              lastSyncedAt: new Date().toISOString(),
            },
            false,
            'saveWorkflow/success'
          )
        } catch (error) {
          console.error('Error saving workflow:', error)
          set(
            {
              isSyncing: false,
              error: error instanceof Error ? error.message : 'Failed to save workflow',
            },
            false,
            'saveWorkflow/error'
          )
          throw error
        }
      },

      // ========== NODE OPERATIONS ==========

      addNode: (node) => {
        const state = get()

        // Save current state to history
        const past = [
          ...state.history.past.slice(-MAX_HISTORY_SIZE + 1),
          { nodes: state.nodes, edges: state.edges },
        ]

        set(
          {
            nodes: [...state.nodes, node],
            history: {
              past,
              future: [], // Clear future when new action is performed
            },
          },
          false,
          'addNode'
        )
      },

      updateNode: (nodeId, updates) => {
        const state = get()

        // Save current state to history
        const past = [
          ...state.history.past.slice(-MAX_HISTORY_SIZE + 1),
          { nodes: state.nodes, edges: state.edges },
        ]

        set(
          {
            nodes: state.nodes.map((node) =>
              node.id === nodeId ? { ...node, ...updates } : node
            ),
            history: {
              past,
              future: [],
            },
          },
          false,
          'updateNode'
        )
      },

      deleteNode: (nodeId) => {
        const state = get()

        // Save current state to history
        const past = [
          ...state.history.past.slice(-MAX_HISTORY_SIZE + 1),
          { nodes: state.nodes, edges: state.edges },
        ]

        // Delete node and all connected edges
        set(
          {
            nodes: state.nodes.filter((node) => node.id !== nodeId),
            edges: state.edges.filter(
              (edge) => edge.source !== nodeId && edge.target !== nodeId
            ),
            selectedNodes: state.selectedNodes.filter((id) => id !== nodeId),
            history: {
              past,
              future: [],
            },
          },
          false,
          'deleteNode'
        )
      },

      setNodes: (nodes) => {
        const state = get()

        // Save current state to history
        const past = [
          ...state.history.past.slice(-MAX_HISTORY_SIZE + 1),
          { nodes: state.nodes, edges: state.edges },
        ]

        set(
          {
            nodes,
            history: {
              past,
              future: [],
            },
          },
          false,
          'setNodes'
        )
      },

      // ========== EDGE OPERATIONS ==========

      addEdge: (edge) => {
        const state = get()

        // Check if edge already exists
        const exists = state.edges.some(
          (e) => e.source === edge.source && e.target === edge.target
        )

        if (exists) {
          return // Don't add duplicate edges
        }

        // Save current state to history
        const past = [
          ...state.history.past.slice(-MAX_HISTORY_SIZE + 1),
          { nodes: state.nodes, edges: state.edges },
        ]

        set(
          {
            edges: [...state.edges, edge],
            history: {
              past,
              future: [],
            },
          },
          false,
          'addEdge'
        )
      },

      updateEdge: (edgeId, updates) => {
        const state = get()

        // Save current state to history
        const past = [
          ...state.history.past.slice(-MAX_HISTORY_SIZE + 1),
          { nodes: state.nodes, edges: state.edges },
        ]

        set(
          {
            edges: state.edges.map((edge) =>
              edge.id === edgeId ? { ...edge, ...updates } : edge
            ),
            history: {
              past,
              future: [],
            },
          },
          false,
          'updateEdge'
        )
      },

      deleteEdge: (edgeId) => {
        const state = get()

        // Save current state to history
        const past = [
          ...state.history.past.slice(-MAX_HISTORY_SIZE + 1),
          { nodes: state.nodes, edges: state.edges },
        ]

        set(
          {
            edges: state.edges.filter((edge) => edge.id !== edgeId),
            selectedEdges: state.selectedEdges.filter((id) => id !== edgeId),
            history: {
              past,
              future: [],
            },
          },
          false,
          'deleteEdge'
        )
      },

      setEdges: (edges) => {
        const state = get()

        // Save current state to history
        const past = [
          ...state.history.past.slice(-MAX_HISTORY_SIZE + 1),
          { nodes: state.nodes, edges: state.edges },
        ]

        set(
          {
            edges,
            history: {
              past,
              future: [],
            },
          },
          false,
          'setEdges'
        )
      },

      // ========== SELECTION OPERATIONS ==========

      setSelectedNodes: (nodeIds) => {
        set({ selectedNodes: nodeIds }, false, 'setSelectedNodes')
      },

      setSelectedEdges: (edgeIds) => {
        set({ selectedEdges: edgeIds }, false, 'setSelectedEdges')
      },

      clearSelection: () => {
        set({ selectedNodes: [], selectedEdges: [] }, false, 'clearSelection')
      },

      // ========== VIEWPORT OPERATIONS ==========

      setViewport: (viewport) => {
        set({ viewport }, false, 'setViewport')
      },

      // ========== HISTORY OPERATIONS ==========

      undo: () => {
        const state = get()
        const { past, future } = state.history

        if (past.length === 0) {
          return // Nothing to undo
        }

        const previous = past[past.length - 1]
        const newPast = past.slice(0, -1)

        set(
          {
            nodes: previous.nodes,
            edges: previous.edges,
            history: {
              past: newPast,
              future: [{ nodes: state.nodes, edges: state.edges }, ...future],
            },
          },
          false,
          'undo'
        )
      },

      redo: () => {
        const state = get()
        const { past, future } = state.history

        if (future.length === 0) {
          return // Nothing to redo
        }

        const next = future[0]
        const newFuture = future.slice(1)

        set(
          {
            nodes: next.nodes,
            edges: next.edges,
            history: {
              past: [...past, { nodes: state.nodes, edges: state.edges }],
              future: newFuture,
            },
          },
          false,
          'redo'
        )
      },

      canUndo: () => {
        return get().history.past.length > 0
      },

      canRedo: () => {
        return get().history.future.length > 0
      },

      // ========== SYNC OPERATIONS ==========

      syncWithServer: async () => {
        const state = get()
        if (!state.workflow) {
          throw new Error('No workflow to sync')
        }

        set({ isSyncing: true }, false, 'syncWithServer/start')

        try {
          const supabase = createClient()
          const service = new WorkflowService(supabase)

          // Get current server state
          const serverWorkflow = await service.getWorkflowWithElements(state.workflow.id)
          if (!serverWorkflow) {
            throw new Error('Workflow not found on server')
          }

          // Simple sync strategy: client state wins
          // In production, implement proper conflict resolution

          // Create sets for easier comparison
          const localNodeIds = new Set(state.nodes.map((n) => n.id))
          const serverNodeIds = new Set(serverWorkflow.nodes.map((n) => n.id))
          const localEdgeIds = new Set(state.edges.map((e) => e.id))
          const serverEdgeIds = new Set(serverWorkflow.edges.map((e) => e.id))

          // Delete nodes that exist on server but not locally
          const nodesToDelete = serverWorkflow.nodes.filter((n) => !localNodeIds.has(n.id))
          for (const node of nodesToDelete) {
            await service.deleteNode(node.id)
          }

          // Delete edges that exist on server but not locally
          const edgesToDelete = serverWorkflow.edges.filter((e) => !localEdgeIds.has(e.id))
          for (const edge of edgesToDelete) {
            await service.deleteEdge(edge.id)
          }

          // Update or create nodes
          for (const node of state.nodes) {
            if (serverNodeIds.has(node.id)) {
              // Update existing node
              await service.updateNode(node.id, {
                type: node.type,
                position_x: node.position.x,
                position_y: node.position.y,
                data: node.data,
                width: node.width,
                height: node.height,
              })
            } else {
              // Create new node
              await service.createNode({
                workflow_id: state.workflow.id,
                type: node.type || 'default',
                position_x: node.position.x,
                position_y: node.position.y,
                data: node.data,
                width: node.width,
                height: node.height,
              })
            }
          }

          // Update or create edges
          for (const edge of state.edges) {
            console.log('Processing edge:', edge)
            
            if (!state.workflow?.id) {
              throw new Error('Workflow ID is missing when syncing edges')
            }
            
            if (serverEdgeIds.has(edge.id)) {
              // Update existing edge
              console.log('Updating existing edge:', edge.id)
              await service.updateEdge(edge.id, {
                source_handle: edge.sourceHandle,
                target_handle: edge.targetHandle,
                type: edge.type,
                data: edge.data,
              })
            } else {
              // Create new edge
              console.log('Creating new edge:', edge)
              const edgeInput = {
                workflow_id: state.workflow.id,
                source_node_id: edge.source,
                target_node_id: edge.target,
                source_handle: edge.sourceHandle,
                target_handle: edge.targetHandle,
                type: edge.type,
                data: edge.data,
              }
              console.log('Edge input:', edgeInput)
              await service.createEdge(edgeInput)
            }
          }

          set(
            {
              isSyncing: false,
              lastSyncedAt: new Date().toISOString(),
            },
            false,
            'syncWithServer/success'
          )
        } catch (error) {
          console.error('Error syncing with server:', error)
          set(
            {
              isSyncing: false,
              error: error instanceof Error ? error.message : 'Failed to sync with server',
            },
            false,
            'syncWithServer/error'
          )
          throw error
        }
      },

      // ========== RESET ==========

      reset: () => {
        set(initialState, false, 'reset')
      },
    }),
    {
      name: 'workflow-flow',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

/**
 * Hook to use workflow flow store with optimistic updates
 */
export function useWorkflowFlowWithOptimisticUpdates(workflowId: string | null) {
  const store = useWorkflowFlow()
  const isLoadingRef = React.useRef(false)
  const currentWorkflowId = store.workflow?.id
  const isLoading = store.isLoading

  // Load workflow on mount or when workflowId changes
  React.useEffect(() => {
    console.log('useWorkflowFlowWithOptimisticUpdates - workflowId:', workflowId)
    console.log('useWorkflowFlowWithOptimisticUpdates - currentWorkflowId:', currentWorkflowId)
    console.log('useWorkflowFlowWithOptimisticUpdates - isLoading:', isLoading)
    console.log('useWorkflowFlowWithOptimisticUpdates - isLoadingRef:', isLoadingRef.current)
    
    if (workflowId && !isLoading && !isLoadingRef.current && currentWorkflowId !== workflowId) {
      console.log('useWorkflowFlowWithOptimisticUpdates - loading workflow:', workflowId)
      isLoadingRef.current = true
      store.loadWorkflow(workflowId).finally(() => {
        isLoadingRef.current = false
      })
    }
  }, [workflowId, currentWorkflowId, isLoading])

  return store
}

// Export hook for undo/redo keyboard shortcuts
export function useWorkflowUndoRedo() {
  const { undo, redo, canUndo, canRedo } = useWorkflowFlow()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) {
          undo()
        }
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z for redo
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (canRedo()) {
          redo()
        }
      }
      // Ctrl+Y / Cmd+Y for redo (alternative)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        if (canRedo()) {
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canUndo, canRedo])

  return { undo, redo, canUndo, canRedo }
}
