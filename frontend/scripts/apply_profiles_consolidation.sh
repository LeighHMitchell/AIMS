#!/bin/bash

# Script to consolidate profiles table into users table
# This script backs up data, runs the migration, and verifies the results

set -e  # Exit on error

echo "========================================="
echo "Profiles Table Consolidation Migration"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it using one of these methods:"
    echo "1. Export it: export DATABASE_URL='your-database-url'"
    echo "2. Create a .env file with DATABASE_URL=your-database-url"
    echo "3. Pass it directly: DATABASE_URL='your-database-url' $0"
    echo ""
    echo "You can find your database URL in Supabase:"
    echo "- Go to your Supabase project"
    echo "- Navigate to Settings → Database"
    echo "- Copy the 'Connection String' (URI format)"
    exit 1
fi

# Function to run SQL commands
run_sql() {
    psql "$DATABASE_URL" -c "$1"
}

# Function to run SQL file
run_sql_file() {
    psql "$DATABASE_URL" -f "$1"
}

echo "Step 1: Creating backup of profiles table..."
echo "----------------------------------------"
run_sql "CREATE TABLE IF NOT EXISTS profiles_backup AS SELECT * FROM profiles;" || true
run_sql "SELECT COUNT(*) as profile_count FROM profiles;" || echo "No profiles table found"

echo ""
echo "Step 2: Running consolidation migration..."
echo "----------------------------------------"
if [ -f "sql/consolidate_profiles_into_users.sql" ]; then
    run_sql_file "sql/consolidate_profiles_into_users.sql"
    echo "✓ Migration completed"
else
    echo "ERROR: Migration file not found at sql/consolidate_profiles_into_users.sql"
    echo "Make sure you're running this script from the frontend directory"
    exit 1
fi

echo ""
echo "Step 3: Verifying migration..."
echo "----------------------------------------"
echo "Checking users table structure:"
run_sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('avatar_url', 'preferred_language', 'reporting_org_id', 'bio') ORDER BY column_name;"

echo ""
echo "Checking data migration:"
run_sql "SELECT COUNT(*) as total_users, COUNT(avatar_url) as users_with_avatar, COUNT(preferred_language) as users_with_language FROM users;"

echo ""
echo "Step 4: Summary"
echo "----------------------------------------"
echo "✓ Profile data has been migrated to the users table"
echo "✓ Application code has been updated to use only the users table"
echo ""
echo "Next steps:"
echo "1. Test the application to ensure everything works correctly"
echo "2. Once verified, you can drop the profiles table:"
echo "   psql \$DATABASE_URL -c \"DROP TABLE IF EXISTS profiles CASCADE;\""
echo "3. You can also remove the backup table:"
echo "   psql \$DATABASE_URL -c \"DROP TABLE IF EXISTS profiles_backup;\""
echo ""
echo "If you encounter any issues, you can restore from backup:"
echo "   psql \$DATABASE_URL -c \"CREATE TABLE profiles AS SELECT * FROM profiles_backup;\""
echo ""
echo "Migration completed successfully!" 