# Quick FSS Test Guide

## ✅ Checklist to Verify FSS is Working

### 1. Database Migration
- [ ] Ran the migration SQL in Supabase SQL Editor
- [ ] Saw "Success" message
- [ ] Tables created: `forward_spending_survey` and `fss_forecasts`

### 2. Dev Server Running
- [ ] Frontend dev server started with `npm run dev`
- [ ] No compilation errors in terminal
- [ ] Can access http://localhost:3000

### 3. FSS Tab Visible
- [ ] Opened an activity in Activity Editor
- [ ] Looked in left sidebar under "Funding & Delivery"
- [ ] See "Forward Spending Survey" tab between "Planned Disbursements" and "Results"

### 4. FSS Tab Works
- [ ] Click on "Forward Spending Survey" tab
- [ ] See empty state with "Create Forward Spending Survey" button
- [ ] Click the button
- [ ] Form appears with fields: Extraction Date, Priority, Phaseout Year, Notes
- [ ] Can enter extraction date
- [ ] Can add a forecast

## If FSS Tab is NOT Visible

### Check 1: Browser Cache
```bash
# Hard refresh your browser
# Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
# Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
```

### Check 2: Dev Server Logs
Look at your terminal where `npm run dev` is running.
You should NOT see any errors about:
- "Cannot find module"
- "ForwardSpendingSurveyTab"
- "fss"

### Check 3: Console Errors
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any red errors
4. Share them if you see any

### Check 4: Verify Files Exist
Run these commands to verify all files were created:

```bash
cd /Users/leighmitchell/aims_project

# Check type definition exists
ls -la frontend/src/types/fss.ts

# Check component exists
ls -la frontend/src/components/activities/ForwardSpendingSurveyTab.tsx

# Check API routes exist
ls -la frontend/src/app/api/activities/\[id\]/fss/route.ts
ls -la frontend/src/app/api/fss/forecasts/route.ts
```

All commands should show file sizes (not "No such file or directory").

## Quick Test with XML Import

If the tab is visible, test XML import:

1. Go to **Tools** → **XML Import**
2. Click "Browse" or paste this XML:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>TEST-FSS-001</iati-identifier>
    <title>
      <narrative>FSS Test Activity</narrative>
    </title>
    
    <fss extraction-date="2025-01-15" priority="1" phaseout-year="2028">
      <forecast year="2025" value-date="2025-01-01" currency="USD">100000</forecast>
      <forecast year="2026" value-date="2025-01-01" currency="USD">120000</forecast>
      <forecast year="2027" value-date="2025-01-01" currency="USD">150000</forecast>
    </fss>
  </iati-activity>
</iati-activities>
```

3. Click "Parse XML"
4. Look for "Forward Spending Survey" in the import preview
5. Check the checkbox
6. Click "Import Selected Fields"
7. Navigate to **Funding & Delivery** → **Forward Spending Survey**
8. You should see 3 forecasts imported!

## Still Having Issues?

Share:
1. Any error messages from terminal
2. Any error messages from browser console (F12 → Console)
3. Screenshot of your Activity Editor sidebar
4. Result of running: `ls -la frontend/src/types/fss.ts`

