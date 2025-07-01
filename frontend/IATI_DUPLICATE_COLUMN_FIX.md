# IATI Migration - Duplicate Column Fix

## Issue
When running the migration, you got:
```
ERROR: 42701: column "reporting_org_id" specified more than once
```

This happened because your `activities` table already has BOTH:
- `created_by_org` column
- `reporting_org_id` column

## Solution
The migration has been updated to handle this case:

### Step 3: Smart Column Handling
```sql
-- If both columns exist:
-- 1. Copy data from created_by_org to reporting_org_id (where NULL)
-- 2. Drop the created_by_org column
-- 3. Keep reporting_org_id

-- If only created_by_org exists:
-- 1. Rename it to reporting_org_id

-- If only reporting_org_id exists:
-- 1. Nothing to do, continue
```

### Step 6: Simplified View Creation
After cleaning up the columns, the view is created with a simple `SELECT a.*` which won't have duplicates because:
- `objectives` has been dropped
- `target_groups` has been dropped  
- Either `created_by_org` has been dropped OR renamed to `reporting_org_id`

## What the Final Migration Does

1. **Drops the view** that depends on the old columns
2. **Removes non-IATI columns** (objectives, target_groups)
3. **Consolidates organization columns**:
   - If you have both created_by_org and reporting_org_id, it merges them
   - If you only have created_by_org, it renames it
   - If you only have reporting_org_id, it keeps it
4. **Adds display fields** (created_by_org_name, created_by_org_acronym)
5. **Backfills organization names** from the organizations table
6. **Recreates the view** with the cleaned schema

## Result
- ✅ No duplicate columns
- ✅ Single source of truth for reporting organization
- ✅ IATI-compliant schema
- ✅ View works correctly

## To Run
```bash
# In Supabase SQL Editor:
# Copy and run: frontend/sql/migrate_activities_iati_compliance.sql
```

The migration will show NOTICE messages telling you exactly what it did with your columns. 