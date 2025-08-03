# Activity Contacts Database Migration

## Overview

This migration updates the `activity_contacts` table to support the revised contact structure with organization references and multiple email fields.

## Database Changes

### New Columns Added:
- `organisation_id` (UUID) - Foreign key reference to `organizations` table
- `organisation_name` (TEXT) - Organization name fallback when organisation_id is not available
- `primary_email` (TEXT) - Primary email address for the contact
- `secondary_email` (TEXT) - Secondary email address for the contact

### Backward Compatibility:
- Old `email` and `organisation` columns are kept for backward compatibility
- Data migration automatically moves existing `email` → `primary_email`
- Data migration automatically moves existing `organisation` → `organisation_name`
- The old columns are marked as DEPRECATED in comments

### Indexes Added:
- `idx_activity_contacts_organisation_id` - For better query performance on organization lookups

## Frontend Interface Changes

The Contact interface now supports:
```typescript
interface Contact {
  id?: string;
  type: string;
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  organisationId?: string;        // NEW: Links to organizations table
  organisationName?: string;      // NEW: Fallback organization name
  phone?: string;
  fax?: string;
  primaryEmail?: string;          // NEW: Primary email
  secondaryEmail?: string;        // NEW: Secondary email  
  profilePhoto?: string;
  notes?: string;
}
```

## API Changes

### Contact Data Transformation
- Added `transformContactFromDB()` helper function to map database fields to frontend format
- Updated all contact API endpoints to use the new schema fields
- Maintains backward compatibility by falling back to old field names

### Organization Integration
- Contact API now fetches related organization details via foreign key
- Organization combobox in frontend can now reference actual organization records
- Better data consistency and referential integrity

## Migration File

Run the migration: `frontend/supabase/migrations/20250117000001_update_activity_contacts_schema.sql`

This migration:
1. Adds new columns
2. Creates foreign key constraints
3. Migrates existing data
4. Adds performance indexes
5. Adds documentation comments

## Testing

After migration:
1. Verify existing contacts still display correctly
2. Test creating new contacts with organization selection
3. Test primary/secondary email functionality
4. Verify organization combobox works with real organization data

## Future Cleanup

In a future migration, the deprecated `email` and `organisation` columns can be removed once all applications are fully updated to use the new schema.