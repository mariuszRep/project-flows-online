-- Create MCP connections table for managing long-lived connection tokens
-- This replaces the need for JWT authentication and provides better UX
CREATE TABLE IF NOT EXISTS public.mcp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Token (hashed for security)
  token_hash TEXT NOT NULL UNIQUE,
  
  -- Metadata
  name TEXT NOT NULL,
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  -- Session tracking
  is_connected BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_connections_token_hash ON public.mcp_connections(token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_user_org ON public.mcp_connections(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_expires_at ON public.mcp_connections(expires_at) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view connections in their organizations
CREATE POLICY mcp_connections_select_policy ON public.mcp_connections
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

-- Users can create connections in their organizations
CREATE POLICY mcp_connections_insert_policy ON public.mcp_connections
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
    )
    AND user_id = auth.uid()
  );

-- Users can update their own connections
CREATE POLICY mcp_connections_update_policy ON public.mcp_connections
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT org_id
      FROM public.permissions
      WHERE principal_id = auth.uid()
      AND principal_type = 'user'
      AND deleted_at IS NULL
    )
  );

-- Users can delete their own connections
CREATE POLICY mcp_connections_delete_policy ON public.mcp_connections
  FOR DELETE
  USING (
    user_id = auth.uid()
  );
