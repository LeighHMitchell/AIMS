# Running the IATI Transaction Migration

> **Update: The import process now automatically creates missing activities!** If a transaction references an activity that doesn't exist in the database, a minimal activity record will be created automatically during import. These auto-created activities will have a title prefixed with "[Auto-created]" and will need to be updated with complete details after import.

## Steps to Fix:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Go to the SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **FIRST: Create the Enum Types**
   - Copy the entire contents of `frontend/create_enums_first.sql`
   - Paste it into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - You should see: "Enum types created successfully!"

4. **THEN: Run the Migration**
   - Clear the SQL editor
   - Copy the entire contents of `frontend/database_migration_iati_fresh_start.sql`
   - Paste it into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

5. **What the Migration Does:**
   - Creates a backup of your existing transactions (if any)
   - Creates a new IATI-compliant transactions table with all required fields:
     - `disbursement_channel`
     - `provider_org_id`, `provider_org_type`, `provider_org_ref`, `provider_org_name`
     - `receiver_org_id`, `receiver_org_type`, `receiver_org_ref`, `receiver_org_name`
     - `sector_code`, `sector_vocabulary`
     - `recipient_country_code`, `recipient_region_code`
     - `flow_type`, `finance_type`, `aid_type`, `tied_status`
     - And more...
   - Migrates any existing transaction data to the new structure

6. **After Running the Migration:**
   - The import should work properly
   - Your existing transactions will be preserved
   - New IATI transactions can be imported with all their fields

## Verification:

After running the migration, you can verify it worked by running this SQL:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('disbursement_channel', 'provider_org_id', 'sector_code')
ORDER BY ordinal_position;
```

You should see these columns listed if the migration was successful.

## If You Get Errors:

- **"type 'transaction_type_enum' does not exist"** - Make sure you ran `create_enums_first.sql` first!
- **"relation 'activities' does not exist"** - This means the activities table doesn't exist. You may need to run other migrations first.
- **Other errors** - Check the error message and let me know what it says. 