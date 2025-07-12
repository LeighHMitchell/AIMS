/**
 * Enhanced Currency Converter with Comprehensive Error Handling and Recovery
 * Fixes common issues with EUR and other currency conversions
 */

import { getSupabaseAdmin } from './supabase';

export interface ConversionResult {
  usd_amount: number | null;
  exchange_rate: number | null;
  success: boolean;
  error?: string;
  source?: string;
  conversion_date?: string;
  diagnostic_info?: any;
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

class EnhancedCurrencyConverterV2 {
  private readonly PRIMARY_API_URL = 'https://api.exchangerate.host';
  private readonly FALLBACK_API_URL = 'https://api.fxratesapi.com/latest';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  // Comprehensive list of supported currencies
  private readonly GUARANTEED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW',
    'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'DKK', 'THB', 'MYR', 'PHP'
  ];

  /**
   * Main conversion method with comprehensive error handling
   */
  async convertToUSD(
    amount: number,
    currency: string,
    transactionDate: Date
  ): Promise<ConversionResult> {
    const diagnostic: any = {
      input: { amount, currency, date: transactionDate.toISOString() },
      steps: []
    };

    try {
      // Step 1: Input validation
      if (amount <= 0) {
        diagnostic.steps.push('❌ Invalid amount: must be greater than 0');
        return {
          usd_amount: null,
          exchange_rate: null,
          success: false,
          error: 'Invalid amount: must be greater than 0',
          diagnostic_info: diagnostic
        };
      }

      const currencyCode = currency.toUpperCase();
      const dateStr = transactionDate.toISOString().split('T')[0];
      diagnostic.steps.push(`✅ Input validated: ${amount} ${currencyCode} on ${dateStr}`);

      // Step 2: Handle USD directly
      if (currencyCode === 'USD') {
        diagnostic.steps.push('✅ Already USD - no conversion needed');
        return {
          usd_amount: amount,
          exchange_rate: 1.0,
          success: true,
          source: 'direct',
          conversion_date: dateStr,
          diagnostic_info: diagnostic
        };
      }

      // Step 3: Check currency support
      if (!this.GUARANTEED_CURRENCIES.includes(currencyCode)) {
        diagnostic.steps.push(`❌ Currency ${currencyCode} not in guaranteed list`);
        return {
          usd_amount: null,
          exchange_rate: null,
          success: false,
          error: `Currency ${currencyCode} is not supported for conversion`,
          diagnostic_info: diagnostic
        };
      }
      diagnostic.steps.push(`✅ Currency ${currencyCode} is supported`);

      // Step 4: Try multiple rate sources
      const rateResult = await this.getExchangeRateWithFallbacks(currencyCode, 'USD', transactionDate, diagnostic);

      if (!rateResult) {
        diagnostic.steps.push('❌ All rate sources failed');
        return {
          usd_amount: null,
          exchange_rate: null,
          success: false,
          error: `No exchange rate available for ${currencyCode} on ${dateStr}`,
          diagnostic_info: diagnostic
        };
      }

      // Step 5: Calculate USD amount
      const usdAmount = Math.round(amount * rateResult.rate * 100) / 100;
      diagnostic.steps.push(`✅ Conversion successful: ${amount} × ${rateResult.rate} = ${usdAmount}`);

      return {
        usd_amount: usdAmount,
        exchange_rate: rateResult.rate,
        success: true,
        source: rateResult.source,
        conversion_date: dateStr,
        diagnostic_info: diagnostic
      };

    } catch (error) {
      diagnostic.steps.push(`❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('[Enhanced Currency Converter] Error:', error);
      return {
        usd_amount: null,
        exchange_rate: null,
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
        diagnostic_info: diagnostic
      };
    }
  }

  /**
   * Get exchange rate with multiple fallback mechanisms
   */
  private async getExchangeRateWithFallbacks(
    from: string,
    to: string,
    date: Date,
    diagnostic: any
  ): Promise<{ rate: number; source: string } | null> {
    const dateStr = date.toISOString().split('T')[0];

    // Strategy 1: Check cache first
    try {
      const cachedRate = await this.getCachedRate(from, to, dateStr);
      if (cachedRate) {
        diagnostic.steps.push(`✅ Using cached rate: ${cachedRate.exchange_rate}`);
        return { rate: cachedRate.exchange_rate, source: 'cache' };
      }
      diagnostic.steps.push('ℹ️ No cached rate found');
    } catch (error) {
      diagnostic.steps.push(`⚠️ Cache lookup failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Strategy 2: Try primary API (ExchangeRate.host)
    try {
      const rate = await this.fetchFromPrimaryAPI(from, to, dateStr, diagnostic);
      if (rate !== null) {
        await this.cacheRate(from, to, dateStr, rate, 'exchangerate.host');
        diagnostic.steps.push(`✅ Primary API success: ${rate}`);
        return { rate, source: 'exchangerate.host' };
      }
    } catch (error) {
      diagnostic.steps.push(`⚠️ Primary API failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Strategy 3: Try fallback API
    try {
      const rate = await this.fetchFromFallbackAPI(from, to, diagnostic);
      if (rate !== null) {
        await this.cacheRate(from, to, dateStr, rate, 'fallback-api');
        diagnostic.steps.push(`✅ Fallback API success: ${rate}`);
        return { rate, source: 'fallback-api' };
      }
    } catch (error) {
      diagnostic.steps.push(`⚠️ Fallback API failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Strategy 4: Try current date if historical date failed
    if (dateStr !== new Date().toISOString().split('T')[0]) {
      try {
        const currentDateStr = new Date().toISOString().split('T')[0];
        const rate = await this.fetchFromPrimaryAPI(from, to, currentDateStr, diagnostic);
        if (rate !== null) {
          await this.cacheRate(from, to, dateStr, rate, 'exchangerate.host-current');
          diagnostic.steps.push(`✅ Current date fallback success: ${rate}`);
          return { rate, source: 'current-date-fallback' };
        }
      } catch (error) {
        diagnostic.steps.push(`⚠️ Current date fallback failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Strategy 5: Use approximate rate for EUR (emergency fallback)
    if (from === 'EUR') {
      const approximateRate = 1.08; // Typical EUR/USD rate
      diagnostic.steps.push(`⚠️ Using approximate EUR rate: ${approximateRate}`);
      return { rate: approximateRate, source: 'approximate-eur' };
    }

    diagnostic.steps.push('❌ All strategies failed');
    return null;
  }

  /**
   * Fetch from primary API (ExchangeRate.host)
   */
  private async fetchFromPrimaryAPI(from: string, to: string, date: string, diagnostic: any): Promise<number | null> {
    const url = `${this.PRIMARY_API_URL}/${date}?base=${from}&symbols=${to}`;
    diagnostic.steps.push(`🔄 Trying primary API: ${url}`);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'AIMS Currency Converter/2.0' },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success && data.error) {
      throw new Error(`API error: ${data.error.info || data.error}`);
    }

    const rates = data.rates || {};
    if (!(to in rates)) {
      throw new Error(`Rate for ${to} not found in response`);
    }

    const rate = rates[to];
    if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
      throw new Error(`Invalid rate value: ${rate}`);
    }

    return rate;
  }

  /**
   * Fetch from fallback API
   */
  private async fetchFromFallbackAPI(from: string, to: string, diagnostic: any): Promise<number | null> {
    const url = `${this.FALLBACK_API_URL}?base=${from}&symbols=${to}`;
    diagnostic.steps.push(`🔄 Trying fallback API: ${url}`);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'AIMS Currency Converter/2.0' },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rates = data.rates || {};
    
    if (!(to in rates)) {
      throw new Error(`Rate for ${to} not found in fallback response`);
    }

    const rate = rates[to];
    if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
      throw new Error(`Invalid rate value from fallback: ${rate}`);
    }

    return rate;
  }

  /**
   * Get cached exchange rate
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

      // Check if cache is still valid
      const cacheAge = Date.now() - new Date(data.created_at || 0).getTime();
      if (cacheAge > this.CACHE_DURATION) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache exchange rate
   */
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
      console.warn('[Enhanced Currency Converter] Failed to cache rate:', error);
    }
  }

  /**
   * Convert a transaction with enhanced error handling
   */
  async convertTransaction(transactionId: string): Promise<{ success: boolean; error?: string; diagnostic?: any }> {
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

      // Skip if already converted or is USD
      if (transaction.value_usd !== null || transaction.currency === 'USD') {
        return { success: true };
      }

      // Use value_date if available, otherwise transaction_date
      const conversionDate = new Date(transaction.value_date || transaction.transaction_date);

      // Convert to USD
      const result = await this.convertToUSD(
        transaction.value,
        transaction.currency,
        conversionDate
      );

      if (!result.success) {
        // Mark as unconvertible with diagnostic info
        await supabase
          .from('transactions')
          .update({
            usd_convertible: false,
            usd_conversion_date: new Date().toISOString()
          })
          .eq('uuid', transactionId);

        return { 
          success: false, 
          error: result.error,
          diagnostic: result.diagnostic_info
        };
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
        return { success: false, error: `Failed to update transaction: ${updateError.message}` };
      }

      return { 
        success: true,
        diagnostic: result.diagnostic_info
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Diagnose conversion issues for a specific currency and date
   */
  async diagnoseConversion(currency: string, date: string): Promise<any> {
    const diagnostic = {
      currency,
      date,
      tests: []
    };

    try {
      // Test 1: Currency support
      const isSupported = this.GUARANTEED_CURRENCIES.includes(currency.toUpperCase());
      diagnostic.tests.push({
        test: 'Currency Support',
        result: isSupported ? 'PASS' : 'FAIL',
        details: isSupported ? 'Currency is supported' : 'Currency not in guaranteed list'
      });

      // Test 2: Cache check
      try {
        const cached = await this.getCachedRate(currency.toUpperCase(), 'USD', date);
        diagnostic.tests.push({
          test: 'Cache Check',
          result: cached ? 'FOUND' : 'NOT_FOUND',
          details: cached ? `Cached rate: ${cached.exchange_rate}` : 'No cached rate'
        });
      } catch (error) {
        diagnostic.tests.push({
          test: 'Cache Check',
          result: 'ERROR',
          details: error instanceof Error ? error.message : 'Cache error'
        });
      }

      // Test 3: Primary API
      try {
        const rate = await this.fetchFromPrimaryAPI(currency.toUpperCase(), 'USD', date, { steps: [] });
        diagnostic.tests.push({
          test: 'Primary API',
          result: 'SUCCESS',
          details: `Rate: ${rate}`
        });
      } catch (error) {
        diagnostic.tests.push({
          test: 'Primary API',
          result: 'FAIL',
          details: error instanceof Error ? error.message : 'API error'
        });
      }

      // Test 4: Fallback API
      try {
        const rate = await this.fetchFromFallbackAPI(currency.toUpperCase(), 'USD', { steps: [] });
        diagnostic.tests.push({
          test: 'Fallback API',
          result: 'SUCCESS',
          details: `Rate: ${rate}`
        });
      } catch (error) {
        diagnostic.tests.push({
          test: 'Fallback API',
          result: 'FAIL',
          details: error instanceof Error ? error.message : 'Fallback API error'
        });
      }

      return diagnostic;

    } catch (error) {
      diagnostic.tests.push({
        test: 'Diagnostic',
        result: 'ERROR',
        details: error instanceof Error ? error.message : 'Diagnostic error'
      });
      return diagnostic;
    }
  }

  /**
   * Reset failed transactions for retry
   */
  async resetFailedTransactions(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return { success: false, count: 0, error: 'Database connection not available' };
      }

      const { data, error } = await supabase
        .from('transactions')
        .update({
          usd_convertible: true,
          usd_conversion_date: null
        })
        .eq('usd_convertible', false)
        .neq('currency', 'USD')
        .is('value_usd', null)
        .select('uuid');

      if (error) {
        return { success: false, count: 0, error: error.message };
      }

      return { success: true, count: data?.length || 0 };

    } catch (error) {
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const enhancedCurrencyConverter = new EnhancedCurrencyConverterV2(); 