#!/bin/bash

# Script to apply IATI compliance migration
# This updates the activities table to align with IATI standards

echo "======================================"
echo "IATI Compliance Migration Script"
echo "======================================"
echo ""
echo "This script will:"
echo "1. Remove non-IATI fields (objectives, target_groups)"
echo "2. Rename created_by_org → reporting_org_id"
echo "3. Add display fields for organization names"
echo "4. Backfill organization names from the organizations table"
echo ""
echo "⚠️  IMPORTANT: This migration will modify your database schema!"
echo ""
echo "To apply this migration:"
echo "1. Go to your Supabase Dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy the contents of: frontend/sql/migrate_activities_iati_compliance.sql"
echo "4. Paste and run in the SQL Editor"
echo ""
echo "The migration file is located at:"
echo "  frontend/sql/migrate_activities_iati_compliance.sql"
echo ""
echo "After running the migration:"
echo "- Verify the changes with the verification query at the end of the SQL file"
echo "- Test your application to ensure everything works correctly"
echo ""

# Option to display the migration file
read -p "Would you like to view the migration SQL now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    cat ../sql/migrate_activities_iati_compliance.sql
fi 