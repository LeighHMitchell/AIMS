# Sector Saving Fix

## Problem
The sector tab in the activity editor was not saving sectors to the database correctly. Users could select sectors in the UI, but the data was not persisting to the backend.

## Root Cause
The issue was in `/src/app/api/activities/field/route.ts` at lines 339-346. The API was using incorrect database column names when transforming sector data for the response:

```typescript
// INCORRECT (before fix):
sectorsData = sectors?.map((sector: any) => ({
  id: sector.id,
  code: sector.sector_code,
  name: `${sector.sector_code} - ${sector.sector_name}`,
  percentage: sector.sector_percentage,    // ❌ Wrong column name
  category: sector.sector_category_name,   // ❌ Wrong column name
  categoryCode: sector.sector_category_code // ❌ Wrong column name
})) || [];
```

The actual database columns are:
- `percentage` (not `sector_percentage`)
- `category_name` (not `sector_category_name`)
- `category_code` (not `sector_category_code`)

## Solution
Fixed the field mapping to use the correct database column names:

```typescript
// CORRECT (after fix):
sectorsData = sectors?.map((sector: any) => ({
  id: sector.id,
  code: sector.sector_code,
  name: sector.sector_name,
  percentage: sector.percentage,      // ✅ Correct column name
  category: sector.category_name,     // ✅ Correct column name
  categoryCode: sector.category_code, // ✅ Correct column name
  level: sector.level,
  type: sector.type
})) || [];
```

## Testing
Created a test page at `/test-sector-fix` to verify the fix works correctly. The test page:
1. Creates an activity with sectors
2. Updates sectors using the field API
3. Fetches the activity to verify sectors are saved
4. Cleans up the test data

## Files Modified
- `/src/app/api/activities/field/route.ts` - Fixed the sector field mapping

## Verification Steps
1. Go to the activity editor
2. Navigate to the Sectors tab
3. Select sectors from the hierarchy
4. Assign percentages to each sector
5. The sectors should now save automatically
6. Refresh the page - sectors should persist
7. Check the green checkmark appears when sectors are saved

## Database Schema
The `activity_sectors` table uses these columns:
- `sector_code` - The DAC sector code
- `sector_name` - The sector name
- `percentage` - The allocation percentage
- `category_code` - The parent category code
- `category_name` - The parent category name
- `level` - The hierarchy level (group/sector/subsector)