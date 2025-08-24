"use client"
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionTypeSelect } from "@/components/forms/TransactionTypeSelect";
import { FinanceTypeSelect } from "@/components/forms/FinanceTypeSelect";
import { Plus, Trash2, Edit, Download, Filter, DollarSign, AlertCircle, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePartners } from "@/hooks/usePartners";
import { Transaction, TransactionType } from "@/types/transaction";
import TransactionModal from "@/components/TransactionModal";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TRANSACTION_TYPES,
  TRANSACTION_ACRONYMS,
  LEGACY_TRANSACTION_TYPE_MAP,
  AID_TYPES,
  FLOW_TYPES,
  TIED_STATUS,
  TRANSACTION_STATUS
} from "@/utils/transactionMigrationHelper";

// Define FINANCE_TYPES locally since it's not exported from the helper
const FINANCE_TYPES: Record<string, string> = {
  '110': 'Grant',
  '210': 'Interest subsidy',
  '310': 'Deposit basis',
  '410': 'Aid loan excluding debt reorganisation',
  '451': 'Non-banks guaranteed export credits',
  '510': 'Debt forgiveness: ODA claims',
  '600': 'Debt rescheduling: ODA claims',
  '700': 'Foreign direct investment',
  '810': 'Bonds',
  '910': 'Other securities/claims',
  '1100': 'Guarantees/insurance'
};

// Define DISBURSEMENT_CHANNELS locally
const DISBURSEMENT_CHANNELS: Record<string, string> = {
  '1': 'Money through government',
  '2': 'Money to/through NGOs',
  '3': 'Cash to recipient',
  '4': 'Aid in kind'
};

interface TransactionsManagerProps {
  activityId: string;
  transactions: Transaction[];
  onTransactionsChange: (transactions: Transaction[]) => void;
  onRefreshNeeded?: () => Promise<void>;
  defaultFinanceType?: string;
  defaultAidType?: string;
  defaultCurrency?: string;
  defaultTiedStatus?: string;
  defaultFlowType?: string;
  defaultDisbursementChannel?: string;
}

export default function TransactionsManager({ 
  activityId, 
  transactions: initialTransactions = [], 
  onTransactionsChange,
  onRefreshNeeded,
  defaultFinanceType,
  defaultAidType,
  defaultCurrency,
  defaultTiedStatus,
  defaultFlowType,
  defaultDisbursementChannel
}: TransactionsManagerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    financeType: "all",
    dateFrom: "",
    dateTo: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Convert legacy transaction types to new format
  const convertLegacyTransaction = (transaction: Transaction): Transaction => {
    // Check if the transaction type is a legacy numeric type
    if (LEGACY_TRANSACTION_TYPE_MAP[transaction.transaction_type]) {
      return {
        ...transaction,
        transaction_type: LEGACY_TRANSACTION_TYPE_MAP[transaction.transaction_type]
      };
    }
    return transaction;
  };

  // Update local state when transactions prop changes
  useEffect(() => {
    setTransactions(initialTransactions.map(convertLegacyTransaction));
  }, [initialTransactions]);

  const handleSubmit = async (formData: Partial<Transaction>) => {
    setSubmitting(true);
    try {
    if (!formData.value || formData.value <= 0) {
      toast.error("Transaction value must be greater than 0");
      return;
    }
    if (!formData.provider_org_name && !formData.provider_org_id) {
      toast.error("Provider organisation is required");
      return;
    }
    if (!formData.receiver_org_name && !formData.receiver_org_id) {
      toast.error("Receiver organisation is required");
      return;
    }

      const transactionData = {
      activity_id: activityId,
      transaction_type: formData.transaction_type as TransactionType,
      transaction_date: formData.transaction_date || format(new Date(), "yyyy-MM-dd"),
      value: formData.value || 0,
      currency: formData.currency || 'USD',
      status: formData.status || 'draft',
      ...formData,
      };

      let response;
      if (editingTransaction) {
        // Update existing transaction
        response = await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...transactionData,
            id: editingTransaction.id
          })
        });
      } else {
        // Create new transaction
        response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData)
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save transaction');
      }

      // Show success message
      if (editingTransaction) {
        toast.success("Transaction updated successfully");
      } else {
        toast.success("Transaction added successfully");
      }

      // Always refresh from server to get complete data and ensure consistency
      if (onRefreshNeeded) {
        await onRefreshNeeded();
      }

      setShowAddDialog(false);
      setEditingTransaction(null);
    } catch (error: any) {
      console.error('[TransactionsManager] Error saving transaction:', error);
      toast.error(error.message || "Failed to save transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    console.log("Editing transaction:", transaction);
    setEditingTransaction(transaction);
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      // Always refresh from server to get complete data and ensure consistency
      if (onRefreshNeeded) {
        await onRefreshNeeded();
      }
      
      toast.success("Transaction deleted");
    } catch (error: any) {
      console.error('[TransactionsManager] Error deleting transaction:', error);
      toast.error(error.message || "Failed to delete transaction");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredTransactions.map(t => ({
      type: TRANSACTION_TYPES[t.transaction_type],
      value: t.value,
      currency: t.currency,
      transaction_date: t.transaction_date,
      provider_org: t.provider_org_name || '',
      receiver_org: t.receiver_org_name || '',
      status: t.status ? TRANSACTION_STATUS[t.status] : "",
      tied_status: t.tied_status ? TIED_STATUS[t.tied_status as keyof typeof TIED_STATUS] : "",
      description: t.description || "",
      aid_type: t.aid_type ? AID_TYPES[t.aid_type as keyof typeof AID_TYPES] : "",
      flow_type: t.flow_type ? FLOW_TYPES[t.flow_type as keyof typeof FLOW_TYPES] : ""
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
    toast.success("Transactions exported");
  };

  // Helper function to safely format dates
  const formatTransactionDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      console.warn('Date formatting error:', dateString, error);
      return '-';
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filters.type !== "all" && t.transaction_type !== filters.type) return false;
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.financeType !== "all" && t.finance_type !== filters.financeType) return false;
    if (filters.dateFrom && t.transaction_date && t.transaction_date < filters.dateFrom) return false;
    if (filters.dateTo && t.transaction_date && t.transaction_date > filters.dateTo) return false;
    return true;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aValue: any = a[sortColumn as keyof Transaction];
    let bValue: any = b[sortColumn as keyof Transaction];

    if (sortColumn === "date") {
      aValue = a.transaction_date || "";
      bValue = b.transaction_date || "";
    } else if (sortColumn === "type") {
      aValue = TRANSACTION_TYPES[a.transaction_type] || a.transaction_type;
      bValue = TRANSACTION_TYPES[b.transaction_type] || b.transaction_type;
    } else if (sortColumn === "provider") {
      aValue = a.provider_org_name || "";
      bValue = b.provider_org_name || "";
    } else if (sortColumn === "receiver") {
      aValue = a.receiver_org_name || "";
      bValue = b.receiver_org_name || "";
    } else if (sortColumn === "value") {
      aValue = a.value || 0;
      bValue = b.value || 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Calculate totals (published transactions only)
  const totalPublished = filteredTransactions
    .filter(t => t.status === "published")
    .reduce((sum, t) => sum + t.value, 0);

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Check if transaction was imported from IATI (no created_by field)
  const isImportedTransaction = (transaction: Transaction) => {
    return !('created_by' in transaction) || transaction.created_by === null;
  };

  // Check for missing fields
  const getMissingFields = (transaction: Transaction) => {
    const missing = [];
    if (!transaction.value || transaction.value === 0) missing.push("value");
    if (!transaction.currency) missing.push("currency");
    if (!transaction.provider_org_name && !transaction.provider_org_id) missing.push("provider");
    if (!transaction.receiver_org_name && !transaction.receiver_org_id) missing.push("receiver");
    if (!transaction.transaction_date) missing.push("date");
    return missing;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage IATI-compliant financial transactions
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Transaction
              </Button>
              {transactions.length > 0 && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {transactions.length > 0 && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="relative">
                  <TransactionTypeSelect
                    value={filters.type}
                    onValueChange={(value) => setFilters({...filters, type: value || "all"})}
                    placeholder="All Types"
                    className="w-full"
                  />
                </div>
                <div className="relative">
                  <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="actual">Actual</SelectItem>
                    </SelectContent>
                  </Select>
                  {filters.status !== "all" && (
                    <button
                      type="button"
                      onClick={() => setFilters({...filters, status: "all"})}
                      className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors z-10"
                      aria-label="Clear status filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <FinanceTypeSelect
                    value={filters.financeType === "all" ? undefined : filters.financeType}
                    onChange={(value) => setFilters({...filters, financeType: value || "all"})}
                    placeholder="All Finance Types"
                    className="w-full h-10"
                  />
                  {filters.financeType !== "all" && (
                    <button
                      type="button"
                      onClick={() => setFilters({...filters, financeType: "all"})}
                      className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors z-10"
                      aria-label="Clear finance type filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="date"
                    placeholder="From date"
                    value={filters.dateFrom}
                    onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                    className="pl-12 pr-8"
                  />
                  <label className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">From</label>
                  {filters.dateFrom && (
                    <button
                      type="button"
                      onClick={() => setFilters({...filters, dateFrom: ""})}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                      aria-label="Clear from date filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="date"
                    placeholder="To date"
                    value={filters.dateTo}
                    onChange={e => setFilters({...filters, dateTo: e.target.value})}
                    className="pl-10 pr-8"
                  />
                  <label className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">To</label>
                  {filters.dateTo && (
                    <button
                      type="button"
                      onClick={() => setFilters({...filters, dateTo: ""})}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                      aria-label="Clear to date filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              {(filters.type !== "all" || filters.status !== "all" || filters.financeType !== "all" || filters.dateFrom || filters.dateTo) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ type: "all", status: "all", financeType: "all", dateFrom: "", dateTo: "" })}
                    className="text-xs"
                  >
                    Clear all filters
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Transactions Table */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {transactions.length === 0 
                ? "No transactions have been added yet." 
                : "No transactions match the current filters."}
            </div>
          ) : (
            <>
              <TransactionTable
                transactions={sortedTransactions}
                loading={false}
                error={null}
                sortField={sortColumn}
                sortOrder={sortDirection}
                onSort={handleSort}
                onRowClick={(transactionId) => {
                  const transaction = sortedTransactions.find(t => t.id === transactionId);
                  if (transaction) handleEdit(transaction);
                }}
                onEdit={(transaction: any) => handleEdit(transaction as Transaction)}
                onDelete={handleDelete}
                variant="compact"
              />


            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        activityId={activityId}
        onSubmit={handleSubmit}
        defaultFinanceType={defaultFinanceType}
        defaultAidType={defaultAidType}
        defaultCurrency={defaultCurrency}
        defaultTiedStatus={defaultTiedStatus}
        defaultFlowType={defaultFlowType}
        defaultDisbursementChannel={defaultDisbursementChannel}
        isSubmitting={submitting}
      />
    </div>
  );
} 