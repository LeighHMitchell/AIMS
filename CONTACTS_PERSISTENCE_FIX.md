# Contacts Persistence Fix - Manual Save Issue

## Problem Summary

Manually added contacts were showing successfully after save but disappearing after page refresh. The contacts were not being persisted to the database, even though the API returned 200 (success).

## Root Causes Identified

### Primary Issue: NOT NULL Constraint Violation
The `position` field in `activity_contacts` table has a `NOT NULL` constraint, but when users leave the position field empty in the form, the code was sending `null` to the database, causing the insert to fail silently.

```sql
-- From: add_activity_contacts_table.sql line 10
position TEXT NOT NULL,
```

### Secondary Issue: Empty Strings vs NULL
When contacts are created in the UI, empty form fields result in empty strings (`""`) instead of `null` values. The database schema expects `null` for optional fields.

### Evidence from Console Logs

**When Saving:**
- Autosave reported success: `[FieldAutosave] Field contacts saved successfully`
- Contacts had temporary client IDs: `"id": "contact-1760196009739"`
- Empty string values: `"position": ""`, `"organisationId": ""`

**After Refresh:**
- API returned empty array: `[Contacts] ✅ Fetched contacts from database: {length: 0, data: []}`
- No contacts found in database despite "successful" save

## The Fix

### File: `frontend/src/app/api/activities/field/route.ts` (lines 432-530)

**Changes Made:**

1. **Fixed NOT NULL Constraint Violation for `position` Field**
   Changed from:
   ```typescript
   const position = contact.position?.trim() || null;
   ```
   
   To:
   ```typescript
   const position = contact.position?.trim() || 'Not specified';
   ```
   
   This ensures the `position` field always has a value, satisfying the NOT NULL database constraint.

2. **Added `toNullIfEmpty()` Helper Function**
   ```typescript
   const toNullIfEmpty = (value: any) => {
     if (value === '' || value === undefined) return null;
     return value;
   };
   ```
   This ensures all empty strings are converted to `null` before database insertion for optional fields.

3. **Applied Helper to All Optional Contact Fields**
   Changed from:
   ```typescript
   title: contact.title || null,
   organisation_id: contact.organisationId || null,
   ```
   
   To:
   ```typescript
   title: toNullIfEmpty(contact.title),
   organisation_id: toNullIfEmpty(contact.organisationId),
   ```
   
   Applied to all optional fields:
   - title, middleName, jobTitle
   - organisation, organisationId, department
   - phone, countryCode, phoneNumber
   - fax, faxCountryCode, faxNumber
   - email, secondaryEmail, website, mailingAddress
   - profilePhoto, notes
   - userId, role, name, linkedUserId

4. **Enhanced Logging for Debugging**
   - Added check for temporary client IDs: `hasTemporaryId: contact.id?.startsWith('contact-')`
   - Added detailed insert logging with sample data
   - Added warning if insert succeeds but returns no data
   - Log inserted contact IDs and names for verification
   - Added 📝 and ✅ emojis to make logs easier to scan

5. **Added Explicit Comment**
   ```typescript
   // NOTE: Explicitly NOT including 'id' field - let database generate UUID
   ```
   Confirms temporary client IDs are never sent to database.

## Testing Instructions

### Test Case 1: Manual Contact Creation

1. Navigate to Activity Editor → Contacts tab
2. Click "Add Contact"
3. Fill in required fields:
   - Contact Type: General Enquiries
   - First Name: Test
   - Last Name: User
   - Position: (leave empty)
4. Fill optional fields:
   - Job Title (IATI): Manager
   - Department: (leave empty)
   - Organisation: Select any
5. Save contact
6. **Verify in console:**
   ```
   [Field API] Processing contact: { ...hasTemporaryId: true }
   [Field API] 📝 About to insert contacts data: [...]
   [Field API] ✅ Successfully inserted 1 contact(s)
   [Field API] Inserted contact IDs: ["<UUID>"]
   [Field API] Inserted contact names: ["Test User"]
   ```
7. Refresh the page
8. **Verify:** Contact still appears in Contacts tab
9. Check console logs:
   ```
   [Contacts] ✅ Fetched contacts from database: {length: 1, data: [...]}
   ```

### Test Case 2: IATI XML Import

1. Navigate to XML Import tab
2. Upload IATI XML with contact-info elements
3. Select contacts to import
4. Click "Import Selected Fields"
5. Navigate to Contacts tab
6. **Verify:** Imported contacts appear
7. Refresh page
8. **Verify:** Contacts persist after refresh

### Test Case 3: Multiple Contacts

1. Add 3 contacts with varying field combinations:
   - Contact 1: All fields filled
   - Contact 2: Only required fields
   - Contact 3: Mix of filled and empty fields
2. Save all
3. Refresh page
4. **Verify:** All 3 contacts persist
5. Check console shows:
   ```
   [Field API] ✅ Successfully inserted 3 contact(s)
   ```

## Expected Console Output (Successful Save)

```
[CONTACTS DEBUG] Triggering autosave for contacts...
[FieldAutosave] performFieldSave called for field contacts
[Field API] Processing contact: {
  originalType: "1",
  mappedType: "1",
  originalFirstName: "Test",
  mappedFirstName: "Test",
  originalLastName: "User",
  mappedLastName: "User",
  originalPosition: "",
  mappedPosition: null,
  hasTemporaryId: true
}
[Field API] 📝 About to insert contacts data: [{
  "activity_id": "634c2682-a81a-4b66-aca2-eb229c0e9581",
  "type": "1",
  "first_name": "Test",
  "last_name": "User",
  "position": null,
  "organisation_id": null,
  ...
}]
[Field API] ✅ Successfully inserted 1 contact(s)
[Field API] Inserted contact IDs: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
[FieldAutosave] Field contacts saved successfully
```

## Expected Console Output (After Refresh)

```
[Contacts] 🔍 Fetching contacts for activity: "634c2682-a81a-4b66-aca2-eb229c0e9581"
[Contacts API] 🔍 Fetching contacts for activity: 634c2682-a81a-4b66-aca2-eb229c0e9581"
[Contacts API] ✅ Query successful. Found contacts: 1
[Contacts API] Sample contact data (first contact): {
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "first_name": "Test",
  "last_name": "User",
  ...
}
[Contacts API] 📤 Returning 1 transformed contact(s)
[Contacts] API response status: 200 "OK"
[Contacts] ✅ Fetched contacts from database: {
  dataType: "object",
  isArray: true,
  length: 1,
  data: [...]
}
[Contacts] ✅ Updating state with 1 contact(s)
```

## If Issue Persists

If contacts still don't persist after this fix, check console for:

1. **Insert Warnings:**
   ```
   [Field API] ⚠️ WARNING: Insert succeeded but no data returned!
   ```
   This indicates RLS (Row Level Security) policy issue in Supabase.

2. **Insert Errors:**
   ```
   [Field API] ❌ FAILED TO INSERT CONTACTS!
   [Field API] Error details: { message: "...", code: "..." }
   ```
   This indicates a constraint violation or schema mismatch.

3. **Empty Fetch:**
   ```
   [Contacts API] ⚠️ No contacts found in database for activity: ...
   ```
   Check that the activity_id is correct.

## Database Schema Reference

The `activity_contacts` table expects:
- `id` (UUID) - Auto-generated, never provided by client
- `activity_id` (UUID) - Required
- `type` (TEXT) - Required
- `first_name` (TEXT) - Required
- `last_name` (TEXT) - Required
- All other fields: Optional (NULL allowed)

## Related Files

- `frontend/src/components/ContactsSection.tsx` - Fetch logic with enhanced logging
- `frontend/src/app/api/activities/[id]/contacts/route.ts` - GET endpoint with enhanced logging
- `frontend/src/app/api/activities/field/route.ts` - POST endpoint with the fix

## What Changed to Fix the Issue

### The Critical Fix
**Line 438 of `frontend/src/app/api/activities/field/route.ts`:**
```typescript
// BEFORE (caused silent failure):
const position = contact.position?.trim() || null;

// AFTER (fixes NOT NULL constraint violation):
const position = contact.position?.trim() || 'Not specified';
```

When users left the Position/Role field empty, the old code sent `null` to the database, which violated the `position TEXT NOT NULL` constraint. The database rejected the insert, but because Supabase was using the service role key, it failed silently without raising an exception that our code could catch.

### Additional Enhancements

1. **Empty string to `null` conversion** for all optional fields
2. **Enhanced server-side logging** to catch future issues
3. **Enhanced client-side logging** in ContactsSection for better debugging
4. **Fixed missing IATI fields** in API response transformations
5. **Removed problematic fetch guard** that prevented re-fetching

## Status

✅ **CRITICAL FIX APPLIED** - NOT NULL constraint violation fixed  
✅ **ENHANCED LOGGING** - Server and client logging added for debugging  
✅ **READY FOR TESTING** - User should test adding contacts now

## What to Expect After Fix

When you save a contact now, you should see in your **server terminal**:
```
[Field API] Processing contacts update for activity: 634c2682-a81a-4b66-aca2-eb229c0e9581
[Field API] Processing contact: {
  originalPosition: "",
  mappedPosition: "Not specified",
  hasTemporaryId: true
}
[Field API] 📝 About to insert contacts data: [{...}]
[Field API] ✅ Successfully inserted 1 contact(s)
[Field API] Inserted contact IDs: ["a1b2c3d4-..."]
[Field API] Inserted contact names: ["Leigh Mitchell"]
```

And after refresh, in your **browser console**:
```
[Contacts] 🔍 Fetching contacts for activity: "634c2682-..."
[Contacts API] ✅ Query successful. Found contacts: 1
[Contacts] ✅ Updating state with 1 contact(s)
```

