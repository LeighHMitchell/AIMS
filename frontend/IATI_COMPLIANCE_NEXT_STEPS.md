# IATI Compliance Migration - Next Steps

## ✅ Completed
1. Created database migration SQL file
2. Updated UI components to remove non-IATI fields
3. Renamed `created_by_org` to `reporting_org_id` in all components
4. Added display-only organization fields
5. Created migration helper script
6. Updated analytics components

## 🚀 Next Steps

### 1. Apply the Database Migration
```bash
# Go to Supabase Dashboard > SQL Editor
# Copy and paste contents from:
frontend/sql/migrate_activities_iati_compliance.sql
# Run the migration
```

### 2. Test the Application
Once the migration is applied and the dev server is running (http://localhost:3000):

1. **Test Activity Creation**
   - Create a new activity
   - Verify objectives/target_groups fields are gone
   - Check that organization info displays correctly

2. **Test Activity Editing**
   - Edit an existing activity
   - Ensure no errors about missing fields
   - Verify organization name appears as read-only

3. **Test Activity List**
   - View activities list
   - Export to CSV and verify new fields are included

4. **Test Analytics**
   - Check Data Heatmap
   - Check Project Pipeline
   - Ensure no errors with reporting_org_id

### 3. Handle Any Remaining References
If you encounter any errors, search for remaining references:
```bash
# Find any remaining objectives references
grep -r "objectives" frontend/src --include="*.tsx" --include="*.ts"

# Find any remaining created_by_org references
grep -r "created_by_org" frontend/src --include="*.tsx" --include="*.ts"
```

### 4. Update API Endpoints (if needed)
Check if any API endpoints need updating:
- `/api/activities/*` endpoints may need field mapping updates
- Import/export functions may need field adjustments

### 5. Update Type Definitions
Ensure TypeScript types are updated:
- Check `frontend/src/types/*.ts` files
- Update any Activity interfaces

### 6. Final Verification
- Run the verification query from the migration SQL
- Test with different user roles
- Verify IATI export functionality (if implemented)

## 🎯 Success Criteria
- [ ] Database migration applied successfully
- [ ] No UI errors when creating/editing activities
- [ ] Organization info displays correctly
- [ ] Analytics dashboards work properly
- [ ] CSV export includes new fields
- [ ] No TypeScript errors

## 📝 Notes
- The dev server should now be running on http://localhost:3000
- If you see any database connection errors, ensure your Supabase credentials are correct in `.env.local`
- The migration is idempotent - it can be run multiple times safely 