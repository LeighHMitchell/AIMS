# EnhancedSearchableSelect Component

A reusable, best-practice dropdown component with search functionality, grouping, and rich option rendering.

## Features

✅ **Searchable** - Filter options by code, name, or description  
✅ **Grouped Options** - Organize options under category headers  
✅ **Rich Display** - Code badges, bold names, and descriptions  
✅ **Clear Selection** - Easy-to-use clear buttons for both selection and search  
✅ **Keyboard Navigation** - Full keyboard support including Escape key  
✅ **Outside Click** - Closes when clicking outside the dropdown  
✅ **Accessibility** - Proper ARIA labels and focus management  
✅ **Mobile Friendly** - Touch-friendly targets and responsive design  
✅ **Customizable** - Flexible styling and messaging options  

## Basic Usage

```tsx
import { EnhancedSearchableSelect } from "@/components/ui/enhanced-searchable-select";

const groups = [
  {
    label: "Primary Options",
    options: [
      { code: "1", name: "Option One", description: "Description for option one" },
      { code: "2", name: "Option Two", description: "Description for option two" }
    ]
  }
];

<EnhancedSearchableSelect
  groups={groups}
  value={selectedValue}
  onValueChange={setSelectedValue}
  placeholder="Select an option..."
/>
```

## Real-World Examples

### 1. Collaboration Type Dropdown

```tsx
import { EnhancedSearchableSelect, transformCollaborationTypes } from "@/components/ui/enhanced-searchable-select";
import { IATI_COLLABORATION_TYPES } from "@/data/iati-collaboration-types";

<EnhancedSearchableSelect
  groups={transformCollaborationTypes(IATI_COLLABORATION_TYPES)}
  value={collaborationType}
  onValueChange={setCollaborationType}
  placeholder="Select Collaboration Type"
  searchPlaceholder="Search collaboration types..."
/>
```

### 2. Activity Status Dropdown

```tsx
const activityStatusGroups = [
  {
    label: "Active States",
    options: [
      { code: "planning", name: "Planning", description: "Activity is being prepared" },
      { code: "implementation", name: "Implementation", description: "Activity is currently active" }
    ]
  },
  {
    label: "Completed States", 
    options: [
      { code: "completed", name: "Completed", description: "Activity has finished successfully" },
      { code: "cancelled", name: "Cancelled", description: "Activity was cancelled" }
    ]
  }
];

<EnhancedSearchableSelect
  groups={activityStatusGroups}
  value={activityStatus}
  onValueChange={setActivityStatus}
  placeholder="Select Activity Status"
/>
```

### 3. Currency Selector

```tsx
const currencyGroups = [
  {
    label: "Major Currencies",
    options: [
      { code: "USD", name: "US Dollar", description: "United States Dollar" },
      { code: "EUR", name: "Euro", description: "European Union Euro" },
      { code: "GBP", name: "British Pound", description: "British Pound Sterling" }
    ]
  },
  {
    label: "Regional Currencies",
    options: [
      { code: "MMK", name: "Myanmar Kyat", description: "Myanmar Kyat" },
      { code: "THB", name: "Thai Baht", description: "Thai Baht" }
    ]
  }
];

<EnhancedSearchableSelect
  groups={currencyGroups}
  value={currency}
  onValueChange={setCurrency}
  placeholder="Select Currency"
  searchPlaceholder="Search currencies..."
/>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `groups` | `EnhancedSelectGroup[]` | **Required** | Array of option groups |
| `value` | `string` | `undefined` | Currently selected option code |
| `onValueChange` | `(value: string) => void` | **Required** | Callback when selection changes |
| `placeholder` | `string` | `"Select..."` | Placeholder text when no option selected |
| `searchPlaceholder` | `string` | `"Search..."` | Placeholder text for search input |
| `disabled` | `boolean` | `false` | Whether the dropdown is disabled |
| `className` | `string` | `undefined` | Additional CSS classes |
| `emptyStateMessage` | `string` | `"No options found."` | Message when no search results |
| `emptyStateSubMessage` | `string` | `"Try adjusting your search terms"` | Sub-message for empty state |

## Type Definitions

```tsx
interface EnhancedSelectOption {
  code: string;           // Unique identifier (e.g., "1", "USD", "planning")
  name: string;           // Display name (e.g., "Bilateral", "US Dollar")
  description?: string;   // Optional description text
}

interface EnhancedSelectGroup {
  label: string;          // Group header (e.g., "Bilateral Types")
  options: EnhancedSelectOption[];
}
```

## Helper Functions

### `transformCollaborationTypes()`

Converts your existing IATI collaboration types data structure:

```tsx
// Before
const IATI_COLLABORATION_TYPES = [
  {
    label: "Bilateral Types",
    types: [
      { code: "1", name: "Bilateral", description: "Direct cooperation..." }
    ]
  }
];

// After transformation
const groups = transformCollaborationTypes(IATI_COLLABORATION_TYPES);
// Result: [{ label: "Bilateral Types", options: [{ code: "1", name: "Bilateral", description: "..." }] }]
```

## Advanced Usage

### Custom Empty State

```tsx
<EnhancedSearchableSelect
  groups={groups}
  value={value}
  onValueChange={setValue}
  emptyStateMessage="No matching options"
  emptyStateSubMessage="Check your spelling or try different keywords"
/>
```

### Styling

```tsx
<EnhancedSearchableSelect
  groups={groups}
  value={value}
  onValueChange={setValue}
  className="w-full max-w-md"
/>
```

### Controlled Search State

The component manages its own search state internally, but you can control the open/close state if needed by wrapping it in your own Popover component.

## Search Behavior

The search functionality matches against:
- Option codes (e.g., "1", "USD")
- Option names (e.g., "Bilateral", "US Dollar")  
- Option descriptions (e.g., "Direct cooperation between...")
- Code with # prefix (e.g., "#1" matches code "1")

## Keyboard Navigation

- **Arrow Keys**: Navigate between options
- **Enter**: Select highlighted option
- **Escape**: Close dropdown and clear search
- **Tab**: Navigate to next focusable element

## Accessibility Features

- Proper ARIA labels and roles
- Screen reader support
- Keyboard navigation
- Focus management
- High contrast support

## Migration Guide

### From CollaborationTypeSearchableSelect

```tsx
// Old
<CollaborationTypeSearchableSelect
  value={value}
  onValueChange={setValue}
  placeholder="Select collaboration type..."
/>

// New
<EnhancedSearchableSelect
  groups={transformCollaborationTypes(IATI_COLLABORATION_TYPES)}
  value={value}
  onValueChange={setValue}
  placeholder="Select collaboration type..."
/>
```

### From Basic Select

```tsx
// Old
<select value={value} onChange={e => setValue(e.target.value)}>
  <option value="">Select...</option>
  <option value="1">Option 1</option>
</select>

// New
<EnhancedSearchableSelect
  groups={[{
    label: "Options",
    options: [{ code: "1", name: "Option 1" }]
  }]}
  value={value}
  onValueChange={setValue}
/>
```

## Best Practices

1. **Group Related Options**: Use meaningful group labels
2. **Provide Descriptions**: Help users understand options
3. **Use Clear Codes**: Short, memorable identifiers
4. **Consistent Naming**: Follow your app's naming conventions
5. **Test Accessibility**: Ensure keyboard and screen reader support

## Performance

- Options are memoized to prevent unnecessary re-renders
- Search filtering is optimized with useMemo
- Virtual scrolling is not needed for typical dropdown sizes (< 100 options)

For very large option lists (> 100 items), consider:
- Server-side filtering
- Virtualization
- Pagination
- Autocomplete instead of dropdown 