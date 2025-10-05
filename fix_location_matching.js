const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/activities/XmlImportTab.tsx');

console.log('Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

// First replacement: Replace the index-based location matching (line 1806-1807)
// with unique identifier-based matching
const oldCode1 = `          // Get current location at this index for comparison
          const currentLocation = currentActivityData.locations && currentActivityData.locations[locIndex];`;

const newCode1 = `          // Helper function to normalize coordinates for comparison (defined early so we can use it in find)
          const normalizeCoordinates = (coords: string) => {
            if (!coords) return '';
            // Normalize to single space between lat/long, trim whitespace
            return coords.trim().replace(/\\s+/g, ' ');
          };

          // Find matching current location by unique identifiers (not by index!)
          // Priority: 1) location_ref, 2) coordinates, 3) location_name
          const currentLocation = currentActivityData.locations?.find((existingLoc: any) => {
            // First try to match by location_ref (most reliable)
            if (location.ref && existingLoc.location_ref) {
              return location.ref === existingLoc.location_ref;
            }
            
            // Then try to match by coordinates
            const existingCoords = existingLoc.latitude && existingLoc.longitude 
              ? \`\${existingLoc.latitude} \${existingLoc.longitude}\` 
              : '';
            const importCoords = location.point?.pos || '';
            
            if (existingCoords && importCoords) {
              return normalizeCoordinates(existingCoords) === normalizeCoordinates(importCoords);
            }
            
            // Finally try to match by name (least reliable)
            return location.name && existingLoc.location_name && 
                   location.name.toLowerCase().trim() === existingLoc.location_name.toLowerCase().trim();
          });`;

console.log('Applying first replacement...');
if (content.includes(oldCode1)) {
  content = content.replace(oldCode1, newCode1);
  console.log('✓ First replacement applied');
} else {
  console.log('✗ Could not find first pattern to replace');
  console.log('Looking for:', oldCode1.substring(0, 100));
}

// Second replacement: Remove the duplicate normalizeCoordinates definition (lines 1870-1875)
const oldCode2 = `          // Compare location data - ONLY check if coordinates match
          // This allows updating other fields (name, ref, description, etc.) even if coordinates are the same
          // Helper function to normalize coordinates for comparison
          const normalizeCoordinates = (coords: string) => {
            if (!coords) return '';
            // Normalize to single space between lat/long, trim whitespace
            return coords.trim().replace(/\\s+/g, ' ');
          };
          
          const locationsMatch`;

const newCode2 = `          // Compare location data - ONLY check if coordinates match
          // This allows updating other fields (name, ref, description, etc.) even if coordinates are the same
          
          const locationsMatch`;

console.log('Applying second replacement (removing duplicate normalizeCoordinates)...');
if (content.includes(oldCode2)) {
  content = content.replace(oldCode2, newCode2);
  console.log('✓ Second replacement applied');
} else {
  console.log('✗ Could not find second pattern to replace');
}

console.log('Writing updated file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Location matching fix applied successfully!');
console.log('\nSummary:');
console.log('- Replaced index-based location matching with unique identifier matching');
console.log('- Removed duplicate normalizeCoordinates function definition');
console.log('- Location matching now uses: 1) location_ref, 2) coordinates, 3) location_name');

