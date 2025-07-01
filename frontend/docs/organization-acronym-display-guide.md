# Organization Acronym Display Guide

## Overview
The AIMS system now displays organization acronyms (short names) instead of full organization names in the "Created By" fields throughout the application.

## Implementation Details

### Database Schema
The organizations table contains:
- `name`: Full organization name (e.g., "Save the Children International")
- `acronym`: Organization acronym/short name (e.g., "SCI")
- `short_name`: Alternative field for acronym (used in some parts of the system)

The activities table contains:
- `created_by_org`: UUID reference to organizations.id

### Frontend Display Logic
The system prioritizes displaying organization information in this order:
1. `acronym` field (if available)
2. `short_name` field (if acronym is not available)
3. `name` field (fallback if no acronym/short_name exists)

### Affected Components
1. **Activities List Page** (`/activities`):
   - Table view: Shows acronym in the "Created by" column
   - Card view: Shows acronym in the card footer

2. **Activity Detail Page** (`/activities/[id]`):
   - Shows acronym in the "Created by" field under "Participating Organizations"

## Running Test Queries

To verify that organizations are properly linked in your Supabase database:

1. **Open Supabase SQL Editor**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Open the file: `frontend/sql/test_organization_integrity.sql`

2. **Run Test Query 1** - Check for orphaned references:
   ```sql
   SELECT DISTINCT a.created_by_org, a.id AS activity_id, a.title
   FROM activities a
   LEFT JOIN organizations o ON a.created_by_org = o.id
   WHERE a.created_by_org IS NOT NULL 
     AND o.id IS NULL
   ORDER BY a.created_at DESC;
   ```
   - **Expected Result**: No rows returned
   - **If rows are returned**: These activities reference non-existent organizations

3. **Run Test Query 2** - Verify acronym display:
   ```sql
   SELECT 
     a.id,
     a.title,
     o.acronym AS created_by_acronym,
     o.name AS created_by_full_name,
     a.created_at
   FROM activities a
   JOIN organizations o ON a.created_by_org = o.id
   LIMIT 20;
   ```
   - **Expected Result**: Activities with their creator organization acronyms
   - **Check**: Acronym field should be populated for most organizations

4. **Run Test Query 4** - Find organizations without acronyms:
   ```sql
   SELECT id, name, acronym
   FROM organizations
   WHERE acronym IS NULL OR acronym = ''
   ORDER BY name;
   ```
   - **Action Required**: Add acronyms for these organizations to ensure proper display

## Troubleshooting

### Issue: "Unknown" displayed instead of organization acronym
**Causes**:
1. Activity's `created_by_org` is NULL
2. Referenced organization doesn't exist
3. Organization exists but has no acronym

**Solution**:
1. Run Test Query 1 to find orphaned references
2. Run Test Query 4 to find organizations without acronyms
3. Update organizations to add missing acronyms

### Issue: Full name displayed instead of acronym
**Cause**: Organization has no acronym or short_name field populated

**Solution**: Update the organization record to add an acronym:
```sql
UPDATE organizations 
SET acronym = 'YOUR_ACRONYM' 
WHERE id = 'organization-uuid';
```

## Best Practices

1. **Always populate acronyms** when creating new organizations
2. **Use standard acronyms** that are widely recognized
3. **Keep acronyms short** (typically 2-10 characters)
4. **Make acronyms unique** to avoid confusion

## Migration Script

If you need to populate missing acronyms based on organization names:
```sql
-- Example: Extract initials from organization names
UPDATE organizations 
SET acronym = 
  CASE 
    WHEN name LIKE '%Save the Children%' THEN 'SCI'
    WHEN name LIKE '%World Bank%' THEN 'WB'
    WHEN name LIKE '%United Nations%' THEN 'UN'
    -- Add more mappings as needed
    ELSE UPPER(LEFT(name, 5)) -- Default: first 5 characters
  END
WHERE acronym IS NULL OR acronym = '';
``` 