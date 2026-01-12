import { fixedCurrencyConverter } from './currency-converter-fixed';

export interface TransactionUSDResult {
  value_usd: number;
  exchange_rate_used: number;
  usd_conversion_date: string;
  usd_convertible: boolean;
  success: boolean;
  error?: string;
}

/**
 * Convert transaction value to USD following the same pattern as budgets and planned disbursements
 * 
 * IMPORTANT: Currency should be resolved using currency-helpers.ts before calling this function.
 * Use resolveCurrency() to check activity → organization → USD fallback chain.
 * 
 * @param value - The original transaction value (supports negative values for refunds/corrections)
 * @param currency - The resolved currency code (should never be null/undefined)
 * @param valueDate - The value date for the transaction (for exchange rate lookup).
 *                    Should default to transaction_date if not provided.
 * @returns Promise<TransactionUSDResult> - USD conversion result with all necessary fields
 */
export async function convertTransactionToUSD(
  value: number,
  currency: string,
  valueDate: string | Date
): Promise<TransactionUSDResult> {
  try {
    // Convert value date to Date object
    const conversionDate = valueDate instanceof Date ? valueDate : new Date(valueDate);
    
    // Handle USD transactions directly (like planned disbursements do)
    if (currency === 'USD') {
      return {
        value_usd: value,
        exchange_rate_used: 1.0,
        usd_conversion_date: new Date().toISOString(),
        usd_convertible: true,
        success: true
      };
    }

    // Convert non-USD currencies (following planned disbursements pattern)
    if (value && currency && currency !== 'USD') {
      try {
        const result = await fixedCurrencyConverter.convertToUSD(
          value,
          currency,
          conversionDate
        );
        
        if (result.success && result.usd_amount) {
          return {
            value_usd: result.usd_amount,
            exchange_rate_used: result.exchange_rate || 0,
            usd_conversion_date: new Date().toISOString(),
            usd_convertible: true,
            success: true
          };
        } else {
          // Conversion failed - mark as unconvertible
          return {
            value_usd: 0,
            exchange_rate_used: 0,
            usd_conversion_date: new Date().toISOString(),
            usd_convertible: false,
            success: false,
            error: result.error || 'Currency conversion failed'
          };
        }
      } catch (err) {
        console.error('Currency conversion error:', err);
        return {
          value_usd: 0,
          exchange_rate_used: 0,
          usd_conversion_date: new Date().toISOString(),
          usd_convertible: false,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown conversion error'
        };
      }
    }

    // Invalid input - no value or currency
    return {
      value_usd: 0,
      exchange_rate_used: 0,
      usd_conversion_date: new Date().toISOString(),
      usd_convertible: false,
      success: false,
      error: 'Missing value or currency for conversion'
    };
  } catch (err) {
    console.error('Transaction USD conversion error:', err);
    return {
      value_usd: 0,
      exchange_rate_used: 0,
      usd_conversion_date: new Date().toISOString(),
      usd_convertible: false,
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error during conversion'
    };
  }
}

/**
 * Add USD fields to transaction data object
 * 
 * @param transactionData - The base transaction data
 * @param usdResult - The USD conversion result
 * @returns Transaction data with USD fields included
 */
export function addUSDFieldsToTransaction(transactionData: any, usdResult: TransactionUSDResult) {
  return {
    ...transactionData,
    value_usd: usdResult.value_usd,
    exchange_rate_used: usdResult.exchange_rate_used,
    usd_conversion_date: usdResult.usd_conversion_date,
    usd_convertible: usdResult.usd_convertible
  };
}

/**
 * Get USD value from a transaction object with strict validation
 * 
 * This function:
 * - Only uses stored USD values or successful conversions
 * - Never falls back to original currency value (except for USD transactions)
 * - Returns 0 if transaction date is missing (never uses today's date)
 * - Normalizes transaction_type to string for comparison
 * 
 * @param transaction - Transaction object with value, currency, value_usd, etc.
 * @returns Promise<number> - USD value or 0 if conversion fails or date is missing
 */
export async function getTransactionUSDValue(transaction: any): Promise<number> {
  // First, try to get existing USD value from database
  let usdValue = parseFloat(transaction.value_usd) || 
                 parseFloat(transaction.value_USD) || 
                 parseFloat(transaction.usd_value) || 
                 0;

  // If transaction is already in USD but value_usd is missing, use the original value
  // (This is safe because it's already USD)
  if (!usdValue && transaction.currency === 'USD' && transaction.value && Number(transaction.value) > 0) {
    usdValue = parseFloat(String(transaction.value)) || 0;
  }

  // If we still don't have a USD value and transaction is NOT in USD, try to convert
  if (!usdValue && transaction.value && transaction.currency && transaction.currency !== 'USD') {
    // CRITICAL: Never use today's date as fallback - return 0 if date is missing
    const valueDate = transaction.value_date 
      ? new Date(transaction.value_date) 
      : transaction.transaction_date 
      ? new Date(transaction.transaction_date) 
      : null;
    
    if (!valueDate || isNaN(valueDate.getTime())) {
      // No valid date - return 0 (never use original currency value)
      console.warn(`[getTransactionUSDValue] Transaction ${transaction.id || transaction.uuid} has no valid date for conversion. Returning 0.`);
      return 0;
    }
    
    try {
      const result = await fixedCurrencyConverter.convertToUSD(
        parseFloat(String(transaction.value)),
        transaction.currency,
        valueDate
      );
      
      // Only use converted value if conversion was successful
      if (result.success && result.usd_amount != null && result.usd_amount > 0) {
        usdValue = result.usd_amount;
      } else {
        // Conversion failed - return 0 (never use original currency value)
        console.warn(`[getTransactionUSDValue] Failed to convert transaction ${transaction.id || transaction.uuid} to USD. Conversion result:`, result);
        return 0;
      }
    } catch (error) {
      // Conversion error - return 0 (never use original currency value)
      console.warn(`[getTransactionUSDValue] Error converting transaction ${transaction.id || transaction.uuid} to USD:`, error);
      return 0;
    }
  }

  // Return USD value or 0 (never return original currency value)
  return usdValue > 0 ? usdValue : 0;
}

/**
 * Synchronous version of getTransactionUSDValue for use in render contexts.
 *
 * This function:
 * - Only uses stored USD values (no real-time conversion)
 * - Falls back to original value only if currency is USD
 * - Returns 0 for non-USD transactions without stored USD conversion
 *
 * @param transaction - Transaction object with value, currency, value_usd, etc.
 * @returns number - USD value or 0 if no USD value available
 */
export function getTransactionUSDValueSync(transaction: any): number {
  // Check stored USD values (explicitly check for null/undefined)
  if (transaction.value_usd != null && !isNaN(Number(transaction.value_usd))) {
    return Number(transaction.value_usd);
  }
  if (transaction.value_USD != null && !isNaN(Number(transaction.value_USD))) {
    return Number(transaction.value_USD);
  }
  if (transaction.usd_value != null && !isNaN(Number(transaction.usd_value))) {
    return Number(transaction.usd_value);
  }
  // Only use original value if currency is USD
  if (transaction.currency === 'USD' && transaction.value != null && Number(transaction.value) > 0) {
    return Number(transaction.value);
  }
  // Return 0 for non-USD transactions without USD conversion (never mix currencies)
  return 0;
}

/**
 * Normalize transaction type to string for consistent comparison
 *
 * @param transactionType - Transaction type (can be string, number, or undefined)
 * @returns Normalized transaction type as string
 */
export function normalizeTransactionType(transactionType: any): string {
  if (transactionType === null || transactionType === undefined) {
    return '';
  }
  return String(transactionType);
}
