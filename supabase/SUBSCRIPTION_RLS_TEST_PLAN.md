# Subscription RLS Integration Test Plan

This document outlines the manual testing procedure for verifying that subscription-based access control is enforced at the database level via RLS policies.

## Test Setup

### Prerequisites
1. Local Supabase running (`npx supabase start`)
2. Database reset applied (`npx supabase db reset`)
3. At least one test user created
4. At least one organization created

### Test Data Required

Create the following test data:

1. **Test User**: Any authenticated user
2. **Test Organization**: Organization with the test user as owner
3. **Test Subscriptions**: Create multiple subscription records with different statuses

## Test Cases

### Test Case 1: Active Subscription - Access Granted

**Setup:**
```sql
-- Create active subscription
INSERT INTO subscriptions (
  org_id,
  stripe_subscription_id,
  stripe_customer_id,
  stripe_price_id,
  status,
  current_period_start,
  current_period_end
) VALUES (
  '<test_org_id>',
  'sub_test_active',
  'cus_test',
  'price_test',
  'active',
  now(),
  now() + interval '30 days'
);
```

**Test:**
- Query organizations table: Should return data
- Query workspaces table: Should return data
- Insert into workspaces: Should succeed
- Update workspace: Should succeed

**Expected Result:** All operations succeed

---

### Test Case 2: Expired Subscription - Access Denied

**Setup:**
```sql
-- Update subscription to expired status
UPDATE subscriptions
SET status = 'canceled',
    current_period_end = now() - interval '1 day'
WHERE org_id = '<test_org_id>';
```

**Test:**
- Query workspaces table: Should return empty or error
- Insert into workspaces: Should fail
- Update workspace: Should fail

**Expected Result:** Database-level access denied

---

### Test Case 3: Trialing Subscription - Access Granted

**Setup:**
```sql
-- Update subscription to trialing status
UPDATE subscriptions
SET status = 'trialing',
    current_period_end = now() + interval '14 days'
WHERE org_id = '<test_org_id>';
```

**Test:**
- Query workspaces table: Should return data
- CRUD operations: Should succeed

**Expected Result:** All operations succeed

---

### Test Case 4: Canceled Subscription Within Period - Access Granted

**Setup:**
```sql
-- Update subscription to canceled but still within period
UPDATE subscriptions
SET status = 'canceled',
    current_period_end = now() + interval '15 days'
WHERE org_id = '<test_org_id>';
```

**Test:**
- Query workspaces table: Should return data
- CRUD operations: Should succeed

**Expected Result:** Access granted until current_period_end

---

### Test Case 5: Past Due with Grace Period - Access Granted

**Setup:**
```sql
-- Update subscription to past_due within 3-day grace period
UPDATE subscriptions
SET status = 'past_due',
    updated_at = now() - interval '2 days'
WHERE org_id = '<test_org_id>';
```

**Test:**
- Query workspaces table: Should return data
- CRUD operations: Should succeed

**Expected Result:** Access granted within 3-day grace period

---

### Test Case 6: Past Due Beyond Grace Period - Access Denied

**Setup:**
```sql
-- Update subscription to past_due beyond 3-day grace period
UPDATE subscriptions
SET status = 'past_due',
    updated_at = now() - interval '4 days'
WHERE org_id = '<test_org_id>';
```

**Test:**
- Query workspaces table: Should return empty or error
- CRUD operations: Should fail

**Expected Result:** Database-level access denied

---

### Test Case 7: Exempt Tables - Always Accessible

**Setup:**
- Any subscription status (even expired)

**Test:**
- Query subscriptions table: Should always work
- Query organizations table: Should always work
- Query invitations table: Should always work

**Expected Result:** These tables exempt from subscription checks

---

### Test Case 8: No Subscription - Access Denied

**Setup:**
```sql
-- Delete subscription
DELETE FROM subscriptions WHERE org_id = '<test_org_id>';
```

**Test:**
- Query workspaces table: Should return empty or error
- CRUD operations: Should fail

**Expected Result:** Database-level access denied

---

## Performance Testing

### Middleware Performance Improvement

**Before (with middleware check):**
```
Middleware execution time: ~50ms (includes DB query)
```

**After (without middleware check):**
```
Expected: < 20ms (only auth session update)
```

**How to Test:**
1. Add console.time/timeEnd to middleware
2. Make 100 requests to organization routes
3. Calculate average execution time
4. Compare before/after removing subscription checks

---

## API Route & Server Action Testing

### Test Direct Database Access Cannot Bypass

**Test 1: API Route with Service Role Client**
```typescript
// This should STILL enforce RLS because function uses user context
const supabase = createServiceRoleClient()
const { data } = await supabase
  .from('workspaces')
  .select('*')
  .eq('org_id', orgId)
```

**Expected:** Should respect has_permission which checks subscription

**Test 2: Server Action**
```typescript
// Uses authenticated client
const supabase = await createClient()
const { data } = await supabase
  .from('workspaces')
  .select('*')
  .eq('org_id', orgId)
```

**Expected:** RLS policies automatically enforce subscription check

---

## Success Criteria

- ✅ Active subscription allows all CRUD operations
- ✅ Expired subscription blocks database access
- ✅ Trialing subscription allows access
- ✅ Canceled subscription allows access until period end
- ✅ Past_due with grace period allows access
- ✅ Past_due beyond grace period blocks access
- ✅ Exempt tables (subscriptions, organizations, invitations) always accessible
- ✅ No subscription blocks access
- ✅ Middleware execution time improved (< 20ms)
- ✅ API routes cannot bypass subscription checks
- ✅ Server Actions cannot bypass subscription checks
- ✅ Direct Supabase client queries respect subscription status

---

## Implementation Verification

### Database Functions Created

Verify functions exist:
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('org_has_active_subscription', 'has_permission')
  AND pronamespace = 'public'::regnamespace;
```

### RLS Policies Use has_permission

Verify RLS policies reference has_permission:
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%has_permission%';
```

---

## Notes

- All tests should be run with an authenticated user session
- Tests should verify both success and failure cases
- Performance tests should use realistic data volumes
- Document any unexpected behaviors or edge cases discovered during testing
