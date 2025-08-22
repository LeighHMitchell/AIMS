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
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileClock,
  CheckCircle,
  Frown
} from "lucide-react";
import { format } from "date-fns";
import { Transaction, TRANSACTION_TYPE_LABELS, TransactionFormData } from '@/types/transaction';
import TransactionForm from './TransactionForm';
import { TransactionDocumentIndicator } from '../TransactionDocumentIndicator';
import { TransactionValueDisplay } from '@/components/currency/TransactionValueDisplay';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
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
}

type SortField = 'transaction_date' | 'transaction_type' | 'value' | 'provider_org_name' | 'receiver_org_name';
type SortDirection = 'asc' | 'desc';

// Create finance type labels mapping from JSON data
const FINANCE_TYPE_LABELS = financeTypesData.reduce((acc, item) => {
  acc[item.code] = item.name;
  return acc;
}, {} as Record<string, string>);

// Validation Status Cell Component
function ValidationStatusCell({ transaction }: { transaction: Transaction }) {
  const { user } = useUser();
  const isValidated = transaction.status === 'validated';
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
  defaultFlowType
}: TransactionListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Currency converter hook
  const { convertTransaction, isConverting, convertingIds, error: conversionError } = useCurrencyConverter();

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
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, sortField, sortDirection]);

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
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: safeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch (error) {
      console.warn(`[TransactionList] Invalid currency "${curr}", using USD:`, error);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
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
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Transactions
              </CardTitle>
              <CardDescription>
                Manage financial transactions for this activity
              </CardDescription>
            </div>
            {!readOnly && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Incoming</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(summary.totalIncoming)}
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Outgoing</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(summary.totalOutgoing)}
                    </p>
                  </div>
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Commitments</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary.commitments)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Disbursements</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary.disbursements)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow>
                    <TableHead 
                      className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('transaction_date')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        {getSortIcon('transaction_date')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('transaction_type')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Type</span>
                        {getSortIcon('transaction_type')}
                      </div>
                    </TableHead>
                    <TableHead className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground">Aid Type</TableHead>
                    <TableHead className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground">Finance Type</TableHead>
                    <TableHead 
                      className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('provider_org_name')}
                    >
                      <div className="flex items-center gap-1">
                        Provider
                        {getSortIcon('provider_org_name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('receiver_org_name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Receiver</span>
                        {getSortIcon('receiver_org_name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('value')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Reported Value</span>
                        {getSortIcon('value')}
                      </div>
                    </TableHead>
                    <TableHead className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground">USD Value</TableHead>
                    <TableHead className="h-12 px-4 py-3 text-center align-middle text-sm font-medium text-muted-foreground w-16 px-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            Docs
                          </TooltipTrigger>
                          <TooltipContent>
                            Supporting Documents
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="h-12 px-4 py-3 text-center align-middle text-sm font-medium text-muted-foreground w-10 px-2">Validation Status</TableHead>
                    {!readOnly && <TableHead className="h-12 px-4 py-3 text-center align-middle text-sm font-medium text-muted-foreground w-[50px]"></TableHead>}
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
                      className={`hover:bg-gray-50 ${!transaction.created_by ? 'bg-blue-50/50' : ''}`}
                      onClick={(e) => {
                        // Prevent any row click navigation
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                          {TRANSACTION_TYPE_LABELS[transaction.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || transaction.transaction_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {transaction.aid_type || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        {transaction.finance_type ? (
                          FINANCE_TYPE_LABELS[transaction.finance_type] || transaction.finance_type
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="truncate text-base">
                            {getOrgAcronymOrName(transaction.provider_org_id, transaction.provider_org_name) || <span className="text-gray-400 font-normal">Not specified</span>}
                          </p>
                          {transaction.provider_org_ref && (
                            <p className="text-xs text-gray-500 truncate">{transaction.provider_org_ref}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="truncate text-base">
                            {getOrgAcronymOrName(transaction.receiver_org_id, transaction.receiver_org_name) || <span className="text-gray-400 font-normal">Not specified</span>}
                          </p>
                          {transaction.receiver_org_ref && (
                            <p className="text-xs text-gray-500 truncate">{transaction.receiver_org_ref}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.value > 0 ? (
                          <TransactionValueDisplay
                            transaction={{
                              id: transaction.uuid || transaction.id,
                              value: transaction.value,
                              currency: transaction.currency,
                              transaction_date: transaction.transaction_date,
                              value_usd: (transaction as any).value_usd,
                              usd_convertible: (transaction as any).usd_convertible,
                              usd_conversion_date: (transaction as any).usd_conversion_date,
                              exchange_rate_used: (transaction as any).exchange_rate_used
                            }}
                            onConvert={handleConvertCurrency}
                            showConvertButton={!readOnly}
                            compact={true}
                            variant="original-only"
                          />
                        ) : (
                          <span className="text-red-600">Invalid</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(transaction as any).value_usd != null ? (
                          <span>{formatCurrency((transaction as any).value_usd, 'USD')}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center w-16 px-2">
                        <TransactionDocumentIndicator 
                          transactionId={transaction.uuid || transaction.id} 
                          compactView={true}
                        />
                      </TableCell>
                      <TableCell className="text-center w-10 px-2">
                        <ValidationStatusCell transaction={transaction} />
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                              <DropdownMenuItem 
                                onSelect={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEdit(transaction);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onSelect={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('[TransactionList] Delete button clicked for transaction:', {
                                    id: transaction.id,
                                    uuid: transaction.uuid,
                                    transaction_reference: transaction.transaction_reference,
                                    hasValidUuid: !!transaction.uuid && transaction.uuid !== 'undefined'
                                  });
                                  if (!transaction.uuid || transaction.uuid === 'undefined') {
                                    console.error('[TransactionList] Cannot delete transaction with invalid UUID:', transaction);
                                    alert('Cannot delete transaction: Invalid transaction UUID');
                                    return;
                                  }
                                  handleDelete(transaction.uuid);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
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