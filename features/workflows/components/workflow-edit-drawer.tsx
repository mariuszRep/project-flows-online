'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import type { Node, Edge } from '@xyflow/react'
import type { WorkflowNodeData } from './workflow-node'
import { ActionSelector } from './action-selector'
import { ActionParametersForm } from './action-parameters-form'
import { getAvailableActions } from '../workflow-actions'
import type { ActionMetadata } from '@/types/actions'

type EditType = 'workflow' | 'node' | 'edge'

interface WorkflowEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editType: EditType
  data?: {
    // For workflow editing
    name?: string
    description?: string
    status?: 'draft' | 'published' | 'archived'
    // For node editing
    node?: Node<WorkflowNodeData>
    // For edge editing
    edge?: Edge
  }
  onSave: (data: any) => void
  onDelete?: () => void
  isSaving?: boolean
  paletteExpanded?: boolean
}

export function WorkflowEditDrawer({
  open,
  onOpenChange,
  editType,
  data,
  onSave,
  onDelete,
  isSaving = false,
  paletteExpanded = false,
}: WorkflowEditDrawerProps) {
  const [formData, setFormData] = React.useState<any>({})
  const [availableActions, setAvailableActions] = React.useState<ActionMetadata[]>([])
  const [isLoadingActions, setIsLoadingActions] = React.useState(false)

  // Load available actions on mount
  React.useEffect(() => {
    const loadActions = async () => {
      setIsLoadingActions(true)
      try {
        const result = await getAvailableActions()
        if (result.success && result.actions) {
          setAvailableActions(result.actions)
        }
      } catch (error) {
        console.error('Failed to load actions:', error)
      } finally {
        setIsLoadingActions(false)
      }
    }

    loadActions()
  }, [])

  // Initialize form data when drawer opens or data changes
  React.useEffect(() => {
    if (open && data) {
      if (editType === 'workflow') {
        setFormData({
          name: data.name || '',
          description: data.description || '',
          status: data.status || 'draft',
        })
      } else if (editType === 'node' && data.node) {
        setFormData({
          label: data.node.data.label || '',
          description: data.node.data.description || '',
          content: data.node.data.content || '',
          footer: data.node.data.footer || '',
          action_id: data.node.data.action_id || '',
          parameters: data.node.data.parameters || {},
        })
      } else if (editType === 'edge' && data.edge) {
        setFormData({
          label: (data.edge.data as any)?.label || '',
          type: data.edge.type || 'default',
        })
      }
    }
  }, [open, data, editType])

  const handleSave = () => {
    onSave(formData)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const renderWorkflowForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workflow-name">Workflow Name</Label>
        <Input
          id="workflow-name"
          placeholder="My Workflow"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workflow-description">Description</Label>
        <Textarea
          id="workflow-description"
          placeholder="A brief description of what this workflow does"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workflow-status">Status</Label>
        <Select
          value={formData.status || 'draft'}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger id="workflow-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Use the Publish button in the canvas to make this workflow available in MCP
        </p>
      </div>
    </div>
  )

  const renderNodeForm = () => {
    const nodeType = data?.node?.data?.nodeType
    const isProcessNode = nodeType === 'process'

    // Get the current action metadata
    const currentActionMetadata = formData.action_id
      ? availableActions.find((a) => a.id === formData.action_id)
      : undefined

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="node-label">Label</Label>
          <Input
            id="node-label"
            placeholder="Node Label"
            value={formData.label || ''}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="node-description">Description</Label>
          <Input
            id="node-description"
            placeholder="Node description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Show action selector only for process nodes */}
        {isProcessNode && (
          <>
            {isLoadingActions ? (
              <div className="text-sm text-muted-foreground">Loading actions...</div>
            ) : (
              <ActionSelector
                value={formData.action_id}
                onChange={(actionId) =>
                  setFormData({ ...formData, action_id: actionId, parameters: {} })
                }
                availableActions={availableActions}
              />
            )}

            {/* Show parameters form if action is selected */}
            {formData.action_id && currentActionMetadata && (
              <ActionParametersForm
                actionMetadata={currentActionMetadata}
                parameters={formData.parameters || {}}
                onChange={(parameters) => setFormData({ ...formData, parameters })}
              />
            )}
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="node-content">Content</Label>
          <Textarea
            id="node-content"
            placeholder="Node content"
            value={formData.content || ''}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="node-footer">Footer</Label>
          <Input
            id="node-footer"
            placeholder="Node footer"
            value={formData.footer || ''}
            onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
          />
        </div>
      </div>
    )
  }

  const renderEdgeForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edge-label">Label</Label>
        <Input
          id="edge-label"
          placeholder="Edge label (optional)"
          value={formData.label || ''}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edge-type">Edge Type</Label>
        <Select
          value={formData.type || 'animated'}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger id="edge-type">
            <SelectValue placeholder="Select edge type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="animated">Animated</SelectItem>
            <SelectItem value="temporary">Temporary</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const getTitle = () => {
    switch (editType) {
      case 'workflow':
        return 'Edit Workflow'
      case 'node':
        return 'Edit Node'
      case 'edge':
        return 'Edit Edge'
      default:
        return 'Edit'
    }
  }

  const getDescription = () => {
    switch (editType) {
      case 'workflow':
        return 'Update workflow name and description'
      case 'node':
        return 'Update node properties and appearance'
      case 'edge':
        return 'Update edge properties'
      default:
        return ''
    }
  }

  const [isDragging, setIsDragging] = React.useState(false)
  const [dragY, setDragY] = React.useState(0)
  const [dragStartY, setDragStartY] = React.useState(0)

  // Reset drag state when closed
  React.useEffect(() => {
    if (!open) {
      setDragY(0)
      setIsDragging(false)
    }
  }, [open])

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setDragStartY(e.clientY - dragY)
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const newDragY = e.clientY - dragStartY
    // Only allow dragging down
    if (newDragY >= 0) {
      setDragY(newDragY)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
      ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)

    // Threshold to close
    if (dragY > 100) {
      onOpenChange(false)
    } else {
      setDragY(0)
    }
  }

  if (!open) return null

  return (
    <div
      className={cn(
        "bg-background absolute z-10 flex h-auto flex-col border-t shadow-lg",
        "inset-x-0 bottom-0 mt-24 max-h-[80vh] rounded-t-lg",
        // Add transition usually, but disable when dragging for performance
        !isDragging && "transition-transform duration-500 ease-[0.32,0.72,0,1]"
      )}
      style={{
        transform: `translateY(${dragY}px)`,
        // Optimization for moving elements
        willChange: 'transform',
      }}
    >
      <div
        className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col gap-0.5 p-4 text-center md:text-left">
          <h2 className="text-foreground font-semibold tracking-tight text-lg">{getTitle()}</h2>
          <p className="text-muted-foreground text-sm">{getDescription()}</p>
        </div>

        <div className="p-4 pb-0 max-h-[50vh] overflow-y-auto">
          {editType === 'workflow' && renderWorkflowForm()}
          {editType === 'node' && renderNodeForm()}
          {editType === 'edge' && renderEdgeForm()}
        </div>

        <div className="flex flex-col gap-2 p-4 flex-row mt-auto">
          {onDelete && (editType === 'node' || editType === 'edge') && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isSaving} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
