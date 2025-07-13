import React, { useState, useEffect } from 'react';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionValueDisplay } from '@/components/currency/TransactionValueDisplay';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

/**
 * Example implementation showing how to integrate the currency converter
 * with transaction displays and tables.
 * 
 * This demonstrates:
 * 1. Using the TransactionValueDisplay component
 * 2. Integration with TransactionTable
 * 3. Currency conversion hooks
 * 4. Bulk conversion operations
 */

interface ExampleTransaction {
  id: string;
  value: number;
  currency: string;
  transaction_date: string;
  value_usd?: number | null;
  usd_convertible?: boolean;
  usd_conversion_date?: string | null;
  exchange_rate_used?: number | null;
  // Additional fields for demo
  transaction_type: string;
  provider_org_name?: string;
  receiver_org_name?: string;
}

export function CurrencyConverterExample() {
  const [transactions, setTransactions] = useState<ExampleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { 
    convertTransaction, 
    bulkConvertTransactions, 
    isConverting, 
    convertingIds, 
    error: conversionError 
  } = useCurrencyConverter();

  // Load sample transactions (in real app, this would fetch from your API)
  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would fetch from your API
      // For demo purposes, we'll create some sample data
      const sampleTransactions: ExampleTransaction[] = [
        {
          id: '1',
          value: 50000,
          currency: 'EUR',
          transaction_date: '2024-01-15',
          transaction_type: '3',
          provider_org_name: 'European Development Fund',
          receiver_org_name: 'Local NGO',
          value_usd: null,
          usd_convertible: true
        },
        {
          id: '2',
          value: 25000,
          currency: 'USD',
          transaction_date: '2024-02-01',
          transaction_type: '4',
          provider_org_name: 'USAID',
          receiver_org_name: 'Health Ministry',
          value_usd: 25000,
          exchange_rate_used: 1.0,
          usd_conversion_date: '2024-02-01T00:00:00Z'
        },
        {
          id: '3',
          value: 75000,
          currency: 'GBP',
          transaction_date: '2024-01-20',
          transaction_type: '1',
          provider_org_name: 'UK Foreign Office',
          receiver_org_name: 'Education Sector',
          value_usd: null,
          usd_convertible: true
        }
      ];

      setTransactions(sampleTransactions);
    } catch (err) {
      setError('Failed to load transactions');
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleConvertTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const success = await convertTransaction(
      transactionId,
      transaction.value,
      transaction.currency,
      transaction.transaction_date
    );

    if (success) {
      // Refresh the transaction data to show updated values
      // In a real app, you'd refetch from your API
      setTransactions(prev => prev.map(t => {
        if (t.id === transactionId) {
          // For demo purposes, simulate the conversion
          return {
            ...t,
            value_usd: t.currency === 'USD' ? t.value : Math.round(t.value * 1.1), // Demo conversion
            exchange_rate_used: t.currency === 'USD' ? 1.0 : 1.1,
            usd_conversion_date: new Date().toISOString(),
            usd_convertible: true
          };
        }
        return t;
      }));
    }
  };

  const handleBulkConvert = async () => {
    const pendingTransactions = transactions.filter(t => 
      t.currency !== 'USD' && t.value_usd === null && t.usd_convertible !== false
    );
    
    if (pendingTransactions.length === 0) {
      alert('No transactions need conversion');
      return;
    }

    const results = await bulkConvertTransactions(pendingTransactions.map(t => t.id));
    
    if (results.success > 0) {
      // Refresh transaction data
      await loadTransactions();
    }

    alert(`Conversion complete: ${results.success} successful, ${results.failed} failed`);
  };

  const getConversionStats = () => {
    const total = transactions.length;
    const converted = transactions.filter(t => t.value_usd !== null).length;
    const pending = transactions.filter(t => 
      t.currency !== 'USD' && t.value_usd === null && t.usd_convertible !== false
    ).length;
    const unconvertible = transactions.filter(t => t.usd_convertible === false).length;

    return { total, converted, pending, unconvertible };
  };

  const stats = getConversionStats();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading currency converter example...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Currency Converter Integration Example</h1>
        <p className="text-gray-600 mt-2">
          This example demonstrates how to integrate the historical currency converter with transaction displays.
        </p>
      </div>

      {/* Conversion Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-600">Total Transactions</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
          <div className="text-sm text-green-600">Converted to USD</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-yellow-600">Pending Conversion</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{stats.unconvertible}</div>
          <div className="text-sm text-red-600">Unconvertible</div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={handleBulkConvert}
          disabled={isConverting || stats.pending === 0}
        >
          {isConverting ? 'Converting...' : `Convert ${stats.pending} Pending Transactions`}
        </Button>
        
        <Button variant="outline" onClick={loadTransactions}>
          Refresh Data
        </Button>

        {conversionError && (
          <Badge variant="destructive">
            Error: {conversionError}
          </Badge>
        )}
      </div>

      {/* Individual Transaction Examples */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Individual Transaction Display Examples</h2>
        
        {transactions.slice(0, 3).map(transaction => (
          <div key={transaction.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  {transaction.provider_org_name} → {transaction.receiver_org_name}
                </h3>
                <p className="text-sm text-gray-600">
                  Transaction Date: {new Date(transaction.transaction_date).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline">
                ID: {transaction.id}
              </Badge>
            </div>

            {/* Full Display */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Full Display Mode:</h4>
              <TransactionValueDisplay
                transaction={transaction}
                onConvert={handleConvertTransaction}
                showConvertButton={true}
                compact={false}
                variant="full"
              />
            </div>

            {/* Compact Display */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Compact Display Mode:</h4>
              <TransactionValueDisplay
                transaction={transaction}
                onConvert={handleConvertTransaction}
                showConvertButton={false}
                compact={true}
                variant="full"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Table with Currency Integration */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Transaction Table with Currency Conversion</h2>
        <div className="border rounded-lg overflow-hidden">
          <TransactionTable
            transactions={transactions}
            loading={false}
            error={error}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onConvertCurrency={handleConvertTransaction}
            variant="full"
          />
        </div>
      </div>

      {/* Integration Notes */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Integration Notes</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong>1. Currency Converter Service:</strong> Located at <code>/lib/currency-converter.ts</code>
          </div>
          <div>
            <strong>2. Transaction Value Display:</strong> Reusable component at <code>/components/currency/TransactionValueDisplay.tsx</code>
          </div>
          <div>
            <strong>3. Currency Conversion Hook:</strong> Management logic at <code>/hooks/useCurrencyConverter.ts</code>
          </div>
          <div>
            <strong>4. Database Requirements:</strong> Requires 4 additional fields in transactions table:
            <ul className="ml-4 mt-1">
              <li>• <code>value_usd</code> - Converted USD amount</li>
              <li>• <code>usd_convertible</code> - Whether currency can be converted</li>
              <li>• <code>usd_conversion_date</code> - When conversion was performed</li>
              <li>• <code>exchange_rate_used</code> - Exchange rate used for conversion</li>
            </ul>
          </div>
          <div>
            <strong>5. API Integration:</strong> Uses exchangerate-api.com free tier (2,000 requests/month)
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurrencyConverterExample;