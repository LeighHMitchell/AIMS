// IATI Results Types for Activity Editor
// Based on IATI Standard v2.03 specification

// Multilingual narrative support
export interface Narrative {
  [languageCode: string]: string;
}

// IATI Result Types
export type ResultType = 'output' | 'outcome' | 'impact' | 'other';

// IATI Measure Types for Indicators
export type MeasureType = 'unit' | 'percentage' | 'currency' | 'qualitative';

// Status calculation for visual indicators
export interface StatusIndicator {
  percentage: number;
  color: 'green' | 'yellow' | 'red' | 'gray';
  label: string;
}

// Main Result entity
export interface ActivityResult {
  id: string;
  activity_id: string;
  type: ResultType;
  aggregation_status: boolean;
  title: Narrative;
  description?: Narrative;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Related data (populated by joins)
  indicators?: ResultIndicator[];
}

// Indicator entity
export interface ResultIndicator {
  id: string;
  result_id: string;
  measure: MeasureType;
  ascending: boolean;
  aggregation_status: boolean;
  title: Narrative;
  description?: Narrative;
  reference_vocab?: string;
  reference_code?: string;
  reference_uri?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Related data (populated by joins)
  baseline?: IndicatorBaseline;
  periods?: IndicatorPeriod[];
  
  // Computed fields for UI
  status?: StatusIndicator;
  latestActual?: number;
  totalTarget?: number;
}

// Baseline entity
export interface IndicatorBaseline {
  id: string;
  indicator_id: string;
  baseline_year?: number;
  iso_date?: string;
  value?: number;
  comment?: string;
  location_ref?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Period entity
export interface IndicatorPeriod {
  id: string;
  indicator_id: string;
  period_start: string;
  period_end: string;
  target_value?: number;
  target_comment?: string;
  target_location_ref?: string;
  actual_value?: number;
  actual_comment?: string;
  actual_location_ref?: string;
  facet: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Computed fields for UI
  status?: StatusIndicator;
  achievementRate?: number;
}

// Form data types for creating/editing
export interface CreateResultData {
  activity_id: string;
  type: ResultType;
  aggregation_status?: boolean;
  title: Narrative;
  description?: Narrative;
}

export interface CreateIndicatorData {
  result_id: string;
  measure: MeasureType;
  ascending?: boolean;
  aggregation_status?: boolean;
  title: Narrative;
  description?: Narrative;
  reference_vocab?: string;
  reference_code?: string;
  reference_uri?: string;
}

export interface CreateBaselineData {
  indicator_id: string;
  baseline_year?: number;
  iso_date?: string;
  value?: number;
  comment?: string;
  location_ref?: string;
}

export interface CreatePeriodData {
  indicator_id: string;
  period_start: string;
  period_end: string;
  target_value?: number;
  target_comment?: string;
  target_location_ref?: string;
  actual_value?: number;
  actual_comment?: string;
  actual_location_ref?: string;
  facet?: string;
}

// Update data types (partial for optimistic updates)
export type UpdateResultData = Partial<Omit<ActivityResult, 'id' | 'activity_id' | 'created_at' | 'created_by'>>;
export type UpdateIndicatorData = Partial<Omit<ResultIndicator, 'id' | 'result_id' | 'created_at' | 'created_by'>>;
export type UpdateBaselineData = Partial<Omit<IndicatorBaseline, 'id' | 'indicator_id' | 'created_at' | 'created_by'>>;
export type UpdatePeriodData = Partial<Omit<IndicatorPeriod, 'id' | 'indicator_id' | 'created_at' | 'created_by'>>;

// API response types
export interface ResultsResponse {
  results: ActivityResult[];
  total: number;
}

export interface IndicatorsResponse {
  indicators: ResultIndicator[];
  total: number;
}

// UI State types
export interface ResultsState {
  results: ActivityResult[];
  loading: boolean;
  error: string | null;
  selectedResult?: string;
  editingResult?: string;
  expandedIndicators: string[];
}

// Filter and sorting options
export interface ResultsFilter {
  type?: ResultType;
  search?: string;
  hasIndicators?: boolean;
}

export interface ResultsSortOption {
  field: 'title' | 'type' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

// Utility functions type definitions
export interface ResultsCalculations {
  calculateStatus: (indicator: ResultIndicator) => StatusIndicator;
  calculateAchievementRate: (period: IndicatorPeriod) => number;
  formatValue: (value: number, measure: MeasureType) => string;
  getTimelineProgress: (periods: IndicatorPeriod[], startDate?: string, endDate?: string) => number;
}

// Export helper type for component props
export interface ResultsTabProps {
  activityId: string;
  readOnly?: boolean;
  onResultsChange?: (results: ActivityResult[]) => void;
  defaultLanguage?: string;
  className?: string;
}

// IATI Reference vocabulary options (commonly used)
export const REFERENCE_VOCABULARIES = {
  '1': 'WB - World Bank',
  '2': 'UN - United Nations',
  '3': 'OECD-DAC',
  '4': 'Sphere Handbook',
  '5': 'IASC',
  '99': 'Reporting Organisation'
} as const;

// Result type display names
export const RESULT_TYPE_LABELS: Record<ResultType, string> = {
  output: 'Output',
  outcome: 'Outcome', 
  impact: 'Impact',
  other: 'Other'
};

// Measure type display names and formatting
export const MEASURE_TYPE_LABELS: Record<MeasureType, string> = {
  unit: 'Unit',
  percentage: 'Percentage',
  currency: 'Currency',
  qualitative: 'Qualitative'
};

// Status thresholds for traffic light indicators
export const STATUS_THRESHOLDS = {
  GREEN: 85, // >= 85% achievement
  YELLOW: 60, // 60-84% achievement
  RED: 0     // < 60% achievement
} as const;