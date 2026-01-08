-- Secure MCP token validation function
-- Uses SECURITY DEFINER to bypass RLS with controlled scope
-- This is safer than using service role key in application code

-- Function to validate MCP token and return connection context
CREATE OR REPLACE FUNCTION public.validate_mcp_token(
  p_token_hash TEXT
)
RETURNS TABLE (
  connection_id UUID,
  user_id UUID,
  organization_id UUID,
  connection_name TEXT,
  has_permission BOOLEAN
) 
SECURITY DEFINER -- Run with function owner's privileges (bypasses RLS)
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_connection RECORD;
  v_permission_count INTEGER;
BEGIN
  -- Step 1: Find the connection by token hash
  SELECT 
    id,
    user_id,
    organization_id,
    name,
    revoked_at,
    expires_at
  INTO v_connection
  FROM public.mcp_connections
  WHERE token_hash = p_token_hash
  AND revoked_at IS NULL
  AND expires_at > NOW();

  -- If no valid connection found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Step 2: Check if user has active permissions for the organization
  SELECT COUNT(*)
  INTO v_permission_count
  FROM public.permissions
  WHERE principal_id = v_connection.user_id
    AND principal_type = 'user'
    AND org_id = v_connection.organization_id
    AND deleted_at IS NULL;

  -- Step 3: Update last_used_at and is_connected
  UPDATE public.mcp_connections
  SET 
    last_used_at = NOW(),
    is_connected = TRUE
  WHERE id = v_connection.id;

  -- Step 4: Return connection context
  RETURN QUERY SELECT
    v_connection.id,
    v_connection.user_id,
    v_connection.organization_id,
    v_connection.name,
    (v_permission_count > 0)::BOOLEAN;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.validate_mcp_token(TEXT) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_mcp_token IS 
'Validates MCP connection token and returns connection context. Uses SECURITY DEFINER to bypass RLS in a controlled manner. Only validates tokens, does not expose sensitive data.';

-- Function to disconnect MCP connection
CREATE OR REPLACE FUNCTION public.disconnect_mcp_connection(
  p_connection_id UUID
)
RETURNS VOID
SECURITY DEFINER -- Run with function owner's privileges (bypasses RLS)
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update connection to mark as disconnected
  UPDATE public.mcp_connections
  SET is_connected = FALSE
  WHERE id = p_connection_id;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.disconnect_mcp_connection(UUID) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.disconnect_mcp_connection IS 
'Marks an MCP connection as disconnected. Uses SECURITY DEFINER to bypass RLS in a controlled manner.';
