import { z } from 'zod';

// IATI Location Reach codes
export const LOCATION_REACH_CODES = ['1', '2'] as const;
export const LOCATION_EXACTNESS_CODES = ['1', '2'] as const;
export const LOCATION_CLASS_CODES = ['1', '2', '3', '4'] as const;

// IATI Gazetteer vocabularies
export const LOCATION_ID_VOCABULARIES = [
  'A1', // GeoNames
  'A2', // OpenStreetMap
  'A3', // GADM
  'A4', // HASC
  'A5', // ISO 3166-1
  'A6', // ISO 3166-2
  'A7', // ISO 3166-3
  'A8', // UN
  'A9', // Custom
  'G1', // GeoNames (alternative)
  'G2', // OpenStreetMap (alternative)
] as const;

// Administrative levels
export const ADMIN_LEVELS = ['admin1', 'admin2', 'admin3', 'admin4'] as const;

// Site types
export const SITE_TYPES = [
  'project_site',
  'office',
  'warehouse',
  'training_center',
  'health_facility',
  'school',
  'community_center',
  'other'
] as const;

// Coverage scopes
export const COVERAGE_SCOPES = [
  'national',
  'subnational',
  'regional',
  'local'
] as const;

// Sources
export const LOCATION_SOURCES = ['map', 'search', 'manual'] as const;

// Validation statuses
export const VALIDATION_STATUSES = ['valid', 'warning', 'error'] as const;

// Base location schema with common fields
export const locationBaseSchema = z.object({
  id: z.string().optional(),
  activity_id: z.string().optional(),
  location_name: z.string(),
  country_code: z.string().optional(),
  description: z.string().optional(),
  location_description: z.string().optional(),
  activity_location_description: z.string().optional(),
});

// IATI fields schema (shared between site and coverage)
const iatiFieldsSchema = z.object({
  // IATI-specific fields
  location_reach: z.enum(LOCATION_REACH_CODES).optional(),
  exactness: z.enum(LOCATION_EXACTNESS_CODES).optional(),
  location_class: z.enum(LOCATION_CLASS_CODES).optional(),
  feature_designation: z.string().optional(),
  location_id_vocabulary: z.enum(LOCATION_ID_VOCABULARIES).optional(),
  location_id_code: z.string().optional(),
  admin_vocabulary: z.enum(LOCATION_ID_VOCABULARIES).optional(),
  admin_level: z.enum(ADMIN_LEVELS).optional(),
  admin_code: z.string().optional(),
  spatial_reference_system: z.string().optional(),
  srs_name: z.string().default('http://www.opengis.net/def/crs/EPSG/0/4326'),

  // Activity-specific fields
  validation_status: z.enum(VALIDATION_STATUSES).optional(),
  source: z.enum(LOCATION_SOURCES).optional(),

  // Location descriptions (IATI compliant)
  location_description: z.string().optional(),
});

// Site-specific location schema
export const siteLocationSchema = locationBaseSchema.extend({
  location_type: z.literal('site'),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .finite('Latitude must be a valid number'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .finite('Longitude must be a valid number'),
  address: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  site_type: z.enum(SITE_TYPES).default('project_site'),
  state_region_name: z.string().optional(),
  state_region_code: z.string().optional(),
  township_name: z.string().optional(),
  township_code: z.string().optional(),
  district_name: z.string().optional(),
  district_code: z.string().optional(),
  village_name: z.string().optional(),
}).merge(iatiFieldsSchema);

// Coverage location schema
export const coverageLocationSchema = locationBaseSchema.extend({
  location_type: z.literal('coverage'),
  coverage_scope: z.enum(COVERAGE_SCOPES),
  admin_unit: z.string().optional(),
  state_region_name: z.string().optional(),
  state_region_code: z.string().optional(),
  township_name: z.string().optional(),
  township_code: z.string().optional(),
}).merge(iatiFieldsSchema);

// Combined location schema
export const locationSchema = z.discriminatedUnion('location_type', [
  siteLocationSchema,
  coverageLocationSchema,
]);

// Location form schema (for form validation) - simplified approach
export const locationFormSchema = z.object({
  // Required fields
  location_name: z.string().min(1, 'Location name is required'),
  location_type: z.enum(['site', 'coverage']),
  country_code: z.string().optional(),
  
  // Site-specific fields
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  site_type: z.enum(SITE_TYPES).optional(),
  state_region_name: z.string().optional(),
  state_region_code: z.string().optional(),
  township_name: z.string().optional(),
  township_code: z.string().optional(),
  district_name: z.string().optional(),
  district_code: z.string().optional(),
  village_name: z.string().optional(),
  
  // Coverage-specific fields
  coverage_scope: z.enum(COVERAGE_SCOPES).optional(),
  admin_unit: z.string().optional(),
  
  // IATI fields
  location_reach: z.enum(LOCATION_REACH_CODES).optional(),
  exactness: z.enum(LOCATION_EXACTNESS_CODES).optional(),
  location_class: z.enum(LOCATION_CLASS_CODES).optional(),
  feature_designation: z.string().optional(),
  location_id_vocabulary: z.enum(LOCATION_ID_VOCABULARIES).optional(),
  location_id_code: z.string().optional(),
  admin_vocabulary: z.enum(LOCATION_ID_VOCABULARIES).optional(),
  admin_level: z.enum(ADMIN_LEVELS).optional(),
  admin_code: z.string().optional(),
  spatial_reference_system: z.string().optional(),
  srs_name: z.string().optional(),
  
  // Activity fields
  validation_status: z.enum(VALIDATION_STATUSES).optional(),
  source: z.enum(LOCATION_SOURCES).optional(),
  
  // Descriptions
  location_description: z.string().optional(),
  description: z.string().optional(),
  id: z.string().optional(),
  activity_id: z.string().optional(),
}).refine((data) => {
  // Site locations must have coordinates
  if (data.location_type === 'site') {
    return data.latitude !== undefined && data.longitude !== undefined;
  }
  return true;
}, {
  message: 'Site locations must have latitude and longitude',
  path: ['latitude'],
}).refine((data) => {
  // Coverage locations must have coverage scope
  if (data.location_type === 'coverage') {
    return data.coverage_scope !== undefined;
  }
  return true;
}, {
  message: 'Coverage locations must have a coverage scope',
  path: ['coverage_scope'],
}).refine((data) => {
  // If gazetteer vocabulary is provided, code must also be provided
  if (data.location_id_vocabulary && !data.location_id_code) {
    return false;
  }
  return true;
}, {
  message: 'Gazetteer code is required when vocabulary is specified',
  path: ['location_id_code'],
}).refine((data) => {
  // If admin level is provided, admin code must also be provided
  if (data.admin_level && !data.admin_code) {
    return false;
  }
  return true;
}, {
  message: 'Administrative code is required when level is specified',
  path: ['admin_code'],
}).refine((data) => {
  // Validate coordinates are within valid ranges
  if (data.latitude !== undefined && data.longitude !== undefined) {
    return data.latitude >= -90 && data.latitude <= 90 && 
           data.longitude >= -180 && data.longitude <= 180;
  }
  return true;
}, {
  message: 'Coordinates must be within valid ranges',
  path: ['latitude'],
});

// Location search result schema
export const locationSearchResultSchema = z.object({
  place_id: z.union([z.string(), z.number()]),
  osm_id: z.union([z.string(), z.number()]).optional(),
  osm_type: z.string().optional(),
  name: z.string().optional(),
  display_name: z.string(),
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  type: z.string().optional(),
  importance: z.union([z.number(), z.string()]).optional(),
  place_rank: z.union([z.number(), z.string()]).optional(),
  category: z.string().optional(),
  address: z.record(z.any()).optional(),
}).transform((data) => {
  const importance = typeof data.importance === 'string' ? parseFloat(data.importance) : data.importance;
  const placeRank = typeof data.place_rank === 'string' ? parseInt(data.place_rank, 10) : data.place_rank;
  const rawAddress = (data.address ?? {}) as Record<string, unknown>;

  const address = {
    city: typeof rawAddress.city === 'string' ? rawAddress.city : undefined,
    town: typeof rawAddress.town === 'string' ? rawAddress.town : undefined,
    village: typeof rawAddress.village === 'string' ? rawAddress.village : undefined,
    hamlet: typeof rawAddress.hamlet === 'string' ? rawAddress.hamlet : undefined,
    suburb: typeof rawAddress.suburb === 'string' ? rawAddress.suburb : undefined,
    state: typeof rawAddress.state === 'string' ? rawAddress.state : undefined,
    province: typeof rawAddress.province === 'string' ? rawAddress.province : undefined,
    county: typeof rawAddress.county === 'string' ? rawAddress.county : undefined,
    district: typeof rawAddress.district === 'string' ? rawAddress.district : undefined,
    postcode: typeof rawAddress.postcode === 'string' ? rawAddress.postcode : undefined,
    country: typeof rawAddress.country === 'string' ? rawAddress.country : undefined,
    country_code: typeof rawAddress.country_code === 'string' ? rawAddress.country_code : undefined,
  };

  return {
    id: String(data.place_id),
    place_id: String(data.place_id),
    osm_id: data.osm_id !== undefined ? String(data.osm_id) : undefined,
    osm_type: data.osm_type,
    name: data.name,
    display_name: data.display_name,
    lat: data.lat,
    lon: data.lon,
    type: data.type,
    category: data.category,
    importance: Number.isFinite(importance) ? importance : undefined,
    place_rank: Number.isFinite(placeRank) ? placeRank : undefined,
    address,
  };
});

// Geocoding result schema
export const geocodingResultSchema = z.object({
  place_id: z.number(),
  licence: z.string(),
  osm_type: z.string(),
  osm_id: z.number(),
  lat: z.string(),
  lon: z.string(),
  display_name: z.string(),
  address: z.record(z.string()).optional(),
  boundingbox: z.array(z.string()).optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  name: z.string().optional(),
  addresstype: z.string().optional(),
});

// Location validation result schema
export const locationValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestions: z.array(z.string()).optional(),
});


// Type exports
export type LocationSchema = z.infer<typeof locationSchema>;
export type LocationFormSchema = z.infer<typeof locationFormSchema>;
export type LocationSearchResult = z.infer<typeof locationSearchResultSchema>;
export type GeocodingResult = z.infer<typeof geocodingResultSchema>;
export type LocationValidationResult = z.infer<typeof locationValidationResultSchema>;

// Validation function
export const validateLocationForm = (data: unknown): LocationFormSchema => {
  return locationFormSchema.parse(data);
};

// Helper functions
export const getDefaultLocationValues = (type: 'site' | 'coverage'): Partial<LocationFormSchema> => {
  const base = {
    location_type: type,
    country_code: undefined,
    srs_name: 'http://www.opengis.net/def/crs/EPSG/0/4326',
    spatial_reference_system: 'http://www.opengis.net/def/crs/EPSG/0/4326',
    source: 'manual' as const,
    validation_status: 'valid' as const,
  };

  if (type === 'site') {
    return {
      ...base,
      site_type: 'project_site',
    };
  }

  return {
    ...base,
    coverage_scope: 'local',
  };
};

export const validateCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};


// Validation functions for API responses
export const validateLocationSearchResult = (data: unknown): LocationSearchResult => {
  return locationSearchResultSchema.parse(data);
};

export const validateGeocodingResult = (data: unknown): GeocodingResult => {
  return geocodingResultSchema.parse(data);
};
