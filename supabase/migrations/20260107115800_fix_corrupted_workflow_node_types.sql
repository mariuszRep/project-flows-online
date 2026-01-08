-- Fix corrupted workflow node types
--
-- Background: Before the fix in workflow-service.ts, nodes were being saved with
-- type='workflow' instead of their actual type (start/process/end). The actual
-- type was stored in data.nodeType but the MCP service looks at the type column.
--
-- This migration fixes all existing workflows by copying data.nodeType to type column.

-- Update all workflow_nodes where type doesn't match the actual nodeType in data
UPDATE workflow_nodes
SET type = data->>'nodeType'
WHERE
  -- Only update nodes where type is 'workflow' but should be something else
  type = 'workflow'
  AND data->>'nodeType' IN ('start', 'process', 'end', 'decision')
  -- Safety check: ensure nodeType exists and is valid
  AND data->>'nodeType' IS NOT NULL;

-- Log the results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % workflow nodes with corrupted types', updated_count;
END $$;

-- Verify the fix by showing any remaining mismatches
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM workflow_nodes
  WHERE type != data->>'nodeType'
    AND data->>'nodeType' IS NOT NULL;

  IF mismatch_count > 0 THEN
    RAISE WARNING 'Still % nodes with type mismatch - manual review needed', mismatch_count;
  ELSE
    RAISE NOTICE 'All workflow node types are now consistent!';
  END IF;
END $$;
