"use client";

import { cn } from "@/lib/utils";
import { Controls as ControlsPrimitive } from "@xyflow/react";
import type { ComponentProps } from "react";

export type ControlsProps = ComponentProps<typeof ControlsPrimitive>;

export const Controls = ({ className, ...props }: ControlsProps) => (
  <ControlsPrimitive
    className={cn(
      "gap-1 overflow-hidden rounded-lg border bg-card p-2 shadow-xl z-[1000]",
      "[&>button]:rounded-md [&>button]:border-2 [&>button]:border-border [&>button]:bg-card [&>button]:hover:bg-accent [&>button]:text-foreground",
      "[&>button]:h-8 [&>button]:w-8 [&>button]:p-0 [&>button]:transition-colors",
      className
    )}
    showZoom={true}
    showFitView={true}
    showInteractive={false}
    {...props}
  />
);
