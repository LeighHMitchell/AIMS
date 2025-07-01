#!/bin/bash

echo "🚀 Starting budget tables migration..."
echo ""
echo "This script will create the necessary tables for the Activity Budgets feature."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set."
    echo "Please set it to your PostgreSQL connection string."
    echo "Example: export DATABASE_URL='postgresql://user:password@localhost:5432/mydb'"
    exit 1
fi

# Run the migration
echo "📦 Creating activity_budgets and activity_budget_exceptions tables..."
psql "$DATABASE_URL" < ../sql/create_activity_budgets_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "You can now use the Budgets tab in your Activity Editor."
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi 