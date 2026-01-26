import { apiFetch } from '@/lib/api-fetch';
/**
 * Client-side helper for currency conversion
 * Calls the server-side API to avoid CSP restrictions
 */

export interface ConversionResult {
  usd_amount: number | null;
  exchange_rate: number | null;
  success: boolean;
  error?: string;
  source?: string;
  conversion_date?: string;
}

/**
 * Convert an amount from one currency to USD using the server-side API
 * 
 * @param amount - The amount to convert
 * @param currency - The source currency code (e.g., 'EUR', 'GBP')
 * @param date - The date for historical conversion
 * @returns ConversionResult with USD amount and exchange rate
 */
export async function convertToUSD(
  amount: number,
  currency: string,
  date: Date
): Promise<ConversionResult> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    // Call server-side API
    const response = await apiFetch('/api/currency/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        date: dateStr,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        usd_amount: null,
        exchange_rate: null,
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result: ConversionResult = await response.json();
    return result;

  } catch (error) {
    console.error('[Currency Conversion API] Error:', error);
    return {
      usd_amount: null,
      exchange_rate: null,
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Convert an amount using GET request (better for caching)
 * 
 * @param amount - The amount to convert
 * @param currency - The source currency code
 * @param date - The date for historical conversion
 * @returns ConversionResult with USD amount and exchange rate
 */
export async function convertToUSDCached(
  amount: number,
  currency: string,
  date: Date
): Promise<ConversionResult> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    // Build query string
    const params = new URLSearchParams({
      amount: amount.toString(),
      currency,
      date: dateStr,
    });

    const response = await apiFetch(`/api/currency/convert?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        usd_amount: null,
        exchange_rate: null,
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result: ConversionResult = await response.json();
    return result;

  } catch (error) {
    console.error('[Currency Conversion API Cached] Error:', error);
    return {
      usd_amount: null,
      exchange_rate: null,
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}




