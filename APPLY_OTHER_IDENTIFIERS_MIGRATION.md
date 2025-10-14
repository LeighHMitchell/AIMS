# Apply Other Identifiers Migration

The `other_identifiers` feature requires a database migration to add the new JSONB column to the activities table.

## Quick Fix: Use Supabase SQL Editor (Easiest Method)

1. **Go to your Supabase Dashboard**
   - Open https://supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste this SQL:**

```sql
-- Add other_identifiers JSONB column to activities table
-- This column stores an array of other identifier objects with type, code, and optional owner-org data
-- Format: [{"type": "A1", "code": "ABC123", "ownerOrg": {"ref": "AA-AAA-123456789", "narrative": "Organisation name"}}]

-- Add the new column if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS other_identifiers JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN activities.other_identifiers IS 'Array of other identifiers for this activity (IATI other-identifier elements). Format: [{"type": "A1", "code": "ABC123", "ownerOrg": {"ref": "...", "narrative": "..."}}]';

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_activities_other_identifiers ON activities USING gin (other_identifiers);
```

4. **Click "Run"** (or press Ctrl+Enter / Cmd+Enter)

5. **Verify Success**
   - You should see "Success. No rows returned" or similar
   - The migration is now applied!

## What This Does

- Adds a new `other_identifiers` column to store multiple other identifiers
- Sets default value to empty array `[]`
- Creates an index for efficient querying
- Preserves all existing data

## After Migration

Once the migration is applied:

✅ **Manual Entry**: You can add other identifiers in the "Other Identifier Types" section and they will save correctly

✅ **XML Import**: You can import other identifiers from IATI XML using the XML Import tool

✅ **Persistence**: Other identifiers will persist after page refresh

## Troubleshooting

### If you see "column already exists"
This means the migration was already applied. You're good to go!

### If you see "permission denied"
Make sure you're logged in with the correct Supabase account that has access to this project.

### If the SQL Editor is not available
You can also run this via psql:
```bash
psql "your-supabase-connection-string" -c "ALTER TABLE activities ADD COLUMN IF NOT EXISTS other_identifiers JSONB DEFAULT '[]'::jsonb;"
```

## Testing

After applying the migration:

1. Go to an activity editor
2. Add an other identifier manually
3. Refresh the page
4. The identifier should still be there! ✅

Or test with XML import:
1. Go to XML Import tab
2. Import XML with `<other-identifier>` elements
3. Select and import them
4. They should appear in the "Other Identifier Types" section ✅

