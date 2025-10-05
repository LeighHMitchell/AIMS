# Participating Organizations Modal Bug Fix

## Issue

When trying to add a participating organization, the modal was throwing an error:

```
TypeError: undefined is not an object (evaluating 'groups.flatMap')
```

## Root Cause

The `EnhancedSearchableSelect` component expects data in a **grouped format** with a `groups` prop that is an array of group objects. Each group has a `label` and an array of `options`.

However, in the `ParticipatingOrgModal.tsx`, I was incorrectly passing an `options` prop directly instead of wrapping it in the required `groups` structure.

## Expected Format

```typescript
interface EnhancedSearchableSelectProps {
  groups: EnhancedSelectGroup[];  // Array of groups
  value?: string;
  onValueChange: (value: string) => void;
  // ... other props
}

interface EnhancedSelectGroup {
  label: string;
  options: EnhancedSelectOption[];
}

interface EnhancedSelectOption {
  code: string;
  name: string;
  description?: string;
}
```

## Fix Applied

### Before (Incorrect)

```typescript
<EnhancedSearchableSelect
  options={IATI_ORGANIZATION_ROLES.map(r => ({
    code: r.name.toLowerCase(),
    name: r.name,
    description: r.description
  }))}
  value={formData.role_type || ''}
  onValueChange={handleRoleChange}
  placeholder="Select role..."
  searchPlaceholder="Search roles..."
/>
```

### After (Correct)

```typescript
<EnhancedSearchableSelect
  groups={[{
    label: "Organization Roles",
    options: IATI_ORGANIZATION_ROLES.map(r => ({
      code: r.name.toLowerCase(),
      name: r.name,
      description: r.description
    }))
  }]}
  value={formData.role_type || ''}
  onValueChange={handleRoleChange}
  placeholder="Select role..."
  searchPlaceholder="Search roles..."
/>
```

## Changes Made

### File: `frontend/src/components/modals/ParticipatingOrgModal.tsx`

1. **Organization Role Select** - Wrapped options in a group:
   ```typescript
   groups={[{
     label: "Organization Roles",
     options: IATI_ORGANIZATION_ROLES.map(...)
   }]}
   ```

2. **Organization Type Select** - Wrapped options in a group:
   ```typescript
   groups={[{
     label: "Organization Types",
     options: getOrganizationTypeOptions()
   }]}
   ```

3. **Removed unused import** - Cleaned up `IATI_ORGANIZATION_TYPES` import since we only use the helper function

## Testing

After this fix:
1. ✅ Modal opens without errors
2. ✅ Role dropdown displays all 4 IATI roles
3. ✅ Type dropdown displays all 15 organization types
4. ✅ Searching works correctly
5. ✅ Selection works correctly
6. ✅ No linting errors

## Prevention

For future reference, when using `EnhancedSearchableSelect`:
- Always use the `groups` prop (not `options`)
- Wrap options in an array with at least one group object
- Each group must have a `label` (string) and `options` (array)

## Status

✅ **FIXED** - Modal now works correctly without errors.


