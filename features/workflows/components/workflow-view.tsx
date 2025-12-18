'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Eye, Play, Share } from 'lucide-react'
import { WorkflowBuilder } from './workflow-builder'
import { useWorkflowFlowWithOptimisticUpdates } from '@/hooks/use-workflow-flow'

interface WorkflowViewProps {
  workflowId: string
  organizationId: string
}

export function WorkflowView({ workflowId, organizationId }: WorkflowViewProps) {
  const { workflow, isLoading, error } = useWorkflowFlowWithOptimisticUpdates(workflowId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'archived':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-lg font-medium">Loading workflow...</div>
        </div>
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-lg font-medium text-destructive">Error loading workflow</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{workflow.name}</h1>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(workflow.status)}>
                {workflow.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Version {workflow.version}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            View Mode
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = `/organizations/${organizationId}/workflows/${workflowId}/edit`}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button size="sm">
            <Play className="mr-2 h-4 w-4" />
            Test Run
          </Button>
        </div>
      </div>

      {/* Description */}
      {workflow.description && (
        <div className="border-b p-4">
          <p className="text-muted-foreground">{workflow.description}</p>
        </div>
      )}

      {/* Workflow Builder */}
      <div className="flex-1">
        <WorkflowBuilder workflowId={workflowId} readOnly={true} />
      </div>
    </div>
  )
}
