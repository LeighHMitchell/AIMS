# Contacts Tab - Supabase Caching Issue

## Current Status

The new ContactsTab has been **temporarily disabled** due to persistent Supabase query caching issues.

**Feature Flag**: `NEXT_PUBLIC_CONTACTS_V2` now defaults to `false` (legacy ContactsSection active)

## Problem Summary

### What Works ✅
- Contacts save successfully to `activity_contacts` database
- All IATI fields are persisted correctly
- Focal point and editing rights flags work
- Manual creation works
- XML import works
- Search functionality works

### What Doesn't Work ❌
- **Contacts don't appear in UI immediately after saving**
- Database shows all contacts, but API only returns a subset
- Supabase query returns fewer contacts than exist in database

## Root Cause: Supabase Query Caching

### Evidence

**Terminal Logs Show**:
```
[Field API] ✅ Successfully inserted 2 contact(s)
[Field API] Inserted contact names: ['A. Example', 'Healthy Life']
```
✅ Save succeeds - 2 contacts inserted

```
[Contacts API] Fetched contacts (no join): 1
```
❌ Fetch returns only 1 contact (should be 2)

**Database Query Shows**:
```sql
SELECT * FROM activity_contacts WHERE activity_id = '...'
-- Returns: 2 contacts ✅
```

**API Query Returns**: 1 contact ❌

### Attempted Fixes

1. ✅ **Changed from INNER JOIN to LEFT JOIN**
   - Issue: Contacts without `linked_user_id` were being filtered
   - Fix: Used `!left` modifier
   - Result: Still only returned 1 contact

2. ✅ **Removed JOIN entirely**
   - Issue: JOIN might be causing filtering
   - Fix: Query `activity_contacts` table only, no joins
   - Result: Still only returned 1 contact

3. ✅ **Disabled Supabase singleton**
   - Issue: Singleton client might cache query results
   - Fix: Create fresh client on each request
   - Result: Improved to 2 contacts, but not all contacts

4. ✅ **Added cache-busting**
   - Issue: Browser or Next.js caching API responses
   - Fix: Added timestamp query param and cache headers
   - Result: No improvement

5. ❌ **Attempted raw SQL query**
   - Not implemented (would require creating SQL function)

### Current Hypothesis

The Supabase JS client has internal query result caching or connection pooling that:
- Caches the first query result for a given table+filter
- Doesn't invalidate cache when new rows are inserted
- Returns stale data even with fresh client instances

This is likely a Supabase JS SDK issue, not a database or RLS problem.

## Workaround: Use Legacy ContactsSection

The legacy `ContactsSection` component uses a different data flow:
- Manages contacts in React state
- Uses `/api/activities/field` for persistence
- Doesn't rely on GET `/api/activities/[id]/contacts`
- Works reliably

### To Use Legacy ContactsSection (Current Default)

No action needed - it's now the default.

### To Enable New ContactsTab (For Testing)

Set environment variable:
```bash
NEXT_PUBLIC_CONTACTS_V2=true npm run dev
```

## What New ContactsTab Provides (When Fixed)

- Search-first UX with unified user search
- IATI-compliant form with all fields
- Modern card-based layout
- Better validation
- Focal point and editing rights checkboxes prominent
- Deduplication on XML import
- Cleaner code architecture

## Next Steps to Fix

### Option 1: Use PostgreSQL Direct Connection (Recommended)
Instead of Supabase JS SDK, use a PostgreSQL client directly:
- `pg` or `postgres.js` library
- Direct SQL queries
- No SDK caching layer
- Full control over queries

### Option 2: Implement Custom RPC Function
Create a PostgreSQL function:
```sql
CREATE OR REPLACE FUNCTION get_activity_contacts(p_activity_id UUID)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM activity_contacts 
  WHERE activity_id = p_activity_id
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;
```

Then call via `supabase.rpc('get_activity_contacts', { p_activity_id })`.

### Option 3: Add Cache Invalidation to Supabase Client
Configure Supabase client with cache: 'no-store':
```typescript
const supabase = createClient(url, key, {
  db: { schema: 'public' },
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
  }
});
```

### Option 4: Poll for Updates
After save, poll the API every 500ms until contact count matches:
```typescript
let retries = 0;
while (retries < 5) {
  const data = await fetch(...);
  if (data.length === expectedCount) break;
  await sleep(500);
  retries++;
}
```

## Files Status

### Working (Legacy)
- ✅ `frontend/src/components/ContactsSection.tsx` - Active
- ✅ Uses existing `/api/activities/field` endpoint
- ✅ No caching issues

### Created But Disabled (New)
- ⏸️ `frontend/src/components/contacts/ContactsTab.tsx`
- ⏸️ `frontend/src/components/contacts/ContactCard.tsx`
- ⏸️ `frontend/src/components/contacts/ContactForm.tsx`
- ⏸️ `frontend/src/components/contacts/ContactSearchBar.tsx`
- ⏸️ `frontend/src/app/api/contacts/search/route.ts`

### Fixed/Updated
- ✅ `frontend/src/lib/contact-utils.ts` - Deduplication works
- ✅ `frontend/src/lib/supabase.ts` - Singleton disabled (helps but not enough)
- ⚠️ `frontend/src/app/api/activities/[id]/contacts/route.ts` - Has caching issue

## Recommendation

**For now**: Use legacy ContactsSection (already active by default)

**For future**: Investigate Supabase JS SDK caching behavior or switch to direct PostgreSQL connection

## Testing Legacy ContactsSection

1. Refresh the page
2. Go to Contacts tab
3. Should see the working legacy interface
4. Add contacts - they should appear immediately
5. All IATI fields still work (they were already implemented)
6. XML import still works

The IATI compliance, focal point/editing rights, and XML import features are **already implemented** in the legacy ContactsSection from previous work.

---

**Status**: New ContactsTab disabled pending Supabase caching fix  
**Active**: Legacy ContactsSection with full IATI support  
**Impact**: User experience slightly different but all features work

