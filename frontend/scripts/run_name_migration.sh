#!/bin/bash

# Script to run the name column migration with safety checks
# This migrates the name column to first_name/last_name

set -e

echo "==================================="
echo "Name Column Migration Script"
echo "==================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set it to your Supabase database connection string"
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SQL_DIR="$SCRIPT_DIR/../sql"

echo "📋 Step 1: Checking current table structure..."
echo ""
psql "$DATABASE_URL" -f "$SQL_DIR/check_users_columns.sql"

echo ""
echo "==================================="
echo ""
echo "⚠️  WARNING: This migration will:"
echo "  - Split name column data into first_name and last_name"
echo "  - DROP the name column permanently"
echo "  - Update database views and functions"
echo ""
echo "This is a ONE-WAY operation that cannot be easily undone!"
echo ""
read -p "Do you want to continue? (yes/no): " -n 3 -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🚀 Running migration..."
echo ""

# Run the migration
psql "$DATABASE_URL" -f "$SQL_DIR/migrate_name_to_first_last_name.sql"

echo ""
echo "✅ Migration completed!"
echo ""
echo "📊 Verifying results..."
echo ""

# Verify the migration
psql "$DATABASE_URL" -c "
SELECT 
  COUNT(*) as total_users,
  COUNT(first_name) as users_with_first_name,
  COUNT(last_name) as users_with_last_name
FROM users;
"

echo ""
echo "🎉 Migration successful! The name column has been removed."
echo "   All user names are now stored in first_name and last_name columns." 