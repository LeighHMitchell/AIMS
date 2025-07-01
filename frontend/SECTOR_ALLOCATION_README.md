# Sector & Sub-sector Allocation Feature

## Overview

This feature provides a comprehensive interface for assigning OECD DAC sector codes to development activities, with a focus on encouraging users to report at the DAC 5 (sub-sector) level for better granularity and data quality.

## Features

### Core Functionality
- **Typeahead Search**: Fast, responsive search for DAC 5 codes and sub-sector names
- **Hierarchical Display**: Automatic display of parent DAC 3 sector information
- **Percentage Allocation**: Precise allocation with validation ensuring 100% total
- **Real-time Visualization**: D3.js-powered donut and stacked bar charts
- **Validation & Nudges**: Encouraging DAC 5 level reporting with helpful hints

### Advanced Features
- **CSV Bulk Import**: Import multiple sector allocations from CSV files
- **Auto-balance**: Automatically distribute percentages equally
- **Copy from Template**: Reuse sector allocations from existing activities
- **Keyboard Navigation**: Full keyboard support for accessibility

## Components

### 1. SectorAllocationForm
Main form component that handles the sector allocation interface.

**Location**: `frontend/src/components/activities/SectorAllocationForm.tsx`

**Props**:
- `allocations`: Initial sector allocations
- `onChange`: Callback for allocation changes
- `onValidationChange`: Callback for validation state changes
- `allowPublish`: Whether to allow publishing with current state

### 2. SectorDonutChart
D3.js donut chart visualization with:
- Inner ring: DAC 3 sectors
- Outer ring: DAC 5 sub-sectors
- Interactive tooltips
- Color grouping by parent sector

**Location**: `frontend/src/components/activities/SectorDonutChart.tsx`

### 3. SectorStackedBar
Alternative stacked bar chart visualization showing:
- DAC 3 sectors on X-axis
- Stacked DAC 5 allocations
- Total percentages on top
- Legend for sub-sectors

**Location**: `frontend/src/components/activities/SectorStackedBar.tsx`

## Data Structure

### DAC Code Structure
```typescript
interface DAC5Sector {
  dac5_code: string;      // e.g., "11220"
  dac5_name: string;      // e.g., "Primary education"
  dac3_code: string;      // e.g., "112"
  dac3_name: string;      // e.g., "Basic Education"
  dac3_parent_code?: string;  // e.g., "110"
  dac3_parent_name?: string;  // e.g., "Education"
}
```

### Sector Allocation
```typescript
interface SectorAllocation {
  id?: string;
  dac5_code: string;
  dac5_name: string;
  dac3_code: string;
  dac3_name: string;
  percentage: number;
}
```

## Usage

### Basic Implementation
```tsx
import SectorAllocationForm from '@/components/activities/SectorAllocationForm';

function MyComponent() {
  const [allocations, setAllocations] = useState<SectorAllocation[]>([]);
  const [validation, setValidation] = useState<SectorValidation | null>(null);

  return (
    <SectorAllocationForm
      allocations={allocations}
      onChange={setAllocations}
      onValidationChange={setValidation}
      allowPublish={true}
    />
  );
}
```

### With Activity Page
Navigate to `/activities/[id]/sectors` to access the full sector allocation page for an activity.

## API Integration

### Endpoints

**GET** `/api/activities/[id]/sectors`
- Fetch existing sector allocations for an activity

**PUT** `/api/activities/[id]/sectors`
- Save/update sector allocations
- Validates total percentage equals 100%
- Updates activity timestamp

### Database Schema
```sql
CREATE TABLE activity_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  dac5_code VARCHAR(10) NOT NULL,
  dac5_name TEXT NOT NULL,
  dac3_code VARCHAR(10) NOT NULL,
  dac3_name TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_sectors_activity_id ON activity_sectors(activity_id);
CREATE INDEX idx_activity_sectors_dac5_code ON activity_sectors(dac5_code);
```

## CSV Import Format

Users can bulk import sector allocations using CSV files:

```csv
dac5_code,percentage
11220,30
12220,25
14030,20
15110,15
31110,10
```

Requirements:
- First row must be the header
- DAC5 codes must be valid OECD codes
- Percentages must sum to 100

## Validation Rules

1. **Total Percentage**: Must equal exactly 100% (with 0.01% tolerance for rounding)
2. **Duplicate Prevention**: No duplicate DAC 5 codes allowed
3. **Required Fields**: At least one sector allocation required
4. **Valid Codes**: DAC 5 codes must exist in the system

## UI/UX Design Principles

1. **Progressive Enhancement**: Start simple, reveal complexity as needed
2. **Visual Feedback**: Real-time visualization updates
3. **Error Prevention**: Validate before submission
4. **Helpful Nudges**: Guide users toward best practices
5. **Accessibility**: Full keyboard navigation and screen reader support

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with minor D3.js adjustments)
- IE11: Not supported

## Performance Considerations

- DAC codes are loaded once and cached
- Search is performed client-side for instant results
- D3.js visualizations use efficient update patterns
- Debounced percentage input for smooth updates

## Future Enhancements

1. **AI Suggestions**: Recommend sectors based on activity description
2. **Historical Analysis**: Show common sector combinations
3. **Peer Comparison**: Compare with similar organizations
4. **Export Options**: Download visualization as PNG/SVG
5. **Mobile Optimization**: Touch-friendly interface for tablets 