# Enhanced Select Components

This document describes the enhanced dropdown components that provide rich option rendering with labels and descriptions.

## Components Created

### 1. **EnhancedSelect** (`/src/components/ui/enhanced-select.tsx`)
A base enhanced select component built on Radix UI that supports:
- Rich option rendering with labels and descriptions
- Consistent styling with ShadCN UI
- Focus states and accessibility
- Custom item content

### 2. **ActivityStatusSelect** (`/src/components/forms/ActivityStatusSelect.tsx`)
Enhanced dropdown for IATI Activity Status with descriptive options:

| Value | Label | Description |
|-------|-------|-------------|
| `planning` | Planning | Activity is being prepared but not yet underway |
| `implementation` | Implementation | Activity is currently being implemented |
| `completed` | Completed | Activity has been completed successfully |
| `cancelled` | Cancelled | Activity has been cancelled and will not proceed |
| `suspended` | Suspended | Activity has been temporarily suspended |

### 3. **CollaborationTypeSelect** (`/src/components/forms/CollaborationTypeSelect.tsx`)
Enhanced dropdown for Collaboration Type with descriptive options:

| Value | Label | Description |
|-------|-------|-------------|
| `bilateral` | Bilateral | Direct cooperation between two countries or organizations |
| `multilateral` | Multilateral | Cooperation involving multiple countries or organizations |
| `public-private` | Public-Private | Partnership between public and private sector entities |
| `triangular` | Triangular | Three-way cooperation between developed, emerging and developing countries |

### 4. **ActivityStatusFilterSelect** (`/src/components/forms/ActivityStatusFilterSelect.tsx`)
Enhanced dropdown for filtering activities by status (includes "All" option):

Same options as ActivityStatusSelect plus:
| Value | Label | Description |
|-------|-------|-------------|
| `all` | All Activity Status | Show activities with any status |

## Usage Examples

### Basic Activity Status Selection
```tsx
import { ActivityStatusSelect } from "@/components/forms/ActivityStatusSelect"

<ActivityStatusSelect
  id="activityStatus"
  value={activity.status}
  onValueChange={(value) => setActivity({...activity, status: value})}
  placeholder="Select Activity Status"
/>
```

### Collaboration Type Selection
```tsx
import { CollaborationTypeSelect } from "@/components/forms/CollaborationTypeSelect"

<CollaborationTypeSelect
  id="collaborationType"
  value={activity.collaborationType}
  onValueChange={(value) => setActivity({...activity, collaborationType: value})}
  placeholder="Select Collaboration Type"
/>
```

### Activity Status Filtering
```tsx
import { ActivityStatusFilterSelect } from "@/components/forms/ActivityStatusFilterSelect"

<ActivityStatusFilterSelect
  value={statusFilter}
  onValueChange={setStatusFilter}
  placeholder="Activity Status"
  className="w-48"
/>
```

## Visual Design

Each dropdown option displays:
- **Label**: Bold/medium font weight (e.g., "Planning")
- **Description**: Smaller, muted text below (e.g., "Activity is being prepared but not yet underway")
- **Check indicator**: Shows when option is selected
- **Hover/Focus states**: Highlighted background on interaction

## Implementation Details

### Styling
- Uses Tailwind CSS classes for consistent styling
- `font-medium` for labels
- `text-xs text-slate-500` for descriptions
- `space-y-1` for vertical spacing between label and description

### Accessibility
- Built on Radix UI primitives for full accessibility support
- Keyboard navigation
- Screen reader support
- Focus management

### Current Usage
- **Activity Creation Form**: Uses both ActivityStatusSelect and CollaborationTypeSelect
- **Activities List Page**: Uses ActivityStatusFilterSelect for filtering

## Future Enhancements

These components can be extended to support:
- Organization Type selects
- Transaction Type selects
- Any other categorical fields that benefit from descriptive options
- Custom icons for each option
- Grouping of related options
- Search/filtering within large option lists