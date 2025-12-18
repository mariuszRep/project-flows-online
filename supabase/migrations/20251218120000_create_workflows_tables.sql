-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create workflow_nodes table
CREATE TABLE IF NOT EXISTS public.workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workflow_edges table
CREATE TABLE IF NOT EXISTS public.workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  source_handle TEXT,
  target_handle TEXT,
  type TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON public.workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON public.workflows(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow_id ON public.workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_type ON public.workflow_nodes(type);

CREATE INDEX IF NOT EXISTS idx_workflow_edges_workflow_id ON public.workflow_edges(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_source ON public.workflow_edges(source);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_target ON public.workflow_edges(target);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflows table
-- Users can view workflows in their organizations
CREATE POLICY workflows_select_policy ON public.workflows
  FOR SELECT
  USING (
    organization_id IN (
      SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
    )
  );

-- Users can insert workflows in organizations they're members of
CREATE POLICY workflows_insert_policy ON public.workflows
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
    )
  );

-- Users can update workflows in their organizations
CREATE POLICY workflows_update_policy ON public.workflows
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
    )
  );

-- Users can delete workflows in their organizations
CREATE POLICY workflows_delete_policy ON public.workflows
  FOR DELETE
  USING (
    organization_id IN (
      SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
    )
  );

-- RLS Policies for workflow_nodes table
CREATE POLICY workflow_nodes_select_policy ON public.workflow_nodes
  FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM public.workflows
      WHERE organization_id IN (
        SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY workflow_nodes_insert_policy ON public.workflow_nodes
  FOR INSERT
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM public.workflows
      WHERE organization_id IN (
        SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY workflow_nodes_update_policy ON public.workflow_nodes
  FOR UPDATE
  USING (
    workflow_id IN (
      SELECT id FROM public.workflows
      WHERE organization_id IN (
        SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY workflow_nodes_delete_policy ON public.workflow_nodes
  FOR DELETE
  USING (
    workflow_id IN (
      SELECT id FROM public.workflows
      WHERE organization_id IN (
        SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
      )
    )
  );

-- RLS Policies for workflow_edges table
CREATE POLICY workflow_edges_select_policy ON public.workflow_edges
  FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM public.workflows
      WHERE organization_id IN (
        SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY workflow_edges_insert_policy ON public.workflow_edges
  FOR INSERT
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM public.workflows
      WHERE organization_id IN (
        SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY workflow_edges_update_policy ON public.workflow_edges
  FOR UPDATE
  USING (
    workflow_id IN (
      SELECT id FROM public.workflows
      WHERE organization_id IN (
        SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY workflow_edges_delete_policy ON public.workflow_edges
  FOR DELETE
  USING (
    workflow_id IN (
      SELECT id FROM public.workflows
      WHERE organization_id IN (
        SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
      )
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_nodes_updated_at
  BEFORE UPDATE ON public.workflow_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_edges_updated_at
  BEFORE UPDATE ON public.workflow_edges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
