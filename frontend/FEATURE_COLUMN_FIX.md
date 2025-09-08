# Fix for Feedback Feature Column

## Problem
The "Which feature/functionality is this about?" field in the feedback modal is not being saved to the database and showing as "Not specified" in the Admin > Feedback panel.

## Solution

### Step 1: Run the SQL Migration
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the following SQL:

```sql
-- Add the feature column to the feedback table
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS feature TEXT;

-- Add a description for the column
COMMENT ON COLUMN feedback.feature IS 'App feature/functionality this feedback relates to';
```

4. Click "Run" to execute the SQL

### Step 2: Verify the Migration
After running the migration, verify it worked by running this query:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'feedback' 
AND column_name = 'feature';
```

You should see the feature column listed.

### Step 3: Code Changes Already Applied
The following code changes have already been made to support the feature column:

1. **API Route (`/src/app/api/feedback/route.ts`)**:
   - Updated to always include the `feature` field when saving feedback
   - Removed conditional checks for column existence
   - The feature field is now saved as: `feature: feature?.trim() || null`

2. **Feedback Modal (`/src/components/ui/feedback-modal.tsx`)**:
   - Already sends the feature field correctly in line 174: `feature: selectedFeature || null`

3. **Admin Panel (`/src/components/admin/FeedbackManagement.tsx`)**:
   - Already displays the feature in lines 623-636
   - Shows "Not specified" when feature is null (line 634)

## Testing

### To Test the Fix:
1. Open the application and trigger the feedback modal
2. Fill in the form including selecting a feature from "Which feature/functionality is this about?"
3. Submit the feedback
4. Go to Admin > Feedback panel
5. You should now see the selected feature displayed in the Feature column instead of "Not specified"

## What Was Changed

### Database:
- Added `feature TEXT` column to the `feedback` table

### Backend API:
- Modified `/api/feedback` POST endpoint to always include the feature field
- Removed conditional logic that was checking for column existence

### Result:
- Feature selections are now properly saved to the database
- The Admin panel correctly displays the selected feature
- No more "Not specified" for feedbacks where a feature was selected

## Alternative Method (If SQL Editor is Not Available)

If you cannot access the SQL Editor directly, you can run the migration programmatically:

1. The migration has been added to `/api/admin/run-migration/route.ts`
2. With the server running, execute:
```bash
curl -X POST http://localhost:3000/api/admin/run-migration \
  -H "Content-Type: application/json" \
  -d '{"secret": "run-migration-2025"}'
```

This will run all pending migrations including the feature column addition.