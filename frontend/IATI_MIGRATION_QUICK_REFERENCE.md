# IATI Migration - Quick Reference

## 🚀 Run This Migration Now

### Step 1: Open Supabase SQL Editor
Go to your Supabase Dashboard → SQL Editor

### Step 2: Copy & Run Migration
Copy the entire contents of:
```
frontend/sql/migrate_activities_iati_compliance.sql
```

### Step 3: Check Results
You should see:
- ✅ "NOTICE: View activities_with_reporting_org exists and will be recreated..."
- ✅ "NOTICE: View activities_with_reporting_org recreated successfully"
- ✅ A verification query result showing your activities

## 🎯 What This Does

**Removes**: 
- `objectives` field (not in IATI standard)
- `target_groups` field (not in IATI standard)

**Renames**:
- `created_by_org` → `reporting_org_id`

**Adds**:
- `created_by_org_name` (organization name for display)
- `created_by_org_acronym` (organization acronym for display)

## ✅ Success Check
After migration, test in your app (http://localhost:3000):
1. Create a new activity - no objectives/target_groups fields
2. Edit an activity - see organization name displayed
3. View activities list - all working correctly

## ⚠️ If You Get Errors
1. Run `check_activities_columns.sql` to see current schema
2. Run `check_view_dependencies.sql` to find other dependent views
3. The migration handles most cases automatically

## 📝 Files Created
- Main migration: `migrate_activities_iati_compliance.sql`
- Helper scripts: `check_activities_columns.sql`, `check_view_dependencies.sql`
- Documentation: This file and others in frontend/

---
**Ready to go! Just copy, paste, and run the migration in Supabase.** 