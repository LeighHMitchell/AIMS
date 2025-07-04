# SupabaseDropdown Integration Guide

## Overview
The `SupabaseDropdown` component is a reusable dropdown that automatically syncs with Supabase on every change. This ensures that dropdown selections are immediately persisted to the database without requiring a separate save action.

## Features
- ✅ Automatic Supabase sync on every change
- ✅ Optimistic UI updates with rollback on error
- ✅ RLS (Row Level Security) error handling
- ✅ Loading and updating states
- ✅ Toast notifications for success/error
- ✅ TypeScript support
- ✅ Tailwind + ShadCN styling

## Basic Usage

```tsx
import { SupabaseDropdown } from "@/components/forms/SupabaseDropdown";

// Basic example
<SupabaseDropdown
  table="activities"
  column="default_currency"
  rowId="activity-id-123"
  options={[
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" }
  ]}
  label="Default Currency"
  tooltip="The default currency for all monetary values"
  placeholder="Select a currency"
/>
```

## Activity-Specific Usage

For activities, use the `ActivitySupabaseDropdown` helper:

```tsx
import { ActivitySupabaseDropdown } from "@/components/forms/SupabaseDropdown";

<ActivitySupabaseDropdown
  activityId="activity-id-123"
  column="default_aid_type"
  options={aidTypeOptions}
  label="Default Aid Type"
  tooltip="The default type of aid for transactions"
  placeholder="Select default aid type"
/>
```

## Props

### SupabaseDropdown Props
- `table` (string, required): The Supabase table name
- `column` (string, required): The column to update
- `rowId` (string, required): The ID of the row to update
- `options` (DropdownOption[], required): Array of {label, value} objects
- `label` (string, optional): Field label
- `tooltip` (string, optional): Tooltip text shown next to label
- `disabled` (boolean, optional): Disable the dropdown
- `placeholder` (string, optional): Placeholder text
- `className` (string, optional): Additional CSS classes
- `onValueChange` (function, optional): Callback when value changes
- `supabaseUrl` (string, optional): Override default Supabase URL
- `supabaseAnonKey` (string, optional): Override default anon key

### ActivitySupabaseDropdown Props
Same as SupabaseDropdown but:
- Replace `table` and `rowId` with `activityId`
- Automatically sets `table="activities"`

## Migration from Existing Dropdowns

### Before (Manual Save Required)
```tsx
<DefaultAidTypeSelect
  value={defaultAidType}
  onValueChange={(value) => onDefaultsChange("defaultAidType", value)}
  placeholder="Select default aid type"
/>
// User must click Save button to persist
```

### After (Auto-Save)
```tsx
<ActivitySupabaseDropdown
  activityId={activityId}
  column="default_aid_type"
  options={aidTypeOptions}
  label="Default Aid Type"
  placeholder="Select default aid type"
/>
// Saves automatically on change
```

## Error Handling

The component handles various error scenarios:

1. **RLS Errors**: Shows "You don't have permission to update this field"
2. **Network Errors**: Shows generic error message and reverts selection
3. **Loading Errors**: Shows error state and allows retry

## Best Practices

1. **Use TypeScript**: Define your options with proper types
```tsx
const currencyOptions: DropdownOption[] = [
  { value: "USD", label: "USD - US Dollar" },
  // ...
];
```

2. **Provide Clear Labels**: Always include label and tooltip for better UX
```tsx
label="Default Currency"
tooltip="This currency will be used for all new transactions"
```

3. **Handle Loading States**: The component shows "Loading..." but you can disable parent forms during initial load
```tsx
const [isLoading, setIsLoading] = useState(true);
// Disable form while initial data loads
```

4. **Group Related Dropdowns**: Use grid layouts for better organization
```tsx
<div className="grid gap-4 md:grid-cols-2">
  <ActivitySupabaseDropdown ... />
  <ActivitySupabaseDropdown ... />
</div>
```

## Complete Example

See `frontend/src/components/forms/SupabaseDropdownExample.tsx` for a complete implementation example with all activity default fields.

## Troubleshooting

### Dropdown not saving
1. Check browser console for errors
2. Verify RLS policies allow updates
3. Ensure correct column name matches database

### Values not loading
1. Verify the rowId exists in the table
2. Check if user has SELECT permissions
3. Ensure Supabase environment variables are set

### Multiple dropdowns interfering
The component handles its own state, so multiple instances work independently. Each dropdown maintains its own loading/error state. 