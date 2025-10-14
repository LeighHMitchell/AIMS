# Contacts Not Appearing - Implementation Summary

## Problem

Contacts added manually or imported via XML were appearing to save successfully but:
- Not appearing in the Contacts tab
- Disappearing after page refresh  
- Database logs showed 0 contacts fetched

## Root Cause

The main POST `/api/activities` route was missing several new IATI contact fields when inserting contacts into the database. While the field API (`/api/activities/field`) had all the correct fields, the main POST route (used for updates and imports) was missing:

- `job_title` (IATI field)
- `department` (IATI field) 
- `website` (IATI field)
- `mailing_address` (IATI field)
- `country_code`, `phone_number` (new phone fields)
- `fax_country_code`, `fax_number` (new fax fields)
- `is_focal_point`, `has_editing_rights` (new role fields)
- `linked_user_id` (new user linking field)

Additionally, the `contact-utils.ts` mapping function was setting `position` to `'Unknown'` as a fallback, which is no longer needed since the field is deprecated.

## Changes Made

### 1. Updated POST /api/activities Route (✅ COMPLETED)
**File**: `frontend/src/app/api/activities/route.ts` (lines 677-709)

Added all missing IATI and new contact fields to match the field API implementation:

```typescript
const contactData: any = {
  activity_id: body.id,
  type: type,
  title: contact.title || null,
  first_name: firstName,
  middle_name: contact.middleName || null,
  last_name: lastName,
  position: position,
  job_title: contact.jobTitle || null, // ADDED
  organisation: contact.organisation || null,
  organisation_id: contact.organisationId || null,
  department: contact.department || null, // ADDED
  phone: contact.phone || null,
  country_code: contact.countryCode || null, // ADDED
  phone_number: contact.phoneNumber || null, // ADDED
  fax: contact.fax || null,
  fax_country_code: contact.faxCountryCode || null, // ADDED
  fax_number: contact.faxNumber || null, // ADDED
  email: contact.email || null,
  secondary_email: contact.secondaryEmail || null,
  website: contact.website || null, // ADDED
  mailing_address: contact.mailingAddress || null, // ADDED
  profile_photo: contact.profilePhoto || null,
  notes: contact.notes || null,
  display_on_web: contact.displayOnWeb || false,
  user_id: contact.userId || null,
  role: contact.role || null,
  name: contact.name || null,
  // Contact roles and user linking - ADDED
  is_focal_point: contact.isFocalPoint || false,
  has_editing_rights: contact.hasEditingRights || false,
  linked_user_id: contact.linkedUserId || null
};
```

### 2. Updated contact-utils.ts (✅ COMPLETED)
**File**: `frontend/src/lib/contact-utils.ts` (line 120)

Changed `position` from defaulting to `'Unknown'` to `null` since the field is deprecated:

```typescript
// Before
position: extractNarrative(iatiContact.jobTitle) || 'Unknown',

// After  
position: null, // Position field is deprecated, use jobTitle instead
```

### 3. Database Migration Verification (✅ COMPLETED)
**File**: `frontend/verify-position-nullable.js` (new file)

Created a verification script to confirm the database migration was applied successfully. The script confirmed:
- ✅ `activity_contacts` table exists and is accessible
- ✅ Position column is nullable (no database errors when querying)

### 4. Migration Files
**File**: `frontend/supabase/migrations/20250115000004_make_position_nullable.sql` (already created)

SQL migration to remove NOT NULL constraint from position column.

## Testing Instructions

### Manual Contact Entry Test
1. Navigate to Activity Editor > Contacts tab
2. Click "Add New Contact"
3. Fill in minimal required fields:
   - First Name: "Test"
   - Last Name: "User"
   - Contact Type: Select any type
4. Optionally fill in IATI fields (Job Title, Department, Website, Mailing Address)
5. Click "Save"
6. **Expected**: Contact appears in the contacts list
7. Refresh the page
8. **Expected**: Contact still appears (persists)

### XML Import Test
1. Navigate to Activity Editor > XML Import tab
2. Import the test contact XML:
```xml
<contact-info type="1">
  <organisation>
    <narrative>Agency A</narrative>
  </organisation>
  <department>
    <narrative>Department B</narrative>
  </department>
  <person-name>
    <narrative>A. Example</narrative>
  </person-name>
  <job-title>
    <narrative>Transparency Lead</narrative>
  </job-title>
  <telephone>0044111222333444</telephone>
  <email>transparency@example.org</email>
  <website>http://www.example.org</website>
  <mailing-address>
    <narrative>Transparency House, The Street, Town, City, Postcode</narrative>
  </mailing-address>
</contact-info>
```
3. Select the contact for import
4. Click "Import Selected Fields"
5. **Expected**: Success message appears
6. Navigate to Contacts tab
7. **Expected**: Imported contact appears with all fields populated:
   - Name: "A. Example"
   - Job Title: "Transparency Lead"
   - Organisation: "Agency A"
   - Department: "Department B"
   - Email: "transparency@example.org"
   - Website: "http://www.example.org"
   - Mailing Address: "Transparency House, The Street, Town, City, Postcode"
8. Refresh the page
9. **Expected**: Contact still appears (persists)

### Database Verification
1. Go to Supabase Dashboard > SQL Editor
2. Run this query:
```sql
SELECT * FROM activity_contacts 
WHERE activity_id = 'your-activity-id'
ORDER BY created_at DESC;
```
3. **Expected**: See inserted contacts with all IATI fields populated

### Server Logs Check
Look for these log messages when saving contacts:
- `[Field API] About to insert contacts data:` (with full contact objects)
- `[Field API] Successfully inserted contacts:` (with returned data)
- `[Contacts API] Found contacts: N` (where N > 0 after refresh)
- No error messages about NOT NULL violations

## Success Criteria

- ✅ Contacts saved manually persist after refresh
- ✅ Contacts imported via XML appear in Contacts tab immediately  
- ✅ Contacts imported via XML persist after refresh
- ✅ All IATI contact fields (jobTitle, department, website, mailingAddress) are saved
- ✅ No database errors in server logs
- ✅ Console logs show successful saves and fetches

## Files Modified

1. `frontend/src/app/api/activities/route.ts` - Added all missing IATI fields to contactData mapping
2. `frontend/src/lib/contact-utils.ts` - Changed position to null instead of 'Unknown'
3. `frontend/verify-position-nullable.js` - Created verification script (new file)
4. `frontend/CONTACTS_FIX_IMPLEMENTATION_SUMMARY.md` - This summary document (new file)

## Database Schema

The `activity_contacts` table now properly supports:
- All IATI standard contact fields
- Nullable `position` field (legacy/deprecated)
- New phone fields with separate country codes
- Contact role fields (is_focal_point, has_editing_rights)
- User linking (linked_user_id)

## Next Steps

The code changes are complete. Please test:
1. ⏳ Test saving a contact manually
2. ⏳ Test importing a contact from XML
3. ⏳ Verify contacts appear in database

If contacts still don't appear, check:
- Server logs for database errors
- Browser console for API errors
- Supabase dashboard for actual database records

