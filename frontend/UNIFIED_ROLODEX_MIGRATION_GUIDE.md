# Unified Rolodex Migration Guide

## Overview
This guide explains how to migrate the existing Rolodex feature to support a unified view of contacts from multiple sources:
- **System Users** - from the `users` table
- **Activity Contacts** - from the `activity_contacts` table  
- **Organization Contacts** - future support planned

## Migration Steps

### 1. Apply Database Changes

Run the SQL script to create the unified view and search function:

```bash
# Option 1: Using the TypeScript migration script
cd frontend
npm run tsx scripts/create-unified-rolodex-view.ts

# Option 2: Manual SQL execution in Supabase Dashboard
# 1. Go to your Supabase Dashboard
# 2. Navigate to SQL Editor
# 3. Copy and paste the contents of frontend/create_unified_rolodex_view.sql
# 4. Execute the SQL
```

### 2. Verify the Migration

After applying the database changes, verify everything is working:

```sql
-- Check if the view was created
SELECT * FROM person_unified_view LIMIT 5;

-- Test the search function
SELECT * FROM search_unified_rolodex(
  p_search := 'john',
  p_limit := 10
);

-- Check activity contacts are included
SELECT source_type, COUNT(*) 
FROM person_unified_view 
GROUP BY source_type;
```

### 3. Frontend Changes Applied

The following frontend components have been updated:
- ✅ **API Route** (`/api/rolodex/route.ts`) - Now queries unified view with fallbacks
- ✅ **PersonCard** - Enhanced to display position, notes, and profile photos
- ✅ **FilterPanel** - Already supports source filtering
- ✅ **Role Labels** - Updated to include activity_contact source type

### 4. Testing the Unified Rolodex

1. Navigate to the Rolodex page in your application
2. You should now see both system users and activity contacts
3. Test filtering by source type:
   - "System User" - shows only users from the users table
   - "Activity Contact" - shows only contacts from activity_contacts table
4. Search for contacts by name, email, or organization
5. Verify that activity contacts without emails are still displayed

## Data Structure Mapping

### Unified Fields
All contact types share these core fields:
- `id` - Unique identifier
- `source_type` - 'user' or 'activity_contact'
- `name` - Full name
- `email` - Email address (optional for activity contacts)
- `role` - Role or position
- `organization_display_name` - Organization name for display
- `phone` - Phone number
- `created_at` / `updated_at` - Timestamps

### Source-Specific Fields
- **Users**: `organization_id`, `active_status`, `title_position`
- **Activity Contacts**: `activity_id`, `fax`, `notes`, `profile_photo`, `organisation` (text)

## Troubleshooting

### Issue: No activity contacts showing up
**Solution**: Ensure activity_contacts have either an email or first_name populated

### Issue: Search function not found error
**Solution**: The view may have been created but not the function. Run just the function creation part of the SQL

### Issue: Fallback to users-only
**Solution**: This is expected behavior if the unified view doesn't exist. Complete the migration steps above.

## Future Enhancements

1. **Organization Contacts** - When implemented, will automatically appear in Rolodex
2. **Advanced Filtering** - Filter by multiple organizations or activities
3. **Export Functionality** - Export filtered contacts to CSV
4. **Bulk Operations** - Send emails to multiple contacts at once

## Rollback Instructions

If you need to revert to the original users-only Rolodex:

```sql
-- Drop the unified view and function
DROP VIEW IF EXISTS person_unified_view CASCADE;
DROP FUNCTION IF EXISTS search_unified_rolodex;

-- The API will automatically fallback to users-only queries
```

The frontend will continue to work with the fallback behavior built into the API route. 