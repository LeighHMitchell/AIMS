# Enhanced Activity Locations UI Implementation

## Overview
This implementation provides a React-based Activity Locations UI with two aligned columns:
1. **Left Column**: Interactive location selector with map pin dropping
2. **Right Column**: Enhanced coverage selector with 3-tiered cascading dropdown

## Key Components

### LocationsTab.tsx
- Main container with grid layout using `items-start` for top alignment
- Wraps both LocationSelector and EnhancedCoverageSelector in flex containers
- Provides IATI-compliant data structure interface

### EnhancedCoverageSelector.tsx
- **NEW**: Replaces radio buttons with single `react-select` dropdown
- **3-Tiered Dropdown**: Nationwide → States/Regions → Townships
- **Map Alignment**: Uses `h-80` (320px) to match LocationSelector map height
- **Visual Icons**: Globe for nationwide, MapPin for states/townships
- **Searchable**: Full-text search across all tiers
- **Auto-preview**: Automatically updates map preview based on selection

### LocationSelector.tsx
- Enhanced with `h-full` class for proper Card alignment
- Interactive map with pin dropping and address search
- Edit functionality for saved locations
- Reverse geocoding for automatic address lookup

## Integration Guide

### 1. Replace Existing Component
```tsx
// In your parent component
import LocationsTab from '@/components/LocationsTab';

// Use with IATI-compliant state structure
const [specificLocations, setSpecificLocations] = useState([]);
const [coverageAreas, setCoverageAreas] = useState([]);

<LocationsTab
  specificLocations={specificLocations}
  coverageAreas={coverageAreas}
  onSpecificLocationsChange={setSpecificLocations}
  onCoverageAreasChange={setCoverageAreas}
/>
```

### 2. Map Alignment Features
- Both maps now use `h-80` (320px) for consistent height
- Grid layout with `items-start` ensures top alignment
- Card containers use `h-full` for equal column heights

### 3. 3-Tiered Dropdown Features
- **Tier 1**: "Nationwide (Myanmar)" with globe icon
- **Tier 2**: State/Region options (e.g., "Kachin State") with blue map pins
- **Tier 3**: Township options (e.g., "Bhamo (Kachin State)") with gray map pins
- Supports full-text search across all levels
- Clear visual hierarchy with indentation and icons

## Data Structure

### Coverage Areas Output
```typescript
interface CoverageArea {
  id: string;
  scope: 'national' | 'subnational';
  description: string;
  regions?: {
    id: string;        // State ID (e.g., "01")
    name: string;      // State name (e.g., "Kachin State")
    code: string;      // State code (e.g., "MM-01")
    townships: {       // Empty array for state-wide, specific townships for township-level
      id: string;      // Township ID (e.g., "01-001")
      name: string;    // Township name (e.g., "Bhamo")
      code: string;    // Township code (e.g., "MM-01-001")
    }[];
  }[];
}
```

## Styling

### Tailwind CSS Classes Used
- `grid grid-cols-1 lg:grid-cols-2 gap-6 items-start` - Responsive two-column layout
- `h-full` - Full height cards for alignment
- `h-80` - Consistent 320px map height
- `flex flex-col` - Column flex containers
- Custom react-select styling for theme consistency

### Custom Components
- Uses existing shadcn/ui components (Card, Button, Badge, etc.)
- `react-select` with custom styling to match Tailwind theme
- Leaflet maps with custom pin icons and boundary visualization

## Myanmar Administrative Data
- Utilizes `/data/myanmar-locations.json` with GADM administrative codes
- Supports all 15 states/regions and their townships
- Hierarchical structure: Country → States → Townships
- IATI-compliant output format for development data standards