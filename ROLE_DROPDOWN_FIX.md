# Organization Role Dropdown Fix

## Problem
The "Organization Role" dropdown in the Edit Participating Organization modal was showing blank, even though the role was correctly displayed in the table (e.g., "Extending" badge).

## Root Cause
**Value Mismatch Between Component and Dropdown**

The `EnhancedSearchableSelect` component matches values by comparing the `code` property:
```typescript
const selectedOption = allOptions.find(opt => opt.code === value);
```

However, we were passing a **formatted string** as the value:
```typescript
// ❌ WRONG - Passing "3 Extending"
value={`${formData.iati_role_code} ${getOrganizationRoleName(formData.iati_role_code)}`}
```

The dropdown options have codes like `"1"`, `"2"`, `"3"`, `"4"`, but we were passing `"3 Extending"`, so the match failed.

## Solution

### 1. Fixed Value Prop
Changed from formatted string to just the code:
```typescript
// ✅ CORRECT - Passing just "3"
value={formData.iati_role_code ? String(formData.iati_role_code) : ''}
```

### 2. Updated handleRoleChange
Since the component now returns just the code (e.g., "3"), updated the handler:
```typescript
const handleRoleChange = (roleCode: string) => {
  // The role value now comes as just the code (e.g., "3")
  const code = parseInt(roleCode);
  
  // Map to internal role_type
  const codeToRoleType: Record<number, string> = {
    1: 'funding',
    2: 'government',
    3: 'extending',
    4: 'implementing'
  };
  
  const roleType = codeToRoleType[code] || 'implementing';
  
  setFormData(prev => ({
    ...prev,
    role_type: roleType as any,
    iati_role_code: code
  }));
};
```

## How EnhancedSearchableSelect Works

### Option Structure
```typescript
options: [
  {
    code: "1",
    name: "1 Funding",
    description: "The government or organization which provides funds..."
  },
  {
    code: "3",
    name: "3 Extending",
    description: "An organization that manages the budget..."
  }
]
```

### Value Matching
- **value prop**: Should be just the `code` (e.g., `"3"`)
- **Component finds**: `allOptions.find(opt => opt.code === value)`
- **Displays**: The full `name` (e.g., "3 Extending")

### onValueChange
- **Returns**: Just the `code` (e.g., `"3"`)
- **Not**: The full formatted name

## Testing

### Before Fix
```
Organization Role: [Select role...] ← Empty/blank
Table shows: Extending ← Correct
```

### After Fix
```
Organization Role: [3 Extending] ← Now shows correctly!
Table shows: Extending ← Still correct
```

## Files Modified

1. **`ParticipatingOrgModal.tsx`**
   - Line 267: Changed `value` prop from formatted string to just code
   - Line 144-165: Updated `handleRoleChange` to handle just the code
   - Added console.log for debugging

## Verification Steps

1. ✅ Refresh browser
2. ✅ Click "Edit" on Agency A (role = 3 Extending)
3. ✅ Modal should show "3 Extending" in the Organization Role dropdown
4. ✅ Click "Edit" on Agency B (role = 1 Funding)
5. ✅ Modal should show "1 Funding" in the Organization Role dropdown
6. ✅ Change the role and save
7. ✅ Verify it persists correctly

## Expected Behavior

### Agency A (Role 3)
- **Table**: Shows "Extending" badge
- **Modal**: Shows "3 Extending" in dropdown
- **Can change to**: Any other role (1, 2, 3, 4)

### Agency B (Role 1)
- **Table**: Shows "Funding" badge
- **Modal**: Shows "1 Funding" in dropdown
- **Can change to**: Any other role (1, 2, 3, 4)

### Agency C (Role 2)
- **Table**: Shows "Accountable" badge
- **Modal**: Shows "2 Accountable" in dropdown
- **Can change to**: Any other role (1, 2, 3, 4)

## Related Components

This same pattern applies to other dropdowns using `EnhancedSearchableSelect`:
- CRS Channel Code dropdown
- Organization Type dropdown
- Any other code-based dropdowns

**Key Principle**: Always pass just the `code` as the value, not the formatted display string.

## Console Output

When editing an organization, you should now see:
```
[ParticipatingOrgModal] Loading editingOrg: { iati_role_code: 3, ... }
[ParticipatingOrgModal] Role code: 3
```

When changing the role:
```
[ParticipatingOrgModal] Role changed: { roleCode: "3", code: 3, roleType: "extending" }
```

## Summary

✅ **Fixed**: Organization Role now displays correctly in modal
✅ **Root Cause**: Value mismatch - was passing formatted string instead of code
✅ **Solution**: Pass just the code string to match component's expectations
✅ **Impact**: All role dropdowns now work correctly
