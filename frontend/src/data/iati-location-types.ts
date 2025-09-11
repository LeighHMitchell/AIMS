// IATI Location Reach types
export const LOCATION_REACH_TYPES = [
  {
    code: '1',
    name: 'Activity happens at this location',
    description: 'The activity is physically implemented at this location'
  },
  {
    code: '2', 
    name: 'Beneficiaries live here',
    description: 'The beneficiaries of the activity live at this location'
  }
] as const;

// IATI Location ID Vocabulary types
export const LOCATION_ID_VOCABULARIES = [
  {
    code: 'A1',
    name: 'GeoNames',
    description: 'GeoNames geographical database'
  },
  {
    code: 'A2',
    name: 'OpenStreetMap',
    description: 'OpenStreetMap database'
  },
  {
    code: 'A3',
    name: 'GADM',
    description: 'Global Administrative Areas'
  },
  {
    code: 'A4',
    name: 'HASC',
    description: 'Hierarchical Administrative Subdivision Codes'
  },
  {
    code: 'A5',
    name: 'ISO',
    description: 'ISO 3166-1 country codes'
  },
  {
    code: 'A6',
    name: 'ISO2',
    description: 'ISO 3166-2 subdivision codes'
  },
  {
    code: 'A7',
    name: 'ISO3',
    description: 'ISO 3166-3 country codes'
  },
  {
    code: 'A8',
    name: 'UN',
    description: 'United Nations codes'
  },
  {
    code: 'A9',
    name: 'Custom',
    description: 'Custom vocabulary'
  }
] as const;

// Administrative Division Levels
export const ADMINISTRATIVE_LEVELS = [
  {
    code: '1',
    name: 'Province/State',
    description: 'First-level administrative division'
  },
  {
    code: '2',
    name: 'District/County',
    description: 'Second-level administrative division'
  },
  {
    code: '3',
    name: 'Township/Municipality',
    description: 'Third-level administrative division'
  },
  {
    code: '4',
    name: 'Ward/Neighborhood',
    description: 'Fourth-level administrative division'
  },
  {
    code: '5',
    name: 'Village/Settlement',
    description: 'Fifth-level administrative division'
  }
] as const;

// Location Exactness types
export const LOCATION_EXACTNESS_TYPES = [
  {
    code: '1',
    name: 'Exact',
    description: 'Location is precisely known'
  },
  {
    code: '2',
    name: 'Approximate',
    description: 'Location is approximately known'
  },
  {
    code: '3',
    name: 'Extrapolated',
    description: 'Location is estimated or extrapolated'
  }
] as const;

// Location Class types
export const LOCATION_CLASS_TYPES = [
  {
    code: '1',
    name: 'Administrative Region',
    description: 'Administrative or political division'
  },
  {
    code: '2',
    name: 'Settlement',
    description: 'Populated place or settlement'
  },
  {
    code: '3',
    name: 'Structure',
    description: 'Building or structure'
  },
  {
    code: '4',
    name: 'Site',
    description: 'Specific site or location'
  },
  {
    code: '5',
    name: 'Area',
    description: 'Geographic area or region'
  }
] as const;

// Feature Designation types (UN/Geonames codes)
export const FEATURE_DESIGNATION_TYPES = [
  // Administrative divisions
  { code: 'ADM1', name: 'First-order administrative division', category: 'Administrative' },
  { code: 'ADM2', name: 'Second-order administrative division', category: 'Administrative' },
  { code: 'ADM3', name: 'Third-order administrative division', category: 'Administrative' },
  { code: 'ADM4', name: 'Fourth-order administrative division', category: 'Administrative' },
  { code: 'ADM5', name: 'Fifth-order administrative division', category: 'Administrative' },
  { code: 'ADMF', name: 'Administrative facility', category: 'Administrative' },
  
  // Populated places
  { code: 'PPL', name: 'Populated place', category: 'Settlement' },
  { code: 'PPLA', name: 'Seat of a first-order administrative division', category: 'Settlement' },
  { code: 'PPLA2', name: 'Seat of a second-order administrative division', category: 'Settlement' },
  { code: 'PPLA3', name: 'Seat of a third-order administrative division', category: 'Settlement' },
  { code: 'PPLA4', name: 'Seat of a fourth-order administrative division', category: 'Settlement' },
  { code: 'PPLG', name: 'Seat of government of a political entity', category: 'Settlement' },
  { code: 'PPLS', name: 'Populated places', category: 'Settlement' },
  { code: 'PPLX', name: 'Section of populated place', category: 'Settlement' },
  
  // Structures and facilities
  { code: 'BLDG', name: 'Building', category: 'Structure' },
  { code: 'SCH', name: 'School', category: 'Structure' },
  { code: 'HSP', name: 'Hospital', category: 'Structure' },
  { code: 'CLIN', name: 'Clinic', category: 'Structure' },
  { code: 'FAC', name: 'Facility', category: 'Structure' },
  { code: 'MIL', name: 'Military facility', category: 'Structure' },
  { code: 'GOV', name: 'Government facility', category: 'Structure' },
  
  // Geographic features
  { code: 'MT', name: 'Mountain', category: 'Geographic' },
  { code: 'HLL', name: 'Hill', category: 'Geographic' },
  { code: 'VLY', name: 'Valley', category: 'Geographic' },
  { code: 'RGN', name: 'Region', category: 'Geographic' },
  { code: 'AREA', name: 'Area', category: 'Geographic' },
  { code: 'ZONE', name: 'Zone', category: 'Geographic' },
  
  // Water features
  { code: 'STM', name: 'Stream', category: 'Water' },
  { code: 'LK', name: 'Lake', category: 'Water' },
  { code: 'RIV', name: 'River', category: 'Water' },
  { code: 'SEA', name: 'Sea', category: 'Water' },
  { code: 'OCN', name: 'Ocean', category: 'Water' }
] as const;

// Type definitions
export type LocationReachType = typeof LOCATION_REACH_TYPES[number];
export type LocationIdVocabulary = typeof LOCATION_ID_VOCABULARIES[number];
export type AdministrativeLevel = typeof ADMINISTRATIVE_LEVELS[number];
export type LocationExactnessType = typeof LOCATION_EXACTNESS_TYPES[number];
export type LocationClassType = typeof LOCATION_CLASS_TYPES[number];
export type FeatureDesignationType = typeof FEATURE_DESIGNATION_TYPES[number];

// Advanced location data structure
export interface AdvancedLocationData {
  id: string;
  locationReach?: string;
  locationId?: {
    vocabulary: string;
    code: string;
  };
  administrative?: {
    level: string;
    code: string;
  };
  exactness?: string;
  locationClass?: string;
  featureDesignation?: string;
  activityDescription?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  percentage?: number; // For percentage allocation across multiple locations
}

