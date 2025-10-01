# IATI Location Import - Database Constraint Fix

## Problem

Location imports were failing with error:
```
Failed to insert locations: new row for relation "activity_locations" 
violates check constraint "activity_locations_source_check"
```

## Root Cause

The `activity_locations` table has a CHECK constraint on the `source` column that only allows:
- `'map'`
- `'search'`  
- `'manual'`

The constraint **does not include** `'import'`, which is needed for IATI XML location imports.

## Solution

Run the SQL migration to update the constraint:

### 1. Via Supabase SQL Editor

```sql
-- Fix activity_locations source check constraint to include 'import'
ALTER TABLE activity_locations DROP CONSTRAINT IF EXISTS activity_locations_source_check;

ALTER TABLE activity_locations ADD CONSTRAINT activity_locations_source_check 
  CHECK (source IN ('map', 'search', 'manual', 'import'));
```

### 2. Via Migration File

```bash
psql $DATABASE_URL -f frontend/sql/fix_location_source_constraint.sql
```

## Verification

After running the migration, verify:

1. **Check constraint updated:**
   ```sql
   SELECT conname, consrc
   FROM pg_constraint
   WHERE conname = 'activity_locations_source_check';
   ```

2. **Test location import:**
   - Upload IATI XML with locations
   - Select locations in comparison view
   - Click "Import Selected Fields"
   - Should succeed without constraint violation

## Files Modified

- `frontend/sql/fix_location_source_constraint.sql` - Migration script
- `frontend/src/lib/schemas/location.ts` - Schema updated to include 'import'
- Application code already updated to use source='import'

## Status

- ✅ Application code ready
- ⏳ Database constraint needs migration
- ⏳ Run SQL migration in Supabase

Once migration is run, IATI location imports will work correctly.

