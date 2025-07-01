# IATI Compliance Migration Summary

## Overview
This migration aligns the activities table with the IATI Activity Standard v2.03 by removing non-standard fields and renaming existing fields to match IATI terminology.

## Database Changes

### 1. Removed Fields
- `objectives` - Not part of IATI standard (use description field instead)
- `target_groups` - Not part of IATI standard

### 2. Renamed Fields
- `created_by_org` → `reporting_org_id` (aligns with IATI's reporting-org element)

### 3. Added Fields
- `created_by_org_name` (TEXT) - Display-only field for UI
- `created_by_org_acronym` (TEXT) - Display-only field for UI

These new fields are populated from the organizations table and are read-only in the UI.

## UI Changes Updated

### Components Modified:
1. **Activity Creation/Edit Form** (`frontend/src/app/activities/new/page.tsx`)
   - Removed objectives and target_groups input fields
   - Added read-only display of reporting organization name and acronym

2. **Activity List Page** (`frontend/src/app/activities/page.tsx`)
   - Updated type definitions
   - Updated CSV export to include organization fields instead of objectives

3. **Activity Detail Page** (`frontend/src/app/activities/[id]/page.tsx`)
   - Removed objectives display
   - Added reporting organization display

4. **Analytics Components**
   - Updated `DataHeatmap.tsx` to use `reporting_org_id`
   - Updated `ProjectPipeline.tsx` to use `reporting_org_id`

5. **Organization Detail Page** (`frontend/src/app/organizations/[id]/page.tsx`)
   - Updated to use `reporting_org_id` for determining organization role

6. **Field Helpers** (`frontend/src/components/ActivityFieldHelpers.tsx`)
   - Removed objectives from field descriptions and recommended fields

## Migration File Location
`frontend/sql/migrate_activities_iati_compliance.sql`

## How to Apply the Migration

1. **Via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy contents of frontend/sql/migrate_activities_iati_compliance.sql
   - Paste and run in SQL Editor

2. **Using the Helper Script:**
   ```bash
   cd frontend/scripts
   ./apply_iati_compliance_migration.sh
   ```

## Post-Migration Verification

After running the migration, verify:
1. The columns have been updated correctly
2. Organization names are populated for existing activities
3. The application functions correctly without objectives/target_groups fields

Run the verification query included at the end of the migration SQL file to check the results.

## Benefits

1. **IATI Compliance**: Schema now aligns with IATI Activity Standard v2.03
2. **Cleaner Data Model**: Removes redundant fields not in the standard
3. **Better Reporting**: reporting_org_id properly identifies the organization publishing the activity
4. **UI Consistency**: Organization information displayed consistently across the app

## Notes

- The migration includes safety checks to prevent errors if run multiple times
- Original data is not backed up - ensure you have database backups before running
- The UI now shows organization details as read-only fields for clarity
