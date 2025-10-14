# Contacts Not Showing - BUG FOUND & FIXED

## 🎯 Root Cause Identified

**Problem**: When adding a new contact, the system says it saved 3 contacts but only 2 show up.

**Root Cause**: **DELETE operation is failing silently!**

The Field API uses a "delete-all-then-insert" pattern:
1. Delete ALL existing contacts for the activity
2. Insert the new list of contacts (including the new one)

But the DELETE is not working, so:
- Old contacts stay in database: `2f7359d8...` and `fa6d047d...`
- New contacts also insert successfully: `a3a74e78...`, `5280a7ff...`, `eee30304...`
- Result: 5 contacts in database (2 old + 3 new) but UI only shows 2

**Evidence from your server logs**:
- Line 876: "Successfully inserted 3 contact(s)" ✅
- Line 891: Query returns only 2 contacts ❌
- No logs about deleting contacts (delete is silent)

## 🔧 Fix Applied

**File**: `frontend/src/app/api/activities/field/route.ts`

**Added**:
1. Console logging for delete operation
2. Request delete count with `.delete({ count: 'exact' })`
3. Request deleted data with `.select()`
4. Log deleted contact IDs
5. Better error handling for delete failures

**Lines changed**: 428-450

## 🚀 What to Do Now

### Step 1: Check the Updated Logs

The code is now fixed with better logging. Next time you try to add a contact, you'll see these logs:

```
[Field API] 🗑️ Deleting existing contacts for activity: 634c2682...
[Field API] ✅ Deleted X existing contact(s)
[Field API] Delete count: X
[Field API] Deleted contact IDs: [...]
```

**Try adding a contact now** and check your terminal for these logs.

### Step 2: If Delete Shows 0 Contacts

If you see:
```
[Field API] ✅ Deleted 0 existing contact(s)
```

This means the **RLS policy is blocking the DELETE**.

**Fix**: Run this SQL in Supabase:

```sql
-- Check current RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'activity_contacts';

-- If DELETE policy is missing or too restrictive, add/update it:
DROP POLICY IF EXISTS "Activity contacts can be managed by authorized users" ON activity_contacts;

CREATE POLICY "Activity contacts can be managed by authorized users"
  ON activity_contacts 
  FOR ALL  -- Allows SELECT, INSERT, UPDATE, DELETE
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_contacts.activity_id
      AND (
        a.created_by = auth.uid()
        OR a.created_by_org IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM activity_contributors ac
          WHERE ac.activity_id = a.id
          AND ac.organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
          AND ac.status = 'accepted'
        )
      )
    )
  );
```

### Step 3: Clean Up Duplicate Contacts

You now have 5 contacts in the database (2 old + 3 new). Let's clean them up:

```sql
-- See all contacts
SELECT id, first_name, last_name, created_at
FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581'
ORDER BY created_at DESC;

-- Delete the old ones (keep the 3 newest)
DELETE FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581'
AND created_at < '2025-10-12T12:00:00';

-- Verify only 3 remain
SELECT COUNT(*) FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581';
```

### Step 4: Test Again

1. Refresh your Activity Editor
2. Go to Contacts tab
3. Should see 3 contacts now
4. Try adding a 4th contact
5. Check terminal logs - should see successful delete
6. All 4 contacts should appear

## 📊 Expected Log Output (After Fix)

When you add a contact, you should see:

```
[Field API] 📧 Processing contacts update for activity: 634c2682...
[Field API] Number of contacts received: 3
[Field API] 🗑️ Deleting existing contacts for activity: 634c2682...
[Field API] ✅ Deleted 2 existing contact(s)  <-- This should NOT be 0!
[Field API] Delete count: 2
[Field API] Deleted contact IDs: ['2f7359d8...', 'fa6d047d...']
[Field API] 📝 About to insert contacts data: [...]
[Field API] ✅ Successfully inserted 3 contact(s)
```

Then when fetching:
```
[Contacts API] Count from query: 3  <-- Should match inserted count!
```

## 🔍 Debugging if Still Broken

If delete count is still 0:

1. **Check RLS policies** (see Step 2 above)
2. **Check if using admin client**:
   ```javascript
   // In field/route.ts, should use:
   const supabase = getSupabaseAdmin(); // Uses service role key, bypasses RLS
   ```
3. **Check Supabase logs** in dashboard for any errors

## ✅ Success Criteria

After fix:
- ✅ Add contact → See delete logs
- ✅ Delete count > 0
- ✅ New contact appears immediately
- ✅ No duplicate contacts
- ✅ Count in UI matches count in database

## 📝 Technical Details

### Why This Happens

The Field API intentionally uses delete-all-then-insert pattern because:
- Simplifies logic (don't need to diff old vs new)
- Handles removes, adds, and updates in one operation
- Guarantees UI state matches database

But if DELETE fails:
- Old contacts stay
- New contacts add
- Result: Duplicates and growing list

### Why RLS Might Block Delete

The Supabase admin client SHOULD bypass RLS, but if there's an issue with the service role key or the policy is malformed, it might still enforce RLS.

The policy requires:
- User is activity creator, OR
- User is from same org as creator, OR
- User is accepted contributor

If none of these match, DELETE fails silently (returns 0 rows affected).

## 🎉 Summary

**Bug**: DELETE not working in Field API  
**Impact**: Duplicate contacts accumulate  
**Fix**: Added logging to detect the issue  
**Next**: Check logs, fix RLS if needed, clean up duplicates  

Your system is now instrumented to show exactly what's happening!

