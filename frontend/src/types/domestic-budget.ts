/**
 * Type definitions for Domestic Budget Data
 * Allows tracking of government budget and expenditure by fiscal year
 */

import { BudgetClassification, ClassificationType } from './aid-on-budget';

/**
 * Domestic budget data entry - links budget amounts to classifications by year
 */
export interface DomesticBudgetData {
  id: string;
  budgetClassificationId: string;
  fiscalYear: number;
  budgetAmount: number;
  expenditureAmount: number;
  currency: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;

  // Joined data
  budgetClassification?: BudgetClassification;
}

/**
 * Database row format (snake_case)
 */
export interface DomesticBudgetDataRow {
  id: string;
  budget_classification_id: string;
  fiscal_year: number;
  budget_amount: number;
  expenditure_amount: number;
  currency: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;

  // Joined data
  budget_classifications?: {
    id: string;
    code: string;
    name: string;
    classification_type: ClassificationType;
    level: number;
  };
}

/**
 * Form data for creating/editing domestic budget entries
 */
export interface DomesticBudgetFormData {
  budgetClassificationId: string;
  fiscalYear: number;
  budgetAmount: number;
  expenditureAmount: number;
  currency?: string;
  notes?: string;
}

/**
 * Summary of domestic budget by classification type
 */
export interface DomesticBudgetSummary {
  totalBudget: number;
  totalExpenditure: number;
  executionRate: number; // expenditure / budget * 100
  byClassificationType: {
    type: ClassificationType;
    budget: number;
    expenditure: number;
    executionRate: number;
  }[];
  byClassification: {
    classificationId: string;
    code: string;
    name: string;
    classificationType: ClassificationType;
    budget: number;
    expenditure: number;
    executionRate: number;
  }[];
}

/**
 * Filters for domestic budget data
 */
export interface DomesticBudgetFilters {
  fiscalYear?: number;
  classificationType?: ClassificationType | 'all';
  classificationId?: string;
}

/**
 * API response for domestic budget data
 */
export interface DomesticBudgetResponse {
  success: boolean;
  data: DomesticBudgetData[];
  summary?: DomesticBudgetSummary;
  error?: string;
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Convert database row to DomesticBudgetData
 */
export function toDomesticBudgetData(row: DomesticBudgetDataRow): DomesticBudgetData {
  return {
    id: row.id,
    budgetClassificationId: row.budget_classification_id,
    fiscalYear: row.fiscal_year,
    budgetAmount: Number(row.budget_amount) || 0,
    expenditureAmount: Number(row.expenditure_amount) || 0,
    currency: row.currency,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    budgetClassification: row.budget_classifications
      ? {
          id: row.budget_classifications.id,
          code: row.budget_classifications.code,
          name: row.budget_classifications.name,
          classificationType: row.budget_classifications.classification_type,
          level: row.budget_classifications.level,
          isActive: true,
          sortOrder: 0,
        }
      : undefined,
  };
}

/**
 * Convert form data to database row format
 */
export function toDomesticBudgetRow(
  data: DomesticBudgetFormData
): Partial<DomesticBudgetDataRow> {
  return {
    budget_classification_id: data.budgetClassificationId,
    fiscal_year: data.fiscalYear,
    budget_amount: data.budgetAmount,
    expenditure_amount: data.expenditureAmount,
    currency: data.currency || 'USD',
    notes: data.notes,
  };
}

/**
 * Calculate execution rate (percentage of budget spent)
 */
export function calculateExecutionRate(budget: number, expenditure: number): number {
  if (!budget || budget === 0) return 0;
  return Math.round((expenditure / budget) * 10000) / 100; // Round to 2 decimal places
}

/**
 * Generate fiscal year options (last 10 years to next 5 years)
 */
export function getFiscalYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear - 10; year <= currentYear + 5; year++) {
    years.push(year);
  }
  return years.reverse(); // Most recent first
}

/**
 * Default currency options
 */
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'UGX', label: 'Uganda Shilling (UGX)' },
  { value: 'KES', label: 'Kenyan Shilling (KES)' },
  { value: 'TZS', label: 'Tanzanian Shilling (TZS)' },
  { value: 'RWF', label: 'Rwandan Franc (RWF)' },
  { value: 'XOF', label: 'CFA Franc BCEAO (XOF)' },
  { value: 'XAF', label: 'CFA Franc BEAC (XAF)' },
];
