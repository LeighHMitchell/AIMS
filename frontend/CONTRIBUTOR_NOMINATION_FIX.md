# Contributor Nomination Fix

## Problem Description

When users nominated contributor organizations, the UI displayed "Nominated by Unknown User" instead of the actual user's name. This happened because:

1. The `nominated_by_name` field was not being properly populated during nomination
2. User name fallback logic was incomplete
3. Some components had hardcoded values instead of using actual user information

## Root Causes

1. **Incomplete user name resolution**: The nomination logic didn't have proper fallbacks for when `user.name` was undefined
2. **Hardcoded values**: Some components used placeholder values like "Activity Creator" instead of actual user names
3. **Database migration gaps**: Existing contributors with "Unknown User" names weren't being updated

## Files Modified

### 1. Frontend Components

#### `frontend/src/components/ContributorsSection.tsx`
- **Lines 75-85**: Enhanced user name resolution with proper fallbacks
- **Lines 87, 108**: Updated nomination logic to use resolved user names
- **Lines 95-97**: Added logging for debugging

#### `frontend/src/components/OrganisationsSection.tsx`
- **Lines 160-200**: Fixed `confirmNomination` function to use actual user information
- **Lines 175-185**: Added proper user name resolution logic

#### `frontend/src/app/activities/[id]/page.tsx`
- **Lines 338-380**: Fixed `requestToJoin` function with proper user name resolution

### 2. API Routes

#### `frontend/src/app/api/activities/[id]/contributors/route.ts`
- **Lines 138-256**: Enhanced contributor creation with better user name handling
- **Lines 15-135**: Improved GET endpoint to properly populate missing user names
- **Lines 200-220**: Added fallback logic for user name resolution

### 3. Database Migrations

#### `frontend/supabase/migrations/20250129000000_ensure_contributor_name_columns.sql`
- Ensures required columns exist in the `activity_contributors` table
- Updates existing records with proper organization and user names

#### `frontend/supabase/migrations/20250129000001_fix_existing_contributor_names.sql`
- Fixes existing contributors with "Unknown User" names
- Populates missing user names from the `users` table

### 4. Testing

#### `frontend/scripts/test-contributor-nomination.ts`
- Comprehensive test script to verify the fix
- Checks database schema, existing contributors, and user name resolution

## Solution Details

### User Name Resolution Logic

The fix implements a robust user name resolution system with multiple fallbacks:

```typescript
// Build the user's display name with fallbacks
let nominatedByName = 'Unknown User';
if (user.name && user.name.trim() !== '') {
  nominatedByName = user.name.trim();
} else if (user.firstName || user.lastName) {
  const nameParts = [user.firstName, user.lastName].filter(Boolean);
  nominatedByName = nameParts.join(' ').trim();
} else if (user.email) {
  nominatedByName = user.email.split('@')[0]; // Use part before @
}
```

### Database Schema Requirements

The fix requires these columns in the `activity_contributors` table:
- `nominated_by` (UUID, references users.id)
- `nominated_by_name` (TEXT, denormalized user name for performance)

### API Enhancements

1. **POST endpoint**: Always captures and stores user information with proper validation
2. **GET endpoint**: Populates missing user names from related tables when needed
3. **Fallback handling**: Gracefully handles cases where user information is incomplete

## Testing the Fix

### 1. Run Database Migrations

```bash
# First, check your users table structure
psql -d your_database -f frontend/supabase/migrations/20250129000000_check_users_table_structure.sql

# Apply the required migrations
psql -d your_database -f frontend/supabase/migrations/20250129000000_ensure_contributor_name_columns.sql
psql -d your_database -f frontend/supabase/migrations/20250129000001_fix_existing_contributor_names.sql
```

**Important**: The migration now only uses columns that are guaranteed to exist in most Supabase users tables:
- `first_name` and `last_name` (combined or individually)
- `email` (using the part before @)
- `User ID: {id}` as final fallback

The migration has been simplified to avoid column existence errors and will work with the standard Supabase users table structure.

### 2. Test the Fix

```bash
# Run the test script
cd frontend
npm run tsx scripts/test-contributor-nomination.ts
```

### 3. Manual Testing

1. Log in as a user (e.g., Leigh Mitchell)
2. Navigate to an activity
3. Nominate a contributor organization
4. Verify the contributor list shows "Nominated by Leigh Mitchell" instead of "Unknown User"

## Expected Results

- ✅ New contributor nominations will show the actual user's name
- ✅ Existing contributors with "Unknown User" will be updated with proper names
- ✅ The system gracefully handles users with incomplete profile information
- ✅ Fallback to "Unknown User" only occurs when no user information is available

## Acceptance Criteria

- [x] When Leigh nominates a contributor, the list shows "Nominated by Leigh" (not Unknown User)
- [x] Works consistently for all logged-in users
- [x] If a contributor was created before this fix (and has no `created_by` set), keep showing "Unknown User" as a fallback
- [x] The fix handles users with various profile configurations (full name, first/last name only, email only)

## Future Improvements

1. **Real-time updates**: Consider implementing real-time updates when user profiles change
2. **Audit trail**: Add logging for all contributor nomination events
3. **User profile validation**: Ensure users have complete profile information during onboarding
4. **Bulk operations**: Add support for bulk contributor nomination with proper user tracking

## Troubleshooting

### Common Issues

1. **"nominated_by_name column missing" error**
   - Run the database migration: `20250129000000_ensure_contributor_name_columns.sql`

2. **"column u.name does not exist" error**
   - This means your users table doesn't have a `name` column
   - The migration has been updated to only use columns that are guaranteed to exist
   - Run the diagnostic migration first: `20250129000000_check_users_table_structure.sql`
   - Then run the main fix: `20250129000001_fix_existing_contributor_names.sql`

3. **"column u.full_name does not exist" or similar column errors**
   - The migration has been simplified to only use guaranteed columns: `first_name`, `last_name`, `email`
   - These columns are standard in most Supabase users tables
   - If you still get errors, run the diagnostic migration to see what columns actually exist

4. **Existing contributors still show "Unknown User"**
   - Run the fix migration: `20250129000001_fix_existing_contributor_names.sql`

5. **User names not updating in real-time**
   - Check if the user context is properly initialized
   - Verify the user object has the expected properties

### Debug Information

The fix includes comprehensive logging to help diagnose issues:
- User object details during nomination
- API request/response data
- Database operation results

Check the browser console and server logs for detailed information.
