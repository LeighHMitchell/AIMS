# Dropdown Outside Click Implementation

## Overview
This document explains how dropdown outside-click behavior is implemented across the AIMS project, ensuring all dropdowns automatically close when users click outside of them.

## Problem
Users were experiencing issues where dropdowns in modals would not close when clicking outside, requiring an additional click on the dropdown trigger to close them.

## Solution

### 1. Z-Index Fix for Radix UI Dropdowns in Modals
When using Radix UI Select components inside modals, portal rendering can cause z-index conflicts. We've addressed this by adding a high z-index to all dropdown content:

```tsx
<SelectContent className="z-[9999]">
  {/* Select items */}
</SelectContent>
```

### 2. Custom useOutsideClick Hook
Created a reusable hook in `/hooks/useOutsideClick.ts` that:
- Detects clicks outside of the referenced element
- Handles Escape key press
- Can be enabled/disabled with an `isActive` parameter

```tsx
export function useOutsideClick<T extends HTMLElement = HTMLDivElement>(
  callback: () => void,
  isActive: boolean = true
): RefObject<T>
```

### 3. SearchableSelect Component
The custom `SearchableSelect` component includes built-in outside click detection:
- Uses the `useOutsideClick` hook
- Automatically closes on outside click or Escape key
- Provides search/filter functionality

### 4. Components Updated

#### TransactionModal
- All Select components have `z-[9999]` on SelectContent
- SearchableSelect used for: Aid Type, Flow Type, Finance Type, Tied Status, Disbursement Channel
- CurrencyCombobox has `z-[9999]` on PopoverContent

#### TransactionsManager
- Filter Select components have `z-[9999]` on SelectContent

## Usage Examples

### Standard Select with Z-Index Fix
```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent className="z-[9999]">
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Using SearchableSelect
```tsx
<SearchableSelect
  options={[
    { value: '1', label: 'Option 1', description: 'Description' }
  ]}
  value={selectedValue}
  onValueChange={setSelectedValue}
  placeholder="Select option"
/>
```

### Using useOutsideClick Hook
```tsx
const MyDropdown = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useOutsideClick(() => setOpen(false), open);

  return (
    <div ref={dropdownRef}>
      {/* Dropdown content */}
    </div>
  );
};
```

## Best Practices

1. **Always use high z-index for dropdown content in modals**: Add `className="z-[9999]"` to SelectContent, PopoverContent, etc.

2. **Use SearchableSelect for complex dropdowns**: When you need search functionality and consistent outside-click behavior.

3. **Test in modal context**: Always test dropdown behavior inside modals to ensure proper z-index stacking.

4. **Consistent behavior**: All dropdowns should close on:
   - Click outside
   - Escape key press
   - Selection of an item

## Troubleshooting

If a dropdown is not closing properly:
1. Check if it's inside a modal/dialog
2. Ensure SelectContent/PopoverContent has `z-[9999]` class
3. Verify no event propagation is being stopped
4. Check for conflicting z-index values in parent components 