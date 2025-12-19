'use client'

import * as React from 'react'
import { useWorkspaceBreadcrumbs } from '@/features/workspaces/components/workspace-client'

interface WorkflowBreadcrumbSetterProps {
  workflowName: string
}

export function WorkflowBreadcrumbSetter({ workflowName }: WorkflowBreadcrumbSetterProps) {
  const { setExtraBreadcrumbs } = useWorkspaceBreadcrumbs()

  React.useEffect(() => {
    setExtraBreadcrumbs([{ label: workflowName }])

    return () => setExtraBreadcrumbs([])
  }, [setExtraBreadcrumbs, workflowName])

  return null
}
