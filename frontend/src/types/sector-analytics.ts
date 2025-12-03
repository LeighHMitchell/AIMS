/**
 * Sector Analytics Types
 * Types for the Sector Analytics dashboard feature
 */

/**
 * Individual sector data with financial metrics and counts
 */
export interface SectorMetrics {
  sectorCode: string
  sectorName: string
  categoryCode: string
  categoryName: string
  groupCode: string
  groupName: string
  
  // Financial metrics
  plannedDisbursements: number
  actualDisbursements: number
  outgoingCommitments: number
  budgets: number
  expenditures: number
  
  // Counts
  projectCount: number
  partnerCount: number
  
  // Percentages
  plannedPercentage: number
  actualPercentage: number
  commitmentPercentage: number
  budgetPercentage: number
}

/**
 * Hierarchical sector metrics for tree-style views
 */
export interface SectorHierarchyMetrics {
  code: string
  name: string
  level: 'group' | 'category' | 'sector' // 1-digit, 3-digit, 5-digit
  plannedDisbursements: number
  actualDisbursements: number
  outgoingCommitments: number
  budgets: number
  projectCount: number
  partnerCount: number
  children?: SectorHierarchyMetrics[]
}

/**
 * Filter state for sector analytics
 */
export interface SectorAnalyticsFilters {
  year?: string
  organizationId?: string
  vocabulary: 'DAC' | 'DAC-5' | 'DAC-3'
  groupByLevel: '1' | '3' | '5' // 1-digit (group), 3-digit (category), 5-digit (sector)
  publicationStatus?: 'published' | 'all' // Filter by activity publication status
}

/**
 * API response structure for sector analytics
 */
export interface SectorAnalyticsResponse {
  success: boolean
  data: SectorMetrics[]
  totalPlanned: number
  totalActual: number
  totalCommitments: number
  totalBudgets: number
  totalProjects: number
  totalPartners: number
  error?: string
}

/**
 * Chart data format for visualizations
 */
export interface SectorChartData {
  name: string
  code: string
  fullName: string
  planned: number
  actual: number
  commitments: number
  budgets: number
  projects: number
  partners: number
  percentage?: number
}

/**
 * Metric type for chart display toggle
 */
export type SectorMetricType = 'planned' | 'actual' | 'commitments' | 'budgets'

/**
 * Chart type for visualization toggle
 */
export type SectorChartType = 'stacked' | 'horizontal' | 'grouped'

/**
 * Sort field for table
 */
export type SectorSortField = 'name' | 'planned' | 'actual' | 'commitments' | 'budgets' | 'projects' | 'partners'

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Time series data point for sector visualization
 * Each point represents aggregated sector data for a specific year
 */
export interface SectorTimeSeriesDataPoint {
  year: string // "2020", "2021", etc.
  [sectorName: string]: number | string // Dynamic sector keys with values
}

/**
 * Raw time series data from API
 */
export interface SectorTimeSeriesData {
  year: string
  sectors: Record<string, number> // { "Agriculture": 12000000, ... }
  activityCount: number
  partnerCount: number
}

/**
 * Filter state for sector time series
 */
export interface SectorTimeSeriesFilters {
  sectors?: string[] // Selected sector codes to display
  yearRange?: { from: number; to: number }
  groupByLevel: '1' | '3' | '5'
  organizationId?: string
  dataType: 'planned' | 'actual'
}

/**
 * API response for sector time series
 */
export interface SectorTimeSeriesResponse {
  success: boolean
  data: SectorTimeSeriesData[]
  sectorNames: string[] // All unique sector names found
  sectorCodes?: Record<string, string> // Map of sector name to sector code
  years: string[] // All years in the data
  totals: Record<string, number> // Total by sector across all years
  error?: string
}

/**
 * Chart type for time series visualization
 */
export type TimeSeriesChartType = 'area' | 'line' | 'bar' | 'stacked-bar' | 'table'

/**
 * Data type toggle for time series
 */
export type TimeSeriesDataType = 'planned' | 'actual'

