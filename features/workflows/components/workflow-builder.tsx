'use client'

import React, { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Panel,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeTypes,
  type EdgeTypes,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWorkflowFlow } from '@/hooks/use-workflow-flow'
import { WorkflowControls } from '@/components/ui/react-flow/workflow-controls'
import { NodePalette } from './node-palette'
import { DefaultNode } from './nodes/default-node'
import { TriggerNode } from './nodes/trigger-node'
import { ActionNode } from './nodes/action-node'
import { ConditionNode } from './nodes/condition-node'

const nodeTypes: NodeTypes = {
  default: DefaultNode,
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
}

const edgeTypes: EdgeTypes = {
  // Add custom edge types here if needed
}

interface WorkflowBuilderProps {
  workflowId: string
  readOnly?: boolean
}

export function WorkflowBuilder({ workflowId, readOnly = false }: WorkflowBuilderProps) {
  const {
    workflow,
    nodes,
    edges,
    viewport,
    isLoading,
    error,
    setNodes,
    setEdges,
    setViewport,
  } = useWorkflowFlow()

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return
      const updatedNodes = applyNodeChanges(changes, nodes)
      setNodes(updatedNodes)
    },
    [nodes, setNodes, readOnly]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return
      const updatedEdges = applyEdgeChanges(changes, edges)
      setEdges(updatedEdges)
    },
    [edges, setEdges, readOnly]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return
      setEdges(addEdge(connection, edges))
    },
    [edges, setEdges, readOnly]
  )

  const onViewportChange = useCallback(
    (newViewport: typeof viewport) => {
      setViewport(newViewport)
    },
    [setViewport]
  )

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-lg font-medium">Loading workflow...</div>
          <div className="text-sm text-muted-foreground">Please wait</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-lg font-medium text-destructive">Error loading workflow</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-lg font-medium">Workflow not found</div>
          <div className="text-sm text-muted-foreground">
            The requested workflow could not be loaded
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full">
      {/* Node Palette Sidebar */}
      {!readOnly && (
        <div className="w-80 flex-shrink-0 border-r bg-muted/30">
          <NodePalette />
        </div>
      )}
      
      {/* Main Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onViewportChange={onViewportChange}
          defaultViewport={viewport}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          className="bg-background"
          style={{ width: '100%', height: '100%' }}
        >
          <Background
            className="bg-muted"
            gap={16}
            size={1}
          />

          {!readOnly && (
            <WorkflowControls />
          )}

          <MiniMap
            position="bottom-left"
          />

          <Panel position="top-left" className="!m-2">
            <div className="rounded-md border bg-card px-4 py-2 shadow-sm">
              <div className="font-semibold">{workflow?.name || 'Untitled Workflow'}</div>
              {workflow?.description && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {workflow.description}
                </div>
              )}
            </div>
          </Panel>

          {readOnly && (
            <Panel position="top-right" className="!m-2">
              <div className="rounded-md border bg-muted px-3 py-1 text-sm font-medium">
                Read Only
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  )
}
