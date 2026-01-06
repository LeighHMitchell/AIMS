/**
 * National Priorities Types
 * Types for the hierarchical national development priorities system
 * Used by the Dashboard for fragmentation analysis
 */

// ============================================
// NATIONAL PRIORITY TYPES
// ============================================

/**
 * National Priority - represents a development priority at any level
 */
export interface NationalPriority {
  id: string;
  code: string;
  name: string;
  nameLocal?: string | null;
  description?: string | null;
  parentId?: string | null;
  level: number; // 1 = top level, 2 = sub, 3 = sub-sub, etc.
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Computed fields for UI
  children?: NationalPriority[];
  fullPath?: string; // e.g., "SC > Education > Primary Education"
  parentName?: string;
}

/**
 * Database row format (snake_case)
 */
export interface NationalPriorityRow {
  id: string;
  code: string;
  name: string;
  name_local?: string | null;
  description?: string | null;
  parent_id?: string | null;
  level: number;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Form data for creating/editing a national priority
 */
export interface NationalPriorityFormData {
  code: string;
  name: string;
  nameLocal?: string;
  description?: string;
  parentId?: string | null;
  isActive: boolean;
}

// ============================================
// ACTIVITY-PRIORITY MAPPING TYPES
// ============================================

/**
 * Activity-Priority mapping with percentage allocation
 */
export interface ActivityNationalPriority {
  id: string;
  activityId: string;
  nationalPriorityId: string;
  percentage: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  
  // Joined data for display
  nationalPriority?: NationalPriority;
}

/**
 * Database row format
 */
export interface ActivityNationalPriorityRow {
  id: string;
  activity_id: string;
  national_priority_id: string;
  percentage: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * Form data for linking activity to priority
 */
export interface ActivityNationalPriorityFormData {
  nationalPriorityId: string;
  percentage: number;
  notes?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Response for national priorities list
 */
export interface NationalPrioritiesResponse {
  success: boolean;
  data: NationalPriority[];
  count: number;
  error?: string;
}

/**
 * Response for single national priority
 */
export interface NationalPriorityResponse {
  success: boolean;
  data: NationalPriority;
  error?: string;
}

/**
 * Response for activity national priorities
 */
export interface ActivityNationalPrioritiesResponse {
  success: boolean;
  data: ActivityNationalPriority[];
  totalPercentage: number;
  error?: string;
}

// ============================================
// DASHBOARD TYPES
// ============================================

/**
 * Measure type for financial calculations
 */
export type MeasureType = 'commitments' | 'disbursements' | 'budgets' | 'plannedDisbursements';

/**
 * Dashboard filters
 */
export interface DashboardFilters {
  measure: MeasureType;
  dateFrom?: string;
  dateTo?: string;
  donorId?: string;
  sectorCode?: string;
}

/**
 * Single item in a ranked list (for bar charts)
 */
export interface RankedItem {
  id: string;
  name: string;
  code?: string;
  country?: string;
  value: number;
  activityCount: number;
  percentage?: number;
}

/**
 * Funding by type over time (for time series)
 */
export interface FundingByType {
  year: number;
  financeType: string;
  financeTypeName: string;
  value: number;
}

/**
 * Aid predictability data point
 */
export interface AidPredictabilityPoint {
  year: number;
  /** Display label for the year (e.g., "AU FY 2024-25" or "CY 2024") */
  yearLabel: string;
  plannedDisbursements: number;
  actualDisbursements: number;
}

/**
 * Main Dashboard data response
 */
export interface DashboardData {
  topDonorAgencies: RankedItem[];
  topDonorGroups: RankedItem[];
  topSectors: RankedItem[];
  topDistricts: RankedItem[];
  implementingAgencies: RankedItem[];
  executingAgencies: RankedItem[];
  recipientGovBodies: RankedItem[];
  fundingByType: FundingByType[];
  grandTotal: number;
}

/**
 * Dashboard API response
 */
export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
  measure: MeasureType;
  dateRange: {
    from: string;
    to: string;
  };
  error?: string;
}

// ============================================
// FRAGMENTATION HEATMAP TYPES
// ============================================

/**
 * Single cell in the fragmentation matrix
 */
export interface FragmentationCell {
  donorId: string;
  donorName: string;
  donorCountry?: string;
  categoryId: string;
  categoryName: string;
  categoryCode?: string;
  value: number; // USD amount
  percentage: number; // % of donor's total (row-based)
  percentageOfCategory: number; // % this donor contributes to category total (column-based)
  activityCount: number;
}

/**
 * Donor summary for fragmentation
 */
export interface FragmentationDonor {
  id: string;
  name: string;
  acronym?: string;
  country?: string;
  total: number;
}

/**
 * Category (column) in fragmentation matrix
 */
export interface FragmentationCategory {
  id: string;
  name: string;
  code?: string;
  total: number; // Sum of all donor values for this category
}

/**
 * Complete fragmentation data for heatmap
 */
export interface FragmentationData {
  donors: FragmentationDonor[];
  categories: FragmentationCategory[];
  cells: FragmentationCell[];
  grandTotal: number;
  othersTotal: number; // Amount aggregated into "OTHERS" row
}

/**
 * Fragmentation API response
 */
export interface FragmentationResponse {
  success: boolean;
  data: FragmentationData;
  measure: MeasureType;
  fragmentationType: 'program' | 'sector' | 'location';
  error?: string;
}

/**
 * Aid predictability API response
 */
export interface AidPredictabilityResponse {
  success: boolean;
  data: AidPredictabilityPoint[];
  dateRange: {
    from: string;
    to: string;
  };
  error?: string;
}

// ============================================
// COLOR SCALE TYPES
// ============================================

/**
 * Color scale threshold for heatmap
 */
export interface ColorThreshold {
  threshold: number; // Upper bound (exclusive)
  color: string;
  label: string;
}

/**
 * Color scale for fragmentation heatmaps (matching Timor-Leste AIMS dashboard style)
 * Colors progress from green (small share) through yellow/orange/red to dark green (dominant)
 */
export const FRAGMENTATION_COLOR_SCALE: ColorThreshold[] = [
  { threshold: 0.01, color: '#8bc34a', label: 'Less than 1%' },       // Light green
  { threshold: 0.05, color: '#cddc39', label: 'Between 1% and <5%' }, // Yellow-green
  { threshold: 0.10, color: '#ff9800', label: 'Between 5% and <10%' }, // Orange
  { threshold: 0.15, color: '#ff5722', label: 'Between 10% and <15%' }, // Red-orange
  { threshold: 0.20, color: '#8d6e63', label: 'Between 15% and <20%' }, // Brown
  { threshold: 1.01, color: '#388e3c', label: 'More than 20%' },      // Dark green
];

/**
 * Get color for a percentage value
 */
export function getColorForPercentage(percentage: number): string {
  for (const { threshold, color } of FRAGMENTATION_COLOR_SCALE) {
    if (percentage < threshold) return color;
  }
  return '#388e3c'; // Default to dark green for >20%
}

/**
 * Get text color for contrast on background
 */
export function getTextColorForBackground(backgroundColor: string): string {
  // Light backgrounds need dark text
  if (['#8bc34a', '#cddc39'].includes(backgroundColor)) {
    return '#000000';
  }
  return '#ffffff';
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Convert database row to frontend format
 */
export function nationalPriorityFromRow(row: NationalPriorityRow): NationalPriority {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameLocal: row.name_local,
    description: row.description,
    parentId: row.parent_id,
    level: row.level,
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

/**
 * Convert frontend format to database row
 */
export function nationalPriorityToRow(priority: Partial<NationalPriority>): Partial<NationalPriorityRow> {
  const row: Partial<NationalPriorityRow> = {};
  
  if (priority.id !== undefined) row.id = priority.id;
  if (priority.code !== undefined) row.code = priority.code;
  if (priority.name !== undefined) row.name = priority.name;
  if (priority.nameLocal !== undefined) row.name_local = priority.nameLocal;
  if (priority.description !== undefined) row.description = priority.description;
  if (priority.parentId !== undefined) row.parent_id = priority.parentId;
  if (priority.level !== undefined) row.level = priority.level;
  if (priority.displayOrder !== undefined) row.display_order = priority.displayOrder;
  if (priority.isActive !== undefined) row.is_active = priority.isActive;
  if (priority.createdBy !== undefined) row.created_by = priority.createdBy;
  if (priority.updatedBy !== undefined) row.updated_by = priority.updatedBy;
  
  return row;
}

/**
 * Build hierarchical tree from flat list
 */
export function buildPriorityTree(priorities: NationalPriority[]): NationalPriority[] {
  const map = new Map<string, NationalPriority>();
  const roots: NationalPriority[] = [];
  
  // First pass: create map with children arrays
  priorities.forEach(p => {
    map.set(p.id, { ...p, children: [] });
  });
  
  // Second pass: build tree
  priorities.forEach(p => {
    const node = map.get(p.id)!;
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  
  // Sort by display order
  const sortByOrder = (a: NationalPriority, b: NationalPriority) => 
    a.displayOrder - b.displayOrder;
  
  roots.sort(sortByOrder);
  map.forEach(node => node.children?.sort(sortByOrder));
  
  return roots;
}

/**
 * Build full path for a priority
 */
export function buildPriorityPath(
  priorityId: string, 
  priorities: NationalPriority[]
): string {
  const map = new Map<string, NationalPriority>();
  priorities.forEach(p => map.set(p.id, p));
  
  const path: string[] = [];
  let current = map.get(priorityId);
  
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }
  
  return path.join(' > ');
}

/**
 * Flatten a priority tree to a list
 */
export function flattenPriorityTree(tree: NationalPriority[]): NationalPriority[] {
  const result: NationalPriority[] = [];
  
  function traverse(nodes: NationalPriority[]) {
    nodes.forEach(node => {
      result.push(node);
      if (node.children?.length) {
        traverse(node.children);
      }
    });
  }
  
  traverse(tree);
  return result;
}

