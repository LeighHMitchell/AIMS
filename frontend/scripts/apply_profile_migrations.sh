#!/bin/bash

# Apply profile and notification migrations to Supabase
# This script applies the combined migration that includes both profiles and notifications

echo "Applying profile and notification migrations to Supabase..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "Error: This script must be run from the frontend directory"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Get database URL from environment
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable not set"
    echo "Please set it to your Supabase database URL"
    echo "You can find this in your Supabase project settings under Database > Connection String > URI"
    exit 1
fi

# Apply the combined migration (v2 with fixes)
echo "Applying combined profile and notification migration (v2)..."
psql "$DATABASE_URL" -f sql/combined_profile_migrations_fixed_v2.sql
if [ $? -ne 0 ]; then
    echo "Error applying migration"
    echo ""
    echo "Common issues and solutions:"
    echo "1. If you see 'column auth_id does not exist', the v2 migration should fix this"
    echo "2. If you see 'relation profiles already exists', the migration may be partially applied"
    echo "3. Try running the diagnostic query in sql/check_users_table_structure.sql to understand your table structure"
    echo ""
    echo "You can also use the Supabase SQL Editor for more control over the process."
    exit 1
fi

echo "✅ All migrations applied successfully!"
echo ""
echo "The following tables and features are now available:"
echo "- profiles table with user profile information"
echo "- notifications table with mention and system notifications"
echo "- Extended user fields (first_name, last_name, organisation, etc.)"
echo "- Updated role system (gov_partner_tier_1/2, dev_partner_tier_1/2, super_user)"
echo "- Automatic sync between users and profiles tables" 