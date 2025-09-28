import {
  locationSearchResultSchema,
  geocodingResultSchema,
  type LocationSearchResult,
  type GeocodingResult,
  validateLocationSearchResult,
  validateGeocodingResult
} from '@/lib/schemas/location';

// Nominatim API configuration
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const NOMINATIM_SEARCH_URL = `${NOMINATIM_BASE_URL}/search`;
const NOMINATIM_REVERSE_URL = `${NOMINATIM_BASE_URL}/reverse`;

// Default request parameters
const DEFAULT_SEARCH_PARAMS = {
  format: 'json',
  addressdetails: '1',
  limit: '10',
  dedupe: '1',
} as const;

const DEFAULT_REVERSE_PARAMS = {
  format: 'json',
  addressdetails: '1',
  zoom: '18',
} as const;

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
let lastRequestTime = 0;

/**
 * Search for locations using Nominatim API
 * @param query - Search query (e.g., "Kempinski Hotel, Napier")
 * @param options - Search options
 * @returns Promise<LocationSearchResult[]>
 */
export async function searchLocations(
  query: string,
  options: {
    countryCodes?: string[];
    limit?: number;
    language?: string;
    email?: string;
  } = {}
): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  try {
    const searchParams = new URLSearchParams({
      ...DEFAULT_SEARCH_PARAMS,
      q: query.trim(),
      ...(options.limit && { limit: options.limit.toString() }),
      ...(options.language && { 'accept-language': options.language }),
      ...(options.countryCodes && options.countryCodes.length > 0 && {
        countrycodes: options.countryCodes.join(',')
      }),
      ...(options.email && { email: options.email }),
    });

    const headers: Record<string, string> = {};
    if (typeof window === 'undefined') {
      headers['User-Agent'] = 'AIMS-Application/1.0 (location-search)';
    }

    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${searchParams}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Validate and transform results
    return data.map((item: unknown) => validateLocationSearchResult(item));
  } catch (error) {
    console.error('Error searching locations:', error);
    throw new Error('Failed to search locations. Please try again.');
  }
}

/**
 * Reverse geocode coordinates to get address information
 * @param lat - Latitude
 * @param lng - Longitude
 * @param options - Reverse geocoding options
 * @returns Promise<GeocodingResult>
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  options: {
    language?: string;
    zoom?: number;
  } = {}
): Promise<GeocodingResult> {
  // Validate coordinates
  if (!isValidCoordinate(lat, lng)) {
    throw new Error('Invalid coordinates provided');
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  try {
    const reverseParams = new URLSearchParams({
      ...DEFAULT_REVERSE_PARAMS,
      lat: lat.toString(),
      lon: lng.toString(),
      ...(options.language && { 'accept-language': options.language }),
      ...(options.zoom && { zoom: options.zoom.toString() }),
    });

    const headers: Record<string, string> = {};
    if (typeof window === 'undefined') {
      headers['User-Agent'] = 'AIMS-Application/1.0 (reverse-geocoding)';
    }

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${reverseParams}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data.lat || !data.lon) {
      throw new Error('No location found for these coordinates');
    }

    return validateGeocodingResult(data);
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw new Error('Failed to reverse geocode coordinates. Please try again.');
  }
}

/**
 * Get location details including administrative areas
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise with parsed location data
 */
export async function getLocationDetails(
  lat: number,
  lng: number
): Promise<{
  coordinates: { lat: number; lng: number };
  address: {
    country?: string;
    state?: string;
    province?: string;
    county?: string;
    district?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    hamlet?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
  };
  display_name: string;
}> {
  const result = await reverseGeocode(lat, lng);

  return {
    coordinates: { lat: result.lat, lng: result.lon },
    address: result.address || {},
    display_name: result.display_name,
  };
}

/**
 * Search locations with Myanmar-specific filtering
 * @param query - Search query
 * @param options - Search options
 * @returns Promise<LocationSearchResult[]>
 */
export async function searchMyanmarLocations(
  query: string,
  options: { limit?: number } = {}
): Promise<LocationSearchResult[]> {
  return searchLocations(query, {
    ...options,
    countryCodes: ['mm'], // Myanmar country code
  });
}

/**
 * Search locations globally (fallback when Myanmar search fails)
 * @param query - Search query
 * @param options - Search options
 * @returns Promise<LocationSearchResult[]>
 */
export async function searchGlobalLocations(
  query: string,
  options: { limit?: number } = {}
): Promise<LocationSearchResult[]> {
  return searchLocations(query, options);
}

/**
 * Smart location search that tries Myanmar first, then global
 * @param query - Search query
 * @param options - Search options
 * @returns Promise<LocationSearchResult[]>
 */
export async function smartLocationSearch(
  query: string,
  options: { limit?: number } = {}
): Promise<LocationSearchResult[]> {
  try {
    // First try Myanmar-specific search
    const myanmarResults = await searchMyanmarLocations(query, options);
    if (myanmarResults.length > 0) {
      return myanmarResults;
    }

    // Fallback to global search
    return await searchGlobalLocations(query, options);
  } catch (error) {
    console.warn('Myanmar search failed, falling back to global search:', error);
    return await searchGlobalLocations(query, options);
  }
}

/**
 * Validate if coordinates are within valid range
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns boolean
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - First latitude
 * @param lng1 - First longitude
 * @param lat2 - Second latitude
 * @param lng2 - Second longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
    return 0;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Extract administrative information from geocoding result
 * @param result - Geocoding result
 * @returns Administrative information
 */
export function extractAdministrativeInfo(result: GeocodingResult): {
  country?: string;
  state?: string;
  province?: string;
  county?: string;
  district?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  hamlet?: string;
} {
  const address = result.address || {};

  return {
    country: address.country,
    state: address.state || address.province,
    province: address.province || address.state,
    county: address.county,
    district: address.district,
    city: address.city,
    town: address.town,
    village: address.village,
    suburb: address.suburb,
    hamlet: address.hamlet,
  };
}

/**
 * Format address for display
 * @param result - Geocoding result
 * @returns Formatted address string
 */
export function formatAddress(result: GeocodingResult): string {
  const address = result.address || {};
  const parts = [];

  // Build address from most specific to general
  if (address.house_number) parts.push(address.house_number);
  if (address.road) parts.push(address.road);
  if (address.suburb) parts.push(address.suburb);
  if (address.village || address.hamlet) parts.push(address.village || address.hamlet);
  if (address.town) parts.push(address.town);
  if (address.city) parts.push(address.city);
  if (address.county || address.district) parts.push(address.county || address.district);
  if (address.state || address.province) parts.push(address.state || address.province);
  if (address.country) parts.push(address.country);

  return parts.join(', ');
}

/**
 * Get location type from feature type
 * @param osmType - OSM feature type (N, W, R)
 * @param featureClass - OSM feature class
 * @param featureType - OSM feature type
 * @returns Human-readable location type
 */
export function getLocationType(
  osmType?: string,
  featureClass?: string,
  featureType?: string
): string {
  if (!osmType) return 'Unknown';

  switch (osmType.toUpperCase()) {
    case 'N': // Node
      return 'Point of Interest';
    case 'W': // Way
      if (featureType === 'residential' || featureType === 'pedestrian') {
        return 'Street/Road';
      }
      return 'Area/Building';
    case 'R': // Relation
      if (featureClass === 'boundary') {
        return 'Administrative Boundary';
      }
      return 'Area/Region';
    default:
      return 'Unknown';
  }
}

/**
 * Debounced search function
 * @param searchFunction - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  searchFunction: T,
  delay: number = 300
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const result = await searchFunction(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

// Export debounced version of smart search
export const debouncedSmartSearch = debounce(smartLocationSearch, 300);
