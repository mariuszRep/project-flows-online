"use client";

import { cn } from "@/lib/utils";
import {
  Controls as ControlsPrimitive,
  ControlButton as ControlButtonPrimitive,
} from "@xyflow/react";
import type { ComponentProps } from "react";

export type ControlsProps = ComponentProps<typeof ControlsPrimitive>;
export type ControlButtonProps = ComponentProps<typeof ControlButtonPrimitive>;

export const ControlButton = ({ className, ...props }: ControlButtonProps) => (
  <ControlButtonPrimitive
    className={cn(
      "border-none! bg-transparent! hover:bg-secondary! rounded-md!",
      className
    )}
    {...props}
  />
);

export const Controls = ({ className, ...props }: ControlsProps) => (
  <ControlsPrimitive
    className={cn(
      "flex gap-px overflow-hidden rounded-md border bg-card p-1 shadow-none!",
      "[&>button]:rounded-md [&>button]:border-none! [&>button]:bg-transparent! [&>button]:hover:bg-secondary!",
      props.orientation === "horizontal" ? "flex-row" : "flex-col",
      className
    )}
    {...props}
  />
);
