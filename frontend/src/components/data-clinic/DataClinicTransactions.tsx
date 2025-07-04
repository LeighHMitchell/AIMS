"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  AlertCircle, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Edit2,
  Save,
  X,
  CalendarClock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { useUser } from "@/hooks/useUser";
import { AidTypeSelect } from "@/components/forms/AidTypeSelect";
import { DefaultFinanceTypeSelect } from "@/components/forms/DefaultFinanceTypeSelect";

// Transaction Type mappings
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge'
};

// Finance Type mappings
const FINANCE_TYPE_LABELS: Record<string, string> = {
  '110': 'Standard grant',
  '210': 'Interest subsidy',
  '310': 'Capital subscription on deposit basis',
  '311': 'Capital subscription on encashment basis',
  '410': 'Aid loan excluding debt reorganisation',
  '421': 'Reimbursable grant'
};

// Flow Type mappings
const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'ODA',
  '20': 'OOF',
  '30': 'Private grants',
  '35': 'Private market',
  '40': 'Non flow',
  '50': 'Other flows'
};

type Transaction = {
  id: string;
  activityId: string;
  activityTitle?: string;
  transactionType?: string;
  aidType?: string;
  financeType?: string;
  flowType?: string;
  transactionDate?: string;
  value?: number;
  currency?: string;
  providerOrgId?: string;
  providerOrgName?: string;
  receiverOrgId?: string;
  receiverOrgName?: string;
  organizationId?: string;
  organizationName?: string;
  description?: string;
  [key: string]: any;
};

type DataGap = {
  field: string;
  label: string;
  count: number;
};

export function DataClinicTransactions() {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ transactionId: string; field: string } | null>(null);
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [dataGaps, setDataGaps] = useState<DataGap[]>([]);

  const isSuperUser = user?.role === 'super_user';

  useEffect(() => {
    fetchTransactionsWithGaps();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedFilter, searchQuery]);

  const fetchTransactionsWithGaps = async () => {
    try {
      const res = await fetch('/api/data-clinic/transactions?missing_fields=true');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      
      const data = await res.json();
      setTransactions(data.transactions || []);
      setDataGaps(data.dataGaps || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Apply field filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(transaction => {
        switch (selectedFilter) {
          case 'missing_finance_type':
            return !transaction.financeType;
          case 'missing_aid_type':
            return !transaction.aidType;
          case 'missing_flow_type':
            return !transaction.flowType;
          case 'missing_transaction_type':
            return !transaction.transactionType;
          case 'missing_date':
            return !transaction.transactionDate;
          case 'future_disbursements':
            return transaction.transactionType === '3' && 
                   transaction.transactionDate && 
                   new Date(transaction.transactionDate) > new Date();
          case 'missing_organization':
            return !transaction.providerOrgId && !transaction.receiverOrgId && !transaction.organizationId;
          case 'missing_value':
            return !transaction.value || transaction.value === 0;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(transaction => 
        transaction.activityTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleInlineEdit = async (transactionId: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/data-clinic/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value, userId: user?.id })
      });

      if (!res.ok) throw new Error('Failed to update transaction');

      // Update local state
      setTransactions(prev => prev.map(transaction => 
        transaction.id === transactionId ? { ...transaction, [field]: value } : transaction
      ));

      toast.success('Transaction updated successfully');
      setEditingField(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkEditField || !bulkEditValue || selectedTransactions.size === 0) {
      toast.error('Please select transactions and provide a field and value');
      return;
    }

    try {
      const res = await fetch('/api/data-clinic/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'transaction',
          field: bulkEditField,
          value: bulkEditValue,
          ids: Array.from(selectedTransactions),
          user_id: user?.id
        })
      });

      if (!res.ok) throw new Error('Failed to bulk update');

      toast.success(`Updated ${selectedTransactions.size} transactions`);
      setSelectedTransactions(new Set());
      setBulkEditField('');
      setBulkEditValue('');
      fetchTransactionsWithGaps(); // Refresh data
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to bulk update transactions');
    }
  };

  const renderFieldValue = (transaction: Transaction, field: string) => {
    const value = transaction[field];
    
    if (editingField?.transactionId === transaction.id && editingField?.field === field) {
      switch (field) {
        case 'aidType':
          return (
            <div className="flex items-center gap-2">
              <AidTypeSelect
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(transaction.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'financeType':
          return (
            <div className="flex items-center gap-2">
              <DefaultFinanceTypeSelect
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(transaction.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'transactionType':
          return (
            <div className="flex items-center gap-2">
              <Select
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(transaction.id, field, newValue || '')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_TYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        default:
          return (
            <div className="flex items-center gap-2">
              <Input
                value={value || ''}
                onChange={(e) => handleInlineEdit(transaction.id, field, e.target.value)}
                className="w-32"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
      }
    }

    // Display value with edit button for super users
    return (
      <div className="flex items-center gap-2">
        {value ? (
          <span className="text-sm">
            {field === 'transactionType' && TRANSACTION_TYPE_LABELS[value] ? 
              TRANSACTION_TYPE_LABELS[value] : 
              field === 'financeType' && FINANCE_TYPE_LABELS[value] ?
              `${value} - ${FINANCE_TYPE_LABELS[value]}` :
              field === 'aidType' ?
              value :
              field === 'flowType' && FLOW_TYPE_LABELS[value] ?
              `${value} - ${FLOW_TYPE_LABELS[value]}` :
              value
            }
          </span>
        ) : (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        )}
        {isSuperUser && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingField({ transactionId: transaction.id, field })}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const isFutureDisbursement = (transaction: Transaction) => {
    return transaction.transactionType === '3' && 
           transaction.transactionDate && 
           new Date(transaction.transactionDate) > new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Gaps Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Gaps Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dataGaps.map((gap) => (
              <div
                key={gap.field}
                className="p-4 rounded-lg border cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedFilter(gap.field)}
              >
                <p className="text-sm text-muted-foreground">{gap.label}</p>
                <p className="text-2xl font-semibold">{gap.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by missing field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="missing_finance_type">Missing Finance Type</SelectItem>
                <SelectItem value="missing_aid_type">Missing Aid Type</SelectItem>
                <SelectItem value="missing_flow_type">Missing Flow Type</SelectItem>
                <SelectItem value="missing_transaction_type">Missing Transaction Type</SelectItem>
                <SelectItem value="missing_date">Missing Date</SelectItem>
                <SelectItem value="future_disbursements">Future-dated Disbursements</SelectItem>
                <SelectItem value="missing_organization">Missing Organization</SelectItem>
                <SelectItem value="missing_value">Missing Value</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => fetchTransactionsWithGaps()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Bulk Actions for Super Users */}
          {isSuperUser && selectedTransactions.size > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium">
                  {selectedTransactions.size} transactions selected
                </p>
                <Select value={bulkEditField} onValueChange={setBulkEditField}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financeType">Finance Type</SelectItem>
                    <SelectItem value="aidType">Aid Type</SelectItem>
                    <SelectItem value="flowType">Flow Type</SelectItem>
                    <SelectItem value="transactionType">Transaction Type</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter value"
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-[200px]"
                />
                <Button onClick={handleBulkUpdate}>
                  <Save className="h-4 w-4 mr-2" />
                  Apply to Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  {isSuperUser && (
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
                          } else {
                            setSelectedTransactions(new Set());
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className="p-4 text-left text-sm font-medium">Activity</th>
                  <th className="p-4 text-left text-sm font-medium">Type</th>
                  <th className="p-4 text-left text-sm font-medium">Date</th>
                  <th className="p-4 text-left text-sm font-medium">Value</th>
                  <th className="p-4 text-left text-sm font-medium">Finance Type</th>
                  <th className="p-4 text-left text-sm font-medium">Aid Type</th>
                  <th className="p-4 text-left text-sm font-medium">Organization</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperUser ? 8 : 7} className="p-8 text-center text-muted-foreground">
                      No transactions found with data gaps
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      {isSuperUser && (
                        <td className="p-4">
                          <Checkbox
                            checked={selectedTransactions.has(transaction.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedTransactions);
                              if (checked) {
                                newSelected.add(transaction.id);
                              } else {
                                newSelected.delete(transaction.id);
                              }
                              setSelectedTransactions(newSelected);
                            }}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="font-medium truncate max-w-xs">
                                {transaction.activityTitle || 'Unknown Activity'}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{transaction.activityTitle || 'Unknown Activity'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="p-4">
                        {renderFieldValue(transaction, 'transactionType')}
                      </td>
                      <td className="p-4">
                        {transaction.transactionDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {format(new Date(transaction.transactionDate), 'MMM d, yyyy')}
                            </span>
                            {isFutureDisbursement(transaction) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <CalendarClock className="h-4 w-4 text-orange-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Future-dated disbursement</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        {transaction.value && transaction.currency ? (
                          <span className="text-sm font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: transaction.currency
                            }).format(transaction.value)}
                          </span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(transaction, 'financeType')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(transaction, 'aidType')}
                      </td>
                      <td className="p-4">
                        {transaction.organizationName || 
                         transaction.providerOrgName || 
                         transaction.receiverOrgName ? (
                          <span className="text-sm">
                            {transaction.organizationName || 
                             transaction.providerOrgName || 
                             transaction.receiverOrgName}
                          </span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 