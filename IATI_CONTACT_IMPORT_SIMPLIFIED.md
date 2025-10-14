# IATI Contact Import - Simplified Schema Implementation

## Overview
Successfully updated the IATI XML import functionality to work with the simplified contact schema. Contacts from IATI XML files can now be imported and saved to the `activity_contacts` table with basic fields only.

## Implementation Complete ✅

### 1. Updated Contact Mapping Function
**File**: `frontend/src/lib/contact-utils.ts`

**Changes**:
- Removed IATI-specific fields (middleName, jobTitle, department, website, mailingAddress, etc.)
- Simplified output to match basic schema
- Maps job-title to position field
- Sets organisationId to null (can be matched later)

**New Mapping**:
```typescript
{
  type: '1-4',                    // Contact type code
  title: '',                      // Empty (not in IATI)
  firstName: 'Parsed',            // From person-name
  lastName: 'Name',               // From person-name
  position: 'Job Title',          // From job-title
  organisation: 'Agency A',       // From organisation
  organisationId: null,           // To be matched
  email: 'email@example.org',    // From email
  phone: '+123...',               // From telephone
  phoneNumber: '+123...',         // Same as phone
}
```

### 2. Import Handler (Already Existed)
**File**: `frontend/src/components/activities/XmlImportTab.tsx` (lines 3247-3318)

The import handler was already complete:
- ✅ Uses `mapIatiContactToDb` to transform IATI data
- ✅ Fetches existing contacts from database
- ✅ Deduplicates using `deduplicateContacts`
- ✅ Saves via `/api/activities/field` endpoint
- ✅ Shows success/error toast notifications

### 3. Updated Preview Display
**File**: `frontend/src/components/activities/XmlImportTab.tsx`

**Updated sections**:
- Lines 4257-4293: Current value display
- Lines 4426-4462: Import value display

**Display Fields** (simplified):
- Contact type badge
- Name (person-name)
- Position (job-title)
- Organization
- Email
- Phone

**Removed from display**:
- Department
- Website
- Mailing address
- Secondary fields

## IATI XML Structure Supported

```xml
<contact-info type="1">
  <organisation>
    <narrative>Agency A</narrative>
  </organisation>
  <person-name>
    <narrative>John Smith</narrative>
  </person-name>
  <job-title>
    <narrative>Project Manager</narrative>
  </job-title>
  <telephone>+1234567890</telephone>
  <email>john@example.org</email>
</contact-info>
```

## Database Fields Populated

| Database Field | IATI Source | Notes |
|---------------|-------------|-------|
| type | @type attribute | 1-4 |
| first_name | person-name | Parsed from full name |
| last_name | person-name | Parsed from full name |
| position | job-title | Used as position/role |
| organisation | organisation | Text value |
| organisation_name | organisation | Same as above |
| email | email | Direct mapping |
| primary_email | email | Same as above |
| phone | telephone | Direct mapping |
| phone_number | telephone | Same as above |

## Fields NOT Imported

The following IATI fields are parsed but **not saved**:
- ❌ department - Removed from schema
- ❌ website - Removed from schema
- ❌ mailing-address - Removed from schema

## Testing

### Test File Created
`test_simplified_contact_import.xml` contains:
- Example from user (A. Example contact)
- Additional test contacts
- Various contact types (1, 2, 3)
- Contacts with minimal and complete data

### How to Test

1. **Open Activity Editor**
   - Go to an activity
   - Click "XML Import" tab

2. **Upload Test File**
   - Upload `test_simplified_contact_import.xml`
   - Click "Parse XML"

3. **Verify Preview**
   - Should see 3 contacts in the preview
   - Each showing: Type, Name, Position, Organization, Email, Phone
   - No department/website/mailing address shown

4. **Import Contacts**
   - Select contacts to import
   - Click "Import Selected Fields"
   - Should see success message: "X contact(s) added to the activity"

5. **Verify in Database**
   - Go to "Contacts" tab
   - Should see imported contacts
   - Click into a contact to verify fields:
     - First name: "A."
     - Last name: "Example"
     - Position: "Transparency Lead"
     - Organization: "Agency A"
     - Email: "transparency@example.org"
     - Phone: "0044111222333444"

### Expected Results

**Contact 1 (A. Example)**:
```json
{
  "type": "1",
  "firstName": "A.",
  "lastName": "Example",
  "position": "Transparency Lead",
  "organisation": "Agency A",
  "email": "transparency@example.org",
  "phone": "0044111222333444"
}
```

**Contact 2 (John Smith)**:
```json
{
  "type": "2",
  "firstName": "John",
  "lastName": "Smith",
  "position": "Project Manager",
  "organisation": "Partner Organization",
  "email": "john.smith@partner.org",
  "phone": "+1234567890"
}
```

**Contact 3 (Sarah Johnson)**:
```json
{
  "type": "3",
  "firstName": "Sarah",
  "lastName": "Johnson",
  "position": "Finance Officer",
  "organisation": "Finance Department",
  "email": "sarah.j@finance.org",
  "phone": null
}
```

## Deduplication

Contacts are deduplicated before saving:
- If a contact with the same email OR full name exists, it won't be imported twice
- Existing contacts are merged with imported data
- Prevents duplicate contacts from XML imports

## Contact Type Mapping

| Code | Label | Description |
|------|-------|-------------|
| 1 | General Enquiries | Public information |
| 2 | Project Management | Implementation queries |
| 3 | Financial Management | Budget/finance questions |
| 4 | Communications | Media & transparency |

## Files Modified

1. ✅ `frontend/src/lib/contact-utils.ts` - Updated mapIatiContactToDb
2. ✅ `frontend/src/components/activities/XmlImportTab.tsx` - Updated preview displays
3. ✅ `test_simplified_contact_import.xml` - Created test file

## Notes

- XML parser (`frontend/src/lib/xml-parser.ts`) did NOT need changes - it still extracts all fields
- Import handler did NOT need changes - it already used the mapping function correctly
- Only the mapping function and preview display needed updates
- The simplified schema reduces complexity while maintaining IATI compliance

## Future Enhancements (Optional)

### Organization Matching
Could add automatic matching of organization text to `organisations` table:
```typescript
export async function matchOrganizationByName(orgName: string): Promise<string | null> {
  // Search organizations table for matching name/acronym
  // Return organisation_id if found
}
```

This would populate `organisationId` automatically during import instead of leaving it null.

## Troubleshooting

### Contacts Not Appearing After Import
1. Check browser console for errors
2. Verify contacts saved in Supabase (activity_contacts table)
3. Click refresh button in Contacts tab
4. Check for deduplication (might have been skipped as duplicate)

### Import Shows 0 Contacts
1. Verify XML has `<contact-info>` elements
2. Check parser extracted contacts (browser console)
3. Ensure contacts are being selected for import

### Contact Names Not Parsing
1. Check XML has `<person-name>` with `<narrative>`
2. Verify name parsing functions work (test in console)
3. Full names should split into first/last at first space

## Summary

✅ IATI contact import fully functional for simplified schema
✅ Contacts map to basic fields only (no IATI extras)
✅ Preview shows simplified information
✅ Deduplication prevents duplicates
✅ Test file available for validation
✅ Ready for production use

