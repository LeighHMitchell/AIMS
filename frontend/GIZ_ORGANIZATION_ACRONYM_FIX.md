# GIZ Organization Acronym Display Fix

## Problem
The user reported that the organization acronym "GIZ" was not displaying in the header dropdown. They were seeing "Deutsche Gesellschaft für Internationale Zusammenarbeit" without the expected "(GIZ)" suffix.

## Root Cause Analysis

After investigating the complete data flow, I found several issues:

### 1. Database Structure ✅ CORRECT
- The `organizations` table has both `name` and `acronym` fields
- The `acronym` field exists and is properly structured

### 2. Data Flow ✅ CORRECT
- Login API (`/api/auth/login`) correctly fetches organization data with `select('*')`
- User object includes both `organisation` (legacy string) and `organization` (full object)
- TopNav component correctly displays: `{user.organization?.name} {user.organization?.acronym ? ' (${acronym})' : ''}`

### 3. Database Data ❌ INCONSISTENT
**The main issue was inconsistent migrations:**

- **Migration 1** (`20250110000000_update_development_partners.sql`): Expected GIZ with name `'Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ)'` (includes acronym in name)
- **Migration 2** (`20250607120000_add_giz_organization.sql`): Originally created GIZ with name including acronym, but should be separate

## Solution

### Fixed Files
1. **`/Users/leighmitchell/aims_project/frontend/supabase/migrations/20250607120000_add_giz_organization.sql`**
   - Changed name from `'Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ)'`
   - To: `'Deutsche Gesellschaft für Internationale Zusammenarbeit'` (without acronym)
   - Acronym remains: `'GIZ'`

2. **`/Users/leighmitchell/aims_project/frontend/supabase/migrations/20250110000000_update_development_partners.sql`**
   - Changed exact match to flexible match using `ILIKE '%Deutsche Gesellschaft für Internationale Zusammenarbeit%'`

### Created Fix Script
3. **`/Users/leighmitchell/aims_project/frontend/fix_giz_organization_name.sql`**
   - Updates existing GIZ organization in the database
   - Separates name and acronym correctly
   - Includes verification queries

## Expected Result
After applying the fixes, the TopNav should display:
```
"Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ)"
```

## Data Structure
```javascript
// Correct organization object structure
{
  id: "uuid",
  name: "Deutsche Gesellschaft für Internationale Zusammenarbeit",  // NO acronym
  acronym: "GIZ",                                                   // Separate field
  code: "XM-DAC-41126"
}
```

## Implementation Steps
1. ✅ Fixed migration files to ensure consistent data structure
2. ✅ Created SQL fix script to correct existing data
3. ✅ Verified TopNav component logic is correct
4. ✅ Verified login API fetches all organization fields

## Testing
Run the test script: `/Users/leighmitchell/aims_project/frontend/test_giz_organization_display.js`

## Files Modified
- `/Users/leighmitchell/aims_project/frontend/supabase/migrations/20250607120000_add_giz_organization.sql`
- `/Users/leighmitchell/aims_project/frontend/supabase/migrations/20250110000000_update_development_partners.sql`

## Files Created
- `/Users/leighmitchell/aims_project/frontend/fix_giz_organization_name.sql`
- `/Users/leighmitchell/aims_project/frontend/test_giz_organization_display.js`
- `/Users/leighmitchell/aims_project/frontend/GIZ_ORGANIZATION_ACRONYM_FIX.md`

## Next Steps
1. Apply the SQL fix script to the database: `fix_giz_organization_name.sql`
2. Test with a GIZ user account to verify the display
3. The acronym should now appear as "(GIZ)" after the organization name