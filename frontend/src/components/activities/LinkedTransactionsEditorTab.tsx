'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Download, 
  ExternalLink,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LinkedTransaction {
  id: string;
  activityId: string;
  activityTitle: string;
  activityIatiId: string;
  transactionType: string;
  transactionTypeLabel: string;
  value: number;
  currency: string;
  transactionDate: string;
  description?: string;
  status: string;
  providerOrg: {
    id?: string;
    name?: string;
    ref?: string;
  };
  receiverOrg: {
    id?: string;
    name?: string;
    ref?: string;
  };
  aidType?: string;
  tiedStatus?: string;
  flowType?: string;
}

interface LinkedTransactionsEditorTabProps {
  activityId: string;
}

const LinkedTransactionsEditorTab: React.FC<LinkedTransactionsEditorTabProps> = ({ activityId }) => {
  const [transactions, setTransactions] = useState<LinkedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkedActivityCount, setLinkedActivityCount] = useState(0);
  const [totalsByCurrency, setTotalsByCurrency] = useState<Record<string, number>>({});
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Fetch linked transactions
  const fetchLinkedTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/linked-transactions`);
      if (!response.ok) throw new Error('Failed to fetch linked transactions');
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      setLinkedActivityCount(data.linkedActivityCount || 0);
      setTotalsByCurrency(data.totalValue || {});
    } catch (error) {
      console.error('Error fetching linked transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activityId) {
      fetchLinkedTransactions();
    }
  }, [activityId]);

  // Filter transactions based on selected criteria
  const filteredTransactions = transactions.filter(t => {
    if (selectedCurrency !== 'all' && t.currency !== selectedCurrency) return false;
    if (selectedType !== 'all' && t.transactionType !== selectedType) return false;
    return true;
  });

  // Get unique currencies and transaction types for filters
  const currencies = Array.from(new Set(transactions.map(t => t.currency)));
  const transactionTypes = Array.from(new Set(transactions.map(t => t.transactionType)));

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Transaction Date',
      'Transaction Type',
      'Amount',
      'Currency',
      'Provider Org',
      'Receiver Org',
      'Source Activity',
      'IATI ID',
      'Description'
    ];

    const rows = filteredTransactions.map(t => [
      t.transactionDate,
      t.transactionTypeLabel,
      t.value.toString(),
      t.currency,
      t.providerOrg.name || 'N/A',
      t.receiverOrg.name || 'N/A',
      t.activityTitle,
      t.activityIatiId,
      t.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linked-transactions-${activityId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Format currency value
  const formatCurrency = (value: number, currency: string) => {
    // Ensure currency is a valid 3-letter code, fallback to USD
    const safeCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency.toUpperCase()) 
      ? currency.toUpperCase() 
      : "USD";
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: safeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch (error) {
      console.warn(`[LinkedTransactionsEditorTab] Invalid currency "${currency}", using USD:`, error);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
  };

  // Transaction type icon
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case '1':
      case '2':
      case '12':
        return <ArrowDownRight className="w-4 h-4 text-green-600" />;
      case '3':
      case '4':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Linked Transactions</h3>
        <p className="text-sm text-gray-600 mt-1">
          View transactions from linked activities. These are read-only and for reference only.
        </p>
      </div>

      {!transactions.length ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {linkedActivityCount === 0 
              ? 'No linked activities found. Link activities first to see their transactions.'
              : 'No transactions found in linked activities.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Summary Section */}
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <Label>Transaction Summary</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {filteredTransactions.length} transactions from {linkedActivityCount} linked activities
                </p>
              </div>
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Currency Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {Object.entries(totalsByCurrency).map(([currency, total]) => (
                <div key={currency} className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total in {currency}</div>
                  <div className="text-2xl font-semibold">{formatCurrency(total, currency)}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {currencies.map(currency => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transaction Types</SelectItem>
                  {transactionTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {transactions.find(t => t.transactionType === type)?.transactionTypeLabel || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receiver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 opacity-75">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transactionType)}
                        <span className="text-sm">{transaction.transactionTypeLabel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {formatCurrency(transaction.value, transaction.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          {transaction.providerOrg.name || 'N/A'}
                        </div>
                        {transaction.providerOrg.ref && (
                          <div className="text-xs text-gray-500">{transaction.providerOrg.ref}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          {transaction.receiverOrg.name || 'N/A'}
                        </div>
                        {transaction.receiverOrg.ref && (
                          <div className="text-xs text-gray-500">{transaction.receiverOrg.ref}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(transaction.transactionDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`/activities/${transaction.activityId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {transaction.activityTitle}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <div className="text-xs text-gray-500">
                        {transaction.activityIatiId}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note about read-only nature */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> These transactions are read-only and come from linked activities. 
              They are displayed here for reference only and cannot be edited from this view.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
};

export default LinkedTransactionsEditorTab; 