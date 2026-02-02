/**
 * Types for subnational allocation data
 * Supports both region-level (15 States/Regions) and township-level (~330 townships) allocations
 */

/** Allocation level - region or township */
export type AllocationLevel = 'region' | 'township';

/** View level for map display */
export type ViewLevel = 'region' | 'township';

/** Administrative unit type from myanmar-locations.json */
export type AdminUnitType = 'state' | 'region' | 'union-territory' | 'township';

/** Administrative unit (State, Region, Union Territory, or Township) */
export interface AdminUnit {
  id: string;
  name: string;
  type: AdminUnitType;
  parentName?: string;   // For townships, this is the state/region name
  parentId?: string;     // For townships, this is the state/region id
  fullName: string;      // Display name with parent context
  st_pcode: string;      // MIMU State/Region PCode (e.g., MMR001)
  ts_pcode?: string;     // MIMU Township PCode (e.g., MMR001001), only for townships
}

/** Breakdown entry for the UI */
export interface BreakdownEntry {
  id: string;
  adminUnit: AdminUnit;
  percentage: number;
  allocationLevel: AllocationLevel;
}

/** Subnational breakdown record from database */
export interface SubnationalBreakdown {
  id: string;
  activity_id: string;
  region_name: string;
  percentage: number;
  is_nationwide: boolean;
  allocation_level: AllocationLevel;
  st_pcode: string | null;
  ts_pcode: string | null;
  created_at: string;
  updated_at: string;
}

/** Payload for creating/updating subnational breakdown */
export interface SubnationalBreakdownPayload {
  region_name: string;
  percentage: number;
  is_nationwide: boolean;
  allocation_level?: AllocationLevel;
  st_pcode?: string;
  ts_pcode?: string;
}

/** Activity info for map tooltips */
export interface ActivityInfo {
  id: string;
  title: string;
  status?: string;
  organization?: string;
}

/** Region data for map visualization */
export interface RegionData {
  percentage: number;
  value?: number;
  activityCount?: number;
  activities?: ActivityInfo[];
}

/** Map breakdowns - can be either a simple number or RegionData */
export type MapBreakdowns = Record<string, number | RegionData>;

/** Aggregated breakdown data from API */
export interface AggregatedBreakdowns {
  breakdowns: Record<string, number>;
  details: Record<string, {
    totalPercentage: number;
    activityCount: number;
    activities: ActivityInfo[];
  }>;
}

/** GeoJSON feature properties for township map */
export interface TownshipGeoJSONProperties {
  ST: string;        // State/Region name (e.g., "Kachin")
  ST_PCODE: string;  // State/Region PCode (e.g., "MMR001")
  DT: string;        // District name
  DT_PCODE: string;  // District PCode
  TS: string;        // Township name
  TS_PCODE: string;  // Township PCode (e.g., "MMR001001")
  TS_MMR: string;    // Township name in Myanmar script
  PCode_V: number;   // PCode version (9.4)
}

/** GeoJSON feature for township */
export interface TownshipGeoJSONFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'MultiPolygon' | 'Polygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: TownshipGeoJSONProperties;
}

/** GeoJSON FeatureCollection for townships */
export interface TownshipGeoJSON {
  type: 'FeatureCollection';
  features: TownshipGeoJSONFeature[];
}

/** Color scale stop for choropleth */
export interface ColorStop {
  value: number;
  color: string;
}

/** Color scale configuration */
export interface ColorScale {
  stops: ColorStop[];
  interpolation: 'linear' | 'step';
  nullColor: string;
}

/** Props for SubnationalChoroplethMap component */
export interface SubnationalChoroplethMapProps {
  breakdowns: MapBreakdowns;
  viewLevel: ViewLevel;
  onViewLevelChange: (level: ViewLevel) => void;
  onFeatureClick?: (pcode: string, name: string, level: AllocationLevel) => void;
  isExpanded?: boolean;
}

/** Region name mapping from GeoJSON short names to full system names */
export const REGION_NAME_MAPPING: Record<string, string> = {
  'Ayeyarwady': 'Ayeyarwady Region',
  'Bago': 'Bago Region',
  'Bago (East)': 'Bago Region',
  'Bago (West)': 'Bago Region',
  'Chin': 'Chin State',
  'Kachin': 'Kachin State',
  'Kayah': 'Kayah State',
  'Kayin': 'Kayin State',
  'Magway': 'Magway Region',
  'Mandalay': 'Mandalay Region',
  'Mon': 'Mon State',
  'Nay Pyi Taw': 'Naypyidaw Union Territory',
  'Rakhine': 'Rakhine State',
  'Sagaing': 'Sagaing Region',
  'Shan': 'Shan State',
  'Shan (East)': 'Shan State',
  'Shan (North)': 'Shan State',
  'Shan (South)': 'Shan State',
  'Tanintharyi': 'Tanintharyi Region',
  'Yangon': 'Yangon Region'
};

/** State PCode mapping - maps ST_PCODE to our primary pcode for the state/region */
export const STATE_PCODE_MAPPING: Record<string, string> = {
  // Primary mappings
  'MMR001': 'MMR001',  // Kachin
  'MMR002': 'MMR002',  // Kayah
  'MMR003': 'MMR003',  // Kayin
  'MMR004': 'MMR004',  // Chin
  'MMR005': 'MMR005',  // Sagaing
  'MMR006': 'MMR006',  // Tanintharyi
  'MMR007': 'MMR007',  // Bago (East) - primary for Bago
  'MMR008': 'MMR007',  // Bago (West) -> Bago primary
  'MMR009': 'MMR009',  // Magway
  'MMR010': 'MMR010',  // Mandalay
  'MMR011': 'MMR011',  // Mon
  'MMR012': 'MMR012',  // Rakhine
  'MMR013': 'MMR013',  // Yangon
  'MMR014': 'MMR014',  // Shan (South) - primary for Shan
  'MMR015': 'MMR014',  // Shan (North) -> Shan primary
  'MMR016': 'MMR014',  // Shan (East) -> Shan primary
  'MMR017': 'MMR017',  // Ayeyarwady
  'MMR018': 'MMR018',  // Nay Pyi Taw
};

/** Default color scale for choropleth maps (matching existing design) */
export const DEFAULT_COLOR_SCALE: ColorScale = {
  stops: [
    { value: 0, color: '#f1f4f8' },    // Platinum
    { value: 5, color: '#e8eaed' },
    { value: 10, color: '#cfd0d5' },   // Pale Slate
    { value: 20, color: '#b3bcc5' },
    { value: 30, color: '#7b95a7' },   // Cool Steel
    { value: 50, color: '#647a8c' },
    { value: 70, color: '#4c5568' },   // Blue Slate
    { value: 90, color: '#3d4555' },
    { value: 100, color: '#dc2625' },  // Primary Scarlet
  ],
  interpolation: 'linear',
  nullColor: '#f1f4f8'
};
