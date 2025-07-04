# Integration Steps for Supabase Default Fields

## Step 1: Database Migration (Run this SQL first)

**In Supabase SQL Editor, run:**
```sql
-- See frontend/supabase/migrations/20250703_add_missing_default_fields.sql
-- This adds the missing default field columns
```

## Step 2: Verify Database Schema

After running the migration, check your activities table has these columns:
- `default_aid_type` (varchar)
- `default_finance_type` (varchar) 
- `default_flow_type` (varchar)
- `default_currency` (varchar)
- `default_tied_status` (varchar)

## Step 3: Add React Files to Project

The following files are React/TypeScript components that should be copied to your frontend:

### Core Hooks (Required)
- ✅ `frontend/src/hooks/use-supabase-field-update.ts` 
- ✅ `frontend/src/hooks/use-activity-defaults.ts`

### Enhanced Components (Choose one approach)
- ✅ `frontend/src/components/forms/SupabaseSelect.tsx`
- ✅ `frontend/src/components/forms/DefaultFieldsSection.tsx` 

### Integration Examples (Reference)
- ✅ `frontend/src/components/activities/EnhancedFinancesSection.tsx`
- ✅ `frontend/src/components/activities/ActivityEditorSupabasePatch.tsx`

## Step 4: Quick Test Implementation

Add this simple test to your existing activity editor to verify it works:

```typescript
// Add to your activity editor imports
import { useSupabaseFieldUpdate } from '@/hooks/use-supabase-field-update';

// Add this test component in your activity editor
function DefaultFieldsTest({ activityId }: { activityId: string }) {
  const { updateField, state } = useSupabaseFieldUpdate(activityId, {
    tableName: 'activities'
  });

  const testUpdate = async () => {
    console.log('Testing Supabase field update...');
    const success = await updateField('default_currency', 'USD');
    console.log('Update result:', success);
  };

  return (
    <div className="p-4 border rounded">
      <h4>Supabase Test</h4>
      <button onClick={testUpdate} className="bg-blue-500 text-white px-4 py-2 rounded">
        Test Update default_currency to USD
      </button>
      <div className="mt-2 text-sm">
        Status: {state.isUpdating ? 'Updating...' : state.error ? 'Error' : 'Ready'}
        {state.error && <div className="text-red-500">Error: {state.error}</div>}
        {state.lastUpdated && <div className="text-green-500">Last updated: {state.lastUpdated.toLocaleTimeString()}</div>}
      </div>
    </div>
  );
}
```

## Step 5: Integration Options

### Option A: Quick Fix (Replace individual selects)
Replace your existing default field selects one by one:

```typescript
// Before
<CurrencySelector
  value={general.defaultCurrency}
  onValueChange={(value) => {
    setGeneral(g => ({ ...g, defaultCurrency: value }));
    triggerAutoSave();
  }}
/>

// After  
<SupabaseCurrencySelector
  activityId={general.id}
  fieldName="default_currency"
  value={general.defaultCurrency}
  onUpdateSuccess={(field, value) => {
    setGeneral(g => ({ ...g, defaultCurrency: value }));
  }}
/>
```

### Option B: Complete Section (Replace entire defaults section)
```typescript
<DefaultFieldsSection
  activityId={general.id}
  initialValues={{
    default_currency: general.defaultCurrency,
    default_aid_type: general.defaultAidType,
    // ... other defaults
  }}
  onFieldUpdate={(field, value) => {
    // Update local state to keep UI in sync
    const localField = field.replace('default_', 'default');
    setGeneral(g => ({ ...g, [localField]: value }));
  }}
/>
```

## Step 6: Test the Integration

1. **Open your activity editor**
2. **Add the test component above**
3. **Click the test button**
4. **Check browser console for logs**
5. **Verify in Supabase dashboard that the field updated**

## Troubleshooting

### If you get "Module not found" errors:
- Ensure all the hook files are in the correct `/src/hooks/` directory
- Check import paths match your project structure

### If you get "supabase is null" errors:
- Verify your Supabase environment variables are set
- Check the Supabase client is properly configured

### If database updates fail:
- Verify the migration SQL ran successfully
- Check RLS policies allow updates to the activities table
- Ensure the user has permission to update activities

## Files Status

- ✅ Database migration SQL created
- ✅ Core hooks implemented  
- ✅ Enhanced components ready
- ✅ Integration examples provided
- ✅ Test implementation ready

**Next:** Run the SQL migration, then add the React hooks to your project!