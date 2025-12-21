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
  source_sector_code?: string; // DAC sector code that suggested this mapping
  source_sector_name?: string; // Readable sector name for display
  created_at?: string;
  updated_at?: string;
}

/**
 * Valid vocabulary codes for country budget items
 * 1-5: IATI standard vocabularies
 * 98-99: Country-specific (requires vocabulary_uri)
 */
export type BudgetVocabulary = '1' | '2' | '3' | '4' | '5' | '98' | '99';

/**
 * Country budget items grouped by vocabulary
 */
export interface CountryBudgetItems {
  id?: string;
  activity_id?: string;
  vocabulary: BudgetVocabulary; // '1' through '5', or '98'/'99' for country-specific
  vocabulary_uri?: string; // Required when vocabulary is '98' or '99' (IATI recommendation)
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

