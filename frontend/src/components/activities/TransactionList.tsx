"use client"

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinancialSummaryCards } from '@/components/FinancialSummaryCards';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Download, 
  Filter,
  Calendar,
  Building2,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileClock,
  CheckCircle,
  Frown,
  Loader2,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { Transaction, TRANSACTION_TYPE_LABELS, TransactionFormData } from '@/types/transaction';
import TransactionForm from './TransactionForm';
import { TransactionDocumentIndicator } from '../TransactionDocumentIndicator';
import { TransactionValueDisplay } from '@/components/currency/TransactionValueDisplay';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { toast } from 'sonner';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUser } from '@/hooks/useUser';
import { getUserPermissions } from '@/types/user';
import financeTypesData from '@/data/finance-types.json';
import { OrganizationLogo } from "@/components/ui/organization-logo";

// IATI Transaction Type Definitions
const TRANSACTION_TYPE_DEFINITIONS: Record<string, string> = {
  '1': 'A firm written obligation from a donor to provide a specified amount of funds, under particular terms and conditions.',
  '2': 'A firm written obligation to provide a specified amount of funds under particular financial terms and conditions.',
  '3': 'Money moved from the donor to an implementing organization.',
  '4': 'Outgoing funds that are spent on goods and services for the activity.',
  '5': 'The actual payment of interest on a loan.',
  '6': 'The actual repayment of the principal of a loan.',
  '7': 'A transaction that covers costs already incurred by the organization.',
  '8': 'Outgoing funds that are used to purchase equity in a business.',
  '9': 'Incoming funds from the sale of equity.',
  '11': 'A commitment made by a funding organization to underwrite a loan or other financial instrument.',
  '12': 'Funds received for use on the activity, which can be from any source.',
  '13': 'Cancellation of a commitment.'
};

interface TransactionListProps {
  transactions: Transaction[];
  organizations?: any[];
  activityId: string;
  onAdd?: (transaction: TransactionFormData) => Promise<void>;
  onUpdate?: (uuid: string, transaction: TransactionFormData) => Promise<void>;
  onDelete?: (uuid: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  readOnly?: boolean;
  currency?: string;
  defaultFinanceType?: string;
  defaultAidType?: string;
  defaultTiedStatus?: string;
  defaultFlowType?: string;
  hideSummaryCards?: boolean;
}

type SortField = 'transaction_date' | 'transaction_type' | 'value' | 'provider_org_name' | 'receiver_org_name' | 'value_date' | 'value_usd' | 'finance_type';
type SortDirection = 'asc' | 'desc';

// Create finance type labels mapping from JSON data
const FINANCE_TYPE_LABELS = financeTypesData.reduce((acc, item) => {
  acc[item.code] = item.name;
  return acc;
}, {} as Record<string, string>);

// Validation Status Cell Component
function ValidationStatusCell({ transaction }: { transaction: Transaction }) {
  const { user } = useUser();
  const isValidated = transaction.status === 'actual';
  const canValidate = user && getUserPermissions(user.role).canValidateActivities;
  
  return (
    <div className="flex flex-col items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-center items-center h-full">
              {isValidated ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="sr-only">Validated Transaction</span>
                </>
              ) : (
                <>
                  <FileClock className="h-4 w-4 text-gray-400" />
                  <span className="sr-only">Unvalidated Transaction</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isValidated ? 'Validated Transaction' : 'Unvalidated Transaction'}
            {canValidate && (
              <div className="text-xs text-muted-foreground mt-1">
                Click edit to change validation status
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Status badges */}
      <div className="flex flex-col items-center gap-1">
        {isValidated && (
          <Badge variant="outline" className="w-fit text-xs bg-green-50 border-green-200 text-green-700">
            Validated
          </Badge>
        )}
        {!transaction.created_by && (
          <Badge variant="outline" className="w-fit text-xs bg-blue-50 border-blue-200 text-blue-700">
            Imported
          </Badge>
        )}
        {(!transaction.currency || transaction.value <= 0) && (
          <Badge variant="outline" className="w-fit text-xs bg-amber-50 border-amber-200 text-amber-700">
            Needs Review
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function TransactionList({
  transactions,
  organizations = [],
  activityId,
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
  readOnly = false,
  currency = 'USD',
  defaultFinanceType,
  defaultAidType,
  defaultTiedStatus,
  defaultFlowType,
  hideSummaryCards = false
}: TransactionListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Currency converter hook
  const { convertTransaction, isConverting, convertingIds, error: conversionError } = useCurrencyConverter();

  // USD conversion tracking
  const [usdValues, setUsdValues] = useState<Record<string, { 
    usd: number | null, 
    rate: number | null, 
    date: string, 
    loading: boolean, 
    error?: string 
  }>>({});

  // Calculate summary statistics
  const summary = React.useMemo(() => {
    const stats = {
      totalIncoming: 0,
      totalOutgoing: 0,
      commitments: 0,
      disbursements: 0,
      expenditures: 0,
      byType: {} as Record<string, { count: number; total: number }>,
      byCurrency: {} as Record<string, number>
    };

    transactions.forEach(t => {
      const amount = t.value || 0;
      const type = t.transaction_type;
      
      // Incoming vs Outgoing
      if (['1', '12'].includes(type)) {
        stats.totalIncoming += amount;
      } else {
        stats.totalOutgoing += amount;
      }

      // Specific types
      if (type === '2') stats.commitments += amount;
      if (type === '3') stats.disbursements += amount;
      if (type === '4') stats.expenditures += amount;

      // By type
      if (!stats.byType[type]) {
        stats.byType[type] = { count: 0, total: 0 };
      }
      stats.byType[type].count++;
      stats.byType[type].total += amount;

      // By currency
      const curr = t.currency || currency;
      if (!stats.byCurrency[curr]) {
        stats.byCurrency[curr] = 0;
      }
      stats.byCurrency[curr] += amount;
    });

    return stats;
  }, [transactions, currency]);

  // Client-side sorting with comprehensive field support
  const sortedTransactions = React.useMemo(() => {
    if (!transactions.length) return transactions;
    
    return [...transactions].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'transaction_date':
          aValue = new Date(a.transaction_date).getTime();
          bValue = new Date(b.transaction_date).getTime();
          break;
        case 'transaction_type':
          aValue = a.transaction_type;
          bValue = b.transaction_type;
          break;
        case 'value':
          aValue = a.value || 0;
          bValue = b.value || 0;
          break;
        case 'provider_org_name':
          aValue = (a.provider_org_name || '').toLowerCase();
          bValue = (b.provider_org_name || '').toLowerCase();
          break;
        case 'receiver_org_name':
          aValue = (a.receiver_org_name || '').toLowerCase();
          bValue = (b.receiver_org_name || '').toLowerCase();
          break;
        case 'value_date':
          aValue = a.value_date ? new Date(a.value_date).getTime() : 0;
          bValue = b.value_date ? new Date(b.value_date).getTime() : 0;
          break;
        case 'value_usd':
          aValue = usdValues[a.uuid || a.id]?.usd || 0;
          bValue = usdValues[b.uuid || b.id]?.usd || 0;
          break;
        case 'finance_type':
          aValue = (a.finance_type || '').toLowerCase();
          bValue = (b.finance_type || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, sortField, sortDirection, usdValues]);

  // Convert all transactions to USD when they change
  React.useEffect(() => {
    let cancelled = false;
    async function convertAll() {
      const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
      for (const transaction of transactions) {
        const transactionId = transaction.uuid || transaction.id;
        if (!transaction.value || !transaction.currency || !transaction.transaction_date) {
          newUsdValues[transactionId] = { 
            usd: null, 
            rate: null, 
            date: transaction.transaction_date, 
            loading: false, 
            error: 'Missing data' 
          };
          continue;
        }
        newUsdValues[transactionId] = { 
          usd: null, 
          rate: null, 
          date: transaction.transaction_date, 
          loading: true 
        };
        try {
          const result = await fixedCurrencyConverter.convertToUSD(
            transaction.value, 
            transaction.currency, 
            new Date(transaction.transaction_date)
          );
          if (!cancelled) {
            newUsdValues[transactionId] = {
              usd: result.usd_amount,
              rate: result.exchange_rate,
              date: result.conversion_date || transaction.transaction_date,
              loading: false,
              error: result.success ? undefined : result.error || 'Conversion failed'
            };
          }
        } catch (err) {
          if (!cancelled) {
            newUsdValues[transactionId] = { 
              usd: null, 
              rate: null, 
              date: transaction.transaction_date, 
              loading: false, 
              error: 'Conversion error' 
            };
          }
        }
      }
      if (!cancelled) setUsdValues(newUsdValues);
    }
    if (transactions.length > 0) convertAll();
    return () => { cancelled = true; };
  }, [transactions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const handleSubmit = async (data: TransactionFormData) => {
    setIsLoading(true);
    try {
      if (editingTransaction) {
        await onUpdate?.(editingTransaction.uuid || editingTransaction.id, data);
      } else {
        await onAdd?.(data);
      }
      setShowForm(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    console.log('[TransactionList] handleEdit called for transaction:', transaction.uuid || transaction.id);
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = async (uuid: string) => {
    console.log('[TransactionList] handleDelete called with UUID:', uuid, 'Type:', typeof uuid);
    
    // Additional validation to prevent undefined UUIDs
    if (!uuid || uuid === 'undefined' || uuid === undefined) {
      console.error('[TransactionList] Invalid transaction UUID for deletion:', uuid);
      alert('Cannot delete transaction: Invalid transaction UUID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setIsLoading(true);
      try {
        await onDelete?.(uuid);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExport = () => {
    const dataToExport = transactions.map(t => ({
      transaction_date: t.transaction_date,
      transaction_type: TRANSACTION_TYPE_LABELS[t.transaction_type] || t.transaction_type,
      value: t.value,
      currency: t.currency,
      provider_org: t.provider_org_name || '',
      receiver_org: t.receiver_org_name || '',
      description: t.description || '',
      status: t.status || 'planned',
      finance_type: t.finance_type ? (FINANCE_TYPE_LABELS[t.finance_type] || t.finance_type) : '',
      aid_type: t.aid_type || '',
      tied_status: t.tied_status || '',
      flow_type: t.flow_type || ''
    }));

    const csv = [
      Object.keys(dataToExport[0] || {}).join(","),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${activityId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConvertCurrency = async (transactionId: string) => {
    const transaction = transactions.find(t => (t.uuid || t.id) === transactionId);
    if (!transaction) {
      toast.error("Transaction not found");
      return;
    }

    try {
      const success = await convertTransaction(
        transactionId,
        transaction.value,
        transaction.currency,
        (transaction as any).value_date || transaction.transaction_date
      );

      if (success) {
        toast.success(`Transaction converted to USD successfully`);
        if (onRefresh) {
          await onRefresh(); // Refresh to show updated USD values
        }
      } else {
        toast.error(conversionError || "Failed to convert transaction");
      }
    } catch (error) {
      console.error('Currency conversion error:', error);
      toast.error("Currency conversion failed");
    }
  };

  const formatCurrency = (value: number, curr: string = currency) => {
    // Ensure currency is a valid 3-letter code, fallback to USD
    const safeCurrency = curr && curr.length === 3 && /^[A-Z]{3}$/.test(curr.toUpperCase()) 
      ? curr.toUpperCase() 
      : "USD";
    
    try {
      // Format number with commas
      const formattedValue = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
      
      // Return format: "EUR 3,000"
      return `${safeCurrency} ${formattedValue}`;
    } catch (error) {
      console.warn(`[TransactionList] Invalid currency "${curr}", using USD:`, error);
      const formattedValue = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
      return `USD ${formattedValue}`;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    const isIncoming = ['1', '12'].includes(type);
    return isIncoming ? 'text-green-600' : 'text-blue-600';
  };

  // Helper to get org acronym or name by ID
  const getOrgAcronymOrName = (orgId: string | undefined, fallbackName?: string) => {
    if (!orgId) return fallbackName;
    const org = organizations.find((o: any) => o.id === orgId);
    if (org) {
      return org.acronym || org.name;
    }
    return fallbackName;
  };

  // Debug logging to diagnose acronym issue
  console.log('Organizations prop:', organizations);

  // Filter out transactions without a valid identifier
  const validTransactions = transactions.filter(t => {
    const isValid = (t.uuid && t.uuid !== 'undefined') || (t.id && t.id !== 'undefined');
    if (!isValid) {
      console.warn('[TransactionList] Transaction without valid identifier found:', t);
    }
    return isValid;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                Commitments, disbursements, and expenditures
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <Button onClick={() => setShowForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              )}
              {transactions.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Financial Summary Cards - Unified component */}
          {activityId && !hideSummaryCards && (
            <div className="mb-6">
              <FinancialSummaryCards activityId={activityId} />
            </div>
          )}

          {/* Transactions Table */}
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Frown className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <p>No transactions yet. Create a new activity or open an existing one to add transactions.</p>
              {!readOnly && (
                <Button 
                  onClick={() => setShowForm(true)} 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Transaction
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border/70">
                  <TableRow>
                    <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('transaction_date')}>
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        {getSortIcon('transaction_date')}
                      </div>
                    </TableHead>
                    <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('transaction_type')}>
                      <div className="flex items-center gap-1">
                        <span>Transaction Type</span>
                        {getSortIcon('transaction_type')}
                      </div>
                    </TableHead>
                    <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('finance_type')}>
                      <div className="flex items-center gap-1">
                        <span>Finance Type</span>
                        {getSortIcon('finance_type')}
                      </div>
                    </TableHead>
                    <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('provider_org_name')}>
                      <div className="flex items-center gap-1">
                        <span>Provider → Receiver</span>
                        {getSortIcon('provider_org_name')}
                      </div>
                    </TableHead>
                    <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('value')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Amount</span>
                        {getSortIcon('value')}
                      </div>
                    </TableHead>
                    <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('value_date')}>
                      <div className="flex items-center gap-1">
                        <span>Value Date</span>
                        {getSortIcon('value_date')}
                      </div>
                    </TableHead>
                    <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('value_usd')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>USD Value</span>
                        {getSortIcon('value_usd')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.filter(t => {
                    const isValid = (t.uuid && t.uuid !== 'undefined') || (t.id && t.id !== 'undefined');
                    if (!isValid) {
                      console.warn('[TransactionList] Transaction without valid identifier found:', t);
                    }
                    return isValid;
                  }).map((transaction) => {
                    console.log('Transaction provider_org_id:', transaction.provider_org_id, 'receiver_org_id:', transaction.receiver_org_id);
                    return (
                    <TableRow 
                      key={transaction.uuid || transaction.id} 
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                      onClick={(e) => {
                        // Prevent any row click navigation
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      {/* Date */}
                      <TableCell className="py-3 px-4 font-medium">
                        {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                      </TableCell>
                      
                      {/* Transaction Type */}
                      <TableCell className="py-3 px-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-default">
                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {transaction.transaction_type}
                                </span>
                                <span className="font-medium">
                                  {TRANSACTION_TYPE_LABELS[transaction.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || transaction.transaction_type}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <div className="font-semibold">
                                  {TRANSACTION_TYPE_LABELS[transaction.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || transaction.transaction_type}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {TRANSACTION_TYPE_DEFINITIONS[transaction.transaction_type] || 'No definition available'}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      
                      {/* Finance Type */}
                      <TableCell className="py-3 px-4">
                        {transaction.finance_type ? (
                          transaction.finance_type_inherited ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 text-gray-400 opacity-70 cursor-help">
                                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                      {transaction.finance_type}
                                    </span>
                                    <span className="text-sm">
                                      {FINANCE_TYPE_LABELS[transaction.finance_type] || transaction.finance_type}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    Inherited from activity's default finance type (code {transaction.finance_type} – {FINANCE_TYPE_LABELS[transaction.finance_type] || transaction.finance_type})
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                {transaction.finance_type}
                              </span>
                              <span className="text-sm">
                                {FINANCE_TYPE_LABELS[transaction.finance_type] || transaction.finance_type}
                              </span>
                            </div>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      
                      {/* Provider → Receiver */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2 font-medium">
                          <div className="flex items-center gap-1.5">
                            <OrganizationLogo
                              logo={(transaction as any).provider_org_logo}
                              name={getOrgAcronymOrName(transaction.provider_org_id, transaction.provider_org_name) || "Unknown"}
                              size="sm"
                            />
                            <span className="truncate max-w-[120px]">
                              {getOrgAcronymOrName(transaction.provider_org_id, transaction.provider_org_name) || "Unknown"}
                            </span>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="flex items-center gap-1.5">
                            <OrganizationLogo
                              logo={(transaction as any).receiver_org_logo}
                              name={getOrgAcronymOrName(transaction.receiver_org_id, transaction.receiver_org_name) || "Unknown"}
                              size="sm"
                            />
                            <span className="truncate max-w-[120px]">
                              {getOrgAcronymOrName(transaction.receiver_org_id, transaction.receiver_org_name) || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Amount */}
                      <TableCell className="py-3 px-4 text-right">
                        {transaction.value > 0 ? (
                          <span className="font-medium">
                            {formatCurrency(transaction.value, transaction.currency)}
                          </span>
                        ) : (
                          <span className="text-red-600">Invalid</span>
                        )}
                      </TableCell>
                      
                      {/* Value Date */}
                      <TableCell className="py-3 px-4">
                        <span className="text-sm">
                          {transaction.value_date 
                            ? format(new Date(transaction.value_date), 'MMM d, yyyy') 
                            : transaction.transaction_date 
                            ? format(new Date(transaction.transaction_date), 'MMM d, yyyy')
                            : '—'}
                        </span>
                      </TableCell>
                      
                      {/* USD Value */}
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {usdValues[transaction.uuid || transaction.id]?.loading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : usdValues[transaction.uuid || transaction.id]?.usd != null ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium cursor-help">
                                    {formatCurrency(usdValues[transaction.uuid || transaction.id].usd!, 'USD')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div>
                                    <div>Original: {formatCurrency(transaction.value, transaction.currency)}</div>
                                    <div>Rate: {usdValues[transaction.uuid || transaction.id].rate}</div>
                                    <div>Date: {usdValues[transaction.uuid || transaction.id].date}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Multiple Currencies Notice */}
          {Object.keys(summary.byCurrency).length > 1 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This activity has transactions in multiple currencies: {' '}
                {Object.entries(summary.byCurrency).map(([curr, amount]) => (
                  <span key={curr} className="font-mono">
                    {formatCurrency(amount, curr)}
                  </span>
                )).reduce((prev, curr, i) => [prev, i > 0 ? ', ' : '', curr] as any)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingTransaction(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto pb-6">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            transaction={editingTransaction || undefined}
            organizations={organizations}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
            defaultCurrency={currency}
            defaultFinanceType={defaultFinanceType}
            defaultAidType={defaultAidType}
            defaultTiedStatus={defaultTiedStatus}
            defaultFlowType={defaultFlowType}
            activityId={activityId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
} 