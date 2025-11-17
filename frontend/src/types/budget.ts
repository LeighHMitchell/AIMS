// IATI-compliant Budget Types

// Budget Type codes based on IATI standard
export type BudgetType = '1' | '2'; // 1 = Original, 2 = Revised

export const BUDGET_TYPE_LABELS: Record<BudgetType, string> = {
  '1': 'Original',
  '2': 'Revised',
};

// Budget Status codes based on IATI standard
export type BudgetStatus = '1' | '2'; // 1 = Indicative, 2 = Committed

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  '1': 'Indicative',
  '2': 'Committed',
};

// Budget interface matching database schema
export interface Budget {
  id: string;
  activity_id: string;
  type: BudgetType | number; // Can be number from DB or string type
  status: BudgetStatus | number; // Can be number from DB or string type
  period_start: string; // Date string
  period_end: string; // Date string
  value: number;
  currency: string;
  value_date: string; // Date string
  value_usd?: number | null; // Mapped from usd_value in API
  usd_value?: number | null; // Original DB field name
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  budget_lines?: any[]; // Budget line items if applicable
  
  // Related activity data (from join)
  activity?: {
    id: string;
    title_narrative?: string;
    title?: string;
    iati_identifier?: string;
  };
}

// Budget filter state
export interface BudgetFilter {
  type: string;
  status: string;
  organization: string;
  dateFrom: string;
  dateTo: string;
}

// Budget response from API
export interface BudgetResponse {
  budgets: Budget[];
  total: number;
  page: number;
  limit: number;
}

