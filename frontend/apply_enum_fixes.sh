#!/bin/bash
# Script to apply PostgreSQL enum comparison fixes to the AIMS database

echo "PostgreSQL Enum Comparison Fix Script"
echo "===================================="
echo ""
echo "This script will apply fixes to prevent 'operator does not exist: text = enum_type' errors"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Prompt for database connection details
read -p "Enter your database connection string (or press Enter to use Supabase SQL Editor): " DB_CONNECTION

if [ -z "$DB_CONNECTION" ]; then
    echo ""
    echo "To apply the fix using Supabase SQL Editor:"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of fix_enum_comparison_errors.sql"
    echo "4. Click 'Run' to execute"
    echo ""
    echo "The SQL file is located at: ./fix_enum_comparison_errors.sql"
    echo ""
    read -p "Would you like to see the SQL commands? (y/n): " SHOW_SQL
    
    if [ "$SHOW_SQL" = "y" ] || [ "$SHOW_SQL" = "Y" ]; then
        echo ""
        echo "=== SQL Commands to Execute ==="
        cat fix_enum_comparison_errors.sql
        echo ""
        echo "=== End of SQL Commands ==="
    fi
else
    # Apply the fix using psql
    echo "Applying enum comparison fixes..."
    
    if psql "$DB_CONNECTION" -f fix_enum_comparison_errors.sql; then
        echo "✓ Enum comparison fixes applied successfully!"
    else
        echo "✗ Error applying fixes. Please check your connection string and try again."
        exit 1
    fi
fi

echo ""
echo "Next Steps:"
echo "1. Restart your Next.js development server"
echo "2. Test creating/editing transactions with various enum fields"
echo "3. Verify no 'operator does not exist' errors occur"
echo ""
echo "If you still encounter issues:"
echo "- Check the ENUM_COMPARISON_FIX_SUMMARY.md for troubleshooting"
echo "- Consider temporarily disabling the validation trigger"
echo ""

# Make the script executable
chmod +x "$0" 2>/dev/null || true 