# 🛠️ Debugging Sector Persistence Issue

## The Issue
Sectors appear to save locally but disappear when publishing or refreshing the page.

## Quick Diagnosis Steps

### 1. Check Browser Network Tab
When you click "Publish":
1. Open DevTools → Network tab
2. Look for the POST request to `/api/activities`
3. Click on it and check the "Request" payload
4. Look for the `sectors` field - is it present and populated?

Example of what you should see:
```json
{
  "title": "My Activity",
  "sectors": [
    { "id": "uuid-1", "code": "11110", "percentage": 60 },
    { "id": "uuid-2", "code": "11120", "percentage": 40 }
  ],
  // ... other fields
}
```

### 2. Check Console Logs
The code already has debugging logs. Look for:
- `[AIMS] Sectors count: X` - This shows how many sectors are being sent
- `[AIMS] Submitting activity payload:` - Check if sectors are included

### 3. Check Database After Save
Run this SQL in Supabase:
```sql
-- Check if sectors are being saved
SELECT 
    a.id,
    a.title,
    COUNT(s.id) as sector_count,
    array_agg(
        json_build_object(
            'code', s.sector_code,
            'name', s.sector_name,
            'percentage', s.percentage
        )
    ) as sectors
FROM activities a
LEFT JOIN activity_sectors s ON s.activity_id = a.id
WHERE a.title LIKE '%Your Activity Title%'
GROUP BY a.id, a.title;
```

## Root Cause Analysis

### Scenario 1: Sectors Missing from Request
If sectors are NOT in the request payload:
- The state might not be synced between tabs
- The sectors state might be cleared somewhere

### Scenario 2: Sectors in Request but Not Saved
If sectors ARE in the request but not in database:
- Check API response for errors
- Database constraints might be failing
- The API might be skipping sector processing

### Scenario 3: Sectors Saved but Not Loading
If sectors ARE in database but not showing:
- The frontend fetch might not include sectors
- The sectors might not be mapped correctly on load

## Fix Verification

### 1. Add Debug Logging
In your browser console, run:
```javascript
// Get current activity state
const debugState = () => {
  console.log('Current sectors:', sectors);
  console.log('Sectors count:', sectors.length);
  console.log('Sectors details:', JSON.stringify(sectors, null, 2));
};

// Call this before saving
debugState();
```

### 2. Test Minimal Case
1. Create a new activity with just title and one sector
2. Save (not publish)
3. Refresh the page
4. Check if the sector persists

### 3. Check API Response
After saving, the API should return the saved sectors:
```javascript
// In the browser console after save
fetch('/api/activities?search=YOUR_ACTIVITY_TITLE')
  .then(r => r.json())
  .then(data => {
    const activity = data[0];
    console.log('Saved sectors:', activity.sectors);
  });
```

## Common Issues & Solutions

### Issue: Sectors state not updating
**Solution:** Ensure the SimpleSectorAllocationForm onChange is called:
```javascript
// This should trigger on every sector change
onChange={setSectors}
```

### Issue: Sectors cleared on tab switch
**Solution:** Check if any effect is clearing sectors:
```javascript
// Look for any code like this
setSectors([]);  // This would clear sectors
```

### Issue: API not processing sectors
**Solution:** Check the API logs for sector processing:
- Look for "Processing X sectors for activity"
- Check for any error messages about sectors

## Emergency Fix

If you need to manually add sectors via SQL:
```sql
-- Manually insert sectors for an activity
INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
VALUES 
  ('YOUR_ACTIVITY_ID', '11110', 'Education policy and administrative management', 50, 'primary'),
  ('YOUR_ACTIVITY_ID', '11120', 'Education facilities and training', 50, 'primary');
```

## Next Steps

1. Run through the diagnosis steps above
2. Share the results:
   - Network request payload
   - Console logs
   - Database query results
3. We can then pinpoint the exact failure point 