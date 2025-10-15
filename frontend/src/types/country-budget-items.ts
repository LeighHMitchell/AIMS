/**
 * Type definitions for IATI Country Budget Items
 * Used for country-budget-items element in IATI 2.03 standard
 */

/**
 * Multi-language narrative type
 * Keys are ISO 639-1 language codes (e.g., 'en', 'fr', 'es')
 */
export interface Narrative {
  [languageCode: string]: string;
}

/**
 * Individual budget item within a country-budget-items element
 */
export interface BudgetItem {
  id?: string;
  code: string;
  percentage: number;
  description?: Narrative; // Multi-language support
  created_at?: string;
  updated_at?: string;
}

/**
 * Country budget items grouped by vocabulary
 */
export interface CountryBudgetItems {
  id?: string;
  activity_id?: string;
  vocabulary: string; // '1' through '5'
  budget_items: BudgetItem[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * Budget identifier from IATI codelist
 */
export interface BudgetIdentifier {
  code: string;
  name: string;
  description: string;
  category: string;
  categoryName: string;
}

/**
 * API response for country budget items
 */
export interface CountryBudgetItemsResponse {
  country_budget_items: CountryBudgetItems[];
}

/**
 * Validation result for budget items
 */
export interface BudgetItemsValidation {
  isValid: boolean;
  percentageSum: number;
  errors: string[];
}

