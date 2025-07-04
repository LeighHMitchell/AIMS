# Troubleshooting Supabase Default Fields Integration

## Common Issues and Solutions

### 1. "Not working" - Debug Steps

**A. Check if the test component appears:**
1. Go to http://localhost:3000
2. Navigate to Activities → Open an existing activity
3. Click on "Finances" tab
4. Click on "Defaults" sub-tab
5. **Do you see a blue box titled "🧪 Supabase Integration Test"?**

**If NO test component appears:**
- The component might not be importing correctly
- Try refreshing the page (Ctrl+F5)
- Check browser console for errors (F12)

**B. Check browser console errors:**
Press F12 and look for:
- Red error messages
- Missing module errors
- Supabase connection errors

### 2. Quick Fixes

**Fix 1: Remove TypeScript errors temporarily**
The TypeScript errors won't prevent the app from running. The test components should still work.

**Fix 2: Check if Supabase client is initialized**
Add this debug code to any page to test Supabase connection:

```javascript
// Add to any component temporarily
useEffect(() => {
  console.log('Supabase client:', supabase);
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
}, []);
```

**Fix 3: Test with a simple direct update**
Try adding this simple test button to any activity page:

```typescript
import { supabase } from '@/lib/supabase';

// In your component
<button onClick={async () => {
  if (!supabase) {
    alert('Supabase client not initialized!');
    return;
  }
  
  const { data, error } = await supabase
    .from('activities')
    .select('id, title_narrative')
    .limit(1);
    
  if (error) {
    console.error('Supabase error:', error);
    alert('Supabase error: ' + error.message);
  } else {
    console.log('Supabase data:', data);
    alert('Supabase connected! Found ' + data.length + ' activities');
  }
}}>
  Test Supabase Connection
</button>
```

### 3. Specific Error Messages

**"Module not found: Can't resolve '@/components/forms/SupabaseFieldsTest'"**
- File might not have saved correctly
- Check if file exists at: `/frontend/src/components/forms/SupabaseFieldsTest.tsx`

**"Cannot read properties of null (reading 'from')"**
- Supabase client is not initialized
- Check environment variables are set
- Verify `.env.local` file exists with:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY

**"permission denied for table activities"**
- RLS policies need to be updated
- User might not be authenticated
- Check Supabase dashboard RLS policies

### 4. What to Tell Me

Please provide:
1. **What page are you on?** (URL)
2. **What do you see?** (screenshot or description)
3. **Browser console errors** (F12 → Console tab)
4. **Network tab errors** (F12 → Network tab)
5. **What happens when you click buttons?**

### 5. Alternative Quick Test

If the test component isn't showing, let's try a minimal test:

1. **Add this to the top of FinancesSection.tsx after the imports:**

```typescript
// Temporary test - remove after testing
if (typeof window !== 'undefined') {
  console.log('🔍 FinancesSection Debug:');
  console.log('- activityId:', activityId);
  console.log('- Supabase exists:', !!supabase);
  console.log('- Hooks imported:', {
    useSupabaseFieldUpdate: typeof useSupabaseFieldUpdate,
    useActivityDefaults: typeof useActivityDefaults
  });
}
```

2. **Check console for these debug messages**

Let me know what specific error or issue you're seeing!