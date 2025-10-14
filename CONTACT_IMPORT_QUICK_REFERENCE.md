# Contact Import - Quick Reference

## For Users

### Import Contacts from IATI XML

**Steps:**
1. Activity Editor → XML Import tab
2. Upload/paste IATI XML file
3. Review contacts in preview
4. Select contacts to import
5. Click "Import Selected Fields"
6. Check Contacts tab

**What Gets Imported:**
- ✅ Contact name (person-name)
- ✅ Job title
- ✅ Organization & department
- ✅ Email, phone, website
- ✅ Mailing address
- ✅ Contact type (1=General, 2=Project Mgmt, 3=Finance, 4=Comms)

### Add Contacts Manually

**Required Fields:**
- Contact Type
- First & Last Name
- Position/Role

**IATI Fields (Optional):**
- Job Title (IATI)
- Department (IATI)
- Website (IATI)
- Mailing Address (IATI)

## For Developers

### Database Schema

```sql
-- New IATI fields added
ALTER TABLE activity_contacts ADD COLUMN website TEXT;
ALTER TABLE activity_contacts ADD COLUMN mailing_address TEXT;
ALTER TABLE activity_contacts ADD COLUMN department TEXT;
ALTER TABLE activity_contacts ADD COLUMN job_title TEXT;
```

### IATI Contact-Info Structure

```xml
<contact-info type="1">
  <organisation><narrative>Org Name</narrative></organisation>
  <department><narrative>Dept Name</narrative></department>
  <person-name><narrative>John Smith</narrative></person-name>
  <job-title><narrative>Director</narrative></job-title>
  <telephone>+1234567890</telephone>
  <email>john@example.org</email>
  <website>https://example.org</website>
  <mailing-address><narrative>123 Main St</narrative></mailing-address>
</contact-info>
```

### Import Function

```typescript
import { mapIatiContactToDb } from '@/lib/contact-utils';

const contacts = iatiContacts.map(mapIatiContactToDb);
await saveContacts(activityId, contacts);
```

### Contact Type Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | General Enquiries | Public information |
| 2 | Project Management | Implementation queries |
| 3 | Financial Management | Budget/finance questions |
| 4 | Communications | Media & transparency |

### Name Parsing Examples

```typescript
"A. Example"      → First: "A.", Last: "Example"
"John M. Smith"   → First: "John", Middle: "M.", Last: "Smith"
"SingleName"      → First: "SingleName", Last: "SingleName"
```

### API Endpoint

```typescript
POST /api/activities/field
{
  "activityId": "uuid",
  "field": "contacts",
  "value": [
    {
      "type": "1",
      "firstName": "John",
      "lastName": "Smith",
      "position": "Director",
      "jobTitle": "Executive Director",
      "organisation": "Test Org",
      "department": "Communications",
      "email": "john@example.org",
      "website": "https://example.org",
      "mailingAddress": "123 Main St"
    }
  ]
}
```

## Testing

### Test XML Available
`test_contact_import.xml` - Contains 4 sample contacts

### Manual Test
1. Import test XML
2. Verify 4 contacts appear
3. Edit a contact
4. Add new contact manually
5. Verify persistence

### Validation
- Type must be 1-4
- First/Last name required
- Position required
- All IATI fields optional

## Migration

```bash
# Run this before using contacts
psql $DATABASE_URL -f frontend/supabase/migrations/20250112000000_add_contact_iati_fields.sql
```

## Files Changed

- `frontend/src/lib/contact-utils.ts` (NEW)
- `frontend/src/lib/xml-parser.ts` (website field added)
- `frontend/src/components/ContactsSection.tsx` (UI enhanced)
- `frontend/src/components/activities/XmlImportTab.tsx` (import logic)
- `frontend/src/app/api/activities/field/route.ts` (API updated)
- `frontend/supabase/migrations/20250112000000_add_contact_iati_fields.sql` (NEW)

## Support

For issues:
1. Check browser console for errors
2. Verify database migration ran
3. Check test XML imports correctly
4. Review CONTACT_IMPORT_IMPLEMENTATION_COMPLETE.md

