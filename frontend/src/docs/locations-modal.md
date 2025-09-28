# Location Modal Documentation

## Overview

The Location Modal provides a comprehensive, IATI v2.03 compliant interface for adding and editing activity locations. It features a unified workflow that supports three entry modes: map click, search, and manual entry, with automatic synchronization between them.

## Features

### 🎯 Three Entry Modes
- **Map Click**: Click on the map to set coordinates and auto-populate address fields
- **Search**: Type-ahead search using Nominatim API with Myanmar-first fallback
- **Manual Entry**: Direct coordinate and address input with full IATI field support

### 🗺️ Interactive Map
- **Leaflet Integration**: Full-featured map with zoom, pan, and interaction
- **Layer Controls**: OpenStreetMap and optional Satellite layers
- **Draggable Markers**: Position markers by dragging
- **Reverse Geocoding**: Automatic address lookup from coordinates
- **Myanmar-Centered**: Default view optimized for Myanmar context

### 📋 IATI v2.03 Compliance
- **Complete Field Set**: All IATI location elements supported
- **Gazetteer Integration**: GeoNames and OpenStreetMap ID support
- **Administrative Divisions**: Multi-level administrative area support
- **Validation**: Client and server-side IATI compliance checking

### 🎨 User Experience
- **Tabbed Interface**: Clean separation of General and Advanced (IATI) fields
- **Real-time Validation**: Immediate feedback on data quality
- **Percentage Allocation**: Visual percentage tracking across locations
- **Sensitive Location Support**: Data protection for vulnerable areas
- **Accessibility**: Full keyboard navigation and screen reader support

## Components

### LocationModal
Main modal component that orchestrates the location editing workflow.

**Props:**
```typescript
interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: LocationSchema) => Promise<void>;
  onDelete?: (locationId: string) => Promise<void>;
  activityId: string;
  location?: LocationSchema; // For editing existing locations
  existingLocations?: LocationSchema[]; // For percentage validation
}
```

**Key Features:**
- Form validation using Zod schema
- Map integration with Leaflet
- Search functionality with debounced API calls
- Percentage allocation tracking
- IATI field management

### LocationCard
Display component for individual locations in the locations list.

**Features:**
- Map thumbnail generation
- Status badges (validation, type, reach)
- Action menu (edit, duplicate, delete)
- Responsive design
- Accessibility support

### LocationsTabNew
Main container component that manages the locations workflow.

**Features:**
- Location grid/list display
- Percentage summary and validation
- Batch operations support
- Loading states and error handling

## Usage

### Basic Implementation
```typescript
import LocationModal from '@/components/locations/LocationModal';
import LocationCard from '@/components/locations/LocationCard';
import LocationsTabNew from '@/components/LocationsTabNew';

// In your component
const [locations, setLocations] = useState<LocationSchema[]>([]);
const [isModalOpen, setIsModalOpen] = useState(false);

const handleSaveLocation = async (location: LocationSchema) => {
  // Save logic here
  setLocations(prev => [...prev, location]);
  setIsModalOpen(false);
};

return (
  <LocationsTabNew
    activityId="your-activity-id"
    canEdit={true}
    locations={locations}
    onLocationsChange={setLocations}
  />
);
```

### Adding Locations Programmatically
```typescript
import { addSampleLocations, SAMPLE_LOCATIONS } from '@/scripts/demo/sample-locations';

// Add sample data for testing
await addSampleLocations(activityId, userId);
```

## API Endpoints

### GET `/api/activities/[id]/locations`
Fetch all locations for an activity with percentage summary.

**Response:**
```typescript
{
  success: true,
  locations: LocationSchema[],
  percentageSummary: {
    total: number,
    locations: Array<{id: string, name: string, percentage?: number}>,
    isValid: boolean,
    error?: string
  }
}
```

### POST `/api/activities/[id]/locations`
Create a new location with full IATI validation.

**Request Body:**
```typescript
{
  location_name: string,
  location_type: 'site' | 'coverage',
  latitude?: number,
  longitude?: number,
  // ... other IATI fields
  percentage_allocation?: number,
  user_id: string
}
```

### PATCH `/api/locations/[id]`
Update an existing location.

### DELETE `/api/locations/[id]`
Delete a location.

## Data Model

### Database Schema
Extended `activity_locations` table with IATI v2.03 fields:

```sql
-- Core fields
id UUID PRIMARY KEY
activity_id UUID FK
location_type ENUM('site', 'coverage')
location_name TEXT NOT NULL

-- Address fields
address_line1 TEXT
address_line2 TEXT
city TEXT
postal_code TEXT

-- Geographic fields
latitude DECIMAL(10,8)
longitude DECIMAL(11,8)
srs_name TEXT DEFAULT 'EPSG:4326'

-- IATI Location fields
location_reach SMALLINT
exactness SMALLINT
location_class SMALLINT
feature_designation TEXT
location_id_vocabulary TEXT
location_id_code TEXT
admin_level SMALLINT
admin_code TEXT

-- Activity-specific
activity_location_description TEXT
percentage_allocation DECIMAL(5,2)

-- Metadata
validation_status ENUM('valid', 'warning', 'error')
source ENUM('map', 'search', 'manual')
is_sensitive BOOLEAN
created_by UUID
updated_by UUID
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## Validation

### Client-Side Validation
- **Zod Schema**: Comprehensive validation using Zod
- **Coordinate Validation**: Latitude/longitude range checking
- **Percentage Validation**: 0-100% range with total constraints
- **IATI Compliance**: Gazetteer vocabulary/code consistency

### Server-Side Validation
- **Database Constraints**: Percentage allocation limits
- **Trigger Functions**: Automatic validation status updates
- **API Validation**: Request body schema validation

## Accessibility

- **Keyboard Navigation**: Full tab order support
- **Screen Reader Support**: ARIA labels and descriptions
- **Focus Management**: Proper focus handling on modal open/close
- **Color Contrast**: WCAG AA compliant color schemes
- **Error Announcements**: Screen reader error notifications

## Testing

### Manual Testing Checklist
- [ ] Map click sets coordinates and populates address fields
- [ ] Search results update map marker and form fields
- [ ] Manual coordinate entry works correctly
- [ ] Percentage allocation validation prevents over 100%
- [ ] IATI fields are properly saved and displayed
- [ ] Sensitive location flag works correctly
- [ ] Validation errors display appropriately
- [ ] Edit existing locations works correctly
- [ ] Delete locations works correctly
- [ ] Duplicate locations works correctly

### Automated Testing
```typescript
// Example Playwright test
test('should add location via map click', async ({ page }) => {
  await page.goto('/activities/test-activity-id');

  // Open location modal
  await page.click('[data-testid="add-location-button"]');

  // Click on map
  await page.click('[data-testid="location-map"]', { position: { x: 200, y: 150 } });

  // Verify coordinates are set
  await expect(page.locator('[data-testid="latitude-input"]')).toHaveValue(/^\d+\.\d+$/);

  // Fill in location name
  await page.fill('[data-testid="location-name-input"]', 'Test Location');

  // Save location
  await page.click('[data-testid="save-location-button"]');

  // Verify location appears in list
  await expect(page.locator('[data-testid="location-card"]')).toHaveCount(1);
});
```

## Demo Data

Sample locations are available in `/scripts/demo/sample-locations.ts`:

- **Yangon Central Hospital** - Health facility with GeoNames ID
- **Mandalay Regional Office** - Office with OpenStreetMap ID
- **Rural Communities in Shan State** - Coverage area (sensitive)
- **Coastal Areas in Rakhine State** - Coverage area
- **Urban Poor in Yangon** - Local coverage (sensitive)

## Migration

### Database Migration
Run the IATI location migration:

```sql
-- Execute the migration
\i frontend/create_iati_location_migration.sql
```

### Component Migration
Replace existing location components:

```typescript
// Old
import LocationsTab from '@/components/LocationsTab';

// New
import LocationsTabNew from '@/components/LocationsTabNew';
```

## Troubleshooting

### Common Issues

**Map not loading:**
- Check Leaflet dependencies are properly installed
- Verify NEXT_PUBLIC_MAPBOX_TOKEN if using satellite layer
- Check browser console for JavaScript errors

**Search not working:**
- Verify internet connection
- Check Nominatim API availability
- Ensure search query is at least 2 characters

**Percentage validation failing:**
- Check total allocation doesn't exceed 100%
- Verify all locations have valid percentage values
- Check for duplicate locations

**IATI fields not saving:**
- Ensure database migration has been applied
- Check API endpoint is using updated schema
- Verify form data matches expected format

### Debug Commands

```bash
# Check database schema
psql -d aims -c "\d activity_locations"

# Test API endpoints
curl -X GET http://localhost:3000/api/activities/YOUR_ACTIVITY_ID/locations

# Check sample data
curl -X POST http://localhost:3000/api/demo/sample-locations \
  -H "Content-Type: application/json" \
  -d '{"activityId": "YOUR_ACTIVITY_ID", "userId": "YOUR_USER_ID"}'
```

## Future Enhancements

- **Offline Support**: Cache map tiles and search results
- **Bulk Import**: CSV/Excel location import
- **Advanced Search**: Filter by administrative divisions
- **Geofencing**: Define custom geographic boundaries
- **Real-time Collaboration**: Multi-user location editing
- **Historical Tracking**: Location change history
- **Integration APIs**: External GIS system integration
