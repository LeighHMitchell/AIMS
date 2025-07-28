# Sector Sunburst Visualization Component

A comprehensive React component for visualizing DAC sector allocations using a 3-level sunburst chart with toggle for table view.

## Features

- ✅ **3-Level Hierarchy**: Automatically builds Category → 3-digit Sector → 5-digit Subsector hierarchy from simple input data
- ✅ **Toggle Views**: Switch between interactive Sunburst chart and detailed Table view
- ✅ **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- ✅ **Interactive**: Hover tooltips, clickable segments with callback support
- ✅ **Color-Coded**: Each DAC category gets a distinct color with transparency levels for sub-levels
- ✅ **Built with Recharts**: High-performance charting with smooth animations
- ✅ **TypeScript Support**: Fully typed for better development experience

## Quick Start

### Basic Usage

```tsx
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization';

const sectorAllocations = [
  { code: '11120', name: 'Education facilities and training', percentage: 33.3 },
  { code: '11130', name: 'Teacher training', percentage: 33.3 },
  { code: '11110', name: 'Education policy and administrative management', percentage: 33.3 }
];

function MyComponent() {
  return (
    <SectorSunburstVisualization 
      allocations={sectorAllocations}
      onSegmentClick={(code, level) => console.log(`Clicked ${level}: ${code}`)}
    />
  );
}
```

### Data Structure

The component accepts a simple array of sector allocations:

```typescript
interface SectorAllocation {
  code: string;        // 5-digit DAC sector code (e.g., '11120')
  name: string;        // Human-readable sector name
  percentage: number;  // Allocation percentage (0-100)
}
```

### Component Props

```typescript
interface Props {
  allocations: SectorAllocation[];
  onSegmentClick?: (code: string, level: 'category' | 'sector' | 'subsector') => void;
  className?: string;
}
```

## Chart Structure

The sunburst chart automatically organizes data into three concentric rings:

### Inner Ring (Categories)
- **DAC Categories** (e.g., Education = 110-119, Health = 120-129)
- Derived from the first two digits of 5-digit codes + '0'
- Examples: '110' (Education), '120' (Health), '140' (Water)

### Middle Ring (3-digit Sectors)  
- **3-digit DAC sectors** (e.g., 111 = Education, Level Unspecified)
- Derived from the first three digits of 5-digit codes
- Examples: '111', '112', '113' under Education category

### Outer Ring (5-digit Subsectors)
- **Your actual sector allocations** (5-digit DAC codes)
- Examples: '11120', '11130', '11110'

## Integration Examples

### In Activity Editor

```tsx
// In your activity editor component
import { useState } from 'react';
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization';

function ActivitySectorsTab({ activityId }: { activityId: string }) {
  const [sectors, setSectors] = useState([
    { code: '11120', name: 'Education facilities and training', percentage: 50.0 },
    { code: '12220', name: 'Basic health care', percentage: 30.0 },
    { code: '14020', name: 'Water supply and sanitation', percentage: 20.0 }
  ]);

  const handleSectorClick = (code: string, level: 'category' | 'sector' | 'subsector') => {
    if (level === 'subsector') {
      // Handle drill-down to sector details
      console.log(`Show details for sector: ${code}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Sector Allocations</h2>
      
      {/* Sector input form would go here */}
      
      <SectorSunburstVisualization 
        allocations={sectors}
        onSegmentClick={handleSectorClick}
        className="mt-6"
      />
    </div>
  );
}
```

### With State Management

```tsx
// Using with Redux or similar state management
import { useSelector, useDispatch } from 'react-redux';
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization';

function SectorDashboard() {
  const dispatch = useDispatch();
  const sectorAllocations = useSelector(state => state.activity.sectors);

  const handleSectorSelection = (code: string, level: string) => {
    dispatch(selectSector({ code, level }));
  };

  return (
    <SectorSunburstVisualization 
      allocations={sectorAllocations}
      onSegmentClick={handleSectorSelection}
    />
  );
}
```

## Features Detail

### Automatic Hierarchy Building

The component automatically maps 5-digit DAC codes to their parent categories:

```
11120 (Education facilities) → 111 (Education, unspecified) → 110 (Education category)
12220 (Basic health care) → 122 (Basic Health) → 120 (Health category)  
14020 (Water supply) → 140 (Water & Sanitation) → 140 (Water category)
```

### Responsive Design

- **Desktop**: Full sunburst with legend
- **Tablet**: Optimized button layout and chart sizing  
- **Mobile**: Stacked layout, icon-only buttons, responsive table

### Color System

Each DAC category gets a consistent color:
- Inner ring: Full opacity category color
- Middle ring: 85% opacity (`colorDD`)
- Outer ring: 73% opacity (`colorBB`)

### Tooltip Information

Hover tooltips show:
- **Code and name** (e.g., "11120 – Education facilities and training")
- **Percentage allocation** (e.g., "33.3% of total")
- **Level context** (Category/Sector/Subsector)

## Styling and Customization

### Custom Styling

```tsx
<SectorSunburstVisualization 
  allocations={sectors}
  className="border shadow-lg"
/>
```

### Theme Integration

The component uses Tailwind classes and can be themed by overriding:
- `text-gray-900` (primary text)
- `text-gray-600` (secondary text) 
- `bg-gray-50` (backgrounds)

## Performance

- **Memoized calculations**: Hierarchy building is memoized for performance
- **Recharts optimization**: Uses Recharts' built-in performance optimizations
- **Responsive**: Uses `ResponsiveContainer` for automatic sizing

## Accessibility

- Semantic HTML structure
- Keyboard navigation support (via Recharts)
- Screen reader friendly tooltips
- High contrast color scheme

## Dependencies

- React 18+
- Recharts 2.15+ ✅ (already installed)
- Tailwind CSS ✅ (already configured)
- Lucide React ✅ (for icons)

## Demo

To see the component in action, check out:
```tsx
import SectorSunburstDemo from '@/components/charts/SectorSunburstDemo';
```

The demo includes both simple and complex examples with multiple DAC categories. 