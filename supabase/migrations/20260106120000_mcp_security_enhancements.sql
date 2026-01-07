-- Security Enhancement: Auto-revoke MCP tokens when user loses org access
-- This prevents ex-members from using old tokens to access organization data

-- Function to auto-revoke tokens when permissions are deleted
CREATE OR REPLACE FUNCTION revoke_mcp_tokens_on_permission_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user permission is soft-deleted (deleted_at set), revoke all their MCP tokens for that org
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.mcp_connections
    SET
      revoked_at = NEW.deleted_at,
      is_connected = false
    WHERE
      user_id = NEW.principal_id
      AND organization_id = NEW.org_id
      AND principal_type = 'user'
      AND revoked_at IS NULL;

    RAISE NOTICE 'Auto-revoked MCP tokens for user % from org %', NEW.principal_id, NEW.org_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on permissions table to auto-revoke tokens
DROP TRIGGER IF EXISTS trigger_revoke_mcp_tokens_on_permission_removal ON public.permissions;
CREATE TRIGGER trigger_revoke_mcp_tokens_on_permission_removal
  AFTER UPDATE ON public.permissions
  FOR EACH ROW
  WHEN (NEW.principal_type = 'user')
  EXECUTE FUNCTION revoke_mcp_tokens_on_permission_removal();

-- Function to auto-revoke tokens when user is hard-deleted
CREATE OR REPLACE FUNCTION revoke_mcp_tokens_on_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Revoke all MCP tokens when user is deleted
  UPDATE public.mcp_connections
  SET
    revoked_at = NOW(),
    is_connected = false
  WHERE
    user_id = OLD.id
    AND revoked_at IS NULL;

  RAISE NOTICE 'Auto-revoked all MCP tokens for deleted user %', OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on users table to auto-revoke tokens on user deletion
DROP TRIGGER IF EXISTS trigger_revoke_mcp_tokens_on_user_deletion ON auth.users;
CREATE TRIGGER trigger_revoke_mcp_tokens_on_user_deletion
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION revoke_mcp_tokens_on_user_deletion();

-- Add comment explaining the security pattern
COMMENT ON FUNCTION revoke_mcp_tokens_on_permission_removal() IS
'Security: Automatically revokes MCP connection tokens when a user loses organization access. Prevents ex-members from using old tokens.';

COMMENT ON FUNCTION revoke_mcp_tokens_on_user_deletion() IS
'Security: Automatically revokes all MCP connection tokens when a user account is deleted.';
