'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Eye, Play, Settings } from 'lucide-react'
import { WorkflowBuilder } from './workflow-builder'
import { useWorkflowFlowWithOptimisticUpdates } from '@/hooks/use-workflow-flow'
import { publishWorkflow } from '../workflow-actions'

interface WorkflowEditProps {
  workflowId: string
  organizationId: string
}

export function WorkflowEdit({ workflowId, organizationId }: WorkflowEditProps) {
  const { workflow, isLoading, error, saveWorkflow, isSyncing } = useWorkflowFlowWithOptimisticUpdates(workflowId)
  const [isPublishing, setIsPublishing] = useState(false)

  const handleSave = async () => {
    try {
      await saveWorkflow()
    } catch (error) {
      console.error('Failed to save workflow:', error)
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const result = await publishWorkflow(workflowId)
      if (result.success) {
        window.location.href = `/organizations/${organizationId}/workflows/${workflowId}`
      } else {
        console.error('Failed to publish workflow:', result.error)
      }
    } catch (error) {
      console.error('Error publishing workflow:', error)
    } finally {
      setIsPublishing(false)
    }
  }

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
              {isSyncing && (
                <span className="text-sm text-blue-600">Saving...</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = `/organizations/${organizationId}/workflows/${workflowId}`}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSave}
            disabled={isSyncing}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSyncing ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing || workflow.status === 'published'}
          >
            <Play className="mr-2 h-4 w-4" />
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b p-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Edit Mode</span>
        </div>
      </div>

      {/* Workflow Builder */}
      <div className="flex-1">
        <WorkflowBuilder workflowId={workflowId} readOnly={false} />
      </div>
    </div>
  )
}
