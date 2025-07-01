# Data Clinic Quick Start Guide

## 🚀 Setup Steps

### 1. Run the Database Migration

**Option A: Using psql**
```bash
psql -h your-database-host -U your-user -d your-database -f frontend/sql/add_data_clinic_fields.sql
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `frontend/sql/add_data_clinic_fields.sql`
4. Click "Run"

### 2. Restart Your Development Server
```bash
npm run dev
```

### 3. Access Data Clinic
1. Login as a super user
2. Look for "Data Clinic" in the left sidebar (with stethoscope icon)
3. Click to open

## 🔍 Diagnostic Tests

### Quick Test
Visit this URL in your browser to check if everything is set up correctly:
```
http://localhost:3005/api/data-clinic/test
```

### Comprehensive Debug Check
For a detailed analysis of your database setup:
```
http://localhost:3005/api/data-clinic/debug
```

This will show:
- Exact counts of activities, transactions, and organizations
- Which specific fields are missing
- Detailed recommendations

You can also click the **"Debug Check"** button in the Data Clinic UI for the same information.

## 🔍 What to Check in Browser Console

If you see "No activities found with data gaps", open the browser console (F12) and look for:

1. **API Response Logs**:
   - `[DataClinic] Response status: 200` (should be 200)
   - `[DataClinic] Activities count: X` (should be > 0)
   - `[DataClinic] Data gaps: [...]` (shows detected issues)
   - `[DataClinic] Has IATI fields: true/false` (shows if migration is needed)

2. **Common Issues**:
   - If status is 500: Database columns are missing - run migration
   - If count is 0: No activities in database
   - If "Has IATI fields: false": Migration needed
   - If no gaps found: All your data is complete! 🎉

## 📊 Understanding the Interface

1. **Debug Check Button**: Click to see detailed database status
2. **Data Gaps Summary**: Cards showing counts of missing fields
3. **Filter Options**: 
   - "All Activities" - Shows everything
   - "Missing Aid Type" - Shows only activities without aid type
   - etc.
4. **Table View**: 
   - Red badges indicate missing fields
   - Edit icons appear for super users
   - Checkboxes for bulk selection

## ✅ Quick Test

1. Click the **"Debug Check"** button to verify your setup
2. If you see "Database migration required", run the migration
3. Click "All Activities" filter to see all records
4. Look for any red "Missing" badges
5. If you're a super user, click the edit icon next to a missing field
6. Select a value from the dropdown
7. The change is saved automatically

## 🆘 Troubleshooting

### "Failed to load activities/transactions"
1. Click the "Debug Check" button
2. Look for missing fields in red
3. If you see missing fields, run the migration
4. Refresh the page

### "No activities found with data gaps"
This could mean:
- All your data is complete (good!)
- You have no activities in the database
- The migration hasn't been run yet

Check the debug info to determine which case applies.

## 📋 Common Solutions

1. **If debug shows "Migration Required: Yes"**:
   - Run the SQL migration file
   - Refresh the Data Clinic page

2. **If debug shows "Activities Count: 0"**:
   - Create some activities first
   - Then return to Data Clinic

3. **If everything looks good but still not loading**:
   - Check browser console for errors
   - Check Network tab for failed API calls
   - Ensure you're logged in as a super user

Need more help? See the full documentation at `frontend/docs/data-clinic-implementation.md` 