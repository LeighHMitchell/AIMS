# Activity Contacts Persistence Fix

## Issues Fixed

### 1. ✅ Missing Data Return on Insert (Update Path)

**Problem:** When updating an activity, contacts were being inserted without `.select()`, so Supabase wasn't returning the inserted data, making it impossible to verify if contacts were saved.

**Fix Applied:**
```typescript
// Before:
const { error: contactsError } = await supabaseAdmin
  .from('activity_contacts')
  .insert(contactsData);

// After:
const { data: insertedContacts, error: contactsError } = await supabaseAdmin
  .from('activity_contacts')
  .insert(contactsData)
  .select();
```

### 2. ✅ Missing Error Handling & Warnings

**Problem:** Contact save errors weren't being properly reported to the user.

**Fix Applied:**
- Added error tracking for contact saves
- Included contact errors in the response warnings
- User now sees toast notifications if contacts fail to save

### 3. ✅ Enhanced Logging for Debugging

**Added comprehensive logging:**
- Log raw contacts data received from frontend
- Log each contact being processed
- Log mapped contact data before insert
- Log deletion errors
- Log successful inserts with count

### 4. ✅ Invalid UUID Format (FIXED)

**Problem:** Frontend was generating IDs like `contact-1234567890` which are not valid UUIDs. The database expects UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

**Fix Applied:**
- Removed ID from contact insert data
- Let database auto-generate UUID using `DEFAULT uuid_generate_v4()`
- Added comments to prevent future confusion

```typescript
// Don't include contact.id - let database auto-generate UUID
return {
  activity_id: body.id,
  type: contact.type || 'general',
  // ... other fields
};
```

## Required Fields Validation

The backend validates these required fields:
- `type` (defaults to 'general' if missing)
- `firstName` (defaults to 'Unknown' if missing)  
- `lastName` (defaults to 'Unknown' if missing)
- `position` (defaults to 'Unknown' if missing)

## Testing Instructions

1. **Check Browser Console**
   - Look for `[AIMS] Processing contacts` logs
   - Check for `[AIMS] Error saving contacts` if failing
   - Verify contact data structure is correct

2. **Test Contact Saving**
   - Add a new contact with all required fields
   - Save the activity
   - Check Supabase `activity_contacts` table
   - Refresh page and verify contact persists

3. **Monitor for Errors**
   ```
   [AIMS] Processing contacts for update, count: 1
   [AIMS] Raw contacts data received: [{...}]
   [AIMS] Mapped contact 0: {...}
   [AIMS] Successfully saved contacts: 1
   ```

## Common Issues & Solutions

### Issue: Contacts not appearing after save
**Check:**
1. Browser console for errors
2. Network tab for API response
3. Supabase table for actual data

### Issue: "Contact missing required fields" warning
**Fix:** Ensure all contacts have:
- Contact type (general, project_manager, etc.)
- First name
- Last name  
- Position/role

### Issue: Contacts deleted on update
**Cause:** Update process deletes all existing contacts before inserting new ones
**Fix:** This is expected behavior - ensures clean state

### Issue: Invalid UUID error
**Cause:** Frontend generating non-UUID IDs like `contact-123456`
**Fix:** Already fixed - backend now ignores frontend ID and auto-generates UUID

## Database Schema

```sql
CREATE TABLE activity_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, -- Auto-generates UUID
  activity_id UUID REFERENCES activities(id),
  type TEXT NOT NULL,
  title TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL,
  organisation TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  profile_photo TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Next Steps

1. Test thoroughly with various contact configurations
2. Monitor logs for any edge cases
3. Consider adding contact deduplication logic
4. Add contact validation on frontend before submit 