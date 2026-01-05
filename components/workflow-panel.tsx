import { Panel } from "@/components/ai-elements/panel";
import type { ComponentProps } from "react";

type WorkflowPanelProps = ComponentProps<typeof Panel>;

export const WorkflowPanel = ({ ...props }: WorkflowPanelProps) => (
  <Panel {...props} />
);
