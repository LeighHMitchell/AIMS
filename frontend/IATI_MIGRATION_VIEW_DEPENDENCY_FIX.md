# IATI Migration - View Dependency Fix

## Issue
When running the IATI compliance migration, you encountered the error:
```
ERROR: 2BP01: cannot drop column objectives of table activities because other objects depend on it
DETAIL: view activities_with_reporting_org depends on column objectives of table activities
```

## Solution Applied
The migration has been updated to handle this dependency:

1. **Check Dependencies First**: Run `check_view_dependencies.sql` to identify all views that depend on the columns being removed
2. **Drop Dependent Views**: The migration now drops `activities_with_reporting_org` view before removing columns
3. **Recreate Views**: After column changes, the view is recreated without the removed columns

## Updated Migration Steps

### 1. Check for Other Dependencies (Optional)
```sql
-- Run in Supabase SQL Editor:
-- Copy contents from: frontend/sql/check_view_dependencies.sql
```

### 2. Run Updated Migration
```sql
-- Run in Supabase SQL Editor:
-- Copy contents from: frontend/sql/migrate_activities_iati_compliance.sql
```

The updated migration now:
- ✅ Drops the `activities_with_reporting_org` view
- ✅ Removes `objectives` and `target_groups` columns
- ✅ Renames `created_by_org` to `reporting_org_id`
- ✅ Adds display fields for organization names
- ✅ Recreates the view with the new schema
- ✅ Grants appropriate permissions

## What Changed in the Migration

1. **Added Step 1**: Handle dependent views
   - Checks if view exists
   - Drops the view with CASCADE

2. **Updated Step 2**: Uses CASCADE when dropping columns
   ```sql
   DROP COLUMN IF EXISTS objectives CASCADE,
   DROP COLUMN IF EXISTS target_groups CASCADE;
   ```

3. **Added Step 6**: Recreates the view
   - All columns except objectives and target_groups
   - Includes new created_by_org_name and created_by_org_acronym fields
   - Joins with organizations table for reporting org details

## Next Steps

1. Run the updated migration in Supabase SQL Editor
2. Verify the view was recreated successfully
3. Test your application to ensure everything works

## Note
If you have other custom views that depend on these columns, you'll need to:
1. Drop them before the migration
2. Recreate them after the migration without the removed columns

The `check_view_dependencies.sql` script will help identify any other views that need attention. 