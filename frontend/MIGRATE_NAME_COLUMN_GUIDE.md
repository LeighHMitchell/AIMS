# Name Column Migration Guide

This guide helps you migrate data from the `name` column to `first_name` and `last_name` columns in the users table, then remove the `name` column.

## Prerequisites

1. Database backup (CRITICAL!)
2. Supabase CLI or direct database access
3. Admin/superuser privileges

## What This Migration Does

1. **Splits existing name data**: Takes any data in the `name` column and intelligently splits it:
   - First word becomes `first_name`
   - Remaining words become `last_name`
   - Only updates if `first_name` or `last_name` are empty

2. **Removes the name column**: Drops the `name` column from both `users` and `profiles` tables

3. **Updates sync functions**: Removes references to the `name` column in database functions

## Pre-Migration Check

Before running the migration, it's important to check your table structure:

### Check Table Columns
```bash
# From the frontend directory
psql "$DATABASE_URL" -f sql/check_users_columns.sql
```

Or run in Supabase SQL Editor:
```sql
-- List all columns in users table
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

This will help identify if there are any unexpected columns or missing columns that might cause issues.

## How to Apply the Migration

### Method 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy and paste the entire contents of `frontend/sql/migrate_name_to_first_last_name.sql`
5. Click **"Run"**

### Method 2: Using psql

```bash
cd frontend
psql "$DATABASE_URL" -f sql/migrate_name_to_first_last_name.sql
```

## What Happens to Your Data

### Before Migration:
```
| name          | first_name | last_name |
|---------------|------------|-----------|
| John Doe      | (empty)    | (empty)   |
| Jane Smith    | Jane       | (empty)   |
| Bob           | (empty)    | (empty)   |
```

### After Migration:
```
| first_name | last_name |
|------------|-----------|
| John       | Doe       |
| Jane       | Smith     |
| Bob        | (empty)   |
```

## Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **One-way Operation**: Once the `name` column is dropped, it cannot be recovered
3. **Code Updates**: The frontend code has been updated to not reference the `name` column
4. **Display Name**: The UI will construct display names from `first_name + last_name`
5. **View Dependencies**: The migration dynamically recreates views like `person_unified_view` based on actual table columns

## Verification

After running the migration, the script will output statistics showing:
- Total number of users
- Users with first names
- Users with last names
- Non-empty first names
- Non-empty last names

You can also manually verify:
```sql
-- Check that name column no longer exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'name';

-- Should return 0 rows

-- Check user data
SELECT id, first_name, last_name 
FROM users 
LIMIT 10;
```

## Rollback (if needed)

If you need to rollback, you would need to:
1. Add the `name` column back
2. Concatenate `first_name` and `last_name` back into `name`

```sql
-- Rollback script (use only if necessary)
ALTER TABLE users ADD COLUMN name VARCHAR(255);
UPDATE users SET name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')));
```

## Next Steps

After the migration:
1. All new users will only use `first_name` and `last_name`
2. The settings form will save to these fields
3. Display names in the UI will be constructed from these fields 