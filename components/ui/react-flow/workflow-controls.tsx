'use client'

import {
  ControlButton,
  Controls,
  useReactFlow,
  type ControlProps,
} from '@xyflow/react'
import { Maximize2, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface WorkflowControlsProps extends ControlProps {
  onReset?: () => void
  onFitView?: () => void
}

export function WorkflowControls({
  onFitView,
  onReset,
  ...props
}: WorkflowControlsProps) {
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow()

  const handleFitView = () => {
    fitView({ padding: 0.2 })
    onFitView?.()
  }

  const handleReset = () => {
    setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })
    onReset?.()
  }

  return (
    <Controls
      className={cn(
        'bg-card text-card-foreground rounded-lg border-2 border-border shadow-xl z-[1000]',
        '[&>button]:border-none [&>button]:bg-card [&>button]:text-foreground [&>button]:border-border',
        '[&>button:hover]:bg-accent [&>button:hover]:text-accent-foreground',
        '[&>button]:h-8 [&>button]:w-8 [&>button]:m-1',
        props.className,
      )}
      position={props.position || 'bottom-left'}
      showInteractive={false}
      {...props}
    >
      <ControlButton aria-label="Zoom in" onClick={() => zoomIn({ duration: 200 })}>
        <ZoomIn className="h-4 w-4" />
      </ControlButton>
      <ControlButton aria-label="Zoom out" onClick={() => zoomOut({ duration: 200 })}>
        <ZoomOut className="h-4 w-4" />
      </ControlButton>
      <ControlButton aria-label="Fit view" onClick={handleFitView}>
        <Maximize2 className="h-4 w-4" />
      </ControlButton>
      <ControlButton aria-label="Reset view" onClick={handleReset}>
        <RefreshCw className="h-4 w-4" />
      </ControlButton>
    </Controls>
  )
}
