/**
 * Fixed Currency Converter with Proper Fallback Logic
 * This version ensures EUR and other currencies convert automatically
 */

import { getSupabaseAdmin } from './supabase';

export interface ConversionResult {
  usd_amount: number | null;
  exchange_rate: number | null;
  success: boolean;
  error?: string;
  source?: string;
  conversion_date?: string;
}

export interface ExchangeRate {
  id?: string;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  rate_date: string;
  source: string;
  created_at?: string;
}

class FixedCurrencyConverter {
  private readonly API_BASE_URL = 'https://api.exchangerate.host';
  private readonly FALLBACK_API_URL = 'https://api.fxratesapi.com';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  private readonly DEFAULT_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW',
    'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'DKK', 'THB', 'MYR', 'PHP'
  ];

  /**
   * Enhanced getHistoricalRate with proper fallback logic
   */
  async getHistoricalRate(
    fromCurrency: string, 
    toCurrency: string, 
    date: Date
  ): Promise<{ rate: number; source: string } | null> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const dateStr = date.toISOString().split('T')[0];

    // Handle same currency conversion
    if (from === to) {
      return { rate: 1.0, source: 'direct' };
    }

    try {
      // Strategy 1: Check exact date cache
      const cachedRate = await this.getCachedRate(from, to, dateStr);
      if (cachedRate) {
        console.log(`[FixedConverter] Using cached rate for ${from}→${to} on ${dateStr}: ${cachedRate.exchange_rate}`);
        return { rate: cachedRate.exchange_rate, source: 'cache' };
      }

      // Strategy 2: Try API for exact date
      const apiRate = await this.fetchRateWithRetry(from, to, dateStr);
      if (apiRate !== null) {
        await this.cacheRate(from, to, dateStr, apiRate, 'api');
        console.log(`[FixedConverter] Fetched rate from API for ${from}→${to} on ${dateStr}: ${apiRate}`);
        return { rate: apiRate, source: 'api' };
      }

      // Strategy 3: Look for nearby cached rates (within 30 days)
      const nearbyRate = await this.findNearbyRate(from, to, dateStr);
      if (nearbyRate) {
        console.log(`[FixedConverter] Using nearby cached rate for ${from}→${to}: ${nearbyRate.exchange_rate} from ${nearbyRate.rate_date}`);
        return { rate: nearbyRate.exchange_rate, source: 'cache-nearby' };
      }

      // Strategy 4: For historical dates (>1 year old), look for ANY cached rate for this currency pair
      const targetDate = new Date(dateStr);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (targetDate < oneYearAgo) {
        const anyHistoricalRate = await this.findAnyHistoricalRate(from, to, dateStr);
        if (anyHistoricalRate) {
          console.log(`[FixedConverter] Using historical fallback rate for ${from}→${to}: ${anyHistoricalRate.exchange_rate} from ${anyHistoricalRate.rate_date}`);
          return { rate: anyHistoricalRate.exchange_rate, source: 'historical-fallback' };
        }
      }

      // Strategy 5: Try current date if original date is future/problematic
      const today = new Date().toISOString().split('T')[0];
      if (dateStr !== today) {
        const currentRate = await this.fetchRateWithRetry(from, to, today);
        if (currentRate !== null) {
          await this.cacheRate(from, to, dateStr, currentRate, 'current-fallback');
          console.log(`[FixedConverter] Using current date fallback for ${from}→${to}: ${currentRate}`);
          return { rate: currentRate, source: 'current-fallback' };
        }
      }

      console.warn(`[FixedConverter] No rate found for ${from}→${to} on ${dateStr}`);
      return null;

    } catch (error) {
      console.error(`[FixedConverter] Error getting historical rate for ${from}→${to} on ${dateStr}:`, error);
      return null;
    }
  }

  /**
   * Find nearby cached rate within 30 days
   */
  private async findNearbyRate(from: string, to: string, targetDate: string): Promise<ExchangeRate | null> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return null;

      // Look for rates within 30 days before and after the target date
      const targetDateObj = new Date(targetDate);
      const thirtyDaysBefore = new Date(targetDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAfter = new Date(targetDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', from)
        .eq('to_currency', to)
        .gte('rate_date', thirtyDaysBefore.toISOString().split('T')[0])
        .lte('rate_date', thirtyDaysAfter.toISOString().split('T')[0])
        .order('rate_date', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return null;

      return data[0];
    } catch (error) {
      console.warn(`[FixedConverter] Error finding nearby rate:`, error);
      return null;
    }
  }

  /**
   * Find ANY historical rate for very old dates (fallback for dates >1 year old)
   * This searches for the closest rate on or before the target date, regardless of how far back
   */
  private async findAnyHistoricalRate(from: string, to: string, targetDate: string): Promise<ExchangeRate | null> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return null;

      // Look for the most recent rate on or before the target date
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', from)
        .eq('to_currency', to)
        .lte('rate_date', targetDate)
        .order('rate_date', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return null;

      return data[0];
    } catch (error) {
      console.warn(`[FixedConverter] Error finding historical rate:`, error);
      return null;
    }
  }

  /**
   * Convert amount to USD using enhanced fallback logic
   */
  async convertToUSD(
    amount: number, 
    currency: string, 
    transactionDate: Date
  ): Promise<ConversionResult> {
    try {
      if (amount <= 0) {
        return { 
          usd_amount: null, 
          exchange_rate: null, 
          success: false, 
          error: 'Invalid amount: must be greater than 0' 
        };
      }

      const currencyCode = currency.toUpperCase();
      const dateStr = transactionDate.toISOString().split('T')[0];

      // Already USD - but still return the amount to populate USD Value field
      if (currencyCode === 'USD') {
        return { 
          usd_amount: amount, 
          exchange_rate: 1.0, 
          success: true,
          source: 'direct',
          conversion_date: dateStr
        };
      }

      // Check if currency is supported
      if (!this.DEFAULT_CURRENCIES.includes(currencyCode)) {
        return { 
          usd_amount: null, 
          exchange_rate: null, 
          success: false, 
          error: `Currency ${currencyCode} is not supported for conversion` 
        };
      }

      // Get exchange rate with enhanced fallback
      const rateResult = await this.getHistoricalRate(currencyCode, 'USD', transactionDate);
      
      if (!rateResult) {
        return { 
          usd_amount: null, 
          exchange_rate: null, 
          success: false, 
          error: `No exchange rate available for ${currencyCode} on ${dateStr}` 
        };
      }

      // Calculate USD amount with proper rounding
      const usdAmount = Math.round(amount * rateResult.rate * 100) / 100;

      console.log(`[FixedConverter] Converted ${amount} ${currencyCode} → $${usdAmount} USD (rate: ${rateResult.rate}, source: ${rateResult.source})`);

      return {
        usd_amount: usdAmount,
        exchange_rate: rateResult.rate,
        success: true,
        source: rateResult.source,
        conversion_date: dateStr
      };

    } catch (error) {
      console.error('[FixedConverter] Conversion error:', error);
      return {
        usd_amount: null,
        exchange_rate: null,
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed'
      };
    }
  }

  /**
   * Convert a single transaction to USD
   */
  async convertTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }

      // Get transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('uuid', transactionId)
        .single();

      if (fetchError || !transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // Skip if already converted (but not for USD transactions - they still need USD value populated)
      if (transaction.value_usd !== null && transaction.currency !== 'USD') {
        console.log(`[FixedConverter] Transaction ${transactionId} already converted`);
        return { success: true };
      }

      // Use value_date if available, otherwise transaction_date
      const conversionDate = new Date(transaction.value_date || transaction.transaction_date);

      console.log(`[FixedConverter] Converting transaction ${transactionId}: ${transaction.value} ${transaction.currency} on ${conversionDate.toISOString().split('T')[0]}`);

      // Convert to USD (even for USD transactions to handle value_date scenarios)
      const result = await this.convertToUSD(
        transaction.value,
        transaction.currency,
        conversionDate
      );

      if (!result.success) {
        console.log(`[FixedConverter] Conversion failed for transaction ${transactionId}: ${result.error}`);
        
        // Mark as unconvertible (only for non-USD currencies)
        if (transaction.currency !== 'USD') {
          await supabase
            .from('transactions')
            .update({
              usd_convertible: false,
              usd_conversion_date: new Date().toISOString()
            })
            .eq('uuid', transactionId);
        }

        return { success: false, error: result.error };
      }

      // Update transaction with USD value
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          value_usd: result.usd_amount,
          exchange_rate_used: result.exchange_rate,
          usd_conversion_date: new Date().toISOString(),
          usd_convertible: true
        })
        .eq('uuid', transactionId);

      if (updateError) {
        console.error('[FixedConverter] Error updating transaction:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`[FixedConverter] Successfully converted transaction ${transactionId}: ${transaction.value} ${transaction.currency} → $${result.usd_amount} USD`);
      return { success: true };

    } catch (error) {
      console.error('[FixedConverter] Transaction conversion error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Private helper methods
   */
  private async getCachedRate(from: string, to: string, date: string): Promise<ExchangeRate | null> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', from)
        .eq('to_currency', to)
        .eq('rate_date', date)
        .single();

      if (error || !data) return null;

      return data;
    } catch (error) {
      return null;
    }
  }

  private async cacheRate(from: string, to: string, date: string, rate: number, source: string): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return;

      await supabase
        .from('exchange_rates')
        .upsert({
          from_currency: from,
          to_currency: to,
          exchange_rate: rate,
          rate_date: date,
          source,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'from_currency,to_currency,rate_date'
        });
    } catch (error) {
      console.warn('[FixedConverter] Failed to cache rate:', error);
    }
  }

  private async fetchRateWithRetry(from: string, to: string, date: string): Promise<number | null> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const rate = await this.fetchRateFromAPI(from, to, date);
        if (rate !== null) return rate;
      } catch (error) {
        console.warn(`[FixedConverter] Attempt ${attempt} failed for ${from}→${to} on ${date}:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
        }
      }
    }
    return null;
  }

  private async fetchRateFromAPI(from: string, to: string, date: string): Promise<number | null> {
    try {
      // Don't fetch rates for future dates
      const today = new Date().toISOString().split('T')[0];
      if (date > today) {
        console.warn(`[FixedConverter] Cannot fetch rate for future date: ${date}`);
        return null;
      }

      // Try primary API (ExchangeRate.host with API key) - most reliable
      const apiKey = process.env.EXCHANGERATE_HOST_API_KEY;
      if (apiKey) {
        try {
          const url = `${this.API_BASE_URL}/${date}?base=${from}&symbols=${to}&access_key=${apiKey}`;
          console.log(`[FixedConverter] Fetching rate from ExchangeRate.host: ${url.replace(apiKey, 'API_KEY')}`);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'AIMS Currency Converter/1.0'
            }
          });

          if (!response.ok) {
            throw new Error(`ExchangeRate.host API request failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          
          // Check for API errors
          if (!data.success) {
            throw new Error(`ExchangeRate.host API error: ${data.error?.info || data.error || 'Unknown error'}`);
          }

          // Extract rate
          const rates = data.rates || {};
          if (!(to in rates)) {
            throw new Error(`Rate for ${to} not found in ExchangeRate.host response`);
          }

          const rate = rates[to];
          if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
            throw new Error(`Invalid rate value from ExchangeRate.host: ${rate}`);
          }

          console.log(`[FixedConverter] ExchangeRate.host success: ${from}→${to} = ${rate} on ${date}`);
          return rate;

        } catch (primaryError) {
          console.warn(`[FixedConverter] ExchangeRate.host failed, trying fallback:`, primaryError);
        }
      } else {
        console.warn(`[FixedConverter] No ExchangeRate.host API key found, trying fallback APIs`);
      }

      // Try fallback API (fxratesapi.com) - free but limited historical data
      try {
        const fallbackUrl = `${this.FALLBACK_API_URL}/historical?date=${date}&base=${from}&symbols=${to}`;
        console.log(`[FixedConverter] Fetching rate from fallback API: ${fallbackUrl}`);
        
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'AIMS Currency Converter/1.0'
          }
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Fallback API request failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }

        const fallbackData = await fallbackResponse.json();
        
        // Check for API errors
        if (!fallbackData.success) {
          throw new Error(`Fallback API error: ${fallbackData.error || 'Unknown error'}`);
        }

        // Extract rate
        const fallbackRates = fallbackData.rates || {};
        if (!(to in fallbackRates)) {
          throw new Error(`Rate for ${to} not found in fallback API response`);
        }

        const fallbackRate = fallbackRates[to];
        if (typeof fallbackRate !== 'number' || isNaN(fallbackRate) || fallbackRate <= 0) {
          throw new Error(`Invalid rate value from fallback API: ${fallbackRate}`);
        }

        console.log(`[FixedConverter] Fallback API success: ${from}→${to} = ${fallbackRate} on ${date}`);
        return fallbackRate;

      } catch (fallbackError) {
        console.error(`[FixedConverter] Fallback API also failed:`, fallbackError);
        
        // Last resort: try current rate for today's date only
        if (date === today) {
          try {
            const currentUrl = `https://api.exchangerate-api.com/v4/latest/${from}`;
            console.log(`[FixedConverter] Trying current rate fallback: ${currentUrl}`);
            
            const currentResponse = await fetch(currentUrl);
            if (currentResponse.ok) {
              const currentData = await currentResponse.json();
              const currentRates = currentData.rates || {};
              if (to in currentRates) {
                const currentRate = currentRates[to];
                if (typeof currentRate === 'number' && !isNaN(currentRate) && currentRate > 0) {
                  console.log(`[FixedConverter] Current rate fallback success: ${from}→${to} = ${currentRate}`);
                  return currentRate;
                }
              }
            }
          } catch (currentError) {
            console.error(`[FixedConverter] Current rate fallback failed:`, currentError);
          }
        }
        
        throw fallbackError;
      }

    } catch (error) {
      console.error(`[FixedConverter] API fetch error for ${from}→${to} on ${date}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const fixedCurrencyConverter = new FixedCurrencyConverter();
export default fixedCurrencyConverter; 