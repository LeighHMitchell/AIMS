# IATI-Compliant Sector Selection Implementation

## Overview
This implementation provides a comprehensive, IATI-compliant sector selection system for the AIMS platform, replacing static dropdowns with dynamic, searchable interfaces based on OECD DAC sector classifications.

## Components Created

### 1. SectorSelect Component
**Location**: `/src/components/forms/SectorSelect.tsx`

**Features**:
- Dynamic dropdown grouped by OECD DAC sector categories
- Full-text search across sector codes, names, descriptions, and categories
- Expandable/collapsible category groups
- Multi-selection support with configurable limits
- Tooltips for sector descriptions
- Click-outside-to-close behavior
- Consistent styling with other form components

**Props**:
```typescript
interface SectorSelectProps {
  selectedSectors?: string[]
  onSectorsChange?: (sectors: string[]) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  maxSelections?: number
  allowMultiple?: boolean
}
```

### 2. EnhancedSectorAllocationForm Component
**Location**: `/src/components/activities/EnhancedSectorAllocationForm.tsx`

**Features**:
- Integrated with SectorSelect for sector selection
- Percentage allocation management with validation
- Real-time validation (must total 100%)
- Visual feedback for validation status
- Distribute equally and clear all functions
- IATI compliance badges and help text
- Preparation for chart visualization integration

### 3. OECD DAC Sector Data
**Location**: `/src/data/dac-sectors.json`

**Structure**:
```json
{
  "Category Name": [
    {
      "code": "sector_code",
      "name": "sector_code - Sector Name",
      "description": "Detailed description"
    }
  ]
}
```

## Data Source
- **Original**: Cleaned_DAC_Sector_Codes.csv (308 sectors across 47 categories)
- **Processed**: Converted to JSON with proper categorization and sorting
- **Compliance**: Full OECD DAC sector classification compliance

## Integration

### Activity Editor Integration
The new components are integrated into the Activity Editor:

1. **Import**: Updated `/src/app/activities/new/page.tsx` to use `EnhancedSectorAllocationForm`
2. **Navigation**: Accessible via "Sectors" tab in the Activity Editor
3. **Validation**: Integrated with existing sector validation system

### Usage Example
```tsx
import { SectorSelect } from '@/components/forms/SectorSelect'

<SectorSelect
  selectedSectors={selectedSectors}
  onSectorsChange={setSelectedSectors}
  placeholder="Search OECD DAC sectors..."
  allowMultiple={true}
  maxSelections={10}
/>
```

## Key Features

### 🔍 Advanced Search
- Search by sector code (e.g., "15140")
- Search by sector name (e.g., "Government administration")
- Search by category name (e.g., "Government & Civil Society")
- Search descriptions for keywords

### 📊 Validation & Allocation
- Real-time percentage validation
- Must total exactly 100%
- Duplicate sector prevention
- Visual validation feedback
- Helpful error messages

### 🎨 UI/UX Excellence
- Grey-blue color palette matching existing UI
- Consistent styling with other form components
- Expandable category groups
- Hover states and focus management
- Responsive design

### 🏗️ IATI Compliance
- Full OECD DAC sector classification
- Proper sector code formatting
- Standardized descriptions
- Validation for completeness

## Future Enhancements

### Chart Integration
The component includes placeholders for:
- Donut chart visualization
- Bar chart visualization
- Toggle between visualization types

### Export/Import
Ready for future implementation:
- CSV export of allocations
- Template import functionality
- Copy from other activities

## Testing

### Access the Implementation
1. Start development server: `npm run dev`
2. Navigate to: `http://localhost:3001/activities/new`
3. Click on "Sectors" tab in the Activity Editor
4. Test the new sector selection interface

### Test Scenarios
1. **Search Functionality**: Try searching for "education", "15140", or "health"
2. **Category Expansion**: Click category headers to expand/collapse
3. **Multi-Selection**: Select multiple sectors and verify allocation
4. **Validation**: Test percentage allocation to ensure 100% total
5. **Responsive Design**: Test on different screen sizes

## Technical Notes

### Performance
- Lazy loading of sector data
- Efficient search filtering
- Minimal re-renders with React optimization

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### Browser Support
- Modern browsers with ES6+ support
- Responsive design for mobile/tablet
- Progressive enhancement approach

## Maintenance

### Data Updates
To update OECD DAC sector codes:
1. Replace `/src/data/dac-sectors.json` with new data
2. Ensure JSON structure matches existing format
3. Test search and validation functionality

### Component Updates
- Follow existing component patterns
- Maintain TypeScript interfaces
- Update tests as needed
- Document any breaking changes