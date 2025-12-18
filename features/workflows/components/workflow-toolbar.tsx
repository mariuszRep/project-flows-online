'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Save,
  Undo,
  Redo,
  Play,
  Archive,
  Copy,
  Download,
  Upload,
} from 'lucide-react'
import { useWorkflowFlow, useWorkflowUndoRedo } from '@/hooks/use-workflow-flow'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface WorkflowToolbarProps {
  onSave?: () => void
  onPublish?: () => void
  onArchive?: () => void
  onDuplicate?: () => void
  onExport?: () => void
  onImport?: () => void
}

export function WorkflowToolbar({
  onSave,
  onPublish,
  onArchive,
  onDuplicate,
  onExport,
  onImport,
}: WorkflowToolbarProps) {
  const { workflow, isSyncing, saveWorkflow } = useWorkflowFlow()
  const { undo, redo, canUndo, canRedo } = useWorkflowUndoRedo()

  const handleSave = async () => {
    try {
      await saveWorkflow()
      onSave?.()
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  return (
    <div className="flex items-center gap-2 border-b bg-card px-4 py-2">
      {/* Workflow Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{workflow?.name || 'Untitled Workflow'}</h2>
          {workflow?.status && (
            <Badge
              variant={
                workflow.status === 'published'
                  ? 'default'
                  : workflow.status === 'draft'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {workflow.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => undo()}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => redo()}
          disabled={!canRedo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Save */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={isSyncing}
      >
        <Save className="mr-2 h-4 w-4" />
        {isSyncing ? 'Saving...' : 'Save'}
      </Button>

      {/* Publish */}
      {workflow?.status !== 'published' && (
        <Button
          variant="default"
          size="sm"
          onClick={onPublish}
        >
          <Play className="mr-2 h-4 w-4" />
          Publish
        </Button>
      )}

      <Separator orientation="vertical" className="h-6" />

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Workflow
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onImport}>
            <Upload className="mr-2 h-4 w-4" />
            Import JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onArchive}
            className="text-destructive"
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive Workflow
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
