-- Fix invitation RLS policy to properly allow users to access their invitations
-- Users should be able to see:
-- 1. Invitations sent to them (user_id = auth.uid())
-- 2. Invitations they created (created_by = auth.uid())

-- Drop the existing overly permissive but non-functional policy
DROP POLICY IF EXISTS "authenticated_access_invitations" ON public.invitations;

-- Create proper invitation access policies
-- Users can view invitations sent to them
CREATE POLICY "users_view_own_invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can view invitations they created
CREATE POLICY "users_view_created_invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Users can insert invitations they create
CREATE POLICY "users_insert_own_invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update invitations they created or received
CREATE POLICY "users_update_own_invitations"
ON public.invitations
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR user_id = auth.uid())
WITH CHECK (created_by = auth.uid() OR user_id = auth.uid());

-- Users can delete invitations they created
CREATE POLICY "users_delete_own_invitations"
ON public.invitations
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Add comments for clarity
COMMENT ON POLICY "users_view_own_invitations" ON public.invitations IS
  'Users can view invitations sent to them';

COMMENT ON POLICY "users_view_created_invitations" ON public.invitations IS
  'Users can view invitations they created';

COMMENT ON POLICY "users_insert_own_invitations" ON public.invitations IS
  'Users can create invitations';

COMMENT ON POLICY "users_update_own_invitations" ON public.invitations IS
  'Users can update invitations they created or received';

COMMENT ON POLICY "users_delete_own_invitations" ON public.invitations IS
  'Users can delete invitations they created';
