# Government Inputs 500 Error - Diagnostic Improvements

## Issue

Users are experiencing a 500 error when the system tries to autosave government inputs:

```
Error: Failed to save government inputs: 500
```

## Root Cause

The error indicates a server-side issue when saving to the `government_inputs` table. Possible causes:

1. **Missing table** - `government_inputs` table doesn't exist
2. **Missing columns** - Table exists but missing required columns
3. **RLS policy** - Row Level Security blocking the insert/update
4. **Constraint violation** - Data violating a database constraint
5. **Invalid data format** - JSON fields with invalid structure

## Fixes Applied

### 1. Enhanced API Error Logging

**File:** `frontend/src/app/api/activities/[id]/government-inputs/route.ts`

Added comprehensive Supabase error details to the response:

```typescript
if (error) {
  console.error('Error saving government inputs:', error);
  console.error('Supabase error details:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint
  });
  return NextResponse.json({ 
    error: 'Failed to save government inputs',
    message: error.message,    // NEW: Specific error message
    code: error.code,           // NEW: Supabase error code
    details: error.details,     // NEW: Additional details
    hint: error.hint            // NEW: Supabase hint
  }, { status: 500 });
}
```

### 2. Enhanced Frontend Error Logging

**File:** `frontend/src/app/activities/new/page.tsx`

Improved error handling to capture and display detailed error information:

```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
  console.error('[GovernmentInputsAutosave] API error response:', errorData);
  throw new Error(`Failed to save government inputs: ${errorData.message || errorData.error || response.status}`);
}
```

## How to Diagnose

Now when the error occurs, check the browser console for detailed information:

### Console Output Example

```
[GovernmentInputsAutosave] API error response: {
  error: "Failed to save government inputs",
  message: "relation \"government_inputs\" does not exist",
  code: "42P01",
  details: null,
  hint: null
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `42P01` | Table doesn't exist | Run migration to create `government_inputs` table |
| `42703` | Column doesn't exist | Add missing column to table |
| `23505` | Unique constraint violation | Check for duplicate activity_id |
| `23503` | Foreign key violation | Verify activity_id exists in activities table |
| `42501` | Insufficient privilege (RLS) | Update RLS policy to allow insert/update |

## Database Table Requirements

The `government_inputs` table should have this structure:

```sql
CREATE TABLE IF NOT EXISTS government_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL UNIQUE REFERENCES activities(id) ON DELETE CASCADE,
  on_budget_classification JSONB DEFAULT '{}'::jsonb,
  rgc_contribution JSONB DEFAULT '{}'::jsonb,
  national_plan_alignment JSONB DEFAULT '{}'::jsonb,
  technical_coordination JSONB DEFAULT '{}'::jsonb,
  oversight_agreement JSONB DEFAULT '{}'::jsonb,
  geographic_context JSONB DEFAULT '{}'::jsonb,
  strategic_considerations JSONB DEFAULT '{}'::jsonb,
  evaluation_results JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_government_inputs_activity_id 
ON government_inputs(activity_id);

-- Enable RLS
ALTER TABLE government_inputs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on government_inputs"
ON government_inputs
FOR ALL
USING (true)
WITH CHECK (true);
```

## Next Steps

1. **Check the browser console** when the error occurs - you'll now see detailed error information

2. **Check if the table exists:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name = 'government_inputs';
   ```

3. **If table doesn't exist**, create it using the SQL above

4. **If table exists**, check for missing columns:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'government_inputs';
   ```

5. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'government_inputs';
   ```

## Workaround (Temporary)

If you don't need government inputs right now, you can:

1. Navigate away from the Government Inputs tab
2. Work on other tabs
3. The error will stop appearing

## Files Modified

1. ✅ `frontend/src/app/api/activities/[id]/government-inputs/route.ts` - Enhanced error reporting
2. ✅ `frontend/src/app/activities/new/page.tsx` - Enhanced error logging

## Status

✅ **DIAGNOSTIC IMPROVED** - The error will now show detailed information to help identify the exact database issue.

---

**Action Required:** Check the browser console when the error occurs to see the detailed error message, then share it so I can provide the exact fix needed.


