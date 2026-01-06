'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { ActionMetadata, ActionParameterSchema } from '@/types/actions'

interface ActionParametersFormProps {
  actionMetadata?: ActionMetadata
  parameters: Record<string, any>
  onChange: (parameters: Record<string, any>) => void
}

export function ActionParametersForm({
  actionMetadata,
  parameters,
  onChange,
}: ActionParametersFormProps) {
  if (!actionMetadata) {
    return null
  }

  const { inputSchema } = actionMetadata
  const properties = inputSchema?.properties || {}

  // If no properties, show a message
  if (Object.keys(properties).length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        This action has no configurable parameters.
      </div>
    )
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({
      ...parameters,
      [fieldName]: value,
    })
  }

  const renderField = (fieldName: string, schema: ActionParameterSchema) => {
    const currentValue = parameters[fieldName] ?? schema.default ?? ''

    switch (schema.type) {
      case 'string':
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={`param-${fieldName}`}>
              {fieldName}
              {schema.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {schema.description && (
              <p className="text-xs text-muted-foreground">{schema.description}</p>
            )}
            <Input
              id={`param-${fieldName}`}
              type="text"
              value={currentValue}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              placeholder={schema.default || `Enter ${fieldName}`}
            />
          </div>
        )

      case 'number':
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={`param-${fieldName}`}>
              {fieldName}
              {schema.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {schema.description && (
              <p className="text-xs text-muted-foreground">{schema.description}</p>
            )}
            <Input
              id={`param-${fieldName}`}
              type="number"
              value={currentValue}
              onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value))}
              placeholder={schema.default?.toString() || `Enter ${fieldName}`}
            />
          </div>
        )

      case 'boolean':
        return (
          <div key={fieldName} className="flex items-center space-x-2 py-2">
            <Checkbox
              id={`param-${fieldName}`}
              checked={Boolean(currentValue)}
              onCheckedChange={(checked) => handleFieldChange(fieldName, checked)}
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor={`param-${fieldName}`} className="cursor-pointer">
                {fieldName}
                {schema.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {schema.description && (
                <p className="text-xs text-muted-foreground">{schema.description}</p>
              )}
            </div>
          </div>
        )

      default:
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={`param-${fieldName}`}>
              {fieldName}
              {schema.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {schema.description && (
              <p className="text-xs text-muted-foreground">{schema.description}</p>
            )}
            <Input
              id={`param-${fieldName}`}
              type="text"
              value={JSON.stringify(currentValue)}
              onChange={(e) => {
                try {
                  handleFieldChange(fieldName, JSON.parse(e.target.value))
                } catch {
                  handleFieldChange(fieldName, e.target.value)
                }
              }}
              placeholder={`Enter ${fieldName}`}
            />
          </div>
        )
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="text-sm font-medium">Parameters</div>
      {Object.entries(properties).map(([fieldName, schema]) =>
        renderField(fieldName, schema)
      )}
    </div>
  )
}
