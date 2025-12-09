-- Integrate subscription status into RLS policies for database-level access control
-- This migration enhances the has_permission function to check subscription status
-- before granting access to organization-scoped resources

-- Helper function to check if an organization has an active subscription
CREATE OR REPLACE FUNCTION public.org_has_active_subscription(org_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub_record RECORD;
BEGIN
  -- Get the subscription record for this organization
  SELECT status, current_period_end, updated_at
  INTO sub_record
  FROM public.subscriptions
  WHERE org_id = org_id_param
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription exists, return false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check subscription status with grace period logic
  RETURN CASE
    -- Active subscriptions are valid
    WHEN sub_record.status = 'active' THEN true

    -- Trialing subscriptions are valid
    WHEN sub_record.status = 'trialing' THEN true

    -- Canceled subscriptions are valid until current_period_end
    WHEN sub_record.status = 'canceled' AND sub_record.current_period_end > now() THEN true

    -- Past_due subscriptions get 3-day grace period from last update
    WHEN sub_record.status = 'past_due' AND sub_record.updated_at > (now() - INTERVAL '3 days') THEN true

    -- All other statuses are invalid
    ELSE false
  END;
END;
$function$;

-- Enhanced has_permission function that checks subscription status
CREATE OR REPLACE FUNCTION public.has_permission(table_name_param text, action_param text, org_id_param uuid, row_id_param uuid DEFAULT NULL::uuid, workspace_id_param uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  permission_action TEXT;
  exempt_tables TEXT[] := ARRAY['subscriptions', 'organizations', 'invitations'];
BEGIN
  -- Check subscription status first (except for exempt tables)
  -- This enforces subscription requirements at the database level
  IF NOT (table_name_param = ANY(exempt_tables)) THEN
    IF NOT public.org_has_active_subscription(org_id_param) THEN
      RETURN false;
    END IF;
  END IF;

  -- Map SQL actions to permission actions
  permission_action := CASE action_param
    WHEN 'select' THEN 'read'
    WHEN 'insert' THEN 'create'
    WHEN 'update' THEN 'update'
    WHEN 'delete' THEN 'delete'
    ELSE action_param
  END;

  -- Check if user has permission
  RETURN EXISTS (
    SELECT 1
    FROM public.permissions p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.principal_type = 'user'
      AND p.principal_id = auth.uid()
      AND p.org_id = org_id_param
      AND p.object_type = table_name_param
      -- Match either:
      -- 1. Table-level permission (object_id IS NULL) OR
      -- 2. Row-level permission (object_id matches row_id_param)
      AND (p.object_id IS NULL OR p.object_id = row_id_param)
      -- For workspace-scoped objects, also check workspace permission
      AND (workspace_id_param IS NULL OR p.object_type = 'workspace' AND p.object_id = workspace_id_param)
      AND r.permissions ? permission_action
      AND p.deleted_at IS NULL
      AND r.deleted_at IS NULL
  );
END;
$function$;

-- Add comment explaining the subscription enforcement
COMMENT ON FUNCTION public.org_has_active_subscription(uuid) IS
'Helper function to check if an organization has an active subscription. Includes grace period logic: canceled subscriptions valid until period end, past_due subscriptions valid for 3 days after last update.';

COMMENT ON FUNCTION public.has_permission(text, text, uuid, uuid, uuid) IS
'Enhanced permission check that enforces subscription status at database level. Checks subscription before permission validation, except for exempt tables (subscriptions, organizations, invitations).';
