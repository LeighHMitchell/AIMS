# Debug Guide: Activity Editor Data Persistence Issue

## Issue Description
When saving or publishing activities in the Activity Editor, data appears to save successfully in the UI but:
- Disappears upon page refresh
- Is not persisted in the Supabase database
- Affects activities, transactions, and related data

## Root Cause Analysis

### 1. Frontend State Management
The Activity Editor maintains local state that updates immediately upon save, giving the illusion of success even if the backend save fails.

**Key Code Location:** `frontend/src/app/activities/new/page.tsx`
- Line 658-795: `saveActivity` function
- Updates local state immediately after API response
- Shows success toast even if data isn't properly persisted

### 2. API Route Issues

#### Activities API (`/api/activities/route.ts`)
**Potential Issues:**
1. **UUID Validation Errors** (lines 23-37)
   - `cleanUUIDValue` function may reject valid UUIDs
   - Empty strings converted to null may violate constraints

2. **Transaction Handling** (lines 176-245)
   - Transactions only saved if explicitly provided in request
   - Missing `uuid` field may cause upsert failures
   - Foreign key constraints with `organization_id`

3. **Response Data Transformation** (lines 556-625)
   - API returns transformed data that may not match database state
   - Frontend updates with response data, masking persistence failures

### 3. Database Issues

#### Row Level Security (RLS)
- RLS policies may be blocking inserts/updates silently
- Service role key should bypass RLS, but policies might be misconfigured

#### Foreign Key Constraints
Common constraint violations:
- `partner_id` references non-existent partners
- `created_by_org` references non-existent organizations
- `created_by` / `last_edited_by` references non-existent users

#### Missing Columns
The transactions table may be missing IATI-compliant columns added recently.

## Debugging Steps

### 1. Enable Verbose Logging

Add to `frontend/src/app/api/activities/route.ts`:
```typescript
// At the start of POST handler
console.log('[DEBUG] Full request body:', JSON.stringify(body, null, 2));

// Before Supabase operations
console.log('[DEBUG] Insert/Update data:', JSON.stringify(insertData, null, 2));

// After Supabase operations
console.log('[DEBUG] Supabase response:', response);
console.log('[DEBUG] Supabase error:', error);
```

### 2. Check Browser Console
1. Open Developer Tools → Network tab
2. Save an activity
3. Check the `/api/activities` POST request:
   - Request payload
   - Response status
   - Response body

### 3. Verify Database State
Run in Supabase SQL Editor:
```sql
-- Check latest activities
SELECT id, title, created_at, updated_at 
FROM activities 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('activities', 'transactions');

-- Check for constraint violations in logs
SELECT * FROM pg_stat_activity 
WHERE state = 'active' 
AND query LIKE '%activities%';
```

### 4. Test Data Persistence
Run the test script:
```bash
cd frontend
npm install dotenv
node test-data-persistence.js
```

## Common Fixes

### 1. Fix UUID Handling
In `frontend/src/app/api/activities/route.ts`:
```typescript
function cleanUUIDValue(value: any): string | null {
  if (!value || value === '') return null;
  
  const cleaned = String(value).trim();
  
  // Allow 'local-' prefixed IDs for frontend-generated IDs
  if (cleaned.startsWith('local-')) return null;
  
  // Validate UUID format
  if (!isValidUUID(cleaned)) {
    console.warn(`Invalid UUID: ${cleaned}`);
    return null;
  }
  
  return cleaned;
}
```

### 2. Fix Transaction Persistence
Ensure transactions are always processed:
```typescript
// In POST handler, change condition from:
if (body.transactions !== undefined && Array.isArray(body.transactions))

// To:
if (Array.isArray(body.transactions))
```

### 3. Add Error Boundaries
Wrap Supabase operations in try-catch:
```typescript
try {
  const { data, error } = await getSupabaseAdmin()
    .from('activities')
    .insert([insertData])
    .select()
    .single();
    
  if (error) {
    console.error('[CRITICAL] Supabase error:', error);
    // Return specific error to frontend
    return NextResponse.json(
      { 
        error: 'Database error', 
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    );
  }
} catch (e) {
  console.error('[CRITICAL] Unexpected error:', e);
  throw e;
}
```

### 4. Fix Frontend State Management
In `frontend/src/app/activities/new/page.tsx`:
```typescript
// After successful save, verify data exists
const verifyResponse = await fetch(`/api/activities/${data.id}`);
if (!verifyResponse.ok) {
  throw new Error('Activity saved but verification failed');
}
```

### 5. Database Schema Fixes
Run in Supabase SQL Editor:
```sql
-- Ensure all required columns exist
ALTER TABLE activities 
  ALTER COLUMN partner_id DROP NOT NULL,
  ALTER COLUMN created_by_org DROP NOT NULL;

-- Add missing transaction columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Disable RLS temporarily for testing
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
```

## Monitoring & Prevention

### 1. Add Health Check Endpoint
Create `/api/health/route.ts`:
```typescript
export async function GET() {
  const checks = {
    database: false,
    tables: {
      activities: false,
      transactions: false
    }
  };
  
  try {
    const { error } = await getSupabaseAdmin()
      .from('activities')
      .select('id')
      .limit(1);
    
    checks.database = !error;
    checks.tables.activities = !error;
    
    // Check transactions
    const { error: txError } = await getSupabaseAdmin()
      .from('transactions')
      .select('uuid')
      .limit(1);
    
    checks.tables.transactions = !txError;
  } catch (e) {
    console.error('Health check failed:', e);
  }
  
  return NextResponse.json(checks);
}
```

### 2. Add Client-Side Verification
After save operations:
```typescript
// Reload data from server
const freshData = await fetch(`/api/activities/${savedId}`);
if (!freshData.ok) {
  alert('Save may have failed - please refresh and check your data');
}
```

### 3. Implement Retry Logic
```typescript
async function saveWithRetry(data: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) return await response.json();
      
      const error = await response.json();
      console.error(`Save attempt ${i + 1} failed:`, error);
      
      if (i === retries - 1) throw new Error(error.error);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
}
```

## Emergency Fixes

If data loss is critical:

1. **Enable Supabase Realtime Logs**
   - Go to Supabase Dashboard → Logs → Realtime
   - Filter by table names
   - Check for failed operations

2. **Create Backup Table**
   ```sql
   CREATE TABLE activity_saves_backup (
     id UUID DEFAULT gen_random_uuid(),
     payload JSONB,
     error TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Log All Save Attempts**
   In API route, before any operations:
   ```typescript
   // Log save attempt
   await getSupabaseAdmin()
     .from('activity_saves_backup')
     .insert([{ 
       payload: body,
       error: null 
     }]);
   ```

## Testing Checklist

- [ ] Create new activity → Refresh → Activity persists
- [ ] Update existing activity → Refresh → Changes persist
- [ ] Add transaction → Refresh → Transaction persists
- [ ] Publish activity → Refresh → Status changes persist
- [ ] Add sectors/contacts/locations → Refresh → Data persists
- [ ] Check Supabase dashboard for actual data
- [ ] Monitor browser console for errors
- [ ] Check Network tab for failed requests
- [ ] Verify no 500 errors in API responses

## Contact for Help

If issues persist after trying these fixes:
1. Check Supabase service status
2. Verify environment variables are correct
3. Ensure database migrations have been run
4. Check Supabase connection limits haven't been exceeded 