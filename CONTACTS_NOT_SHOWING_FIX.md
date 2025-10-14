# Fix: Contacts Not Showing in UI

## Root Cause Analysis

After investigating, the system uses **legacy ContactsSection** by default (not the new ContactsTab). The legacy component DOES fetch from the API, so contacts should appear. If they don't, here are the issues and fixes:

## Issue 1: Feature Flag Disabled New Component

**Current State**: `NEXT_PUBLIC_CONTACTS_V2` defaults to `false`, using legacy ContactsSection

**Location**: `frontend/src/app/activities/new/page.tsx` line 1757

**Impact**: The new ContactsTab (which has better caching) is not being used

**Fix Options**:

### Option A: Enable New ContactsTab (Recommended)
Set environment variable:
```bash
NEXT_PUBLIC_CONTACTS_V2=true
```

Or update `.env.local`:
```
NEXT_PUBLIC_CONTACTS_V2=true
```

Then restart dev server.

### Option B: Keep Legacy, Ensure It Refreshes
The legacy component should work. If it doesn't show contacts:

1. Check browser console for `[Contacts]` logs
2. Look for any error messages
3. Verify API is returning data

## Issue 2: Caching Preventing Updates

**Problem**: When you manually add contacts to database, the UI doesn't refresh

**Solution 1: Force Refresh** (Quick)
After adding contacts to database:
1. Navigate away from Contacts tab
2. Click back to Contacts tab
3. OR refresh the page (F5)

**Solution 2: Add Manual Refresh Button**

Add a refresh button to the Contacts tab that triggers re-fetch.

## Issue 3: RLS Policy Blocking

**Problem**: Row Level Security might be preventing reads

**Check**: Run this SQL in Supabase:
```sql
-- Check if RLS is blocking
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'activity_contacts';
```

**Fix**: Ensure SELECT policy allows reads:
```sql
-- This policy should exist and be permissive for SELECT
CREATE POLICY "Activity contacts are viewable by everyone"
  ON activity_contacts FOR SELECT
  USING (true);
```

## Issue 4: displayOnWeb Filter

**Problem**: Legacy component might filter by `display_on_web` column

**Check**: Verify your manually added contacts have `display_on_web = true`:
```sql
SELECT id, first_name, last_name, display_on_web 
FROM activity_contacts 
WHERE activity_id = '<YOUR_ACTIVITY_ID>';
```

**Fix**: Update contacts to set display flag:
```sql
UPDATE activity_contacts 
SET display_on_web = true 
WHERE activity_id = '<YOUR_ACTIVITY_ID>' 
  AND display_on_web IS NULL OR display_on_web = false;
```

## Issue 5: Missing Required Fields

**Problem**: Contacts might be missing required NOT NULL fields

**Check**: Verify all required fields are populated:
```sql
SELECT 
  id,
  CASE WHEN first_name IS NULL OR first_name = '' THEN 'MISSING' ELSE 'OK' END as first_name_status,
  CASE WHEN last_name IS NULL OR last_name = '' THEN 'MISSING' ELSE 'OK' END as last_name_status,
  CASE WHEN position IS NULL OR position = '' THEN 'MISSING' ELSE 'OK' END as position_status,
  CASE WHEN type IS NULL OR type = '' THEN 'MISSING' ELSE 'OK' END as type_status
FROM activity_contacts 
WHERE activity_id = '<YOUR_ACTIVITY_ID>';
```

**Fix**: Ensure all required fields are set:
```sql
UPDATE activity_contacts 
SET 
  first_name = COALESCE(NULLIF(first_name, ''), 'Unknown'),
  last_name = COALESCE(NULLIF(last_name, ''), 'Unknown'),
  position = COALESCE(NULLIF(position, ''), 'Not specified'),
  type = COALESCE(NULLIF(type, ''), '1')
WHERE activity_id = '<YOUR_ACTIVITY_ID>';
```

## Recommended Actions (In Order)

### Step 1: Run Diagnostic
```bash
# 1. Navigate to your activity in Activity Editor
# 2. Open DevTools Console (F12)
# 3. Run the diagnostic script
```

Paste the contents of `diagnose_contacts_not_showing.js` into console.

This will tell you exactly where the break is:
- ❌ API not returning data → Database or RLS issue
- ❌ API returns data but UI blank → Component issue
- ✅ Everything working → Check if on wrong tab

### Step 2: Apply Quick Fixes

**If API returns 0 contacts:**
```sql
-- Check database directly
SELECT * FROM activity_contacts WHERE activity_id = '<YOUR_ID>';

-- If contacts exist, check display_on_web
UPDATE activity_contacts 
SET display_on_web = true 
WHERE activity_id = '<YOUR_ID>';
```

**If API returns contacts but UI doesn't show:**
```bash
# Enable new ContactsTab
echo "NEXT_PUBLIC_CONTACTS_V2=true" >> .env.local

# Restart dev server
npm run dev
```

### Step 3: Verify Fix
1. Navigate to Activity Editor
2. Go to Contacts tab
3. Contacts should now appear
4. Try adding a new contact to verify it saves

## Permanent Solution: Switch to New ContactsTab

The new ContactsTab component has better caching and refresh logic. To enable permanently:

1. Create/update `.env.local`:
```
NEXT_PUBLIC_CONTACTS_V2=true
```

2. Restart your development server:
```bash
npm run dev
```

3. Test thoroughly:
- Existing contacts display
- New contacts can be added
- Edits save properly
- Deletes work

4. If stable, update the default in code:

**File**: `frontend/src/app/activities/new/page.tsx`

Change line 1757 from:
```typescript
const useNewContactsTab = process.env.NEXT_PUBLIC_CONTACTS_V2 === 'true'; // Default to false for now
```

To:
```typescript
const useNewContactsTab = process.env.NEXT_PUBLIC_CONTACTS_V2 !== 'false'; // Default to true
```

This makes the new component default while allowing override with `NEXT_PUBLIC_CONTACTS_V2=false`.

## Testing Checklist

After applying fixes:

- [ ] Manually add contact to database
- [ ] Refresh Activity Editor page
- [ ] Navigate to Contacts tab
- [ ] Contact appears in list
- [ ] Can click Edit on contact
- [ ] Can delete contact
- [ ] Can add new contact via UI
- [ ] New contact persists after page refresh

## Additional Debugging

If contacts still don't show after all fixes:

### Check Browser Console
Look for these log patterns:
```
[Contacts] 🔍 Fetching contacts for activity: <ID>
[Contacts] ✅ Fetched contacts from database: {...}
[Contacts] ✅ Updating state with X contact(s)
```

If you see:
```
[Contacts] ⚠️ API returned empty array
```
→ Database or RLS issue

If you see:
```
[Contacts] ❌ API returned error status: 500
```
→ API or database error

### Check Network Tab
1. Open DevTools → Network tab
2. Filter by "contacts"
3. Refresh Contacts tab
4. Click the request to `/api/activities/{id}/contacts`
5. Check Response:
   - Should be JSON array
   - Should contain your contacts
   - Status should be 200 OK

### Check React DevTools
1. Install React DevTools extension
2. Open React DevTools → Components
3. Search for "ContactsSection" or "ContactsTab"
4. Check props and state:
   - `contacts` array should have data
   - `activityId` should match your activity
   - `isLoading` should be false

## Summary

**Most Likely Issue**: Contacts ARE in database and API returns them, but:
1. Using legacy component with caching issues, OR
2. `display_on_web` flag is false, OR
3. Need to enable new ContactsTab component

**Quick Fix**: 
```bash
echo "NEXT_PUBLIC_CONTACTS_V2=true" >> .env.local
npm run dev
```

**Verification**: Run `diagnose_contacts_not_showing.js` in browser console

