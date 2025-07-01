# IATI Transaction System Migration Instructions

## Overview
The IATI-compliant transaction system migration has been prepared and is ready to be applied to your database. Due to the complexity of the migration and Supabase client limitations, you'll need to run it manually through the Supabase dashboard.

## Migration File Options
- **Main Migration**: `database_migration_iati_compliant_transactions.sql` - Complete migration with all safety checks
- **Resume Migration**: `database_migration_iati_resume.sql` - Completes a partially applied migration
- **Fresh Start**: `database_migration_iati_fresh_start.sql` - Handles complex scenarios and missing backups
- **Diagnostic**: `diagnose_transaction_tables.sql` - Check your current database state

## Steps to Apply the Migration

### 1. Diagnose Current State (Recommended First Step)
Before running any migration:
1. Copy the contents of `diagnose_transaction_tables.sql`
2. Run it in the SQL Editor
3. This will show you:
   - Which transaction-related tables exist
   - Current table structure
   - Whether you have old or new IATI structure
   - How many records exist
   - Which ENUMs have been created

### 2. Check Existing Table Structure (Optional)
Before running the migration, you may want to check your existing transactions table structure:
1. Copy the contents of `check_transactions_table.sql`
2. Run it in the SQL Editor to see what columns currently exist

### 3. Check Migration Status (Important if you get errors)
If you've already attempted the migration and got errors:
1. Copy the contents of `check_migration_status.sql`
2. Run it in the SQL Editor to see what parts have already been applied
3. This will show you which ENUMs, indexes, and tables already exist

### 4. Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (usually in the left sidebar)

### 5. Choose and Run the Appropriate Migration
Based on your situation:

#### Scenario A: First Time Migration
Use `database_migration_iati_compliant_transactions.sql`

#### Scenario B: Partial Migration Failed
Use `database_migration_iati_resume.sql` 

#### Scenario C: "transactions_backup doesn't exist" Error
Use `database_migration_iati_fresh_start.sql` - This handles:
- Missing backup tables
- Existing IATI structure
- Partial migrations
- Empty tables

1. Click **New Query** or **+** to create a new SQL query
2. Copy the entire contents of your chosen migration file
3. Paste it into the SQL editor
4. Click **Run** or press `Cmd/Ctrl + Enter`

### 6. Verify the Migration
After running the migration, verify it was successful by checking:
- The `transactions` table should have new IATI-compliant columns
- Several new ENUM types should be created (transaction_type_enum, etc.)
- Existing transaction data (if any) should be migrated with proper type mappings
- The migration script will show status messages about what was done

### 7. Test the Application
1. Start the development server: `npm run dev`
2. Navigate to any activity detail page
3. Click on the **Transactions** tab
4. Try adding a new transaction to verify the new system works

## What the Migration Does
- Creates IATI-standard ENUM types for transaction classifications
- Creates a new IATI-compliant transactions table structure
- Migrates existing transaction data (if any) to the new format
- Sets up proper indexes for performance
- Adds database triggers for timestamp updates

## Troubleshooting

### "column 'narrative' does not exist" Error
This error was fixed in the migration file. The original migration tried to reference a column called `narrative` that doesn't exist in the current transactions table. The migration now correctly uses only the `description` column.

### "relation 'idx_transactions_activity_id' already exists" Error
This error means the migration has been partially applied. The updated migration now uses `IF NOT EXISTS` clauses to handle this. The migration will:
- Skip creating ENUMs that already exist
- Skip creating indexes that already exist  
- Replace existing triggers

If you continue to have issues:
1. Run `check_migration_status.sql` to see what's already been created
2. Try running `database_migration_iati_resume.sql` instead - this script is designed to complete a partial migration
3. Or run the rollback instructions below and start fresh

### "relation 'transactions_backup' does not exist" Error
This error occurs when the migration expects a backup table that was never created. Solutions:
1. Run `diagnose_transaction_tables.sql` to check your current state
2. Use `database_migration_iati_fresh_start.sql` instead - this handles missing backups gracefully
3. The fresh start migration will:
   - Check if your transactions table already has the new structure
   - Create a backup only if needed and possible
   - Handle empty tables appropriately
   - Provide detailed status messages

### Using the Resume Migration Script
If the main migration partially failed:
1. Use `database_migration_iati_resume.sql` instead of the main migration
2. This script will:
   - Check if `transactions_iati` table exists and rename it to `transactions`
   - Create any missing indexes
   - Set up the trigger
   - Add documentation comments
3. After running, it will show you a status message about what was completed

### Other Column Errors
If you encounter other column-related errors:
1. Run the `check_transactions_table.sql` script to see your current table structure
2. Compare it with the migration expectations
3. Adjust the migration file as needed

## Rollback Instructions
If you need to rollback:
- The migration creates a backup table `transactions_backup` with your original data (if data existed)
- To rollback (if backup exists): `DROP TABLE transactions; ALTER TABLE transactions_backup RENAME TO transactions;`
- To clean up ENUMs: `DROP TYPE IF EXISTS transaction_type_enum, transaction_status_enum, organization_type_enum, disbursement_channel_enum, flow_type_enum, finance_type_enum, aid_type_enum, tied_status_enum CASCADE;`

## Notes
- The new transaction types are numeric IATI codes (1-13) instead of letter codes
- All IATI-specific fields are now properly supported
- Organization tracking is improved with separate provider/receiver fields
- Multi-currency support is maintained 