'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Workflow as WorkflowIcon, Plus, ArrowRight, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { deleteWorkflow } from '@/features/workflows/workflow-actions'
import type { WorkflowTable } from '@/types/database'

interface WorkflowManagerProps {
  organizationId: string
  workspaceId: string
  workflows: WorkflowTable[]
}

interface WorkflowCardProps {
  variant: 'create' | 'default'
  workflow?: WorkflowTable
  organizationId?: string
  workspaceId?: string
  onCreate?: () => void
  onDelete?: (workflow: WorkflowTable) => void
}

function WorkflowCard({ variant, workflow, organizationId, workspaceId, onCreate, onDelete }: WorkflowCardProps) {
  const router = useRouter()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleDoubleClick = () => {
    if (variant === 'default' && workflow && organizationId && workspaceId) {
      router.push(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflow.id}`)
    }
  }

  const handleOpen = () => {
    if (variant === 'default' && workflow && organizationId && workspaceId) {
      router.push(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/${workflow.id}`)
    }
  }

  if (variant === 'create') {
    return (
      <Card
        className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors"
        onClick={onCreate}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-center">Create Workflow</p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Add a new workflow
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!workflow) return null

  return (
    <Card
      className="hover:border-primary cursor-pointer transition-colors flex flex-col"
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <WorkflowIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">{workflow.name}</CardTitle>
            <CardDescription>Double-click to edit workflow</CardDescription>
          </div>
          {isMounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  handleOpen()
                }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(workflow)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {workflow.description && (
          <p className="text-sm text-muted-foreground mb-3">{workflow.description}</p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-secondary">
            {workflow.status}
          </span>
          <span className="text-xs text-muted-foreground">
            v{workflow.version}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Created {new Date(workflow.created_at).toLocaleDateString()}
        </p>
      </CardContent>
      <CardFooter className="pt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation()
            handleOpen()
          }}
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Open
        </Button>
      </CardFooter>
    </Card>
  )
}

export function WorkflowManager({ organizationId, workspaceId, workflows: initialWorkflows }: WorkflowManagerProps) {
  const router = useRouter()
  const [workflows, setWorkflows] = React.useState<WorkflowTable[]>(initialWorkflows)
  const [deleteConfirmWorkflow, setDeleteConfirmWorkflow] = React.useState<WorkflowTable | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const handleCreateWorkflow = () => {
    router.push(`/organizations/${organizationId}/workspaces/${workspaceId}/workflows/create`)
  }

  const handleDelete = async () => {
    if (!deleteConfirmWorkflow) return

    setSubmitting(true)
    try {
      await deleteWorkflow(deleteConfirmWorkflow.id, organizationId, workspaceId)
      toast.success('Workflow deleted successfully')
      setWorkflows(workflows.filter(w => w.id !== deleteConfirmWorkflow.id))
      setDeleteConfirmWorkflow(null)
    } catch (error) {
      toast.error('Failed to delete workflow')
      console.error('Delete workflow error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WorkflowCard
          variant="create"
          onCreate={handleCreateWorkflow}
        />
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            variant="default"
            workflow={workflow}
            organizationId={organizationId}
            workspaceId={workspaceId}
            onDelete={setDeleteConfirmWorkflow}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmWorkflow}
        onOpenChange={() => setDeleteConfirmWorkflow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workflow "{deleteConfirmWorkflow?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
