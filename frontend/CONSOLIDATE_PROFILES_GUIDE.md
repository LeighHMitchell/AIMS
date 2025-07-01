# Guide: Consolidating Profiles Table into Users Table

This guide explains how to consolidate the `profiles` table into the `users` table to simplify the database structure.

## Background

Previously, the application used two tables:
- `users` - Core user data (name, email, role, etc.)
- `profiles` - Extended profile data (avatar, preferences, etc.)

This consolidation merges all data into a single `users` table for simplicity and better performance.

## Migration Steps

### Step 1: Backup Your Data

Before running any migration, create a backup:

```sql
-- Create backup of profiles table
CREATE TABLE profiles_backup AS SELECT * FROM profiles;

-- Verify backup
SELECT COUNT(*) FROM profiles_backup;
```

### Step 2: Run the Migration

Apply the consolidation migration:

```bash
# Using psql
psql "your-database-url" -f sql/consolidate_profiles_into_users.sql

# Or using Supabase SQL Editor
# Copy and paste the contents of sql/consolidate_profiles_into_users.sql
```

### Step 3: Verify the Migration

Run these queries to verify the data was migrated correctly:

```sql
-- Check that users have the new columns
SELECT 
  COUNT(*) as total_users,
  COUNT(avatar_url) as users_with_avatar,
  COUNT(preferred_language) as users_with_language,
  COUNT(reporting_org_id) as users_with_reporting_org
FROM users;

-- Compare with original profiles data
SELECT 
  COUNT(*) as total_profiles
FROM profiles;

-- Check specific user data
SELECT 
  id, 
  first_name, 
  last_name, 
  avatar_url, 
  preferred_language,
  reporting_org_id
FROM users 
WHERE avatar_url IS NOT NULL 
LIMIT 5;
```

### Step 4: Update Application Code

The following files have been updated to use only the `users` table:

1. **UserSettingsForm.tsx**
   - Removed queries to `profiles` table
   - Now saves all data to `users` table

2. **AdminUserTable.tsx**
   - Removed join with `profiles` table
   - Uses fields directly from `users` table

3. **API Routes**
   - Updated to reference `users` table fields

### Step 5: Drop the Profiles Table (Optional)

Once you've verified everything is working correctly:

```sql
-- Drop the profiles table
DROP TABLE IF EXISTS profiles CASCADE;

-- If you created a backup and are satisfied
DROP TABLE IF EXISTS profiles_backup;
```

## New Database Schema

After consolidation, the `users` table includes:

### Core Fields (Original)
- `id` - User ID
- `email` - User email
- `role` - User role
- `first_name` - First name
- `last_name` - Last name
- `organisation` - Organization name
- `organization_id` - Organization ID reference
- `department` - Department
- `job_title` - Job title
- `telephone` - Phone number
- `website` - Website URL
- `mailing_address` - Mailing address
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### Profile Fields (Migrated)
- `avatar_url` - Profile picture URL
- `bio` - User biography
- `preferred_language` - IATI preferred language (ISO 639-1)
- `reporting_org_id` - IATI reporting organization ID
- `phone` - Additional phone field (synced with telephone)
- `position` - Position/title (synced with job_title)

## Benefits of Consolidation

1. **Simpler Queries** - No need for joins between users and profiles
2. **Better Performance** - Fewer database queries
3. **Easier Maintenance** - Single source of truth for user data
4. **Cleaner Code** - Simplified data access patterns

## Troubleshooting

### If Migration Fails

1. Check for constraint violations:
```sql
SELECT * FROM profiles WHERE user_id NOT IN (SELECT id FROM users);
```

2. Restore from backup:
```sql
-- If you need to restore profiles
CREATE TABLE profiles AS SELECT * FROM profiles_backup;
```

### If Application Shows Errors

1. Clear your browser cache
2. Restart the application
3. Check browser console for specific error messages

## Rollback Plan

If you need to rollback:

1. Restore the profiles table from backup
2. Revert the code changes (git checkout previous commit)
3. Re-enable the sync triggers between tables

## Next Steps

After successful consolidation:

1. Update any external integrations that might reference the profiles table
2. Update documentation to reflect the new schema
3. Consider adding indexes for frequently queried fields:

```sql
CREATE INDEX idx_users_organisation ON users(organisation);
CREATE INDEX idx_users_department ON users(department);
``` 