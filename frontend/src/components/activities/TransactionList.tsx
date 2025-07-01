"use client"

import React, { useState } from 'react';
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
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { Transaction, TRANSACTION_TYPE_LABELS, TransactionFormData } from '@/types/transaction';
import TransactionForm from './TransactionForm';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransactionListProps {
  transactions: Transaction[];
  organizations?: any[];
  activityId: string;
  onAdd?: (transaction: TransactionFormData) => Promise<void>;
  onUpdate?: (id: string, transaction: TransactionFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  readOnly?: boolean;
  currency?: string;
}

type SortField = 'transaction_date' | 'transaction_type' | 'value' | 'provider_org_name' | 'receiver_org_name';
type SortDirection = 'asc' | 'desc';

export default function TransactionList({
  transactions,
  organizations = [],
  activityId,
  onAdd,
  onUpdate,
  onDelete,
  readOnly = false,
  currency = 'USD'
}: TransactionListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  // Sort transactions
  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Convert to lowercase for string comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      // Compare values
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
        await onUpdate?.(editingTransaction.id, data);
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
    console.log('[TransactionList] Editing transaction:', transaction);
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setIsLoading(true);
      try {
        await onDelete?.(id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatCurrency = (value: number, curr: string = currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getTransactionTypeColor = (type: string) => {
    const isIncoming = ['1', '12'].includes(type);
    return isIncoming ? 'text-green-600' : 'text-blue-600';
  };

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
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No transactions recorded yet</p>
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
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('transaction_date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {getSortIcon('transaction_date')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('transaction_type')}
                    >
                      <div className="flex items-center gap-1">
                        Type
                        {getSortIcon('transaction_type')}
                      </div>
                    </TableHead>
                    <TableHead>Aid Type</TableHead>
                    <TableHead>Finance Type</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('provider_org_name')}
                    >
                      <div className="flex items-center gap-1">
                        Provider
                        {getSortIcon('provider_org_name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('receiver_org_name')}
                    >
                      <div className="flex items-center gap-1">
                        Receiver
                        {getSortIcon('receiver_org_name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 text-right"
                      onClick={() => handleSort('value')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Value
                        {getSortIcon('value')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-10 px-2">Status</TableHead>
                    {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map((transaction) => (
                    <TableRow 
                      key={transaction.id} 
                      className={`hover:bg-gray-50 ${!transaction.created_by ? 'bg-blue-50/50' : ''}`}
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
                        {transaction.finance_type || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="truncate text-base">
                            {transaction.provider_org_name || <span className="text-gray-400 font-normal">Not specified</span>}
                          </p>
                          {transaction.provider_org_ref && (
                            <p className="text-xs text-gray-500 truncate">{transaction.provider_org_ref}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="truncate text-base">
                            {transaction.receiver_org_name || <span className="text-gray-400 font-normal">Not specified</span>}
                          </p>
                          {transaction.receiver_org_ref && (
                            <p className="text-xs text-gray-500 truncate">{transaction.receiver_org_ref}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {transaction.value > 0 ? formatCurrency(transaction.value, transaction.currency) : (
                          <span className="text-red-600">Invalid</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center w-10 px-2">
                        <div className="flex flex-col items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center items-center h-full">
                                  {transaction.status === 'actual' ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                      <span className="sr-only">Actual Transaction</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileClock className="h-4 w-4 text-muted-foreground" />
                                      <span className="sr-only">Draft Transaction</span>
                                    </>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {transaction.status === 'actual' ? 'Actual Transaction' : 'Draft Transaction'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(transaction.id)}
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
                  ))}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
            activityId={activityId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
} 