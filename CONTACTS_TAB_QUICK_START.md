# Contacts Tab Rewrite - Quick Start Guide

## For Developers

### Running the Migration

```bash
# Apply the database migration
psql -d your_database < frontend/supabase/migrations/20250113000001_add_linked_contact_id.sql

# Or use Supabase CLI
supabase migration up
```

### Running the Application

```bash
# New contacts tab is enabled by default
npm run dev

# To use legacy ContactsSection (fallback)
NEXT_PUBLIC_CONTACTS_V2=false npm run dev
```

### Running Tests

```bash
# Run E2E tests for contacts
npm run test:e2e e2e-tests/contacts-tab.spec.ts

# Run all E2E tests
npm run test:e2e
```

## For Users

### Adding a Contact

**Method 1: Search Existing**
1. Go to activity → **Contacts** tab
2. Type name or email in search bar
3. Select from results
4. Set contact type, focal point, editing rights
5. Click **"Add Contact to Activity"**

**Method 2: Create New**
1. Go to activity → **Contacts** tab
2. Click **"Create New Contact"**
3. Fill in required fields (type, first name, last name)
4. Optionally add IATI fields (job title, department, website, mailing address)
5. Check ☑ **Focal Point** or ☑ **Editing Rights** if needed
6. Click **"Add Contact to Activity"**

### Contact Types

| Type | Icon | When to Use |
|------|------|-------------|
| General Enquiries (1) | 📧 | Public information and general questions |
| Project Management (2) | 💼 | Implementation queries |
| Financial Management (3) | 💰 | Budget and funding questions |
| Communications (4) | 📢 | Media and transparency |

### Focal Point vs Editing Rights

- **⭐ Focal Point**: This person is a primary contact for the activity
- **✏️ Editing Rights**: This person can edit the activity (permissions-based)

### Importing from XML

1. Go to activity → **XML Import** tab
2. Upload or paste IATI XML file
3. Click **"Parse XML"**
4. Select contacts from field preview
5. Click **"Import Selected Fields"**
6. System automatically deduplicates contacts
7. Go to **Contacts** tab to see imported contacts

### Editing a Contact

1. Go to activity → **Contacts** tab
2. Find the contact card
3. Click **Edit** button (pencil icon)
4. Modify fields
5. Click **"Update Contact"**

### Deleting a Contact

1. Go to activity → **Contacts** tab
2. Find the contact card
3. Click **Delete** button (trash icon)
4. Confirm deletion

## API Quick Reference

### Search Contacts
```bash
GET /api/contacts/search?q=john&limit=10
```

Response:
```json
[{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.org",
  "source": "user",
  "label": "John Doe (john@example.org) - Org Name"
}]
```

### Get Activity Contacts
```bash
GET /api/activities/{activityId}/contacts
```

### Save Contacts
```bash
POST /api/activities/field
Content-Type: application/json

{
  "activityId": "uuid",
  "field": "contacts",
  "value": [{
    "type": "1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.org",
    "isFocalPoint": true,
    "hasEditingRights": false
  }]
}
```

## Troubleshooting

### "Search not working"
- Ensure query is at least 2 characters
- Wait 300ms for debounce
- Check browser console for API errors

### "Duplicate contact error"
- Contact with same email+name already exists
- Edit existing contact instead, or use different email

### "Validation errors"
- First name and last name are required
- Email must be valid format (user@domain.com)
- Website must start with http:// or https://

### "XML import not showing contacts"
- Ensure XML has `<contact-info>` elements
- Check contacts were selected in field preview
- Navigate to Contacts tab after import

### "Changes not saving"
- Check browser console for API errors
- Ensure you have edit permissions
- Verify activity ID exists

## Feature Flag

To disable new contacts tab and use legacy version:

```bash
# .env.local
NEXT_PUBLIC_CONTACTS_V2=false
```

Default is `true` (new tab enabled).

## Migration Verification

Check if migration applied:

```sql
-- Check for linked_contact_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_contacts' 
AND column_name = 'linked_contact_id';

-- Should return:
-- linked_contact_id | uuid
```

## Support

- **Documentation**: See `CONTACTS_TAB_REWRITE_COMPLETE.md`
- **Tests**: See `e2e-tests/contacts-tab.spec.ts`
- **Code**: See `frontend/src/components/contacts/`

---

**Quick Tips**:
- Use search to avoid duplicates
- Set focal point for primary contacts
- Import XML to bulk-add contacts
- Type 1 (General) is most common
- Editing rights checkbox is for future permissions

