#!/bin/bash

# Script to apply activity_sectors table migration
# This creates the activity_sectors table for storing sector allocations

echo "======================================"
echo "Activity Sectors Migration Script"
echo "======================================"
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

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    echo ""
    echo "Alternative: Use the Supabase SQL Editor"
    echo "1. Go to your Supabase dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of: supabase/migrations/20250706_create_activity_sectors_table.sql"
    echo "4. Click 'Run'"
    exit 1
fi

echo "This migration will:"
echo "- Create the activity_sectors table"
echo "- Add proper indexes and constraints"
echo "- Set up Row Level Security policies"
echo ""
echo "⚠️  IMPORTANT: This migration will modify your database schema!"
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Applying activity_sectors migration..."
echo "----------------------------------------"

# Apply the migration
psql "$DATABASE_URL" -f supabase/migrations/20250706_create_activity_sectors_table.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "The activity_sectors table has been created with:"
    echo "- Proper foreign key constraints"
    echo "- Indexes for performance"
    echo "- Row Level Security policies"
    echo "- Triggers for updated_at timestamps"
    echo ""
    echo "You can now save sectors to activities without errors!"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    echo "Alternative: Use the Supabase SQL Editor"
    echo "1. Go to your Supabase dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of: supabase/migrations/20250706_create_activity_sectors_table.sql"
    echo "4. Click 'Run'"
    exit 1
fi 