#!/bin/bash

# Apply name column migration to Supabase
# This script migrates name data to first_name/last_name and removes the name column

echo "Applying name column migration to Supabase..."

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

echo "⚠️  WARNING: This migration will:"
echo "   - Split the 'name' column into 'first_name' and 'last_name'"
echo "   - DELETE the 'name' column permanently"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

# Apply the migration
echo "Applying migration..."
psql "$DATABASE_URL" -f sql/migrate_name_to_first_last_name.sql

if [ $? -ne 0 ]; then
    echo "❌ Error applying migration"
    exit 1
fi

echo "✅ Migration applied successfully!"
echo ""
echo "The name column has been migrated and removed."
echo "All user names are now stored as first_name and last_name." 