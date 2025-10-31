# Activity Locations Map Feature

## Overview
Added an interactive map visualization of activity locations based on longitude/latitude coordinates above the Activity Locations card. The map uses the same Leaflet-based mapping system as the Add Location modal for consistency.

## What Was Added

### 1. New Component: `ActivityLocationsHeatmap.tsx`
**Location:** `/frontend/src/components/maps/ActivityLocationsHeatmap.tsx`

**Features:**
- Interactive Leaflet map matching the Add Location modal style
- **Subnational heatmap overlay** showing activity density by state/region:
  - Regions colored based on number of activity locations
  - Gray: 0 locations
  - Light blue: 1-2 locations
  - Orange: 3-4 locations
  - Red: 5-6 locations
  - Dark red: 7+ locations
  - Hover over regions to see exact counts
  - Interactive region highlighting on hover
- Multiple map layers (same as Location Modal):
  - OpenStreetMap Standard
  - Humanitarian (HOT)
  - CyclOSM Transport
  - OpenTopo Terrain
  - ESRI Satellite
- Interactive markers with popups showing:
  - Location name
  - Site type (if available)
  - Region name (if available)
  - Latitude and longitude coordinates
- Layer selector dropdown in header
- Color-coded legend explaining density levels
- Export to JPEG functionality
- Location counter in header
- Auto-centers and zooms based on location distribution
- Automatically hidden when no valid locations exist
- Remembers user's last selected map layer

**Technical Details:**
- Uses react-leaflet library (same as Location Modal)
- GeoJSON layer for Myanmar states/regions boundaries
- Point-in-polygon algorithm to determine which region each location belongs to
- Real-time density calculation based on location distribution
- Dynamically imports map view for SSR compatibility
- Filters locations to only show those with valid lat/lng coordinates
- Calculates optimal map center and zoom level based on locations
- Saves layer preference to localStorage
- Leverages existing UI components (Card, Button, Select, HelpTextTooltip)
- Uses html2canvas for JPEG export

### 2. New Component: `ActivityLocationsMapView.tsx`
**Location:** `/frontend/src/components/maps/ActivityLocationsMapView.tsx`

**Features:**
- Leaflet MapContainer with TileLayer
- GeoJSON overlay for Myanmar states/regions
- Choropleth heatmap coloring based on activity density
- Region hover effects and tooltips
- Renders location markers with popups
- Configurable map layers
- Scroll wheel zoom enabled
- Force re-renders when layer changes

**Technical Details:**
- Client-side only component (uses 'use client')
- Loads Myanmar GeoJSON boundaries from `/myanmar-states-simplified.geojson`
- Point-in-polygon algorithm for location-to-region mapping
- Dynamic region styling based on activity counts
- Interactive region tooltips with counts
- Fixes Leaflet icon paths for Next.js compatibility
- Styled popups with location details

### 2. Integration Points

**LocationsTab.tsx:**
- Added import for `ActivityLocationsHeatmap`
- Placed map component above the "Activity Locations" header
- Automatically receives location data from existing state

**LocationsTabNew.tsx:**
- Same integration as LocationsTab.tsx
- Ensures consistency across different versions of the locations tab

## User Experience

1. **When locations exist with coordinates:**
   - Interactive map appears at the top of the Locations tab, focused on Myanmar only
   - **Dual visualization:**
     - **Red marker pins** show exact location of each activity site
     - **Colored regions (choropleth)** show density at subnational level
   - Regions are color-coded from light gray (no activities) to dark red (high density)
   - Hover over regions to see exact activity counts with checkmarks
   - Click markers to see enhanced popups with location details
   - Pan and zoom restricted to Myanmar boundaries
   - Switch between map layers (street, humanitarian, terrain, satellite)
   - Export map as JPEG for reports/presentations
   - Enhanced legend explains both pins and choropleth colors
   - Surrounding countries are faded out for focus

2. **When no locations have coordinates:**
   - Map is hidden (null component)
   - Only the Activity Locations card list is shown

3. **Visual Feedback:**
   - Loading state while map initializes
   - Enhanced marker visibility with z-index prioritization
   - Smooth region hover effects with border highlighting
   - Enhanced popups with formatted information
   - Dual-legend system (pins + choropleth)
   - Layer switcher in header
   - Professional appearance matching Location Modal
   - Myanmar-only focus with faded surrounding areas

## Data Requirements

The map expects locations with the following structure:
```typescript
{
  id?: string
  location_name?: string
  latitude?: number
  longitude?: number
  // ... other fields
}
```

Only locations with valid (non-null, non-NaN) latitude and longitude values are displayed.

## Dependencies

- Existing: `react-leaflet` (already in project, used by Location Modal)
- Existing: `leaflet` (already in project, used by Location Modal)
- Existing: `html2canvas` (already in project)
- Existing: `next/dynamic` (for SSR compatibility)
- Existing UI components: Card, Button, Select, HelpTextTooltip
- Existing utilities: toast (sonner)

## Future Enhancements (Optional)

Potential improvements that could be added:
1. Clustering for many nearby locations (using marker cluster plugin)
2. Different marker icons based on location type/category
3. Filter controls (by date, category, etc.)
4. Drawing tools for coverage areas
5. Heatmap overlay layer showing density
6. Custom marker colors/styles
7. Multiple export formats (PNG, SVG, PDF)

## Testing Recommendations

1. Test with activities that have:
   - No locations
   - Locations without coordinates
   - Single location with coordinates
   - Multiple locations spread across Myanmar
   - Multiple locations in same area (density test)
   
2. Test export functionality
3. Test hover interactions
4. Test responsive behavior on different screen sizes
5. Verify GeoJSON loads correctly

## Files Modified

1. **Created:**
   - `/frontend/src/components/maps/ActivityLocationsHeatmap.tsx` - Main wrapper component with layer selector
   - `/frontend/src/components/maps/ActivityLocationsMapView.tsx` - Leaflet map implementation

2. **Updated:**
   - `/frontend/src/components/LocationsTab.tsx` - Added heatmap above locations
   - `/frontend/src/components/LocationsTabNew.tsx` - Added heatmap above locations

## Notes

- The map only appears when there are valid locations with coordinates
- Uses the same Leaflet mapping system as the Location Modal for consistency
- The component is fully self-contained and doesn't affect existing functionality
- No database changes required
- No API changes required
- Fully compatible with existing location data structure
- Map layer preference is saved separately from Location Modal preference
- SSR-safe with dynamic imports

