/**
 * Currency Resolution Helpers
 * 
 * Provides utility functions to resolve currency and value_date defaults
 * following the priority order: provided → activity → organization → USD
 */

import { getSupabaseAdmin } from './supabase';

/**
 * Resolve currency with priority order:
 * 1. Provided currency (if exists)
 * 2. Activity default_currency
 * 3. Provider organization default_currency (for transactions)
 * 4. Fallback to 'USD'
 * 
 * @param providedCurrency - Currency value provided in the request
 * @param activityId - Activity ID to fetch default_currency from
 * @param providerOrgId - Optional provider organization ID (for transactions)
 * @returns Promise<string> - Resolved currency code
 */
export async function resolveCurrency(
  providedCurrency: string | null | undefined,
  activityId: string,
  providerOrgId?: string | null
): Promise<string> {
  // 1. Use provided currency if available and valid
  if (providedCurrency && providedCurrency.trim() !== '') {
    return providedCurrency.toUpperCase();
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[Currency Helpers] No database connection, defaulting to USD');
      return 'USD';
    }

    // 2. Try to get activity default_currency
    const { data: activity } = await supabase
      .from('activities')
      .select('default_currency')
      .eq('id', activityId)
      .single();

    if (activity?.default_currency) {
      console.log(`[Currency Helpers] Using activity default_currency: ${activity.default_currency}`);
      return activity.default_currency;
    }

    // 3. Try to get provider organization default_currency (for transactions)
    if (providerOrgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('default_currency')
        .eq('id', providerOrgId)
        .single();

      if (org?.default_currency) {
        console.log(`[Currency Helpers] Using provider org default_currency: ${org.default_currency}`);
        return org.default_currency;
      }
    }

    // 4. Fallback to USD
    console.log('[Currency Helpers] No defaults found, using USD');
    return 'USD';

  } catch (error) {
    console.error('[Currency Helpers] Error resolving currency:', error);
    return 'USD';
  }
}

/**
 * Synchronous version of currency resolution when defaults are already available
 * 
 * @param providedCurrency - Currency value provided in the request
 * @param activityDefaultCurrency - Activity's default_currency (if available)
 * @param orgDefaultCurrency - Organization's default_currency (if available)
 * @returns string - Resolved currency code
 */
export function resolveCurrencySync(
  providedCurrency: string | null | undefined,
  activityDefaultCurrency?: string | null,
  orgDefaultCurrency?: string | null
): string {
  // 1. Use provided currency if available and valid
  if (providedCurrency && providedCurrency.trim() !== '') {
    return providedCurrency.toUpperCase();
  }

  // 2. Use activity default_currency if available
  if (activityDefaultCurrency && activityDefaultCurrency.trim() !== '') {
    return activityDefaultCurrency.toUpperCase();
  }

  // 3. Use organization default_currency if available
  if (orgDefaultCurrency && orgDefaultCurrency.trim() !== '') {
    return orgDefaultCurrency.toUpperCase();
  }

  // 4. Fallback to USD
  return 'USD';
}

/**
 * Resolve value_date with fallback
 * - For transactions: use transaction_date
 * - For budgets: use period_start
 * - For planned disbursements: use period_start
 * 
 * @param providedValueDate - Value date provided in the request
 * @param fallbackDate - Fallback date (transaction_date or period_start)
 * @returns string - Resolved value_date
 */
export function resolveValueDate(
  providedValueDate: string | null | undefined,
  fallbackDate: string
): string {
  // Use provided value_date if available and valid
  if (providedValueDate && providedValueDate.trim() !== '') {
    return providedValueDate;
  }

  // Use fallback date
  return fallbackDate;
}

/**
 * Validate that a currency code is a valid 3-letter ISO 4217 code format
 * 
 * @param currency - Currency code to validate
 * @returns boolean - True if valid format
 */
export function isValidCurrencyFormat(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency.toUpperCase());
}

/**
 * Format currency for display
 * 
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns string - Formatted currency string
 */
export function formatCurrencyAmount(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${currency.toUpperCase()} ${amount.toLocaleString('en-US')}`;
  }
}



