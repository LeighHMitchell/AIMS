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

// ============================================================================
// IATI STANDARD INTERFACES
// ============================================================================

// Document Link (used at result, indicator, baseline, and period levels)
export interface DocumentLink {
  id: string;
  format?: string;
  url: string;
  title: Narrative;
  description?: Narrative;
  category_code?: string;
  language_code?: string;
  document_date?: string;
  link_type?: 'target' | 'actual' | 'general'; // Only for period document links
  created_at: string;
  updated_at: string;
}

// Reference (used at result and indicator levels)
export interface ResultReference {
  id: string;
  vocabulary: string;
  code: string;
  vocabulary_uri?: string;
  indicator_uri?: string; // Only for indicator references
  created_at: string;
}

// Dimension (used for disaggregation at baseline and period levels)
export interface Dimension {
  id: string;
  name: string;
  value: string;
  dimension_type: 'baseline' | 'target' | 'actual';
  created_at: string;
}

// Location reference
export interface LocationReference {
  id: string;
  location_ref: string;
  location_type?: 'target' | 'actual'; // Only for period locations
  created_at: string;
}

// ============================================================================
// IATI CODE MAPPINGS
// ============================================================================

// Result Type Code to String Mapping (IATI Standard codes)
export const RESULT_TYPE_CODE_MAP: Record<string, ResultType> = {
  '1': 'output',
  '2': 'outcome',
  '3': 'impact',
  '9': 'other'
};

// Reverse mapping for export
export const RESULT_TYPE_TO_CODE: Record<ResultType, string> = {
  'output': '1',
  'outcome': '2',
  'impact': '3',
  'other': '9'
};

// Measure Type Code to String Mapping (IATI Standard codes)
export const MEASURE_TYPE_CODE_MAP: Record<string, MeasureType> = {
  '1': 'unit',
  '2': 'percentage',
  '5': 'qualitative'
};

// Reverse mapping for export
export const MEASURE_TYPE_TO_CODE: Record<MeasureType, string> = {
  'unit': '1',
  'percentage': '2',
  'currency': '1', // Currency uses unit measure in IATI
  'qualitative': '5'
};

// Aggregation Status Mapping (IATI uses 1 for true, 0 for false)
export const parseAggregationStatus = (value: string | undefined): boolean => {
  if (!value) return false;
  return value === '1' || value === 'true';
};

export const formatAggregationStatus = (value: boolean): string => {
  return value ? '1' : '0';
};

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
  references?: ResultReference[];
  document_links?: DocumentLink[];
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
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Related data (populated by joins)
  baseline?: IndicatorBaseline;
  periods?: IndicatorPeriod[];
  references?: ResultReference[];
  document_links?: DocumentLink[];
  
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
  comment?: Narrative;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Related data (populated by joins)
  locations?: LocationReference[];
  dimensions?: Dimension[];
  document_links?: DocumentLink[];
}

// Period entity
export interface IndicatorPeriod {
  id: string;
  indicator_id: string;
  period_start: string;
  period_end: string;
  target_value?: number;
  target_comment?: Narrative;
  actual_value?: number;
  actual_comment?: Narrative;
  facet: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Related data (populated by joins)
  target_locations?: LocationReference[];
  actual_locations?: LocationReference[];
  target_dimensions?: Dimension[];
  actual_dimensions?: Dimension[];
  target_document_links?: DocumentLink[];
  actual_document_links?: DocumentLink[];
  
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
  references?: Omit<ResultReference, 'id' | 'created_at'>[];
  document_links?: Omit<DocumentLink, 'id' | 'created_at' | 'updated_at'>[];
}

export interface CreateIndicatorData {
  result_id: string;
  measure: MeasureType;
  ascending?: boolean;
  aggregation_status?: boolean;
  title: Narrative;
  description?: Narrative;
  references?: Omit<ResultReference, 'id' | 'created_at'>[];
  document_links?: Omit<DocumentLink, 'id' | 'created_at' | 'updated_at'>[];
}

export interface CreateBaselineData {
  indicator_id: string;
  baseline_year?: number;
  iso_date?: string;
  value?: number;
  comment?: Narrative;
  locations?: Omit<LocationReference, 'id' | 'created_at'>[];
  dimensions?: Omit<Dimension, 'id' | 'created_at'>[];
  document_links?: Omit<DocumentLink, 'id' | 'created_at' | 'updated_at'>[];
}

export interface CreatePeriodData {
  indicator_id: string;
  period_start: string;
  period_end: string;
  target_value?: number;
  target_comment?: Narrative;
  actual_value?: number;
  actual_comment?: Narrative;
  facet?: string;
  target_locations?: Omit<LocationReference, 'id' | 'created_at'>[];
  actual_locations?: Omit<LocationReference, 'id' | 'created_at'>[];
  target_dimensions?: Omit<Dimension, 'id' | 'created_at'>[];
  actual_dimensions?: Omit<Dimension, 'id' | 'created_at'>[];
  target_document_links?: Omit<DocumentLink, 'id' | 'created_at' | 'updated_at'>[];
  actual_document_links?: Omit<DocumentLink, 'id' | 'created_at' | 'updated_at'>[];
}

// Simplified form data for document links
export interface CreateDocumentLinkData {
  format?: string;
  url: string;
  title: Narrative;
  description?: Narrative;
  category_code?: string;
  language_code?: string;
  document_date?: string;
}

// Simplified form data for dimensions
export interface CreateDimensionData {
  name: string;
  value: string;
}

// Simplified form data for references
export interface CreateReferenceData {
  vocabulary: string;
  code: string;
  vocabulary_uri?: string;
  indicator_uri?: string;
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
  '1': 'IATI - Global Indicator Framework',
  '2': 'WB - World Bank',
  '3': 'UN - United Nations',
  '4': 'IMF - International Monetary Fund',
  '5': 'UNICEF',
  '6': 'WHO - World Health Organization',
  '7': 'SDG - Sustainable Development Goals',
  '8': 'OECD-DAC',
  '9': 'Sphere Standards',
  '99': 'Reporting Organisation'
} as const;

// Common dimension templates
export const DIMENSION_TEMPLATES = {
  sex: ['male', 'female', 'other', 'not specified'],
  age: ['0-5', '6-12', '13-17', '18-24', '25-49', '50-64', '65+'],
  disability: ['yes', 'no', 'not specified'],
  geographic: ['urban', 'rural'],
  status: ['refugee', 'idp', 'returnee', 'host community']
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