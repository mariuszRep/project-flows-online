'use client'

// React Flow canvas wrapper for AI workflows

import { Background, ReactFlow, type ReactFlowProps } from "@xyflow/react";
import type { ReactNode } from "react";
import "@xyflow/react/dist/style.css";

type CanvasProps = ReactFlowProps & {
  children?: ReactNode;
};

export const Canvas = ({ children, ...props }: CanvasProps) => (
  <ReactFlow
    deleteKeyCode={["Backspace", "Delete"]}
    fitView
    panOnDrag={false}
    panOnScroll
    selectionOnDrag={true}
    zoomOnDoubleClick={false}
    minZoom={0.1}
    maxZoom={2}
    preventScrolling={true}
    {...props}
  >
    <Background bgColor="var(--sidebar)" gap={16} size={1} />
    {children}
  </ReactFlow>
);
