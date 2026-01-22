/**
 * Type definitions for Aid on Budget feature
 * Maps IATI aid data to country-specific budget classifications
 */

/**
 * Classification type categories
 */
export type ClassificationType = 'administrative' | 'functional' | 'functional_cofog' | 'economic' | 'programme' | 'revenue' | 'liabilities' | 'funding_sources' | 'country_sector';

/**
 * Budget Classification (Chart of Accounts entry)
 * Represents a single budget code in the country's classification system
 */
export interface BudgetClassification {
  id: string;
  code: string;
  name: string;
  nameLocal?: string;
  description?: string;
  classificationType: ClassificationType;
  parentId?: string;
  level: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;

  // For hierarchical display
  children?: BudgetClassification[];
  parent?: BudgetClassification;
}

/**
 * Database row format (snake_case)
 */
export interface BudgetClassificationRow {
  id: string;
  code: string;
  name: string;
  name_local?: string;
  description?: string;
  classification_type: ClassificationType;
  parent_id?: string;
  level: number;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * Sector to Budget Mapping
 * Defines how DAC sector codes map to budget classifications
 */
export interface SectorBudgetMapping {
  id: string;
  sectorCode: string;
  sectorName?: string;
  budgetClassificationId: string;
  budgetClassification?: BudgetClassification;
  percentage: number;
  isDefault: boolean;
  isCategoryLevel: boolean;  // true for 3-digit category mappings, false for 5-digit specific
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

/**
 * Database row format for sector mappings
 */
export interface SectorBudgetMappingRow {
  id: string;
  sector_code: string;
  sector_name?: string;
  budget_classification_id: string;
  percentage: number;
  is_default: boolean;
  is_category_level: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  // Joined data
  budget_classifications?: BudgetClassificationRow;
}

/**
 * Mapping source for country_budget_items
 */
export type MappingSource = 'manual' | 'auto' | 'imported';

/**
 * Aid on Budget Metrics for analytics
 */
export interface AidOnBudgetMetrics {
  budgetClassificationId: string;
  budgetCode: string;
  budgetName: string;
  classificationType: ClassificationType;
  level: number;
  parentCode?: string;

  // Financial metrics
  totalCommitments: number;
  totalDisbursements: number;
  totalBudget: number;
  totalExpenditure: number;

  // Counts
  activityCount: number;
  partnerCount: number;

  // Percentages
  aidShare: number;        // % of total aid going to this classification
  disbursementRate: number; // disbursements / commitments
}

/**
 * Filters for Aid on Budget analytics
 */
export interface AidOnBudgetFilters {
  fiscalYear?: string;
  classificationType?: ClassificationType | 'all';
  organizationId?: string;
  level?: '1' | '2' | '3' | 'all';
  dateFrom?: string;
  dateTo?: string;
}

/**
 * API response for Aid on Budget analytics
 */
export interface AidOnBudgetResponse {
  success: boolean;
  data: AidOnBudgetMetrics[];
  totalAid: number;
  activityCount: number;
  mappedActivityCount: number;
  mappingCoverage: number;  // % of activities with budget mappings
  byClassificationType: {
    type: ClassificationType;
    totalAmount: number;
    count: number;
  }[];
  error?: string;
}

/**
 * Suggested mapping from auto-mapper
 */
export interface SuggestedMapping {
  budgetClassificationId: string;
  budgetClassification: BudgetClassification;
  percentage: number;
  sourceSector: {
    code: string;
    name: string;
    percentage: number;  // Activity's sector percentage
  };
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Auto-mapping result
 */
export interface AutoMappingResult {
  success: boolean;
  activityId: string;
  suggestions: SuggestedMapping[];
  unmappedSectors: {
    code: string;
    name: string;
    percentage: number;
  }[];
  coveragePercent: number;  // % of activity sectors that have mappings
}

/**
 * Batch auto-mapping result
 */
export interface BatchAutoMappingResult {
  success: number;
  failed: number;
  skipped: number;  // Already mapped
  errors: string[];
  details: {
    activityId: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }[];
}

/**
 * Chart data structure for AidOnBudgetChart
 */
export interface AidOnBudgetChartData {
  centerData: {
    total: number;
    breakdown: {
      type: 'On-Budget' | 'Off-Budget' | 'Unmapped';
      value: number;
    }[];
  };
  sectorData: {
    name: string;
    code: string;
    value: number;
    breakdown: number[];  // [On-Budget %, Off-Budget %, Unmapped %]
  }[];
}

/**
 * Form data for creating/editing budget classifications
 */
export interface BudgetClassificationFormData {
  code: string;
  name: string;
  nameLocal?: string;
  description?: string;
  classificationType: ClassificationType;
  parentId?: string;
  isActive: boolean;
  sortOrder?: number;
}

/**
 * Form data for creating/editing sector mappings
 */
export interface SectorBudgetMappingFormData {
  sectorCode: string;
  sectorName?: string;
  budgetClassificationId: string;
  percentage: number;
  isDefault: boolean;
  isCategoryLevel: boolean;
  notes?: string;
}

/**
 * Grouped sector mapping - groups all 4 classification types for a sector
 */
export interface GroupedSectorMapping {
  sectorCode: string;
  sectorName: string;
  isCategoryLevel: boolean;
  hasOverride?: boolean;  // True if this is a specific sector that overrides a category default
  mappings: {
    functional?: SectorBudgetMapping;
    functional_cofog?: SectorBudgetMapping;
    administrative?: SectorBudgetMapping;
    economic?: SectorBudgetMapping;
    programme?: SectorBudgetMapping;
    revenue?: SectorBudgetMapping;
    liabilities?: SectorBudgetMapping;
    funding_sources?: SectorBudgetMapping;
    country_sector?: SectorBudgetMapping;
  };
}

/**
 * Sector with mapping status for admin display
 */
export interface SectorMappingStatus {
  sectorCode: string;
  sectorName: string;
  categoryCode: string;  // 3-digit category
  categoryName: string;
  isMapped: boolean;
  hasCategoryMapping: boolean;
  hasSpecificMapping: boolean;
  mappingCount: number;  // Number of classification types mapped
}

/**
 * Import format for bulk budget classification import
 */
export interface BudgetClassificationImportRow {
  code: string;
  name: string;
  name_local?: string;
  description?: string;
  classification_type: ClassificationType;
  parent_code?: string;  // Reference by code, not ID
  level?: number;
  sort_order?: number;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: {
    row: number;
    code: string;
    error: string;
  }[];
}

// ============================================================================
// Utility functions for type conversion
// ============================================================================

/**
 * Convert database row to BudgetClassification
 */
export function toBudgetClassification(row: BudgetClassificationRow): BudgetClassification {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameLocal: row.name_local,
    description: row.description,
    classificationType: row.classification_type,
    parentId: row.parent_id,
    level: row.level,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

/**
 * Convert BudgetClassification to database row format
 */
export function toBudgetClassificationRow(
  data: BudgetClassificationFormData
): Partial<BudgetClassificationRow> {
  return {
    code: data.code,
    name: data.name,
    name_local: data.nameLocal,
    description: data.description,
    classification_type: data.classificationType,
    parent_id: data.parentId,
    is_active: data.isActive,
    sort_order: data.sortOrder ?? 0,
  };
}

/**
 * Convert database row to SectorBudgetMapping
 */
export function toSectorBudgetMapping(row: SectorBudgetMappingRow): SectorBudgetMapping {
  return {
    id: row.id,
    sectorCode: row.sector_code,
    sectorName: row.sector_name,
    budgetClassificationId: row.budget_classification_id,
    budgetClassification: row.budget_classifications
      ? toBudgetClassification(row.budget_classifications)
      : undefined,
    percentage: row.percentage,
    isDefault: row.is_default,
    isCategoryLevel: row.is_category_level ?? false,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

/**
 * Build hierarchical tree from flat list
 */
export function buildClassificationTree(
  classifications: BudgetClassification[]
): BudgetClassification[] {
  const map = new Map<string, BudgetClassification>();
  const roots: BudgetClassification[] = [];

  // First pass: create map
  classifications.forEach((c) => {
    map.set(c.id, { ...c, children: [] });
  });

  // Second pass: build tree
  classifications.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      const parent = map.get(c.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort by sort_order at each level
  const sortNodes = (nodes: BudgetClassification[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        sortNodes(n.children);
      }
    });
  };
  sortNodes(roots);

  return roots;
}

/**
 * Classification type display labels
 */
export const CLASSIFICATION_TYPE_LABELS: Record<ClassificationType, string> = {
  administrative: 'Line Ministries',
  functional: 'Functional - National',
  functional_cofog: 'Functional - COFOG',
  economic: 'Economic',
  programme: 'Programme',
  revenue: 'Revenue',
  liabilities: 'Liabilities',
  funding_sources: 'Funding Sources',
  country_sector: 'Country Sectors',
};

/**
 * Classification type descriptions
 */
export const CLASSIFICATION_TYPE_DESCRIPTIONS: Record<ClassificationType, string> = {
  administrative: 'Government ministries and agencies that receive and manage aid funds (budget vote holders)',
  functional: 'By purpose or function (national classification)',
  functional_cofog: 'By purpose or function (COFOG international standard)',
  economic: 'By type of expenditure (salaries, goods, grants)',
  programme: 'By government programme or project',
  revenue: 'By source of revenue (grants, loans, taxes)',
  liabilities: 'By type of liability (loans, debt obligations)',
  funding_sources: 'By development partner (multilateral and bilateral)',
  country_sector: 'Country-specific sector classification mapped from DAC sectors',
};

// ============================================================================
// Enhanced Aid on Budget Types (with Domestic Budget integration)
// ============================================================================

import { BudgetStatusType } from './activity-budget-status';

/**
 * Enhanced summary including domestic budget data
 */
export interface EnhancedAidOnBudgetSummary {
  // Aid totals
  totalAid: number;
  totalOnBudgetAid: number;
  totalOffBudgetAid: number;
  totalPartialAid: number;
  totalUnknownAid: number;
  totalBudgetSupport: number; // A01 and A02 aid types

  // Domestic totals
  totalDomesticBudget: number;
  totalDomesticExpenditure: number;
  domesticExecutionRate: number;

  // Combined metrics
  totalSpending: number; // domestic expenditure + on-budget aid
  aidShareOfBudget: number; // on-budget aid / (domestic + on-budget aid)
  onBudgetPercentage: number; // on-budget aid / total aid

  // Counts
  activityCount: number;
  mappedActivityCount: number;
  onBudgetActivityCount: number;
  offBudgetActivityCount: number;
  partialActivityCount: number;
  unknownActivityCount: number;
  budgetSupportActivityCount: number;
}

/**
 * Data point for enhanced chart visualization
 */
export interface EnhancedChartDataPoint {
  name: string;
  code: string;
  classificationType: ClassificationType;
  level: number;

  // Values in USD
  domesticBudget: number;
  domesticExpenditure: number;
  onBudgetAid: number;
  offBudgetAid: number;
  partialAid: number;
  unknownAid: number;

  // Derived metrics
  totalAid: number;
  totalSpending: number;
  aidShare: number;
}

/**
 * Enhanced chart data structure
 */
export interface EnhancedAidOnBudgetChartData {
  centerData: {
    total: number;
    breakdown: {
      type: 'Domestic Spending' | 'Aid on Budget' | 'Aid off Budget' | 'Budget Support';
      value: number;
      color: string;
    }[];
  };
  sectorData: EnhancedChartDataPoint[];
  fiscalYear: number;
  currency: string;
}

/**
 * Filters for enhanced Aid on Budget analytics
 */
export interface EnhancedAidOnBudgetFilters {
  fiscalYear?: number;
  classificationType?: ClassificationType | 'all';
  level?: number | 'all';
  includeUnmapped?: boolean;
  organizationId?: string;
}

/**
 * API response for enhanced Aid on Budget analytics
 */
export interface EnhancedAidOnBudgetResponse {
  success: boolean;
  data: EnhancedChartDataPoint[];
  summary: EnhancedAidOnBudgetSummary;
  chartData: EnhancedAidOnBudgetChartData;
  filters: EnhancedAidOnBudgetFilters;
  error?: string;
}

/**
 * Activity with budget status for aggregation
 */
export interface ActivityBudgetStatusAggregation {
  activityId: string;
  iatiIdentifier?: string;
  title?: string;
  budgetStatus: BudgetStatusType;
  onBudgetPercentage?: number;
  totalDisbursements: number;
  totalCommitments: number;
  budgetClassificationIds: string[];
}

/**
 * Comparison row for domestic vs aid table
 */
export interface DomesticAidComparisonRow {
  classificationId: string;
  code: string;
  name: string;
  classificationType: ClassificationType;
  level: number;

  // Amounts
  domesticBudget: number;
  domesticExpenditure: number;
  onBudgetAid: number;
  offBudgetAid: number;
  totalAid: number;
  total: number;

  // Percentages
  executionRate: number;
  aidSharePercent: number;
  onBudgetAidSharePercent: number;
}

/**
 * Chart color scheme for enhanced visualization - Brand palette
 */
export const ENHANCED_CHART_COLORS = {
  // Brand palette
  primaryScarlet: '#dc2625', // Primary Scarlet - off-budget/alerts
  paleSlate: '#cfd0d5',      // Pale Slate - budget support/borders
  blueSlate: '#4c5568',      // Blue Slate - domestic spending/text
  coolSteel: '#7b95a7',      // Cool Steel - on-budget aid
  platinum: '#f1f4f8',       // Platinum - backgrounds

  // Semantic mappings
  domestic: '#4c5568',       // Blue Slate for domestic spending
  onBudgetAid: '#7b95a7',    // Cool Steel for on-budget aid
  offBudgetAid: '#dc2625',   // Primary Scarlet for off-budget aid
  budgetSupport: '#cfd0d5',  // Pale Slate for budget support
  unknownAid: '#cfd0d5',     // Pale Slate for unknown
};
