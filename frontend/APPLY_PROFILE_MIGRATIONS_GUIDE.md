# Profile & Notifications Migration Guide

The error "relation 'profiles' does not exist" occurs because the profile and notification migrations haven't been applied to your database yet. Here's how to fix it:

## Migration Files

You have two migration files that need to be applied in order:
1. `sql/create_user_profiles_notifications.sql` - Creates profiles and notifications tables
2. `sql/update_users_table_full_profile.sql` - Adds full profile fields to users table

**Important:** If you encounter errors, use the latest fixed version:
- `sql/combined_profile_migrations_fixed_v2.sql` - Compatible with all PostgreSQL versions and fixes column reference issues

## Method 1: Using the Migration Script (Recommended)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Set your DATABASE_URL environment variable:
   ```bash
   export DATABASE_URL="your-supabase-database-url"
   ```
   
   You can find your database URL in Supabase:
   - Go to your Supabase project
   - Navigate to Settings → Database
   - Copy the "Connection String" (URI format)

3. Run the migration script:
   ```bash
   ./scripts/apply_profile_migrations.sh
   ```

## Method 2: Using Supabase SQL Editor (Web Interface)

1. Go to your Supabase dashboard
2. Navigate to SQL Editor

### First: Check your table structure (Optional but recommended)
- Click "New Query"
- Copy and paste the contents of `frontend/sql/check_users_table_structure.sql`
- Click "Run"
- Note what ID column your users table uses (id, auth_id, or user_id)

### Then: Apply the migration
- Click "New Query"
- Copy and paste the entire contents of `frontend/sql/combined_profile_migrations_fixed_v2.sql`
- Click "Run"

## Method 3: Using psql directly

If you have psql installed and prefer to run the commands directly:

```bash
cd frontend

# Use the v2 fixed combined migration
psql "your-database-url" -f sql/combined_profile_migrations_fixed_v2.sql
```

## Verifying the Migrations

After applying the migrations, you can verify they worked by checking:

1. In Supabase SQL Editor, run:
   ```sql
   -- Check if profiles table exists
   SELECT * FROM profiles LIMIT 1;
   
   -- Check if notifications table exists
   SELECT * FROM notifications LIMIT 1;
   
   -- Check if users table has new columns
   SELECT first_name, last_name, organisation, role 
   FROM users LIMIT 1;
   ```

2. The app should now work without the "profiles does not exist" error

## What These Migrations Do

### create_user_profiles_notifications.sql:
- Creates `profiles` table for extended user information
- Creates `notifications` table for mentions and system notifications
- Sets up Row Level Security (RLS) policies
- Creates triggers for automatic mention detection

### update_users_table_full_profile.sql:
- Adds profile fields to users table (first_name, last_name, organisation, etc.)
- Updates role system (migrates admin→super_user, orphan→dev_partner_tier_2)
- Creates sync trigger between users and profiles tables
- Updates RLS policies for new fields

## Troubleshooting

If you encounter errors:

1. **"syntax error at or near 'NOT'"** - This occurs when using CREATE POLICY IF NOT EXISTS on older PostgreSQL versions. Use `combined_profile_migrations_fixed_v2.sql` instead
2. **"column 'auth_id' does not exist"** - Your users table uses 'id' instead of 'auth_id'. Use `combined_profile_migrations_fixed_v2.sql` which has this fixed
3. **"psql command not found"** - Use Method 2 (Supabase SQL Editor) instead
4. **"permission denied"** - Make sure you're using the correct database URL with proper permissions
5. **"relation already exists"** - The migrations may have been partially applied. Check what exists and apply only the missing parts
6. **Role constraint errors** - The migration handles role updates, but if you have custom roles, you may need to update them manually

## Next Steps

After successfully applying the migrations:
1. Restart your Next.js development server
2. The Settings, Notifications, and Admin pages should now work properly
3. Users will have extended profile fields and the new role system 