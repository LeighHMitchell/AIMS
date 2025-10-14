# How to Apply Results IATI Migrations

## Issue Fixed

The migration files have been updated to handle cases where tables might have been partially created. All migrations now use `DROP TABLE IF EXISTS` followed by `CREATE TABLE` to ensure clean creation.

## Migration Order

Apply these migrations in Supabase SQL Editor **in this exact order**:

### Step 1: Document Links
File: `frontend/supabase/migrations/20250116000001_add_results_document_links.sql`

This creates:
- `result_document_links`
- `indicator_document_links`
- `baseline_document_links`
- `period_document_links`

**Important**: This will drop and recreate these tables if they exist. Any existing data in these tables will be lost.

### Step 2: References
File: `frontend/supabase/migrations/20250116000002_add_results_references.sql`

This creates:
- `result_references`
- `indicator_references`

### Step 3: Dimensions
File: `frontend/supabase/migrations/20250116000003_add_results_dimensions.sql`

This creates:
- `baseline_dimensions`
- `period_dimensions`

### Step 4: Locations
File: `frontend/supabase/migrations/20250116000004_add_results_locations.sql`

This creates:
- `baseline_locations`
- `period_locations`

### Step 5: Comment Fields Update
File: `frontend/supabase/migrations/20250116000005_update_comment_fields.sql`

This updates:
- `indicator_baselines.comment` → JSONB
- `indicator_periods.target_comment` → JSONB
- Adds `indicator_periods.actual_comment` → JSONB

**Important**: This migration preserves existing comment data by converting text to JSONB format.

## How to Apply

### In Supabase Dashboard:

1. Go to **SQL Editor** in Supabase
2. Click **New Query**
3. Copy the entire contents of migration file #1
4. Paste and click **Run**
5. Verify success (no errors)
6. Repeat for migrations #2, #3, #4, #5

### Verification

After applying all migrations, run this query to verify:

```sql
SELECT 
    table_name 
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_name LIKE '%result%'
    OR table_name LIKE '%indicator%'
    OR table_name LIKE '%baseline%'
    OR table_name LIKE '%period%'
ORDER BY 
    table_name;
```

You should see all the new tables listed.

## Expected Tables After Migration

**Results Framework Tables** (existing):
- `activity_results`
- `result_indicators`
- `indicator_baselines`
- `indicator_periods`

**New Tables** (created by these migrations):
- `result_document_links`
- `result_references`
- `indicator_document_links`
- `indicator_references`
- `baseline_document_links`
- `baseline_dimensions`
- `baseline_locations`
- `period_document_links`
- `period_dimensions`
- `period_locations`

**Total**: 14 tables in the results framework

## Rollback (if needed)

If you need to rollback, run:

```sql
-- Drop all new tables
DROP TABLE IF EXISTS period_document_links CASCADE;
DROP TABLE IF EXISTS period_dimensions CASCADE;
DROP TABLE IF EXISTS period_locations CASCADE;
DROP TABLE IF EXISTS baseline_document_links CASCADE;
DROP TABLE IF EXISTS baseline_dimensions CASCADE;
DROP TABLE IF EXISTS baseline_locations CASCADE;
DROP TABLE IF EXISTS indicator_document_links CASCADE;
DROP TABLE IF EXISTS indicator_references CASCADE;
DROP TABLE IF EXISTS result_document_links CASCADE;
DROP TABLE IF EXISTS result_references CASCADE;

-- Note: This does NOT rollback the comment field changes in migration #5
-- To rollback comment fields, you would need to manually convert back to TEXT
```

## After Migration

Once migrations are applied successfully:
1. Test the Results tab in the application
2. Try adding references, documents, dimensions, and locations
3. Verify collapsible period metadata works
4. Test IATI XML import/export with comprehensive data

## Troubleshooting

**If you see foreign key errors**:
- Make sure the base results tables exist (`activity_results`, `result_indicators`, etc.)
- Run migrations in the exact order specified

**If you see RLS policy errors**:
- Policies are created after tables, so any table creation errors will prevent policy creation
- Fix the table errors first, then re-run

**If migration #5 fails**:
- Check if existing data in `indicator_baselines.comment` or `indicator_periods.target_comment` is already JSONB
- If so, you can skip this migration or modify it to check column type first

## Success Indicators

After successful migration:
- ✅ All 10 new tables created
- ✅ All indexes created
- ✅ All RLS policies active
- ✅ No errors in Supabase logs
- ✅ Results tab loads without errors
- ✅ New fields visible in edit forms

The migrations are now fixed and ready to apply! 🚀

