'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GitBranch, Plus, FileText, Edit, Eye, Trash2 } from 'lucide-react'
import { getOrganizationWorkflows } from '../workflow-actions'
import type { Workflow } from '@/types/workflow'

interface WorkflowsViewProps {
  organizationId: string
}

export function WorkflowsView({ organizationId }: WorkflowsViewProps) {
  const router = useRouter()
  const [workflows, setWorkflows] = React.useState<Workflow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch workflows on component mount
  React.useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getOrganizationWorkflows(organizationId)
        
        if (result.success && result.data) {
          setWorkflows(result.data.workflows)
        } else {
          setError(result.error || 'Failed to fetch workflows')
        }
      } catch (err) {
        setError('An unexpected error occurred')
        console.error('Error fetching workflows:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkflows()
  }, [organizationId])

  const handleCreateWorkflow = () => {
    router.push(`/organizations/${organizationId}/workflows/create`)
  }

  const handleEditWorkflow = (workflowId: string) => {
    router.push(`/organizations/${organizationId}/workflows/${workflowId}/edit`)
  }

  const handleViewWorkflow = (workflowId: string) => {
    router.push(`/organizations/${organizationId}/workflows/${workflowId}`)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
            <p className="text-muted-foreground">
              Build and manage your automation workflows
            </p>
          </div>
          <Button onClick={handleCreateWorkflow}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>

        {/* Loading skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
            <p className="text-muted-foreground">
              Build and manage your automation workflows
            </p>
          </div>
          <Button onClick={handleCreateWorkflow}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
          <div className="text-center">
            <div className="mb-2 text-lg font-medium text-destructive">Error loading workflows</div>
            <div className="text-sm text-muted-foreground">{error}</div>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
          <p className="text-muted-foreground">
            Build and manage your automation workflows ({workflows.length} total)
          </p>
        </div>
        <Button onClick={handleCreateWorkflow}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Workflows Grid */}
      {workflows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-6">
              <GitBranch className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">No workflows yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Get started by creating your first workflow. Workflows help you automate
                tasks and connect different services.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateWorkflow}>
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                View Templates
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    {workflow.description && (
                      <CardDescription className="mt-1">
                        {workflow.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge className={getStatusColor(workflow.status)}>
                    {workflow.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <div>Version: {workflow.version}</div>
                    <div>Created: {formatDate(workflow.created_at)}</div>
                    <div>Updated: {formatDate(workflow.updated_at)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewWorkflow(workflow.id)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditWorkflow(workflow.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
