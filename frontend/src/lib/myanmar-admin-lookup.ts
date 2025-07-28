// Myanmar Administrative Lookup Service
// Provides reverse geocoding and administrative boundary lookup for Myanmar

import myanmarData from '@/data/myanmar-locations.json';

export interface MyanmarAdminData {
  stateRegionCode: string;
  stateRegionName: string;
  townshipCode?: string;
  townshipName?: string;
}

export interface MyanmarLocation {
  latitude: number;
  longitude: number;
  adminData: MyanmarAdminData;
}

// Simple point-in-polygon check for administrative boundaries
// This is a basic implementation - in production you'd use proper GIS libraries
function isPointInBounds(lat: number, lng: number, bounds: number[][]): boolean {
  // Simple bounding box check for now
  // bounds format: [[minLat, minLng], [maxLat, maxLng]]
  if (bounds.length < 2) return false;
  
  const minLat = Math.min(...bounds.map(b => b[0]));
  const maxLat = Math.max(...bounds.map(b => b[0]));
  const minLng = Math.min(...bounds.map(b => b[1]));
  const maxLng = Math.max(...bounds.map(b => b[1]));
  
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

// Enhanced administrative boundaries for Myanmar states/regions
// More accurate boundaries based on geographical data
const stateRegionBounds: { [key: string]: { bounds: number[][], name: string } } = {
  // Yangon Region - more accurate bounds
  'yangon': { 
    bounds: [[16.4, 95.8], [17.8, 96.8]], 
    name: 'Yangon Region' 
  },
  // Mandalay Region
  'mandalay': { 
    bounds: [[20.8, 95.3], [23.0, 96.8]], 
    name: 'Mandalay Region' 
  },
  // Nay Pyi Taw Union Territory
  'naypyitaw': { 
    bounds: [[19.2, 95.8], [20.3, 96.8]], 
    name: 'Nay Pyi Taw Union Territory' 
  },
  // Sagaing Region
  'sagaing': { 
    bounds: [[21.8, 93.3], [26.0, 96.5]], 
    name: 'Sagaing Region' 
  },
  // Bago Region
  'bago': { 
    bounds: [[16.8, 95.0], [19.5, 96.8]], 
    name: 'Bago Region' 
  },
  // Magway Region
  'magway': { 
    bounds: [[18.9, 93.8], [21.9, 95.8]], 
    name: 'Magway Region' 
  },
  // Ayeyarwady Region
  'ayeyarwady': { 
    bounds: [[15.5, 94.2], [19.4, 95.8]], 
    name: 'Ayeyarwady Region' 
  },
  // Rakhine State
  'rakhine': { 
    bounds: [[16.5, 92.2], [21.5, 94.8]], 
    name: 'Rakhine State' 
  },
  // Kachin State
  'kachin': { 
    bounds: [[23.3, 96.0], [28.5, 98.7]], 
    name: 'Kachin State' 
  },
  // Shan State (combined)
  'shan': { 
    bounds: [[19.3, 96.8], [24.5, 101.2]], 
    name: 'Shan State' 
  },
  // Chin State
  'chin': { 
    bounds: [[20.8, 92.8], [24.1, 94.2]], 
    name: 'Chin State' 
  },
  // Kayah State
  'kayah': { 
    bounds: [[18.4, 96.8], [19.8, 97.8]], 
    name: 'Kayah State' 
  },
  // Kayin State
  'kayin': { 
    bounds: [[15.9, 96.8], [19.3, 98.8]], 
    name: 'Kayin State' 
  },
  // Mon State
  'mon': { 
    bounds: [[14.8, 97.0], [16.8, 98.6]], 
    name: 'Mon State' 
  },
  // Tanintharyi Region
  'tanintharyi': { 
    bounds: [[9.8, 97.8], [15.0, 99.2]], 
    name: 'Tanintharyi Region' 
  }
};

/**
 * Lookup administrative data by coordinates
 */
export function lookupAdminByCoordinates(latitude: number, longitude: number): MyanmarAdminData | null {
  try {
    console.log(`[Admin Lookup] Looking up coordinates: ${latitude}, ${longitude}`);
    
    // Check against enhanced state/region boundaries
    for (const [key, region] of Object.entries(stateRegionBounds)) {
      if (isPointInBounds(latitude, longitude, region.bounds)) {
        console.log(`[Admin Lookup] Found state/region: ${region.name}`);
        
        const adminData: MyanmarAdminData = {
          stateRegionCode: key.toUpperCase(),
          stateRegionName: region.name
        };
        
        console.log(`[Admin Lookup] Returning admin data:`, adminData);
        return adminData;
      }
    }
    
    // Fallback to original data structure if enhanced lookup fails
    for (const state of myanmarData.states) {
      const bounds = stateRegionBounds[state.code];
      if (bounds && isPointInBounds(latitude, longitude, bounds.bounds || bounds)) {
        console.log(`[Admin Lookup] Found state/region (fallback): ${state.name} (${state.code})`);
        
        const adminData: MyanmarAdminData = {
          stateRegionCode: state.code,
          stateRegionName: state.name
        };
        
        return adminData;
      }
    }
    
    console.warn(`[Admin Lookup] No administrative boundary found for coordinates: ${latitude}, ${longitude}`);
    return null;
  } catch (error) {
    console.error('[Admin Lookup] Error during coordinate lookup:', error);
    return null;
  }
}

/**
 * Lookup administrative data by place name
 */
export function lookupAdminByName(placeName: string): MyanmarAdminData | null {
  try {
    const searchTerm = placeName.toLowerCase().trim();
    console.log(`[Admin Lookup] Looking up place name: ${searchTerm}`);
    
    // Search states/regions first
    for (const state of myanmarData.states) {
      if (state.name.toLowerCase().includes(searchTerm)) {
        console.log(`[Admin Lookup] Found state/region by name: ${state.name}`);
        return {
          stateRegionCode: state.code,
          stateRegionName: state.name
        };
      }
      
      // Search townships within this state
      for (const township of state.townships) {
        if (township.name.toLowerCase().includes(searchTerm)) {
          console.log(`[Admin Lookup] Found township by name: ${township.name} in ${state.name}`);
          return {
            stateRegionCode: state.code,
            stateRegionName: state.name,
            townshipCode: township.code,
            townshipName: township.name
          };
        }
      }
    }
    
    console.warn(`[Admin Lookup] No administrative area found for place name: ${placeName}`);
    return null;
  } catch (error) {
    console.error('[Admin Lookup] Error during name lookup:', error);
    return null;
  }
}

/**
 * Get all available states/regions
 */
export function getAllStatesRegions(): Array<{code: string, name: string}> {
  return myanmarData.states.map(state => ({
    code: state.code,
    name: state.name
  }));
}

/**
 * Get townships for a specific state/region
 */
export function getTownshipsByState(stateCode: string): Array<{code: string, name: string}> {
  const state = myanmarData.states.find(s => s.code === stateCode);
  return state?.townships?.map(township => ({
    code: township.code,
    name: township.name
  })) || [];
}

/**
 * Validate administrative data
 */
export function validateAdminData(adminData: Partial<MyanmarAdminData>): boolean {
  if (!adminData.stateRegionCode || !adminData.stateRegionName) {
    return false;
  }
  
  // Check if state/region exists
  const state = myanmarData.states.find(s => s.code === adminData.stateRegionCode);
  if (!state) {
    return false;
  }
  
  // If township is provided, validate it belongs to the state
  if (adminData.townshipCode && adminData.townshipName) {
    const township = state.townships?.find(t => t.code === adminData.townshipCode);
    return !!township;
  }
  
  return true;
}

/**
 * Enhanced location data with administrative information
 */
export function enhanceLocationWithAdmin(
  latitude: number, 
  longitude: number, 
  name?: string
): MyanmarLocation | null {
  // Try coordinate lookup first
  let adminData = lookupAdminByCoordinates(latitude, longitude);
  
  // If coordinate lookup fails and we have a name, try name lookup
  if (!adminData && name) {
    adminData = lookupAdminByName(name);
  }
  
  if (!adminData) {
    console.warn(`[Admin Lookup] Could not determine administrative data for location: ${name || `${latitude}, ${longitude}`}`);
    return null;
  }
  
  return {
    latitude,
    longitude,
    adminData
  };
}