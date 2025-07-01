# Full Name to Name Field Migration Guide

## Overview
This guide documents the complete migration from using separate `full_name` and `name` fields to a unified `name` field across the entire AIMS codebase.

## Migration Steps

### STEP 1: Pre-Migration Backup
Before starting, create a complete backup of your database:
```bash
pg_dump -h your-host -U your-user -d your-database > backup_before_name_migration.sql
```

### STEP 2: Run Data Migration
Execute the SQL migration to merge `full_name` values into `name`:
```bash
psql -h your-host -U your-user -d your-database < frontend/sql/merge_full_name_to_name.sql
```

This script will:
- Backup the organizations table
- Merge `full_name` into `name` where `name` is empty
- Create a compatibility view for transition
- Log all changes to the `change_log` table

### STEP 3: Deploy Code Changes
The following files have been updated to use `name` instead of `full_name`:

#### Frontend Components Updated:
- `frontend/src/lib/supabase.ts` - Removed full_name from type definitions
- `frontend/src/components/activities/PlannedDisbursementsTab.tsx`
- `frontend/src/components/rolodex/PersonCard.tsx`
- `frontend/src/components/AidEffectivenessForm.tsx`
- `frontend/src/components/ui/organization-combobox.tsx`
- `frontend/src/components/organizations/CreateCustomGroupModal.tsx`
- `frontend/src/app/organizations/page.tsx`
- `frontend/src/app/organizations/[id]/page.tsx`
- `frontend/src/app/transactions/page.tsx`
- `frontend/src/app/rolodex/page.tsx`

#### API Routes Updated:
- `frontend/src/app/api/partners/route.ts`
- `frontend/src/app/api/partners/summary/route.ts`
- `frontend/src/app/api/rolodex/route.ts`
- `frontend/src/app/api/transactions/route.ts`
- `frontend/src/app/api/transactions/[id]/route.ts`

#### Backend Templates Updated:
- `templates/profiles/profile.html`

### STEP 4: Test the Application
After deploying the code changes:

1. **Test Organization Display**:
   - Check that organization names display correctly
   - Verify organization selection dropdowns work
   - Ensure organization cards show proper names

2. **Test Data Entry**:
   - Create a new organization
   - Edit existing organizations
   - Verify name field saves correctly

3. **Test API Endpoints**:
   - GET /api/organizations
   - GET /api/partners
   - PUT /api/organizations
   - GET /api/partners/summary

### STEP 5: Drop the full_name Column
Once you've verified everything works correctly, remove the `full_name` column:
```bash
psql -h your-host -U your-user -d your-database < frontend/sql/drop_full_name_column.sql
```

This will:
- Drop the `full_name` column from organizations, profiles, and rolodex_persons tables
- Remove the compatibility view
- Verify the changes

## Rollback Plan

If you need to rollback:

1. **Restore from backup**:
   ```bash
   psql -h your-host -U your-user -d your-database < backup_before_name_migration.sql
   ```

2. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   ```

## Key Changes Made

### Type Definition Changes
- Removed `full_name?: string` from Organization interfaces
- Updated all TypeScript types to use only `name`

### Display Logic Changes
- Changed from: `org.full_name || org.name`
- Changed to: `org.name`

- Changed from: `${org.full_name} (${org.name})`
- Changed to: `${org.name} (${org.acronym})`

### API Response Changes
- Removed `fullName` field from API responses
- All organization data now uses `name` field consistently

## Verification Checklist

- [ ] Database backup created
- [ ] Data migration script executed successfully
- [ ] All code changes deployed
- [ ] Organization display tested
- [ ] Organization editing tested
- [ ] API endpoints tested
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] full_name column dropped
- [ ] Final verification complete

## Support

If you encounter any issues during the migration:
1. Check the browser console for errors
2. Check server logs for API errors
3. Verify the migration script output
4. Ensure all code changes are deployed

The migration preserves all existing data by merging `full_name` values into `name` where needed, ensuring no data loss. 