"use client"
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, Download, DollarSign, AlertCircle, FileText, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CheckCircle, Loader2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
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

// Hero Card Component
interface HeroCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
}

function HeroCard({ title, value, subtitle, icon }: HeroCardProps) {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}

interface TransactionsManagerProps {
  activityId: string;
  activityPartnerId?: string; // User-assigned Activity ID from General tab
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
  activityPartnerId,
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
  const [fetchedActivityPartnerId, setFetchedActivityPartnerId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    financeType: "all",
    dateFrom: "",
    dateTo: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<"all" | "commitments" | "disbursements" | "expenditures">("all");
  const [hasFetchedTransactions, setHasFetchedTransactions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Bulk selection state
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Track last notified transaction count to prevent infinite loops
  const lastNotifiedCountRef = React.useRef<number>(-1);

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
    console.log('[TransactionsManager] initialTransactions prop changed:', {
      propsLength: initialTransactions.length,
      currentLocalLength: transactions.length,
      hasFetchedTransactions
    });
    
    // Only update from props if:
    // 1. Props actually have data (initialTransactions.length > 0), OR
    // 2. We haven't fetched transactions ourselves yet (!hasFetchedTransactions)
    // This prevents empty props from clearing fetched data
    if (initialTransactions.length > 0 || !hasFetchedTransactions) {
      const converted = initialTransactions.map(convertLegacyTransaction);
      console.log('[TransactionsManager] Updating local state from props, converted length:', converted.length);
      setTransactions(converted);
      // If we receive transactions from props, mark as fetched
      if (initialTransactions.length > 0) {
        setHasFetchedTransactions(true);
      }
    } else {
      console.log('[TransactionsManager] Skipping props update - already have fetched transactions');
    }
  }, [initialTransactions]);

  // Fetch transactions if not provided and activityId is valid
  useEffect(() => {
    const fetchTransactions = async () => {
      // Only fetch if:
      // 1. We have a valid activityId (not 'new')
      // 2. We haven't already fetched transactions
      // 3. No transactions were provided via props
      if (activityId && activityId !== 'new' && !hasFetchedTransactions && initialTransactions.length === 0) {
        try {
          setIsLoading(true);
          console.log('[TransactionsManager] No transactions provided, fetching for activity:', activityId);
          const response = await fetch(`/api/activities/${activityId}/transactions`);
          if (response.ok) {
            const responseData = await response.json();
            
            // Handle both response formats: { data: [...] } or direct array [...]
            const transactionsData = Array.isArray(responseData) ? responseData : (responseData.data || []);
            
            console.log('[TransactionsManager] Successfully loaded', transactionsData.length, 'transactions from API');
            const convertedTransactions = transactionsData.map(convertLegacyTransaction);
            setTransactions(convertedTransactions);
            setHasFetchedTransactions(true);
            onTransactionsChange?.(convertedTransactions);
          }
        } catch (error) {
          console.error('[TransactionsManager] Error fetching transactions:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();
  }, [activityId, hasFetchedTransactions, initialTransactions.length]); // Only depend on activityId and fetch flag

  // Reset fetch flag and notification tracking when activityId changes
  useEffect(() => {
    setHasFetchedTransactions(false);
    lastNotifiedCountRef.current = -1; // Reset notification tracking for new activity
  }, [activityId]);

  // Notify parent component when transactions change (only after initial load)
  // This ensures the green tick indicator is updated when transactions are loaded
  useEffect(() => {
    console.log('[TransactionsManager] useEffect - Checking notification conditions:', {
      hasCallback: !!onTransactionsChange,
      isLoading,
      transactionsCount: transactions.length,
      lastNotifiedCount: lastNotifiedCountRef.current
    });
    
    // Only notify if:
    // 1. We have a callback
    // 2. We're not loading
    // 3. The transaction count has actually changed since last notification
    if (onTransactionsChange && !isLoading && lastNotifiedCountRef.current !== transactions.length) {
      console.log('[TransactionsManager] Notifying parent with transactions:', transactions.length);
      lastNotifiedCountRef.current = transactions.length;
      onTransactionsChange(transactions);
    } else {
      console.log('[TransactionsManager] NOT notifying parent - isLoading:', isLoading, 'or count unchanged');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, isLoading]); // Intentionally exclude onTransactionsChange to prevent infinite loops

  // Fetch activity data to get partner_id if not provided as prop
  useEffect(() => {
    if (!activityPartnerId && activityId && activityId !== 'new') {
      const fetchActivityData = async () => {
        try {
          const response = await fetch(`/api/activities/${activityId}`);
          if (response.ok) {
            const activityData = await response.json();
            setFetchedActivityPartnerId(activityData.partner_id || null);
          }
        } catch (error) {
          console.error('Error fetching activity data:', error);
        }
      };
      fetchActivityData();
    }
  }, [activityId, activityPartnerId]);

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

  const handleSelectTransaction = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactionIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTransactionIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedTransactions.filter(t => t.id).map(t => t.id));
      setSelectedTransactionIds(allIds);
    } else {
      setSelectedTransactionIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selectedTransactionIds);
    if (selectedArray.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedArray.length} transaction(s)?`)) return;
    
    setIsBulkDeleting(true);
    
    try {
      // Delete all selected transactions
      await Promise.all(selectedArray.map(async (id) => {
        const response = await fetch(`/api/transactions?id=${id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete transaction');
        }
      }));
      
      // Clear selection
      setSelectedTransactionIds(new Set());
      
      // Refresh data
      if (onRefreshNeeded) {
        await onRefreshNeeded();
      }
      
      toast.success(`Successfully deleted ${selectedArray.length} transaction(s)`);
    } catch (error: any) {
      console.error('[TransactionsManager] Error deleting transactions:', error);
      toast.error('Failed to delete some transactions');
    } finally {
      setIsBulkDeleting(false);
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

  // Calculate summary statistics BEFORE filtering
  const summaryStats = {
    // Commitments (type 1 = Incoming Commitment, type 2 = Outgoing Commitment)
    commitments: transactions.filter(t => t.transaction_type === '1' || t.transaction_type === '2').reduce((sum, t) => sum + (t.value || 0), 0),
    commitmentsCount: transactions.filter(t => t.transaction_type === '1' || t.transaction_type === '2').length,
    
    // Disbursements (type 3 = Disbursement)
    disbursements: transactions.filter(t => t.transaction_type === '3').reduce((sum, t) => sum + (t.value || 0), 0),
    disbursementsCount: transactions.filter(t => t.transaction_type === '3').length,
    
    // Expenditures (type 4 = Expenditure)
    expenditures: transactions.filter(t => t.transaction_type === '4').reduce((sum, t) => sum + (t.value || 0), 0),
    expendituresCount: transactions.filter(t => t.transaction_type === '4').length,
    
    // Validation stats
    validatedCount: transactions.filter(t => t.status === 'actual').length,
    validatedPercent: transactions.length > 0 ? (transactions.filter(t => t.status === 'actual').length / transactions.length) * 100 : 0
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    // Quick filter
    if (quickFilter === 'commitments' && t.transaction_type !== '1' && t.transaction_type !== '2') return false;
    if (quickFilter === 'disbursements' && t.transaction_type !== '3') return false;
    if (quickFilter === 'expenditures' && t.transaction_type !== '4') return false;
    
    // Regular filters
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

  // Pagination logic
  const totalTransactions = sortedTransactions.length;
  const totalPages = Math.ceil(totalTransactions / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalTransactions);
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

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
      {/* Hero Cards Summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <HeroCard
            title="Total Commitments"
            value={formatCurrency(summaryStats.commitments, defaultCurrency || 'USD')}
            subtitle={`${summaryStats.commitmentsCount} transaction${summaryStats.commitmentsCount !== 1 ? 's' : ''}`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <HeroCard
            title="Total Disbursements"
            value={formatCurrency(summaryStats.disbursements, defaultCurrency || 'USD')}
            subtitle={`${summaryStats.disbursementsCount} transaction${summaryStats.disbursementsCount !== 1 ? 's' : ''}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <HeroCard
            title="Total Expenditures"
            value={formatCurrency(summaryStats.expenditures, defaultCurrency || 'USD')}
            subtitle={`${summaryStats.expendituresCount} transaction${summaryStats.expendituresCount !== 1 ? 's' : ''}`}
            icon={<TrendingDown className="h-5 w-5" />}
          />
          <HeroCard
            title="Validated"
            value={`${summaryStats.validatedCount}/${transactions.length}`}
            subtitle={`${Math.round(summaryStats.validatedPercent)}% validated`}
            icon={<CheckCircle className="h-5 w-5" />}
          />
        </div>
      )}

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
              {selectedTransactionIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedTransactionIds.size})
                    </>
                  )}
                </Button>
              )}
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
          {/* Quick Filter Buttons */}
          {transactions.length > 0 && (
            <div className="flex gap-2 mb-4">
              <Button
                variant={quickFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setQuickFilter('all')}
                size="sm"
              >
                All Transactions
              </Button>
              <Button
                variant={quickFilter === 'commitments' ? 'default' : 'outline'}
                onClick={() => setQuickFilter('commitments')}
                size="sm"
              >
                Commitments ({summaryStats.commitmentsCount})
              </Button>
              <Button
                variant={quickFilter === 'disbursements' ? 'default' : 'outline'}
                onClick={() => setQuickFilter('disbursements')}
                size="sm"
              >
                Disbursements ({summaryStats.disbursementsCount})
              </Button>
              <Button
                variant={quickFilter === 'expenditures' ? 'default' : 'outline'}
                onClick={() => setQuickFilter('expenditures')}
                size="sm"
              >
                Expenditures ({summaryStats.expendituresCount})
              </Button>
            </div>
          )}

          {/* Transactions Table */}
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium"><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead className="font-medium"><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="font-medium"><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="font-medium"><Skeleton className="h-4 w-24" /></TableHead>
                    <TableHead className="font-medium"><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="font-medium"><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="font-medium text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableHead>
                    <TableHead className="font-medium text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                    <TableHead className="font-medium text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableHead>
                    <TableHead className="font-medium text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
                    <TableHead className="font-medium"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-6 w-6 rounded-full mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {transactions.length === 0 
                ? "No transactions have been added yet." 
                : "No transactions match the current filters."}
            </div>
          ) : (
            <>
              <TransactionTable
                transactions={paginatedTransactions}
                loading={false}
                error={null}
                sortField={sortColumn}
                sortOrder={sortDirection}
                onSort={handleSort}
                onRowClick={(transactionId) => {
                  const transaction = paginatedTransactions.find(t => t.id === transactionId);
                  if (transaction) handleEdit(transaction);
                }}
                onEdit={(transaction: any) => handleEdit(transaction as Transaction)}
                onDelete={handleDelete}
                variant="compact"
                selectedIds={selectedTransactionIds}
                onSelectAll={handleSelectAll}
                onSelectTransaction={handleSelectTransaction}
              />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <Select value={pageSize.toString()} onValueChange={(value) => {
                        setPageSize(parseInt(value));
                        setCurrentPage(1); // Reset to first page when changing page size
                      }}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

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
        activityPartnerId={activityPartnerId || fetchedActivityPartnerId || undefined}
        onSubmit={handleSubmit}
        defaultFinanceType={defaultFinanceType}
        defaultAidType={defaultAidType}
        defaultCurrency={defaultCurrency}
        defaultTiedStatus={defaultTiedStatus}
        defaultFlowType={defaultFlowType}
        isSubmitting={submitting}
      />
    </div>
  );
} 