# HierarchicalSectorSelect Component

A React component that displays IATI DAC sector codes in a hierarchical, tiered dropdown structure. Perfect for Aid Information Management Systems requiring structured sector selection.

## Features

- **3-Level Hierarchy**: Displays DAC sector categories → 3-digit sectors → 5-digit subsectors
- **Visual Distinction**: Clear visual hierarchy with indentation and styling
- **Selective Interaction**: Only 5-digit codes are selectable (categories and 3-digit sectors are display-only)
- **Smart Search**: Filter across 5-digit sector codes and names only
- **Accessibility**: Proper ARIA roles, keyboard navigation, and screen reader support
- **Multi-Selection**: Support for selecting multiple 5-digit codes with badges
- **Selection Management**: Individual removal, clear all, and maximum selection limits
- **Responsive Design**: Works on desktop and mobile layouts

## Usage

### Basic Usage

```tsx
import { HierarchicalSectorSelect } from '@/components/forms/HierarchicalSectorSelect';

function MyForm() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  return (
    <HierarchicalSectorSelect
      value={selectedSectors}
      onValueChange={setSelectedSectors}
      placeholder="Select DAC 5-digit sector codes..."
      maxSelections={10}
    />
  );
}
```

### Using with SectorSelect (Variant Approach)

```tsx
import { SectorSelect } from '@/components/forms/SectorSelect';

function MyForm() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  return (
    <SectorSelect
      variant="hierarchical"  // Use hierarchical instead of flat
      value={selectedSectors}
      onValueChange={setSelectedSectors}
      placeholder="Select DAC 5-digit sector codes..."
      maxSelections={10}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string[]` | **Required** | Array of selected 5-digit DAC sector codes |
| `onValueChange` | `(value: string[]) => void` | **Required** | Callback when selection changes |
| `placeholder` | `string` | `"Select DAC 5-digit sector code(s)"` | Placeholder text when no items selected |
| `searchPlaceholder` | `string` | `"Search 5-digit sector codes..."` | Placeholder for search input |
| `disabled` | `boolean` | `false` | Whether the component is disabled |
| `className` | `string` | `""` | Additional CSS classes |
| `maxSelections` | `number` | `10` | Maximum number of sectors that can be selected |

## Data Structure

The component automatically transforms data from `SectorGroup.json` into this hierarchy:

```
Education (Category - Non-selectable)
├── 111 – Education, Level Unspecified (3-digit - Non-selectable)
│   ├── 11110 – Education policy and administrative management (5-digit - Selectable)
│   ├── 11120 – Education facilities and training (5-digit - Selectable)
│   └── 11130 – Teacher training (5-digit - Selectable)
└── 112 – Basic Education (3-digit - Non-selectable)
    ├── 11220 – Primary education (5-digit - Selectable)
    └── 11230 – Basic life skills for youth and adults (5-digit - Selectable)

Health (Category - Non-selectable)
├── 121 – Health, General (3-digit - Non-selectable)
│   ├── 12110 – Health policy and administrative management (5-digit - Selectable)
│   └── 12181 – Medical education/training (5-digit - Selectable)
└── ...
```

## Visual Hierarchy

- **Categories**: Bold text, grey background, border-top separator
- **3-digit Sectors**: Medium font weight, grey background, indented
- **5-digit Subsectors**: Normal text, further indented, hover effects, selectable

## Accessibility Features

- **ARIA Roles**: Proper roles for headings and options
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Descriptive labels and state information
- **Focus Management**: Clear focus indicators

## Integration Examples

### In Activity Forms

```tsx
// Replace existing flat sector select
<HierarchicalSectorSelect
  value={activity.sectorCodes}
  onValueChange={(codes) => updateActivity({ sectorCodes: codes })}
  maxSelections={5}
/>
```

### In Search/Filter Components

```tsx
<HierarchicalSectorSelect
  value={filters.sectors}
  onValueChange={(sectors) => setFilters({ ...filters, sectors })}
  placeholder="Filter by sectors..."
  maxSelections={3}
/>
```

## Styling Customization

The component uses Tailwind CSS classes. You can customize styling by:

1. **Extending the className prop**:
```tsx
<HierarchicalSectorSelect
  className="custom-border custom-shadow"
  // ...other props
/>
```

2. **CSS Modules/Custom CSS** (target specific elements):
```css
.hierarchical-dropdown .category-header {
  background: your-custom-color;
}

.hierarchical-dropdown .sector-option:hover {
  background: your-hover-color;
}
```

## Testing

Visit `/test-hierarchical-sectors` to see the component in action with interactive demos.

## Data Requirements

Requires `SectorGroup.json` with the following structure:
```json
{
  "data": [
    {
      "code": "11110",
      "name": "Education policy and administrative management",
      "codeforiati:category-code": "111",
      "codeforiati:category-name": "Education, Level Unspecified", 
      "codeforiati:group-code": "110",
      "codeforiati:group-name": "Education",
      "status": "active"
    }
  ]
}
```

## Performance Notes

- Data transformation is memoized for efficiency
- Search filtering is optimized with useMemo
- Large datasets (500+ sectors) render smoothly with virtual scrolling 