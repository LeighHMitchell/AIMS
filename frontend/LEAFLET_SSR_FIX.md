# Leaflet SSR (Server-Side Rendering) Fix Documentation

## Issue Description
When using Leaflet with Next.js, you may encounter the error "window is not defined" during server-side rendering. This happens because Leaflet requires browser-specific APIs (like `window` and `document`) that don't exist in the Node.js server environment.

## Common Error Messages
- `ReferenceError: window is not defined`
- `Cannot read properties of undefined (reading 'L')`
- Server connection errors when accessing pages with maps

## Solution Overview
We use two approaches to fix this issue:

### 1. Dynamic Imports for Components (Recommended)
Create wrapper components that use Next.js dynamic imports with SSR disabled.

### 2. Conditional Loading in Components
Check for `window` availability before using Leaflet.

## Implementation Details

### Approach 1: Dynamic Import Wrappers (Recommended)

For any component that uses Leaflet, create a dynamic wrapper:

```typescript
// LocationSelectorDynamic.tsx
import dynamic from 'next/dynamic';

const LocationSelector = dynamic(
  () => import('./LocationSelector'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-6 bg-gray-50 animate-pulse rounded-lg">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-80 bg-gray-200 rounded"></div>
      </div>
    )
  }
);

export default LocationSelector;
```

Then import the dynamic version in your pages/components:

```typescript
// Instead of:
import LocationSelector from './LocationSelector';

// Use:
import LocationSelector from './LocationSelectorDynamic';
```

### Approach 2: Conditional Leaflet Loading

In components that directly use Leaflet:

```typescript
// At the top of the component
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

// In functions that use Leaflet
const createPinIcon = (color = '#ef4444') => {
  if (!L || typeof window === 'undefined') {
    return null;
  }
  
  return L.divIcon({
    // ... icon configuration
  });
};
```

## Files Already Fixed

The following files have been updated with SSR fixes:

1. **Components with Dynamic Wrappers:**
   - `LocationSelector.tsx` → `LocationSelectorDynamic.tsx`
   - `EnhancedCoverageSelector.tsx` → `EnhancedCoverageSelectorDynamic.tsx`

2. **Components Using the Wrappers:**
   - `LocationsTab.tsx` - imports dynamic versions

3. **Direct Leaflet Usage:**
   - `LocationSelector.tsx` - added window checks for Leaflet

## Guidelines for Future Development

### When Adding New Map Components:

1. **Always use 'use client' directive** at the top of components using Leaflet:
   ```typescript
   'use client';
   ```

2. **Create a dynamic wrapper** for any new component using Leaflet:
   ```typescript
   // YourMapComponentDynamic.tsx
   import dynamic from 'next/dynamic';
   
   const YourMapComponent = dynamic(
     () => import('./YourMapComponent'),
     { ssr: false }
   );
   
   export default YourMapComponent;
   ```

3. **Check for window availability** when using Leaflet directly:
   ```typescript
   if (typeof window !== 'undefined') {
     // Leaflet code here
   }
   ```

4. **Import react-leaflet components** normally (they handle SSR internally):
   ```typescript
   import { MapContainer, TileLayer, Marker } from 'react-leaflet';
   ```

5. **But guard Leaflet direct usage**:
   ```typescript
   let L: any;
   if (typeof window !== 'undefined') {
     L = require('leaflet');
   }
   ```

## Troubleshooting

### If you still get SSR errors:

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   ```

2. **Kill existing dev server processes:**
   ```bash
   lsof -ti:3000 -ti:3001 | xargs kill -9
   ```

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

4. **Check for missed imports** - ensure all components importing map components use the Dynamic versions.

5. **Force dynamic rendering** for problematic pages:
   ```typescript
   // At the top of the page component
   export const dynamic = 'force-dynamic';
   ```

## Testing

To verify SSR compatibility:

1. Build the production version:
   ```bash
   npm run build
   ```

2. If the build succeeds without SSR errors, the fix is working.

3. Test in production mode locally:
   ```bash
   npm run start
   ```

## Note for Vercel Deployment

The production build on Vercel will fail if there are SSR issues. Always test with `npm run build` locally before deploying.

## Related Files

- `next.config.js` - Contains `ignoreBuildErrors` settings (should be false in production)
- `package.json` - Leaflet dependencies
- Any component in `src/components` that shows a map

## Maintenance

When updating Leaflet or react-leaflet versions, test thoroughly as SSR handling may change between versions. 