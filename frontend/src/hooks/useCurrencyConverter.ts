import { useState, useCallback } from 'react';
import { currencyConverter, ConversionResult } from '@/lib/currency-converter';
import { supabase } from '@/lib/supabase';

interface UseCurrencyConverterReturn {
  convertTransaction: (transactionId: string, value: number, currency: string, transactionDate: string) => Promise<boolean>;
  bulkConvertTransactions: (transactionIds: string[]) => Promise<{ success: number; failed: number; errors: Array<{ id: string; error: string }> }>;
  isConverting: boolean;
  convertingIds: Set<string>;
  error: string | null;
}

/**
 * Hook for managing currency conversion operations
 * Provides functions to convert individual or bulk transactions to USD
 */
export function useCurrencyConverter(): UseCurrencyConverterReturn {
  const [isConverting, setIsConverting] = useState(false);
  const [convertingIds, setConvertingIds] = useState(new Set<string>());
  const [error, setError] = useState<string | null>(null);

  const convertTransaction = useCallback(async (
    transactionId: string,
    value: number,
    currency: string,
    transactionDate: string
  ): Promise<boolean> => {
    if (currency === 'USD') {
      // Transaction is already in USD, update the database to reflect this
      try {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            value_usd: value,
            exchange_rate_used: 1.0,
            usd_conversion_date: new Date().toISOString(),
            usd_convertible: true
          })
          .eq('id', transactionId);

        if (updateError) {
          console.error('Error updating USD transaction:', updateError);
          setError(`Failed to update USD transaction: ${updateError.message}`);
          return false;
        }

        return true;
      } catch (err) {
        console.error('Error updating USD transaction:', err);
        setError('Failed to update USD transaction');
        return false;
      }
    }

    setConvertingIds(prev => new Set(prev).add(transactionId));
    setError(null);

    try {
      // Convert to USD using the currency converter
      const result: ConversionResult = await currencyConverter.convertToUSD(
        value,
        currency,
        new Date(transactionDate)
      );

      if (!result.success) {
        // Mark as unconvertible in the database
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            usd_convertible: false,
            usd_conversion_date: new Date().toISOString()
          })
          .eq('id', transactionId);

        if (updateError) {
          console.error('Error marking transaction as unconvertible:', updateError);
        }

        setError(result.error || `Failed to convert ${currency} to USD`);
        return false;
      }

      // Update the transaction with USD values
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          value_usd: result.usd_amount,
          exchange_rate_used: result.exchange_rate,
          usd_conversion_date: new Date().toISOString(),
          usd_convertible: true
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Error updating transaction with USD values:', updateError);
        setError(`Failed to save conversion: ${updateError.message}`);
        return false;
      }

      return true;

    } catch (err) {
      console.error('Currency conversion error:', err);
      setError('Currency conversion failed');
      return false;
    } finally {
      setConvertingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  }, []);

  const bulkConvertTransactions = useCallback(async (transactionIds: string[]) => {
    setIsConverting(true);
    setError(null);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>
    };

    try {
      // Fetch transaction details for all IDs
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, value, currency, transaction_date')
        .in('id', transactionIds);

      if (fetchError || !transactions) {
        setError('Failed to fetch transaction details');
        return results;
      }

      // Convert each transaction
      for (const transaction of transactions) {
        try {
          const success = await convertTransaction(
            transaction.id,
            transaction.value,
            transaction.currency,
            transaction.transaction_date
          );

          if (success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({
              id: transaction.id,
              error: error || 'Conversion failed'
            });
          }
        } catch (err) {
          results.failed++;
          results.errors.push({
            id: transaction.id,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }

    } catch (err) {
      console.error('Bulk conversion error:', err);
      setError('Bulk conversion failed');
    } finally {
      setIsConverting(false);
    }

    return results;
  }, [convertTransaction, error]);

  return {
    convertTransaction,
    bulkConvertTransactions,
    isConverting,
    convertingIds,
    error
  };
}

export default useCurrencyConverter;