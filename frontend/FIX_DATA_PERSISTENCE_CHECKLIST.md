# 🐛 Data Persistence Fix Checklist

## Issues Identified & Fixed

### 1. 🟦 Default Aid Type & Flow Type Not Saving
**Issue:** Fields were missing from database and API
**Fix Applied:**
- ✅ Added `default_aid_type` and `flow_type` columns to activities table
- ✅ Updated API POST handler to save these fields
- ✅ Updated API GET handler to return these fields
- ✅ Added fields to response transformation

### 2. 🎯 Objectives and Target Groups
**Issue:** Fields exist but might not be saving properly
**Fix Applied:**
- ✅ Confirmed fields are included in API save/update logic
- ✅ Added to GET query to ensure they're returned

### 3. 🖼️ Project Icon (Image Upload)
**Issue:** Icon field was missing from some queries
**Fix Applied:**
- ✅ Added `icon` field to GET query
- ✅ Ensured it's included in save/update operations

### 4. 🟫 Sector Allocations
**Issue:** Sectors are saved as separate table records
**Status:** ✅ Already properly implemented in API

### 5. 💧 Transactions
**Issue:** Transactions save logic was already correct
**Status:** ✅ Already properly implemented

## SQL Migration to Run

Run this SQL in your Supabase SQL Editor:

```sql
-- Add missing fields to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS default_aid_type TEXT;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS flow_type TEXT;

-- Add comments for documentation
COMMENT ON COLUMN activities.default_aid_type IS 'Default aid type for the activity (IATI aid type codes)';
COMMENT ON COLUMN activities.flow_type IS 'Flow type for the activity (IATI flow type codes)';

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'activities' 
AND column_name IN ('default_aid_type', 'flow_type', 'objectives', 'target_groups', 'icon');
```

## Testing Steps

1. **Run the SQL migration** in Supabase
2. **Restart your development server** to pick up the changes
3. **Test saving an activity** with:
   - Default Aid Type selected
   - Flow Type selected
   - Objectives text filled
   - Target Groups text filled
   - Icon uploaded
   - Sectors allocated

4. **Verify persistence** by:
   - Refreshing the page
   - Checking the Network tab for the API response
   - Confirming all fields are returned with values

## Debug Commands

If issues persist, run these in your browser console:

```javascript
// Check what's being sent to the API
console.log('Activity data being saved:', general);

// Check the API response
fetch('/api/activities').then(r => r.json()).then(data => {
  const activity = data.find(a => a.id === 'YOUR_ACTIVITY_ID');
  console.log('Activity from API:', activity);
  console.log('Default Aid Type:', activity.defaultAidType);
  console.log('Flow Type:', activity.flowType);
  console.log('Objectives:', activity.objectives);
  console.log('Target Groups:', activity.targetGroups);
  console.log('Icon:', activity.icon);
});
```

## Common Issues & Solutions

### Issue: Fields still not saving
**Solution:** 
- Clear browser cache
- Restart Next.js server
- Check browser console for errors
- Verify SQL migration ran successfully

### Issue: "Column does not exist" error
**Solution:** 
- Run the SQL migration above
- Check Supabase table structure

### Issue: Values save but don't load
**Solution:**
- Check the `fetchActivity` function in your component
- Ensure it's mapping the fields correctly from the API response

## Next Steps

1. Run the SQL migration
2. Restart your development server
3. Test all the fields
4. If issues persist, check the browser console and network tab for specific errors 