# Organisation Type Column Migration Guide

## Overview
This guide explains how to apply the migration that renames `organisation_type` to `Organisation_Type_Code` and adds a new `Organisation_Type_Name` column in the Supabase database.

## What Changed

### Database Changes
1. **New Column**: `Organisation_Type_Name` - Contains the human-readable name (e.g., "Government", "Multilateral")
2. **Renamed Column**: `organisation_type` → `Organisation_Type_Code` - Contains the IATI code (e.g., "10", "40")
3. **Updated Reference Table**: `organization_types` table now has complete IATI standard data

### Frontend Changes
All TypeScript interfaces, API routes, and React components have been updated to use the new column names.

## Migration Steps

### Step 1: Backup Your Data (Recommended)
Before running any migration, create a backup of your organizations table:

```sql
CREATE TABLE organizations_backup_before_type_rename AS 
SELECT * FROM organizations;
```

### Step 2: Run the Main Migration
Copy and paste the contents of `rename_organisation_type_column.sql` into your Supabase SQL Editor and run it.

This migration will:
- Add the new `Organisation_Type_Name` column
- Populate it with the correct IATI names based on existing codes
- Rename `organisation_type` to `Organisation_Type_Code`
- Create indexes for better performance

### Step 3: Update the Organization Types Reference Table
Copy and paste the contents of `frontend/update_organization_types_table_complete.sql` into your Supabase SQL Editor and run it.

This will update the `organization_types` lookup table with all IATI standard organization types.

### Step 4: Verify the Migration
Run these verification queries:

```sql
-- Check that all codes have corresponding names
SELECT "Organisation_Type_Code", "Organisation_Type_Name", COUNT(*) as count
FROM organizations 
WHERE "Organisation_Type_Code" IS NOT NULL
GROUP BY "Organisation_Type_Code", "Organisation_Type_Name"
ORDER BY "Organisation_Type_Code";

-- Check for any NULL names where codes exist
SELECT id, name, "Organisation_Type_Code", "Organisation_Type_Name"
FROM organizations 
WHERE "Organisation_Type_Code" IS NOT NULL AND "Organisation_Type_Name" IS NULL;

-- Verify organization_types table
SELECT code, label, description 
FROM organization_types 
ORDER BY sort_order;
```

### Step 5: Deploy Frontend Changes
The frontend code has been updated to use the new column names. Deploy the updated code to your production environment.

**Important**: Deploy the database migration and frontend code together to avoid breaking the application.

## IATI Organization Type Codes Reference

| Code | Name |
|------|------|
| 10 | Government |
| 11 | Local Government |
| 15 | Other Public Sector |
| 21 | International NGO |
| 22 | National NGO |
| 23 | Regional NGO |
| 24 | Partner Country based NGO |
| 30 | Public Private Partnership |
| 40 | Multilateral |
| 60 | Foundation |
| 70 | Private Sector |
| 71 | Private Sector in Provider Country |
| 72 | Private Sector in Aid Recipient Country |
| 73 | Private Sector in Third Country |
| 80 | Academic, Training and Research |
| 90 | Other |

## Rollback (If Needed)
If you need to rollback the migration:

```sql
-- Restore from backup
DROP TABLE organizations;
ALTER TABLE organizations_backup_before_type_rename RENAME TO organizations;

-- Or manually rollback just the column changes
ALTER TABLE organizations RENAME COLUMN "Organisation_Type_Code" TO organisation_type;
ALTER TABLE organizations DROP COLUMN IF EXISTS "Organisation_Type_Name";
```

## Files Modified

### Database Migration Files
- `rename_organisation_type_column.sql` - Main migration script
- `frontend/update_organization_types_table_complete.sql` - Reference table update

### Frontend Files Updated
- `frontend/src/lib/supabase.ts` - TypeScript type definitions
- `frontend/src/app/organizations/page.tsx` - Main organizations page
- `frontend/src/app/api/organizations/route.ts` - Organizations API
- `frontend/src/app/api/organizations/bulk-stats/route.ts` - Bulk stats API
- `frontend/src/components/ui/organization-combobox.tsx` - Organization selector
- `frontend/src/components/activities/PlannedDisbursementsTab.tsx` - Planned disbursements
- `frontend/src/components/activities/XmlImportTab.tsx` - XML import
- `frontend/src/components/activities/OrganizationsTab.tsx` - Organizations tab
- `frontend/src/components/modals/ParticipatingOrgModal.tsx` - Participating org modal
- `frontend/src/app/api/activities/[id]/participating-organizations/route.ts` - Participating orgs API

## Testing Checklist

After applying the migration, test these features:

- [ ] View organizations list page
- [ ] Create new organization with organization type
- [ ] Edit existing organization
- [ ] Filter organizations by type
- [ ] Search organizations
- [ ] Add participating organization to activity
- [ ] Import XML with organization data
- [ ] View organization type in organization details
- [ ] Check analytics/reports that use organization types

## Support

If you encounter any issues:
1. Check the verification queries above
2. Review the error messages in browser console
3. Verify that both database and frontend changes were applied
4. Check that organization_types reference table has all 16 IATI codes

## Notes

- The old `type` column is kept for backward compatibility and will be automatically updated alongside `Organisation_Type_Code`
- The migration is idempotent - it can be run multiple times safely
- Indexes are created automatically for better query performance

