# 🛠️ Sector Persistence Fix - Complete Solution

## Issue Summary
Sectors are being saved to the database but not showing when the activity is loaded because the individual activity GET endpoint wasn't fetching related data.

## What I Fixed

### 1. Updated `/api/activities/[id]/route.ts` ✅
- Added queries to fetch all related data (sectors, transactions, contacts, etc.)
- Updated response to include all related data in the correct format
- Added missing fields: `defaultAidType` and `flowType`

### 2. Database Column Issues
You need to run this SQL in Supabase to add the missing columns:

```sql
-- Add missing columns to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS default_aid_type TEXT;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS flow_type TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND column_name IN ('default_aid_type', 'flow_type');
```

## Testing Steps

1. **Restart your development server**:
   ```bash
   # Kill any existing processes
   pkill -f "next dev"
   
   # Clear cache and restart
   cd frontend
   rm -rf .next
   npm run dev
   ```

2. **Test Sector Persistence**:
   - Go to an activity editor
   - Navigate to the Sector Allocation tab
   - Add some sectors with percentages
   - Click Save or Publish
   - Refresh the page
   - Sectors should now persist!

3. **Check the Console**:
   When you save, you should see:
   - `[AIMS DEBUG] Sectors being saved: [...]`
   - `[AIMS DEBUG] Sectors count: X`
   
   When the page loads, you should see:
   - `[AIMS DEBUG] After setting state - sectors: [...]`
   - `[AIMS DEBUG] After setting state - sectors count: X`

## Debugging SQL Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Check if sectors are saved for your activity
SELECT 
    a.id,
    a.title,
    COUNT(s.*) as sector_count,
    json_agg(s.*) as sectors
FROM activities a
LEFT JOIN activity_sectors s ON s.activity_id = a.id
WHERE a.id = '51a1fcab-4f1a-48be-8592-292eef27dc55'  -- Replace with your activity ID
GROUP BY a.id, a.title;

-- Check all sectors in the database
SELECT * FROM activity_sectors ORDER BY created_at DESC LIMIT 20;
```

## Common Issues & Solutions

### Issue 1: "Could not find 'default_aid_type' column"
**Solution**: Run the SQL migration above in Supabase

### Issue 2: Sectors save but don't show after refresh
**Solution**: This should be fixed now with the API update

### Issue 3: Search not working (OR condition error)
**Solution**: Already fixed in the main activities route

## Next Steps

1. Run the SQL migration in Supabase
2. Restart your development server
3. Test sector persistence
4. If issues persist, check the browser console and server logs

## Additional Improvements Made

- ✅ Fixed individual activity GET endpoint to fetch all related data
- ✅ Added proper field transformations for frontend compatibility
- ✅ Included all missing fields in API responses
- ✅ Fixed search functionality in activities list

The sector persistence should now work correctly! 