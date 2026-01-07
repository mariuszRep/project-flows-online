'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  type Node,
  type Edge,
  type NodeTypes,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import { WorkflowCanvas } from '@/components/workflow-canvas'
import { WorkflowEdge } from '@/components/workflow-edge'
import { WorkflowControls, WorkflowControlButton } from '@/components/workflow-controls'
import { WorkflowMiniMap } from '@/components/workflow-minimap'
import { WorkflowPanel } from '@/components/workflow-panel'
import { WorkflowNode, type WorkflowNodeData } from './workflow-node'
import { WorkflowNodePalette } from './workflow-node-palette'
import { WorkflowEditDrawer } from './workflow-edit-drawer'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit, Save, Map as MapIcon, PanelLeft } from 'lucide-react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import {
  saveWorkflow,
  updateWorkflow,
  saveWorkflowCanvas,
  createNode as createNodeAction,
  updateNode as updateNodeAction,
  deleteNode as deleteNodeAction,
  createEdge as createEdgeAction,
  deleteEdge as deleteEdgeAction,
} from '../workflow-actions'
import { toast } from 'sonner'
import { useWorkspaceBreadcrumbs } from '@/features/workspaces/components/workspace-client'

const nodeTypes = {
  workflow: WorkflowNode,
} satisfies NodeTypes

import { TemporaryEdge } from './custom-edges'

const edgeTypes = {
  animated: WorkflowEdge.Animated,
  temporary: TemporaryEdge,
}

// Helper function to get node configuration based on type
const getNodeConfig = (type: string): Partial<WorkflowNodeData> => {
  switch (type) {
    case 'start':
      return {
        nodeType: 'start',
        label: 'Start',
        description: 'Workflow entry point',
        content: 'This is where the workflow begins',
        footer: 'Triggered manually or by event',
        handles: { target: false, source: true },
      }
    case 'process':
      return {
        nodeType: 'process',
        label: 'Process',
        description: 'Execute an action or task',
        content: 'Add processing logic here',
        footer: 'Performs operations',
        handles: { target: true, source: true },
      }
    case 'decision':
      return {
        nodeType: 'decision',
        label: 'Decision',
        description: 'Conditional branching',
        content: 'Add decision logic here',
        footer: 'Branches based on conditions',
        handles: { target: true, source: true },
      }
    case 'end':
      return {
        nodeType: 'end',
        label: 'End',
        description: 'Workflow completion',
        content: 'Workflow ends here',
        footer: 'Final step',
        handles: { target: true, source: false },
      }
    default:
      return {
        label: 'Node',
        description: 'Custom node',
        handles: { target: true, source: true },
      }
  }
}

const initialNodesDefault: Node<WorkflowNodeData>[] = [
  {
    id: crypto.randomUUID(),
    type: 'workflow',
    position: { x: 250, y: 50 },
    data: {
      nodeType: 'start',
      label: 'Start',
      description: 'Workflow entry point',
      content: 'This is where the workflow begins',
      footer: 'Triggered manually or by event',
      handles: { target: false, source: true },
    },
  },
]

const initialEdgesDefault: Edge[] = []

interface WorkflowEditorProps {
  organizationId: string
  workspaceId: string
  workflowId?: string
  initialData?: {
    workflow: {
      name: string
      description: string | null
    }
    nodes: Node<WorkflowNodeData>[]
    edges: Edge[]
  }
}

function WorkflowEditorInner({
  organizationId,
  workspaceId,
  workflowId,
  initialData
}: WorkflowEditorProps) {
  const router = useRouter()
  const reactFlowInstance = useReactFlow()
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = React.useState<Node<WorkflowNodeData>[]>(initialData?.nodes || initialNodesDefault)
  const [edges, setEdges] = React.useState<Edge[]>(initialData?.edges || initialEdgesDefault)
  const [isSaving, setIsSaving] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerType, setDrawerType] = React.useState<'workflow' | 'node' | 'edge'>('workflow')
  const [drawerData, setDrawerData] = React.useState<any>(null)
  const [workflowName, setWorkflowName] = React.useState(initialData?.workflow.name || '')
  const [workflowDescription, setWorkflowDescription] = React.useState(initialData?.workflow.description || '')
  const [workflowStatus, setWorkflowStatus] = React.useState<'draft' | 'published' | 'archived'>(
    (initialData?.workflow as any)?.status || 'draft'
  )
  const [showMiniMap, setShowMiniMap] = React.useState(true)
  const [paletteExpanded, setPaletteExpanded] = React.useState(false)
  const { setExtraBreadcrumbs, resetExtraBreadcrumbs } = useWorkspaceBreadcrumbs()

  React.useEffect(() => {
    const label = workflowId ? workflowName || 'Workflow' : 'New Workflow'
    if (workflowId && workflowName && typeof window !== 'undefined') {
      sessionStorage.setItem(`workflowName:${workflowId}`, workflowName)
    }
    setExtraBreadcrumbs([{ label }])

    return () => resetExtraBreadcrumbs()
  }, [workflowId, workflowName, setExtraBreadcrumbs, resetExtraBreadcrumbs])

  const onNodesChange: OnNodesChange = React.useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds) as Node<WorkflowNodeData>[]),
    []
  )

  const onEdgesChange: OnEdgesChange = React.useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect: OnConnect = React.useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        id: crypto.randomUUID(),
        sourceHandle: connection.sourceHandle || null,
        targetHandle: connection.targetHandle || null,
        type: 'animated',
      }
      setEdges((eds) => addEdge(newEdge as any, eds))
    },
    []
  )

  // Double-click handler for nodes
  const onNodeDoubleClick: NodeMouseHandler = React.useCallback(
    (event, node) => {
      setDrawerType('node')
      setDrawerData({ node })
      setDrawerOpen(true)
    },
    []
  )

  // Double-click handler for edges
  const onEdgeDoubleClick: EdgeMouseHandler = React.useCallback(
    (event, edge) => {
      setDrawerType('edge')
      setDrawerData({ edge })
      setDrawerOpen(true)
    },
    []
  )

  // Single-click handler for nodes (updates drawer if open)
  const onNodeClick: NodeMouseHandler = React.useCallback(
    (event, node) => {
      setDrawerOpen((isOpen) => {
        if (isOpen) {
          setDrawerType('node')
          setDrawerData({ node })
        }
        return isOpen
      })
    },
    []
  )

  // Single-click handler for edges (updates drawer if open)
  const onEdgeClick: EdgeMouseHandler = React.useCallback(
    (event, edge) => {
      setDrawerOpen((isOpen) => {
        if (isOpen) {
          setDrawerType('edge')
          setDrawerData({ edge })
        }
        return isOpen
      })
    },
    []
  )

  // Keyboard delete handler for nodes
  const onNodesDelete = React.useCallback(
    async (deleted: Node[]) => {
      if (!workflowId) {
        // For unsaved workflows, just update local state
        toast.success(`Deleted ${deleted.length} node(s)`)
        return
      }

      // For saved workflows, delete from database
      let errorCount = 0
      for (const node of deleted) {
        const result = await deleteNodeAction(
          node.id,
          workflowId,
          organizationId,
          workspaceId
        )
        if (!result.success) {
          toast.error(`Failed to delete node: ${result.error}`)
          errorCount++
        }
      }

      if (errorCount === 0) {
        toast.success(`Deleted ${deleted.length} node(s)`)
      }
    },
    [workflowId, organizationId, workspaceId]
  )

  // Keyboard delete handler for edges
  const onEdgesDelete = React.useCallback(
    async (deleted: Edge[]) => {
      if (!workflowId) {
        // For unsaved workflows, just update local state
        toast.success(`Deleted ${deleted.length} edge(s)`)
        return
      }

      // For saved workflows, delete from database
      let errorCount = 0
      for (const edge of deleted) {
        const result = await deleteEdgeAction(
          edge.id,
          workflowId,
          organizationId,
          workspaceId
        )
        if (!result.success) {
          toast.error(`Failed to delete edge: ${result.error}`)
          errorCount++
        }
      }

      if (errorCount === 0) {
        toast.success(`Deleted ${deleted.length} edge(s)`)
      }
    },
    [workflowId, organizationId, workspaceId]
  )

  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) {
        return
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const nodeConfig = getNodeConfig(type)
      const newNode: Node<WorkflowNodeData> = {
        id: crypto.randomUUID(),
        type: 'workflow',
        position,
        data: nodeConfig as WorkflowNodeData,
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance]
  )

  // Handle Edit Workflow button
  const handleEditWorkflow = () => {
    setDrawerType('workflow')
    setDrawerData({
      name: workflowName,
      description: workflowDescription,
      status: workflowStatus,
    })
    setDrawerOpen(true)
  }

  // Handle Save Changes button - saves canvas to database
  const handleSaveChanges = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow first')
      return
    }

    setIsSaving(true)
    try {
      const result = await saveWorkflowCanvas(
        workflowId,
        nodes,
        edges,
        organizationId,
        workspaceId
      )

      if (result.success) {
        toast.success('Workflow saved successfully')
      } else {
        toast.error(result.error || 'Failed to save workflow')
      }
    } catch (error) {
      console.error('Failed to save workflow:', error)
      toast.error('Failed to save workflow')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle publish/unpublish toggle
  const handleTogglePublish = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow first')
      return
    }

    const newStatus = workflowStatus === 'published' ? 'draft' : 'published'

    setIsSaving(true)
    try {
      const result = await updateWorkflow(
        workflowId,
        undefined,
        undefined,
        newStatus,
        organizationId,
        workspaceId
      )

      if (result.success) {
        setWorkflowStatus(newStatus)
        if (newStatus === 'published') {
          toast.success('Workflow published successfully', {
            description: 'Reconnect your MCP client to see this workflow as a new tool',
            duration: 5000,
          })
        } else {
          toast.success('Workflow unpublished successfully')
        }
      } else {
        toast.error(result.error || 'Failed to update workflow status')
      }
    } catch (error) {
      console.error('Failed to update workflow status:', error)
      toast.error('Failed to update workflow status')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle drawer save based on type
  const handleDrawerSave = async (formData: any) => {
    setIsSaving(true)
    try {
      if (drawerType === 'workflow') {
        if (workflowId) {
          // Update existing workflow metadata
          const result = await updateWorkflow(
            workflowId,
            formData.name,
            formData.description,
            formData.status,
            organizationId,
            workspaceId
          )
          if (result.success) {
            setWorkflowName(formData.name)
            setWorkflowDescription(formData.description)
            setWorkflowStatus(formData.status || 'draft')
            toast.success('Workflow updated successfully')
            setDrawerOpen(false)
          } else {
            toast.error(result.error || 'Failed to update workflow')
          }
        } else {
          // Create new workflow
          const result = await saveWorkflow({
            organizationId,
            workspaceId,
            name: formData.name,
            description: formData.description,
            nodes,
            edges,
          })
          if (result.success && result.workflowId) {
            router.push(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${result.workflowId}`)
            toast.success('Workflow created successfully')
          } else {
            toast.error(result.error || 'Failed to create workflow')
          }
        }
      } else if (drawerType === 'node' && drawerData?.node) {
        const node = drawerData.node
        // Update node with optimistic UI
        const updatedNodes = nodes.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, ...formData } }
            : n
        )
        setNodes(updatedNodes)
        setDrawerOpen(false)
        toast.success('Node updated successfully')
      } else if (drawerType === 'edge' && drawerData?.edge) {
        const edge = drawerData.edge
        // Update edge with optimistic UI
        const updatedEdges = edges.map((e) =>
          e.id === edge.id
            ? { ...e, type: formData.type, data: { ...e.data, label: formData.label } }
            : e
        )
        setEdges(updatedEdges)
        setDrawerOpen(false)
        toast.success('Edge updated successfully')
      }
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle drawer delete
  const handleDrawerDelete = async () => {
    setIsSaving(true)
    try {
      if (drawerType === 'node' && drawerData?.node) {
        if (workflowId) {
          // For saved workflows, delete from database
          const result = await deleteNodeAction(
            drawerData.node.id,
            workflowId,
            organizationId,
            workspaceId
          )
          if (result.success) {
            setNodes((nds) => nds.filter((n) => n.id !== drawerData.node.id))
            toast.success('Node deleted successfully')
            setDrawerOpen(false)
          } else {
            toast.error(result.error || 'Failed to delete node')
          }
        } else {
          // For unsaved workflows, just update local state
          setNodes((nds) => nds.filter((n) => n.id !== drawerData.node.id))
          toast.success('Node deleted successfully')
          setDrawerOpen(false)
        }
      } else if (drawerType === 'edge' && drawerData?.edge) {
        if (workflowId) {
          // For saved workflows, delete from database
          const result = await deleteEdgeAction(
            drawerData.edge.id,
            workflowId,
            organizationId,
            workspaceId
          )
          if (result.success) {
            setEdges((eds) => eds.filter((e) => e.id !== drawerData.edge.id))
            toast.success('Edge deleted successfully')
            setDrawerOpen(false)
          } else {
            toast.error(result.error || 'Failed to delete edge')
          }
        } else {
          // For unsaved workflows, just update local state
          setEdges((eds) => eds.filter((e) => e.id !== drawerData.edge.id))
          toast.success('Edge deleted successfully')
          setDrawerOpen(false)
        }
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      toast.error('Failed to delete')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SidebarProvider
      open={paletteExpanded}
      onOpenChange={setPaletteExpanded}
      className="h-full w-full overflow-hidden border rounded-lg shadow-sm relative isolate !min-h-0"
    >
      <WorkflowNodePalette onNodeDoubleClick={(type) => {
        const position = reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })

        const nodeConfig = getNodeConfig(type)
        const newNode: Node<WorkflowNodeData> = {
          id: crypto.randomUUID(),
          type: 'workflow',
          position,
          data: nodeConfig as WorkflowNodeData,
        }

        setNodes((nds) => nds.concat(newNode))
        toast.success(`Added ${nodeConfig.label} node`)
      }} />
      <SidebarInset className="bg-background relative flex flex-col flex-1 h-full overflow-hidden">
        <header className="absolute top-4 left-4 z-50">
          <SidebarTrigger className="bg-background border shadow-sm" />
        </header>
        <div
          ref={reactFlowWrapper}
          className="h-full w-full relative"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-background"
          >
            <WorkflowControls
              orientation="horizontal"
              showInteractive={true}
              className="!absolute !bottom-8 !left-1/2 !-translate-x-1/2 z-50 shadow-lg"
            >
              <WorkflowControlButton onClick={() => setShowMiniMap(!showMiniMap)}>
                <MapIcon className="h-4 w-4" />
              </WorkflowControlButton>
            </WorkflowControls>
            {showMiniMap && <WorkflowMiniMap />}
            <WorkflowPanel position="top-right" className="flex gap-2">
              {workflowId && (
                <>
                  <Button
                    onClick={handleTogglePublish}
                    size="sm"
                    variant={workflowStatus === 'published' ? 'default' : 'outline'}
                    className="shadow-lg"
                    disabled={isSaving || workflowStatus === 'archived'}
                  >
                    {workflowStatus === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    onClick={handleEditWorkflow}
                    size="sm"
                    variant="outline"
                    className="shadow-lg"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Workflow
                  </Button>
                </>
              )}
              <Button
                onClick={workflowId ? handleSaveChanges : handleEditWorkflow}
                size="sm"
                className="shadow-lg"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : workflowId ? 'Save Changes' : 'Save Workflow'}
              </Button>
            </WorkflowPanel>

            <WorkflowEditDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              editType={drawerType}
              data={drawerData}
              onSave={handleDrawerSave}
              onDelete={handleDrawerDelete}
              isSaving={isSaving}
              paletteExpanded={paletteExpanded}
            />
          </WorkflowCanvas>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
