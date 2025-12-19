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
import { useSidebar } from '@/components/ui/sidebar'
import { Trash2 } from 'lucide-react'
import type { Node, Edge } from '@xyflow/react'
import type { WorkflowNodeData } from './workflow-node'

type EditType = 'workflow' | 'node' | 'edge'

interface WorkflowEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editType: EditType
  data?: {
    // For workflow editing
    name?: string
    description?: string
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
  const { state } = useSidebar()
  const [formData, setFormData] = React.useState<any>({})

  // Calculate offsets based on sidebar and palette
  const sidebarOffset = state === 'expanded' ? '16rem' : '3rem' // Sidebar width
  const paletteOffset = paletteExpanded ? '20rem' : '4rem' // 80 (320px) when expanded, 16 (64px) when collapsed
  const totalLeftOffset = `calc(${sidebarOffset} + ${paletteOffset})`

  // Initialize form data when drawer opens or data changes
  React.useEffect(() => {
    if (open && data) {
      if (editType === 'workflow') {
        setFormData({
          name: data.name || '',
          description: data.description || '',
        })
      } else if (editType === 'node' && data.node) {
        setFormData({
          label: data.node.data.label || '',
          description: data.node.data.description || '',
          content: data.node.data.content || '',
          footer: data.node.data.footer || '',
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
    </div>
  )

  const renderNodeForm = () => (
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

  if (!open) return null

  return (
    <div
      className={cn(
        "bg-background fixed z-[5] flex h-auto flex-col border-t shadow-lg transition-transform duration-300 ease-in-out",
        "inset-x-0 bottom-0 mt-24 max-h-[80vh] rounded-t-lg"
      )}
      style={{
        left: totalLeftOffset,
        width: `calc(100% - ${totalLeftOffset})`,
        right: 'auto',
      }}
    >
      <div className="bg-muted mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full" />
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
