# Migration Instructions for Activity Contacts Table

## Overview
This migration adds support for storing activity contacts in the database. Previously, contacts were only stored in the frontend state and not persisted.

## Steps to Apply Migration

1. **Connect to your Supabase project**
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor

2. **Run the migration**
   - Copy the contents of `supabase/migrations/add_activity_contacts_table.sql`
   - Paste and execute in the SQL Editor

3. **Verify the migration**
   - Check that the `activity_contacts` table was created
   - Verify that the RLS policies are in place
   - Test creating/updating activities with contacts

## What This Migration Does

- Creates the `activity_contacts` table with the following fields:
  - Contact identification (type, title, names)
  - Professional details (position, organisation)
  - Contact information (phone, fax, email)
  - Additional data (profile photo, notes)
  
- Sets up Row Level Security (RLS) policies to:
  - Allow everyone to read contacts
  - Only allow activity creators and contributors to manage contacts

- Creates an automatic `updated_at` trigger to track changes

## Rollback (if needed)

```sql
DROP TABLE IF EXISTS activity_contacts CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

## Testing

After applying the migration:
1. Create a new activity with contacts
2. Save the activity
3. Refresh the page
4. Verify contacts are still displayed
5. Edit the activity and verify contacts can be updated 