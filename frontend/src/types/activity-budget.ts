// Activity Budget Types for IATI-compliant budget management

export interface ActivityBudget {
  id?: string;
  activity_id: string;
  type: BudgetType;
  status: BudgetStatus;
  period_start: string; // ISO date string
  period_end: string; // ISO date string
  value: number;
  currency: string; // ISO 4217 currency code
  value_date: string; // ISO date string
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface ActivityBudgetException {
  id?: string;
  activity_id: string;
  reason: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

// IATI Budget Type codes
export enum BudgetType {
  Original = 1,
  Revised = 2
}

// IATI Budget Status codes
export enum BudgetStatus {
  Indicative = 1,
  Committed = 2
}

// UI-specific budget type with additional fields
export interface ActivityBudgetUI extends ActivityBudget {
  isEditing?: boolean;
  isDraft?: boolean;
  validationErrors?: Record<string, string>;
}

// Budget totals view
export interface ActivityBudgetTotals {
  activity_id: string;
  revised_total: number;
  original_total: number;
  total_budget: number;
  budget_count: number;
  earliest_period: string | null;
  latest_period: string | null;
}

// Validation error types
export interface BudgetValidationErrors {
  period_start?: string;
  period_end?: string;
  value?: string;
  currency?: string;
  value_date?: string;
  type?: string;
  status?: string;
}

// Budget period for validation
export interface BudgetPeriod {
  start: Date;
  end: Date;
  budgetId?: string;
} 