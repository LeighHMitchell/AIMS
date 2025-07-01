# Reporting Organization Normalization

This migration normalizes the reporting organization information in the `activities` table to avoid duplication and ensure referential integrity with the `organizations` table.

## ⚠️ Important: Duplicate IATI Org IDs

The migration requires a unique constraint on `organizations.iati_org_id`. If you have duplicate values (including empty strings), you must fix them first.

## Overview

Previously, reporting organization information might have been duplicated across multiple fields or stored inconsistently. This migration:

1. Adds a `reporting_org_id` foreign key column to the `activities` table
2. Populates it using existing `created_by_org` values where appropriate
3. Ensures referential integrity with the `organizations` table
4. Creates a view for easy access to denormalized reporting org data

## Migration Steps

### Step 1: Fix Duplicate IATI Org IDs (if needed)

If you encounter an error about duplicate `iati_org_id` values:

```bash
# Check for duplicates and fix them
psql -d your_database -f frontend/sql/fix_duplicate_iati_org_ids.sql
```

This script will:
- Convert empty strings to NULL
- Append sequence numbers to duplicate values (e.g., `XM-DAC-12-1` becomes `XM-DAC-12-1-1`)
- Preserve the original value for the oldest record

### Step 2: Run Helper Functions SQL (if not already present)

```bash
# Run the helper functions SQL file
psql -d your_database -f frontend/sql/add_reporting_org_helper_functions.sql
```

### Step 3: Run the Migration SQL

```bash
# Run the main migration SQL file
psql -d your_database -f frontend/sql/add_reporting_org_normalization.sql
```

### Step 3: Check Migration Status

You can check the migration status via the API:

```bash
# Check current status
curl http://localhost:3000/api/normalize-reporting-org
```

### Step 4: Run Data Migration (if needed)

If the SQL migration is complete but data needs to be migrated:

```bash
# Run the data migration
curl -X POST http://localhost:3000/api/normalize-reporting-org
```

## Using the Normalized Data

### Direct Query

```sql
SELECT
  a.iati_identifier,
  a.title,
  o.iati_org_id AS reporting_org_ref,
  o.organisation_type AS reporting_org_type,
  o.name AS reporting_org_name
FROM activities a
JOIN organizations o ON a.reporting_org_id = o.id;
```

### Using the View

```sql
SELECT
  iati_identifier,
  title,
  reporting_org_ref,
  reporting_org_type,
  reporting_org_name
FROM activities_with_reporting_org;
```

## Updating Application Code

After running this migration, update your application code to:

1. Use `reporting_org_id` instead of separate reporting org fields
2. Join with the `organizations` table to get IATI org details
3. Remove any code that duplicates reporting org information

### Example TypeScript Update

```typescript
// Before
const activity = {
  reporting_org_ref: 'XM-DAC-12-1',
  reporting_org_type: '10',
  reporting_org_name: 'Example Org',
  // ... other fields
};

// After
const activity = {
  reporting_org_id: 'uuid-of-organization',
  // ... other fields
};

// To get reporting org details
const activityWithOrg = await supabase
  .from('activities')
  .select(`
    *,
    organization:organizations!reporting_org_id (
      iati_org_id,
      organisation_type,
      name
    )
  `)
  .eq('id', activityId)
  .single();
```

## Rollback

If you need to rollback this migration:

1. Remove the foreign key constraint:
   ```sql
   ALTER TABLE activities DROP CONSTRAINT IF EXISTS fk_reporting_org;
   ```

2. Drop the view:
   ```sql
   DROP VIEW IF EXISTS activities_with_reporting_org;
   ```

3. Optionally remove the column:
   ```sql
   ALTER TABLE activities DROP COLUMN IF EXISTS reporting_org_id;
   ```

## Notes

- The migration preserves existing data by using `created_by_org` as the initial value for `reporting_org_id`
- Activities without a valid organization reference will have NULL `reporting_org_id`
- The foreign key constraint prevents deletion of organizations that are referenced by activities
- The migration is idempotent - it can be run multiple times safely

## Troubleshooting

### Error: "could not create unique index"

If you see this error:
```
ERROR: 23505: could not create unique index "organizations_iati_org_id_unique"
DETAIL: Key (iati_org_id)=() is duplicated.
```

This means you have duplicate `iati_org_id` values. Follow these steps:

1. **Check for duplicates:**
   ```bash
   npm run tsx frontend/scripts/check-org-duplicates.ts
   ```

2. **Review what will be changed:**
   ```bash
   psql -d your_database -f frontend/sql/fix_duplicate_iati_org_ids_safe.sql
   ```

3. **Apply the fixes:**
   ```bash
   psql -d your_database -f frontend/sql/fix_duplicate_iati_org_ids.sql
   ```

4. **Retry the migration:**
   ```bash
   psql -d your_database -f frontend/sql/add_reporting_org_normalization.sql
   ```

### Common Issues

- **Empty strings:** These are converted to NULL
- **Duplicate values:** The oldest record keeps the original value, newer ones get a suffix (e.g., `XM-DAC-12-1` → `XM-DAC-12-1-1`)
- **Missing helper functions:** Run `add_reporting_org_helper_functions.sql` first 