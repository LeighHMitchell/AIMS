# 🛠️ Complete Sector Persistence Fix

## Issues Identified

1. **Missing `activity_sectors` table** - The table might not exist in your Supabase database
2. **Missing columns** - `default_aid_type` and `flow_type` columns missing from activities table
3. **API endpoint not fetching sectors** - The individual activity GET endpoint wasn't including related data

## Complete Fix Steps

### 1. Run SQL Migrations in Supabase

Go to your Supabase Dashboard → SQL Editor and run these scripts in order:

#### Step 1: Add missing columns to activities table
```sql
-- Add missing columns to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS default_aid_type TEXT;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS flow_type TEXT;
```

#### Step 2: Create activity_sectors table if it doesn't exist
```sql
-- Create activity_sectors table
CREATE TABLE IF NOT EXISTS activity_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    sector_code TEXT NOT NULL,
    sector_name TEXT,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    type TEXT DEFAULT 'secondary',
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_sectors_activity_id ON activity_sectors(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_sector_code ON activity_sectors(sector_code);

-- Enable RLS
ALTER TABLE activity_sectors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "activity_sectors_read_policy" 
ON activity_sectors FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "activity_sectors_write_policy" 
ON activity_sectors FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM activities 
        WHERE activities.id = activity_sectors.activity_id
    )
);
```

### 2. Verify the Fix

Run this query to check if everything is set up correctly:

```sql
-- Check if tables and columns exist
SELECT 
    'activities table has default_aid_type' as check_item,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_aid_type'
    ) as status
UNION ALL
SELECT 
    'activities table has flow_type' as check_item,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'flow_type'
    ) as status
UNION ALL
SELECT 
    'activity_sectors table exists' as check_item,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'activity_sectors'
    ) as status;
```

All three should return `true`.

### 3. Restart Your Development Server

```bash
# Kill any existing processes
pkill -f "next dev"

# Clear cache and restart
cd frontend
rm -rf .next
npm run dev
```

### 4. Test Sector Persistence

1. Go to http://localhost:3000/activities/new (or whatever port is shown)
2. Fill in the General tab with basic info
3. Go to the Sector Allocation tab
4. Add some sectors with percentages that total 100%
5. Click Save or Publish
6. Check the browser console for these logs:
   - `[AIMS] Sectors being saved: [...]`
   - `[AIMS] Sectors count: X`
7. Refresh the page
8. Go back to Sector Allocation tab - sectors should still be there!

### 5. Check Server Logs

In your terminal where the dev server is running, look for:
- `[AIMS API] Handling sectors update for activity: ...`
- `[AIMS API] Successfully inserted X sectors`
- `[AIMS API] Fetched X sectors after update`

### 6. If Sectors Still Don't Persist

Run this diagnostic query in Supabase:

```sql
-- Check for any sectors in the database
SELECT 
    a.id,
    a.title,
    COUNT(s.id) as sector_count,
    json_agg(
        json_build_object(
            'code', s.sector_code,
            'percentage', s.percentage
        )
    ) FILTER (WHERE s.id IS NOT NULL) as sectors
FROM activities a
LEFT JOIN activity_sectors s ON s.activity_id = a.id
GROUP BY a.id, a.title
ORDER BY a.updated_at DESC
LIMIT 10;
```

## What Was Fixed

1. **API Route Updates**:
   - Added comprehensive logging to track sector saving/loading
   - Fixed error handling for sector operations
   - Added sectors to individual activity GET endpoint

2. **Database Schema**:
   - Created proper table structure for activity_sectors
   - Added missing columns to activities table
   - Set up proper indexes and RLS policies

3. **Frontend Integration**:
   - Sectors are properly included in save payload
   - Response data includes fetched sectors
   - State is updated after save

## Common Issues

### "Could not find 'default_aid_type' column"
**Fix**: Run the SQL migration in step 1

### "relation 'activity_sectors' does not exist"
**Fix**: Run the SQL migration in step 2

### Sectors save but don't show after refresh
**Fix**: This should be fixed now with the API updates. If not, check browser console and server logs for errors.

### Network shows request to maps.googleapis.com
**Fix**: This is unrelated - it's for Google Maps. The actual save request should go to `/api/activities`

## Success Indicators

✅ Sectors persist after page refresh
✅ Console shows successful save logs
✅ Server logs show sectors being inserted and fetched
✅ Database query shows sectors linked to activities

The sector persistence should now work correctly! 