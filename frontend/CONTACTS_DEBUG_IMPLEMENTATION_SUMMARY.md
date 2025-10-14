# Contacts Debugging Implementation Summary

## Problem Status

**Issue:** Contacts appear to save (success toast) but don't persist after page refresh.

## Investigation Completed

### ✅ Database Schema Check
**Script:** `check-contacts-schema.js`

**Result:** ALL 35 required columns exist in the database including:
- All IATI fields (job_title, department, website, mailing_address)
- Phone fields (country_code, phone_number, fax_country_code, fax_number)
- Role fields (is_focal_point, has_editing_rights, linked_user_id)
- Organisation field (organisation_id)

**Conclusion:** Database schema is correct.

### ✅ Direct Database Insert Test
**Script:** `test-contact-insert.js`

**Result:** Both minimal and full contacts insert successfully
- Minimal contact (required fields only) - ✅ WORKS
- Full contact (all IATI fields) - ✅ WORKS
- Fetch after insert - ✅ WORKS

**Conclusion:** Database accepts contacts perfectly. The issue is NOT in the database.

### ✅ Code Updates Applied

1. **POST `/api/activities` route** - Added all missing IATI fields
2. **Field `/api/activities/field` route** - Already had all fields  
3. **contact-utils.ts** - Set position to null instead of 'Unknown'

## Enhanced Logging Added

### Field API (`/api/activities/field/route.ts`)
Added comprehensive logging:
```
[Field API] About to insert contacts data: <full JSON>
[Field API] Number of contacts to insert: N
[Field API] Activity ID: <id>
[Field API] ✅ Successfully inserted contacts: N contacts
[Field API] Inserted contact IDs: [<uuids>]
```

Or on error:
```
[Field API] ❌ FAILED TO INSERT CONTACTS!
[Field API] Error details: { message, details, hint, code }
[Field API] Failed contact data: <full JSON>
```

### POST API (`/api/activities/route.ts`)  
Added comprehensive logging:
```
[AIMS API] Attempting to insert N contacts
[AIMS API] Contact data sample: <JSON object>
[AIMS API] ✅ Successfully updated N contacts
[AIMS API] Inserted contact IDs: [<uuids>]
```

Or on error:
```
[AIMS API] ❌ Error updating contacts: <error>
[AIMS API] Error details: { message, details, hint, code }
```

## Debug Tools Created

### 1. check-contacts-schema.js
**Purpose:** Verify all database columns exist
**Usage:** `node check-contacts-schema.js`
**Output:** Lists all columns, identifies missing ones

### 2. test-contact-insert.js
**Purpose:** Test direct database inserts
**Usage:** `node test-contact-insert.js <activity-id>`
**Output:** Tests minimal and full contact inserts, verifies fetch

### 3. verify-position-nullable.js
**Purpose:** Check position column constraint
**Usage:** `node verify-position-nullable.js`
**Output:** Confirms position is nullable

## Next Steps for User

**CRITICAL: You must check the logs to identify the actual issue**

### Step 1: Check Server Console
When you save a contact, check your Next.js server terminal for:
- Success logs showing `✅ Successfully inserted contacts`
- Error logs showing `❌ FAILED TO INSERT CONTACTS`
- The error details will tell you EXACTLY what's wrong

### Step 2: Check Browser Console  
Look for:
- `[CONTACTS DEBUG] Triggering autosave for contacts...`
- If you don't see this, the save isn't being attempted

### Step 3: Check Browser Network Tab
1. Open DevTools > Network
2. Save a contact
3. Look for `/api/activities/field` call
4. Check status code and response

### Step 4: Check Database
Run this SQL in Supabase:
```sql
SELECT id, first_name, last_name, email, created_at
FROM activity_contacts
WHERE activity_id = 'your-activity-id'
ORDER BY created_at DESC;
```

## Likely Scenarios

### Scenario A: Logs show successful insert
**Meaning:** Contacts ARE saving to database
**Issue:** Problem is in the fetch/display logic
**Solution:** Check GET `/api/activities/[id]/contacts` endpoint

### Scenario B: Logs show error
**Meaning:** Database insert is failing
**Issue:** The error message will tell you why
**Solution:** Fix the specific constraint/validation error

### Scenario C: No logs appear
**Meaning:** API is not being called
**Issue:** Autosave might be disabled or activity ID is missing
**Solution:** Check `[CONTACTS DEBUG]` logs in browser console

## Success Criteria (Not Yet Tested)

- ⏳ Server logs show successful contact insert
- ⏳ Database query shows inserted contacts
- ⏳ Contacts persist after page refresh
- ⏳ Both manual save and XML import work

## Files Modified

1. **frontend/src/app/api/activities/route.ts** - Enhanced logging
2. **frontend/src/app/api/activities/field/route.ts** - Enhanced logging
3. **frontend/check-contacts-schema.js** - Schema verification script (new)
4. **frontend/test-contact-insert.js** - Database test script (new)
5. **frontend/DEBUG_CONTACTS_NOT_PERSISTING.md** - Debug guide (new)
6. **frontend/CONTACTS_DEBUG_IMPLEMENTATION_SUMMARY.md** - This file (new)

## What to Report Back

After trying to save a contact, please provide:

1. **Server Console Output** - Copy the logs from your Next.js terminal
2. **Browser Console Output** - Copy the `[CONTACTS DEBUG]` logs
3. **Network Tab** - Status code and response from `/api/activities/field`
4. **Database Query Result** - Result of the SQL query above

With this information, we can pinpoint and fix the exact issue!

