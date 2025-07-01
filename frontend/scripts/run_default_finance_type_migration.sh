#!/bin/bash

# Script to run the default_finance_type migration
# This adds the default_finance_type column to the activities table

echo "🚀 Running default_finance_type migration..."
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
    exit 1
fi

# Extract database connection info from Supabase URL
DB_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
DB_NAME="postgres"
DB_PORT="5432"
DB_USER="postgres"

# Run the migration
echo "📝 Applying migration to add default_finance_type column..."
psql "postgresql://$DB_USER:$SUPABASE_SERVICE_ROLE_KEY@$DB_HOST.$DB_NAME:$DB_PORT/$DB_NAME" -f sql/add_default_finance_type.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "The following changes have been applied:"
    echo "- Added default_finance_type column to activities table"
    echo "- Added check constraint for valid IATI finance type codes"
    echo "- Added index for performance optimization"
    echo ""
    echo "You can now use the Default Finance Type field in the activity editor!"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi 