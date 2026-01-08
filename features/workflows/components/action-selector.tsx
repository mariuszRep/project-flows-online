'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { ActionMetadata } from '@/types/actions'

interface ActionSelectorProps {
  value?: string
  onChange: (actionId: string) => void
  availableActions: ActionMetadata[]
}

export function ActionSelector({ value, onChange, availableActions }: ActionSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="action-selector">Action</Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger id="action-selector">
          <SelectValue placeholder="Select an action" />
        </SelectTrigger>
        <SelectContent>
          {availableActions.map((action) => (
            <SelectItem key={action.id} value={action.id}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{action.name}</span>
                <span className="text-xs text-muted-foreground">{action.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
