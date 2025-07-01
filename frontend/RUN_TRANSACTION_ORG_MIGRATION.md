# Running the Transaction Organization Migration

## Quick Steps

1. **Apply the database migration**:
   ```bash
   # From the frontend directory
   npx supabase db push < add_transaction_org_columns.sql
   ```

   Or run it directly in Supabase SQL Editor:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `add_transaction_org_columns.sql`
   - Click "Run"

2. **Restart your development server**:
   ```bash
   # Kill any running instances
   pkill -f "next dev"
   
   # Start fresh
   npm run dev
   ```

3. **Test the import**:
   - Navigate to `/iati-import-enhanced`
   - Upload your IATI XML file
   - The import should now work without the "receiver_org" error

## What This Migration Does

- Adds `provider_org_id`, `provider_org_ref`, `provider_org_name` columns
- Adds `receiver_org_id`, `receiver_org_ref`, `receiver_org_name` columns
- Adds `activity_iati_ref` column for traceability
- Removes incorrect `provider_org` and `receiver_org` columns if they exist
- Creates indexes for better query performance

## Verification

After running the migration, you can verify it worked:

```sql
-- Check the transactions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name LIKE '%org%'
ORDER BY ordinal_position;
```

You should see the new organization columns listed.

## Troubleshooting

If you still get schema cache errors:
1. Clear your browser cache
2. Restart the Next.js development server
3. Check Supabase logs for any migration errors
4. Ensure you're connected to the correct Supabase project 