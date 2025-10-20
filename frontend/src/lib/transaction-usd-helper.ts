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
 * @param value - The original transaction value
 * @param currency - The original currency code
 * @param valueDate - The value date for the transaction (for exchange rate lookup)
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
