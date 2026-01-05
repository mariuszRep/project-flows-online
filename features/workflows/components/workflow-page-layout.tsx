'use client'

import { WorkflowBuilder } from './workflow-builder'
import { WorkflowToolbar } from './workflow-toolbar'
import { NodePalette } from './node-palette'

interface WorkflowPageLayoutProps {
  workflowId: string
}

export function WorkflowPageLayout({ workflowId }: WorkflowPageLayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      <WorkflowToolbar
        onSave={() => console.log('Save')}
        onPublish={() => console.log('Publish')}
        onArchive={() => console.log('Archive')}
        onDuplicate={() => console.log('Duplicate')}
        onExport={() => console.log('Export')}
        onImport={() => console.log('Import')}
      />
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <div className="flex-1">
          <WorkflowBuilder workflowId={workflowId} />
        </div>
      </div>
    </div>
  )
}
