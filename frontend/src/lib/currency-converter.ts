/**
 * Enhanced Historical Currency Converter Service for AIMS
 * Integrates with ExchangeRate.host for reliable historical currency conversion
 * Uses Supabase for intelligent caching and supported currency management
 */

import { getSupabaseAdmin } from './supabase';

export interface ExchangeRate {
  id?: string;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  rate_date: string;
  source: string;
  created_at?: string;
}

export interface SupportedCurrency {
  id?: string;
  code: string;
  name: string;
  is_supported: boolean;
  last_checked?: string;
  created_at?: string;
}

export interface ConversionResult {
  usd_amount: number | null;
  exchange_rate: number | null;
  success: boolean;
  error?: string;
  source?: string;
  conversion_date?: string;
}

export interface ConversionStats {
  total_transactions: number;
  converted_transactions: number;
  unconvertible_transactions: number;
  pending_transactions: number;
  usd_transactions: number;
  conversion_rate: number;
}

class EnhancedCurrencyConverter {
  private readonly API_BASE_URL = 'https://api.exchangerate.host';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  
  // Comprehensive list of supported currencies
  private readonly DEFAULT_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW',
    'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'DKK', 'THB', 'MYR', 'PHP',
    'IDR', 'VND', 'CLP', 'PEN', 'COP', 'ARS', 'UYU', 'BOB', 'PYG', 'GHS',
    'NGN', 'KES', 'UGX', 'TZS', 'RWF', 'ETB', 'EGP', 'MAD', 'TND', 'DZD',
    'LKR', 'PKR', 'BDT', 'NPR', 'BTN', 'MVR', 'AFN', 'IRR', 'IQD', 'JOD',
    'KWD', 'BHD', 'QAR', 'AED', 'SAR', 'OMR', 'YER', 'LBP', 'SYP', 'ILS'
  ];

  /**
   * Get historical exchange rate using ExchangeRate.host
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
      // Check cache first
      const cachedRate = await this.getCachedRate(from, to, dateStr);
      if (cachedRate) {
        console.log(`[CurrencyConverter] Using cached rate for ${from}→${to} on ${dateStr}: ${cachedRate.exchange_rate}`);
        return { rate: cachedRate.exchange_rate, source: 'cache' };
      }

      // Fetch from ExchangeRate.host with retry logic
      const rate = await this.fetchRateWithRetry(from, to, dateStr);
      
      if (rate !== null) {
        // Cache the successful result
        await this.cacheRate(from, to, dateStr, rate, 'exchangerate.host');
        console.log(`[CurrencyConverter] Fetched and cached rate for ${from}→${to} on ${dateStr}: ${rate}`);
        return { rate, source: 'api' };
      }

      return null;

    } catch (error) {
      console.error(`[CurrencyConverter] Error getting historical rate for ${from}→${to} on ${dateStr}:`, error);
      return null;
    }
  }

  /**
   * Convert amount to USD using historical rates
   */
  async convertToUSD(
    amount: number, 
    currency: string, 
    transactionDate: Date
  ): Promise<ConversionResult> {
    try {
      // Reject only zero values - negative values are valid (refunds, reimbursements, corrections)
      if (amount === 0) {
        return { 
          usd_amount: null, 
          exchange_rate: null, 
          success: false, 
          error: 'Invalid amount: cannot be zero' 
        };
      }

      // Preserve sign for negative amounts (refunds, loan repayments, corrections)
      const isNegative = amount < 0;
      const absoluteAmount = Math.abs(amount);

      const currencyCode = currency.toUpperCase();
      const dateStr = transactionDate.toISOString().split('T')[0];

      // Already USD - preserve the sign for negative values
      if (currencyCode === 'USD') {
        return { 
          usd_amount: amount, // Preserves sign
          exchange_rate: 1.0, 
          success: true,
          source: 'direct',
          conversion_date: dateStr
        };
      }

      // Check if currency is supported
      if (!(await this.isCurrencySupported(currencyCode))) {
        return { 
          usd_amount: null, 
          exchange_rate: null, 
          success: false, 
          error: `Currency ${currencyCode} is not supported for conversion` 
        };
      }

      // Get exchange rate (using absolute value)
      const rateResult = await this.getHistoricalRate(currencyCode, 'USD', transactionDate);
      
      if (!rateResult) {
        return { 
          usd_amount: null, 
          exchange_rate: null, 
          success: false, 
          error: `No exchange rate available for ${currencyCode} on ${dateStr}` 
        };
      }

      // Calculate USD amount with proper rounding using absolute value
      const usdAmount = Math.round(absoluteAmount * rateResult.rate * 100) / 100;
      
      // Apply the original sign to the converted amount
      const finalAmount = isNegative ? -usdAmount : usdAmount;

      return {
        usd_amount: finalAmount,
        exchange_rate: rateResult.rate,
        success: true,
        source: rateResult.source,
        conversion_date: dateStr
      };

    } catch (error) {
      console.error('[CurrencyConverter] Conversion error:', error);
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
        // Mark as unconvertible
        await supabase
          .from('transactions')
          .update({
            usd_convertible: false,
            usd_conversion_date: new Date().toISOString()
          })
          .eq('uuid', transactionId);

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
        console.error('[CurrencyConverter] Error updating transaction:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`[CurrencyConverter] Successfully converted transaction ${transactionId}: ${transaction.value} ${transaction.currency} → $${result.usd_amount} USD`);
      return { success: true };

    } catch (error) {
      console.error('[CurrencyConverter] Transaction conversion error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if a currency is supported for conversion
   */
  async isCurrencySupported(currencyCode: string): Promise<boolean> {
    const code = currencyCode.toUpperCase();
    
    if (code === 'USD') return true;

    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        // Fallback to default list if no database
        return this.DEFAULT_CURRENCIES.includes(code);
      }

      const { data, error } = await supabase
        .from('supported_currencies')
        .select('is_supported')
        .eq('code', code)
        .single();

      if (error || !data) {
        // Check if it's in our default list
        return this.DEFAULT_CURRENCIES.includes(code);
      }

      return data.is_supported;
    } catch (error) {
      console.warn(`[CurrencyConverter] Error checking currency support for ${code}:`, error);
      return this.DEFAULT_CURRENCIES.includes(code);
    }
  }

  /**
   * Get list of supported currencies
   */
  async getSupportedCurrencies(refresh = false): Promise<SupportedCurrency[]> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        // Return default currencies if no database
        return this.DEFAULT_CURRENCIES.map(code => ({
          code,
          name: this.getCurrencyName(code),
          is_supported: true
        }));
      }

      if (!refresh) {
        // Try to get from database first
        const { data: dbCurrencies, error } = await supabase
          .from('supported_currencies')
          .select('*')
          .eq('is_supported', true)
          .order('code');

        if (!error && dbCurrencies && dbCurrencies.length > 0) {
          return dbCurrencies;
        }
      }

      // Fetch supported currencies from ExchangeRate.host
      const supportedCurrencies = await this.fetchSupportedCurrencies();
      
      // Update database
      await this.updateSupportedCurrencies(supportedCurrencies);

      // Return updated list
      const { data: updatedCurrencies } = await supabase
        .from('supported_currencies')
        .select('*')
        .eq('is_supported', true)
        .order('code');

      return updatedCurrencies || [];

    } catch (error) {
      console.error('[CurrencyConverter] Error getting supported currencies:', error);
      
      // Return fallback currencies
      return this.DEFAULT_CURRENCIES.map(code => ({
        code,
        name: this.getCurrencyName(code),
        is_supported: true
      }));
    }
  }

  /**
   * Bulk convert multiple transactions
   */
  async bulkConvertTransactions(transactionIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>
    };

    console.log(`[CurrencyConverter] Starting bulk conversion of ${transactionIds.length} transactions`);

    for (const id of transactionIds) {
      try {
        const result = await this.convertTransaction(id);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({ id, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          id, 
          error: error instanceof Error ? error.message : 'Unexpected error' 
        });
      }
    }

    console.log(`[CurrencyConverter] Bulk conversion completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  /**
   * Get conversion statistics
   */
  async getConversionStats(activityId?: string): Promise<ConversionStats> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return this.getEmptyStats();
      }

      let query = supabase.from('transactions').select('*');
      
      if (activityId) {
        query = query.eq('activity_id', activityId);
      }

      const { data: transactions, error } = await query;

      if (error || !transactions) {
        console.error('[CurrencyConverter] Error fetching transactions for stats:', error);
        return this.getEmptyStats();
      }

      const stats = {
        total_transactions: transactions.length,
        converted_transactions: 0,
        unconvertible_transactions: 0,
        pending_transactions: 0,
        usd_transactions: 0,
        conversion_rate: 0
      };

      transactions.forEach((txn: any) => {
        if (txn.currency === 'USD') {
          stats.usd_transactions++;
        } else if (txn.value_usd !== null) {
          stats.converted_transactions++;
        } else if (txn.usd_convertible === false) {
          stats.unconvertible_transactions++;
        } else {
          stats.pending_transactions++;
        }
      });

      const convertibleTotal = stats.total_transactions - stats.usd_transactions - stats.unconvertible_transactions;
      if (convertibleTotal > 0) {
        stats.conversion_rate = Math.round((stats.converted_transactions / convertibleTotal) * 100 * 100) / 100;
      }

      return stats;

    } catch (error) {
      console.error('[CurrencyConverter] Error getting conversion stats:', error);
      return this.getEmptyStats();
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
      console.warn('[CurrencyConverter] Failed to cache rate:', error);
    }
  }

  private async fetchRateWithRetry(from: string, to: string, date: string): Promise<number | null> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const rate = await this.fetchRateFromAPI(from, to, date);
        if (rate !== null) return rate;
      } catch (error) {
        console.warn(`[CurrencyConverter] Attempt ${attempt} failed for ${from}→${to} on ${date}:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
        }
      }
    }
    return null;
  }

  private async fetchRateFromAPI(from: string, to: string, date: string): Promise<number | null> {
    try {
      // Validate date is not in the future
      const today = new Date().toISOString().split('T')[0];
      if (date > today) {
        console.warn(`[CurrencyConverter] Cannot fetch rate for future date: ${date}`);
        return null;
      }

      // Use ExchangeRate.host historical endpoint
      const url = `${this.API_BASE_URL}/${date}?base=${from}&symbols=${to}`;
      console.log(`[CurrencyConverter] Fetching rate from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AIMS Currency Converter/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check for API errors
      if (!data.success && data.error) {
        throw new Error(`API error: ${data.error.info || data.error}`);
      }

      // Extract rate
      const rates = data.rates || {};
      if (!(to in rates)) {
        throw new Error(`Rate for ${to} not found in response`);
      }

      const rate = rates[to];
      if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
        throw new Error(`Invalid rate value: ${rate}`);
      }

      return rate;

    } catch (error) {
      console.error(`[CurrencyConverter] API fetch error for ${from}→${to} on ${date}:`, error);
      throw error;
    }
  }

  private async fetchSupportedCurrencies(): Promise<string[]> {
    try {
      const url = `${this.API_BASE_URL}/symbols`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch supported currencies: ${response.status}`);
      }

      const data = await response.json();
      const symbols = data.symbols || {};
      
      return Object.keys(symbols);
    } catch (error) {
      console.warn('[CurrencyConverter] Failed to fetch supported currencies from API, using defaults:', error);
      return this.DEFAULT_CURRENCIES;
    }
  }

  private async updateSupportedCurrencies(currencyCodes: string[]): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return;

      // Mark all as unsupported first
      await supabase
        .from('supported_currencies')
        .update({ is_supported: false, last_checked: new Date().toISOString() });

      // Update/insert supported currencies
      for (const code of currencyCodes) {
        await supabase
          .from('supported_currencies')
          .upsert({
            code: code.toUpperCase(),
            name: this.getCurrencyName(code),
            is_supported: true,
            last_checked: new Date().toISOString()
          }, {
            onConflict: 'code'
          });
      }
    } catch (error) {
      console.error('[CurrencyConverter] Error updating supported currencies:', error);
    }
  }

  private getCurrencyName(code: string): string {
    const names: Record<string, string> = {
      'USD': 'US Dollar', 'EUR': 'Euro', 'GBP': 'British Pound', 'JPY': 'Japanese Yen',
      'AUD': 'Australian Dollar', 'CAD': 'Canadian Dollar', 'CHF': 'Swiss Franc', 'CNY': 'Chinese Yuan',
      'SEK': 'Swedish Krona', 'NZD': 'New Zealand Dollar', 'MXN': 'Mexican Peso', 'SGD': 'Singapore Dollar',
      'HKD': 'Hong Kong Dollar', 'NOK': 'Norwegian Krone', 'TRY': 'Turkish Lira', 'RUB': 'Russian Ruble',
      'INR': 'Indian Rupee', 'BRL': 'Brazilian Real', 'ZAR': 'South African Rand', 'KRW': 'South Korean Won',
      'PLN': 'Polish Zloty', 'CZK': 'Czech Koruna', 'HUF': 'Hungarian Forint', 'RON': 'Romanian Leu',
      'BGN': 'Bulgarian Lev', 'HRK': 'Croatian Kuna', 'DKK': 'Danish Krone', 'THB': 'Thai Baht',
      'MYR': 'Malaysian Ringgit', 'PHP': 'Philippine Peso', 'IDR': 'Indonesian Rupiah', 'VND': 'Vietnamese Dong',
      'CLP': 'Chilean Peso', 'PEN': 'Peruvian Sol', 'COP': 'Colombian Peso', 'ARS': 'Argentine Peso',
      'LKR': 'Sri Lankan Rupee', 'PKR': 'Pakistani Rupee', 'BDT': 'Bangladeshi Taka', 'NPR': 'Nepalese Rupee',
      'AFN': 'Afghan Afghani', 'MMK': 'Myanmar Kyat', 'KHR': 'Cambodian Riel', 'LAK': 'Lao Kip'
    };
    return names[code.toUpperCase()] || `${code.toUpperCase()} Currency`;
  }

  private getEmptyStats(): ConversionStats {
    return {
      total_transactions: 0,
      converted_transactions: 0,
      unconvertible_transactions: 0,
      pending_transactions: 0,
      usd_transactions: 0,
      conversion_rate: 0
    };
  }
}

// Export singleton instance
export const currencyConverter = new EnhancedCurrencyConverter();
export default currencyConverter;