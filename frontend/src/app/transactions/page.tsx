"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, ChevronUp, ChevronDown, ChevronsUpDown, Frown, ChevronLeft, ChevronRight, Receipt, ShieldCheck, Building2, Banknote, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ColumnSelector } from "@/components/ui/column-selector";
import {
  TransactionColumnId,
  transactionColumns,
  transactionColumnGroups,
  defaultVisibleTransactionColumns,
  TRANSACTION_COLUMNS_LOCALSTORAGE_KEY,
} from "./columns";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { useTransactions } from "@/hooks/useTransactions";
import { TRANSACTION_TYPE_LABELS, Transaction } from "@/types/transaction";
import TransactionModal from "@/components/TransactionModal";
import { TransactionsListSkeleton } from "@/components/skeletons";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { BulkDeleteDialog } from "@/components/dialogs/bulk-delete-dialog";
import { YearlyTotalsBarChart, MultiSeriesDataPoint } from "@/components/charts/YearlyTotalsBarChart";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { CustomYearSelector } from "@/components/ui/custom-year-selector";
import { useCustomYears } from "@/hooks/useCustomYears";

type FilterState = {
  transactionTypes: string[];
  aidType: string;
  flowType: string;
  financeTypes: string[];
  organizations: string[];
  dateFrom: string;
  dateTo: string;
  statuses: string[];
  transactionSource: string;
};

export default function TransactionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("transaction_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [financeTypes, setFinanceTypes] = useState<Array<{code: string, name: string}>>([]);
  const [activityPartnerId, setActivityPartnerId] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkAccepting, setIsBulkAccepting] = useState(false);
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  
  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<TransactionColumnId[]>(defaultVisibleTransactionColumns);
  
  const [filters, setFilters] = useState<FilterState>({
    transactionTypes: [],
    aidType: "all",
    flowType: "all",
    financeTypes: [],
    organizations: [],
    dateFrom: "",
    dateTo: "",
    statuses: [],
    transactionSource: "all",
  });

  // Yearly summary state for chart
  const [yearlySummary, setYearlySummary] = useState<MultiSeriesDataPoint[]>([]);
  const [yearlySummaryLoading, setYearlySummaryLoading] = useState(true);

  // Custom year selection for chart
  const { customYears, selectedId: selectedCustomYearId, setSelectedId: setSelectedCustomYearId, selectedYear, loading: customYearsLoading } = useCustomYears();

  // Year range filter for chart
  const [chartStartYear, setChartStartYear] = useState<number | null>(null);
  const [chartEndYear, setChartEndYear] = useState<number | null>(null);

  // Filter yearly summary data by year range
  const filteredYearlySummary = useMemo(() => {
    if (!yearlySummary) return [];
    return yearlySummary.filter(item => {
      if (chartStartYear && item.year < chartStartYear) return false;
      if (chartEndYear && item.year > chartEndYear) return false;
      return true;
    });
  }, [yearlySummary, chartStartYear, chartEndYear]);

  // Calculate actual data year range (from unfiltered data)
  const dataYearRange = useMemo(() => {
    if (!yearlySummary || yearlySummary.length === 0) return { min: null, max: null };
    const years = yearlySummary.map(d => d.year);
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [yearlySummary]);

  // Auto-select "Data" range when data first loads
  useEffect(() => {
    if (dataYearRange.min !== null && dataYearRange.max !== null && chartStartYear === null && chartEndYear === null) {
      setChartStartYear(dataYearRange.min);
      setChartEndYear(dataYearRange.max);
    }
  }, [dataYearRange.min, dataYearRange.max, chartStartYear, chartEndYear]);

  // Use the custom hook to fetch transactions (without sorting - we'll sort client-side)
  const { transactions, loading, error, refetch, deleteTransaction, addTransaction, acceptTransaction, rejectTransaction } = useTransactions({
    searchQuery,
    filters,
    page: currentPage,
    limit: pageLimit,
    includeLinked: true, // Always include linked transactions
  });

  // Currency converter hook
  const { convertTransaction, isConverting, convertingIds, error: conversionError } = useCurrencyConverter();
  
  // Global loading bar for top-of-screen progress indicator
  const { startLoading, stopLoading } = useLoadingBar();
  
  // Show/hide global loading bar based on loading state
  useEffect(() => {
    if (loading && transactions.data.length === 0) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [loading, transactions.data.length, startLoading, stopLoading]);

  // Load saved page limit preference and fetch organizations on mount
  useEffect(() => {
    const saved = localStorage.getItem("transactions-page-limit");
    if (saved) {
      const savedLimit = Number(saved);
      // Don't allow 9999 (show all) - default to 20
      if (savedLimit !== 9999 && savedLimit > 0) {
        setPageLimit(savedLimit);
      }
    }

    // Load visible columns from localStorage
    try {
      const savedColumns = localStorage.getItem(TRANSACTION_COLUMNS_LOCALSTORAGE_KEY);
      if (savedColumns) {
        const parsed = JSON.parse(savedColumns) as TransactionColumnId[];
        // Validate that all saved columns are valid column IDs
        const validColumns = parsed.filter(id => 
          TRANSACTION_COLUMN_CONFIGS.some(config => config.id === id)
        );
        // Ensure always-visible columns are included
        const alwaysVisible = TRANSACTION_COLUMN_CONFIGS
          .filter(c => c.alwaysVisible)
          .map(c => c.id);
        const merged = [...new Set([...alwaysVisible, ...validColumns])];
        setVisibleColumns(merged);
      }
    } catch (e) {
      console.error('Failed to load column preferences from localStorage:', e);
    }

    // Fetch organizations and finance types for filter dropdowns
    fetchOrganizations();
    fetchFinanceTypes();
  }, []);

  // Save visible columns to localStorage when they change
  const handleColumnsChange = useCallback((newColumns: TransactionColumnId[]) => {
    setVisibleColumns(newColumns);
    try {
      localStorage.setItem(TRANSACTION_COLUMNS_LOCALSTORAGE_KEY, JSON.stringify(newColumns));
    } catch (e) {
      console.error('Failed to save column preferences to localStorage:', e);
    }
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || data);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchFinanceTypes = async () => {
    try {
      const response = await fetch('/api/analytics/finance-types');
      if (response.ok) {
        const data = await response.json();
        setFinanceTypes(data);
      }
    } catch (error) {
      console.error('Error fetching finance types:', error);
    }
  };

  // Fetch yearly summary when filters change
  useEffect(() => {
    const fetchYearlySummary = async () => {
      setYearlySummaryLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.transactionTypes.length > 0) params.append('transactionTypes', filters.transactionTypes.join(','));
        if (filters.statuses.length > 0) params.append('statuses', filters.statuses.join(','));
        if (filters.organizations.length > 0) params.append('organizations', filters.organizations.join(','));
        if (filters.financeTypes.length > 0) params.append('financeTypes', filters.financeTypes.join(','));
        if (filters.flowType !== 'all') params.append('flowType', filters.flowType);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (searchQuery) params.append('search', searchQuery);
        
        // Add custom year params if selected
        if (selectedYear) {
          params.append('startMonth', selectedYear.startMonth.toString());
          params.append('startDay', selectedYear.startDay.toString());
          params.append('endMonth', selectedYear.endMonth.toString());
          params.append('endDay', selectedYear.endDay.toString());
        }

        const response = await fetch(`/api/transactions/yearly-summary?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setYearlySummary(data.years || []);
        }
      } catch (error) {
        console.error('Error fetching yearly summary:', error);
      } finally {
        setYearlySummaryLoading(false);
      }
    };

    fetchYearlySummary();
  }, [filters, searchQuery, selectedYear]);

  // Reset to page 1 when filters change (but not when sorting changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // Fetch activity data when editing a transaction to get partner_id
  useEffect(() => {
    if (editingTransaction?.activity_id) {
      const fetchActivityData = async () => {
        try {
          const response = await fetch(`/api/activities/${editingTransaction.activity_id}`);
          if (response.ok) {
            const activityData = await response.json();
            setActivityPartnerId(activityData.partner_id || null);
          }
        } catch (error) {
          console.error('Error fetching activity data:', error);
          setActivityPartnerId(null);
        }
      };
      fetchActivityData();
    } else {
      setActivityPartnerId(null);
    }
  }, [editingTransaction?.activity_id]);

  // Client-side sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort transactions client-side
  const sortedTransactions = React.useMemo(() => {
    if (!transactions?.data?.length) return transactions?.data || [];
    
    return [...transactions.data].sort((a, b) => {
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
        case 'value_usd':
          aValue = a.value_usd || 0;
          bValue = b.value_usd || 0;
          break;
        case 'provider_org_name':
          aValue = (a.provider_org_name || a.from_org || '').toLowerCase();
          bValue = (b.provider_org_name || b.from_org || '').toLowerCase();
          break;
        case 'activity':
          // Use activityTitle which is the field from the slim API endpoint
          aValue = (a.activityTitle || a.activity?.title_narrative || a.activity?.title || 'Untitled Activity').toLowerCase();
          bValue = (b.activityTitle || b.activity?.title_narrative || b.activity?.title || 'Untitled Activity').toLowerCase();
          break;
        case 'finance_type':
          aValue = a.finance_type || '';
          bValue = b.finance_type || '';
          break;
        case 'aid_type':
          aValue = a.aid_type || '';
          bValue = b.aid_type || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions?.data, sortField, sortOrder]);

  // Pagination logic
  const totalTransactions = transactions?.total || 0;
  const totalPages = Math.ceil(totalTransactions / pageLimit);
  const startIndex = (currentPage - 1) * pageLimit;
  const endIndex = Math.min(startIndex + pageLimit, totalTransactions);

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
    localStorage.setItem("transactions-page-limit", newLimit.toString());
  };

  const exportTransactions = () => {
    const dataToExport = transactions.data.map((transaction) => ({
      "Transaction ID": transaction.id,
      "Activity": transaction.activityTitle || transaction.activity?.title || transaction.activity_id,
      "From Organization": transaction.provider_org_name || transaction.from_org || "",
      "To Organization": transaction.receiver_org_name || transaction.to_org || "",
      "Transaction Type": TRANSACTION_TYPE_LABELS[transaction.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || transaction.transaction_type,
      "Aid Type": transaction.aid_type || "",
      "Flow Type": transaction.flow_type || "",
      "Finance Type": transaction.finance_type || "",
      "Value": transaction.value,
      "Currency": transaction.currency,
      "Transaction Date": format(new Date(transaction.transaction_date), "yyyy-MM-dd"),
      "Status": transaction.status,
      "Created By": transaction.created_by || "",
    }));

    const headers = Object.keys(dataToExport[0] || {});
    const csv = [
      headers.join(","),
      ...dataToExport.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transactions exported successfully");
  };

  const handleRowClick = (transactionId: string) => {
    // Find the transaction to get its activity_id
    const transaction = transactions.data.find(t => (t.uuid || t.id) === transactionId);
    if (transaction && transaction.activity_id) {
      // Navigate to Activity Editor's finances section
      router.push(`/activities/new?id=${transaction.activity_id}&section=finances`);
    } else {
      // Fallback to transaction detail page if no activity_id
      router.push(`/transactions/${transactionId}`);
    }
  };

  const handleEdit = (transaction: any) => {
    if (transaction && transaction.activity_id) {
      // Navigate to Activity Editor's finances section for editing with transaction ID
      const transactionId = transaction.uuid || transaction.id;
      router.push(`/activities/new?id=${transaction.activity_id}&section=finances&transactionId=${transactionId}`);
    } else {
      // Fallback to modal if no activity_id
      setEditingTransaction(transaction);
      setShowTransactionModal(true);
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!transactionId || transactionId === 'undefined') {
      toast.error("Invalid transaction ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    // Find the transaction to delete (for potential recovery)
    const transactionToDelete = transactions.data.find(t => (t.uuid || t.id) === transactionId);
    
    // Optimistic update - remove from UI immediately
    deleteTransaction(transactionId);

    try {
      const response = await fetch(`/api/transactions?uuid=${transactionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      toast.success("Transaction deleted successfully");
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast.error(error.message || "Failed to delete transaction");
      
      // Revert the optimistic update on error
      if (transactionToDelete) {
        addTransaction(transactionToDelete);
      } else {
        refetch(); // Fallback: refresh the entire list
      }
    }
  };

  const handleConvertCurrency = async (transactionId: string) => {
    const transaction = transactions.data.find(t => (t.uuid || t.id) === transactionId);
    if (!transaction) {
      toast.error("Transaction not found");
      return;
    }

    try {
      const success = await convertTransaction(
        transactionId,
        transaction.value,
        transaction.currency,
        transaction.value_date || transaction.transaction_date
      );

      if (success) {
        toast.success(`Transaction converted to USD successfully`);
        refetch(); // Refresh to show updated USD values
      } else {
        toast.error(conversionError || "Failed to convert transaction");
      }
    } catch (error) {
      console.error('Currency conversion error:', error);
      toast.error("Currency conversion failed");
    }
  };

  const handleAcceptTransaction = async (transactionId: string, acceptingActivityId: string) => {
    try {
      await acceptTransaction(transactionId, acceptingActivityId);
      refetch(); // Refresh the data to show updated status
    } catch (error) {
      console.error("Failed to accept transaction:", error);
      // Error handling is done in the hook
    }
  };

  const handleRejectTransaction = async (transactionId: string, rejectionReason?: string) => {
    try {
      await rejectTransaction(transactionId, undefined, rejectionReason);
      refetch(); // Refresh the data to show updated status
    } catch (error) {
      console.error("Failed to reject transaction:", error);
      // Error handling is done in the hook
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = sortedTransactions.map(t => t.uuid || t.id).filter(Boolean);
      setSelectedTransactionIds(new Set(allIds));
    } else {
      setSelectedTransactionIds(new Set());
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

  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selectedTransactionIds);
    if (selectedArray.length === 0) return;
    
    setShowBulkDeleteDialog(false);
    setIsBulkDeleting(true);
    
    // Clear selection immediately - ensures checkbox state is correct right away
    setSelectedTransactionIds(new Set());
    
    try {
      // Optimistic update - remove from UI immediately
      selectedArray.forEach(id => deleteTransaction(id));
      
      const response = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuids: selectedArray
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete transactions');
      }
      
      const result = await response.json();
      toast.success(`${result.deletedCount} ${result.deletedCount === 1 ? 'transaction' : 'transactions'} deleted successfully`);
      
      // Refetch to ensure data is in sync with the server
      refetch();
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete some transactions');
      // Revert optimistic updates by refetching
      refetch();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkAccept = async () => {
    const selectedArray = Array.from(selectedTransactionIds);
    const linkedTransactions = sortedTransactions.filter(t => 
      selectedArray.includes(t.uuid || t.id) && 
      t.transaction_source === 'linked' && 
      t.acceptance_status === 'pending'
    );
    
    if (linkedTransactions.length === 0) {
      toast.error('No pending linked transactions selected');
      return;
    }

    setIsBulkAccepting(true);
    
    try {
      const response = await fetch('/api/transactions/bulk-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: linkedTransactions.map(t => t.uuid || t.id),
          acceptingActivityId: linkedTransactions[0]?.activity_id, // Use first transaction's activity
          acceptingUserId: undefined // Could be passed from user context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept transactions');
      }

      const result = await response.json();
      
      toast.success(result.message);
      
      // Clear selection and refresh data
      setSelectedTransactionIds(new Set());
      refetch();
      
    } catch (error) {
      console.error('Bulk accept failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to accept transactions');
    } finally {
      setIsBulkAccepting(false);
    }
  };

  const handleBulkReject = async () => {
    const selectedArray = Array.from(selectedTransactionIds);
    const linkedTransactions = sortedTransactions.filter(t => 
      selectedArray.includes(t.uuid || t.id) && 
      t.transaction_source === 'linked' && 
      t.acceptance_status === 'pending'
    );
    
    if (linkedTransactions.length === 0) {
      toast.error('No pending linked transactions selected');
      return;
    }

    setIsBulkRejecting(true);
    
    try {
      const response = await fetch('/api/transactions/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: linkedTransactions.map(t => t.uuid || t.id),
          rejectingUserId: undefined, // Could be passed from user context
          rejectionReason: 'Bulk rejection' // Could be made configurable
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject transactions');
      }

      const result = await response.json();
      
      toast.success(result.message);
      
      // Clear selection and refresh data
      setSelectedTransactionIds(new Set());
      refetch();
      
    } catch (error) {
      console.error('Bulk reject failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject transactions');
    } finally {
      setIsBulkRejecting(false);
    }
  };

  const handleTransactionSubmit = async (formData: any) => {
    try {
      const response = await fetch('/api/transactions', {
        method: editingTransaction ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingTransaction?.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save transaction');
      }

      toast.success(editingTransaction ? "Transaction updated successfully" : "Transaction added successfully");
      setShowTransactionModal(false);
      setEditingTransaction(null);
      refetch(); // Refresh the transactions list
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast.error(error.message || "Failed to save transaction");
    }
  };

  // Show skeleton loader during initial load
  if (loading && transactions.data.length === 0 && !searchQuery) {
    return (
      <MainLayout>
        <TransactionsListSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Transactions</h1>
            <p className="text-slate-500">View and manage all financial transactions</p>
          </div>
          <div className="flex items-center space-x-4">
            {transactions.data.length > 0 && (
              <Button
                variant="outline"
                onClick={exportTransactions}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search, Filters, and View Controls - All in One Row */}
        <div className="flex items-end gap-3 py-3 bg-slate-50 rounded-lg px-3 border border-gray-200">
          {/* Search */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[240px] h-9 pl-8"
              />
            </div>
          </div>

          {/* Filters */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <MultiSelectFilter
                options={[
                  { value: "1", label: "Incoming Funds", code: "1" },
                  { value: "2", label: "Outgoing Commitment", code: "2" },
                  { value: "3", label: "Disbursement", code: "3" },
                  { value: "4", label: "Expenditure", code: "4" },
                  { value: "5", label: "Interest Payment", code: "5" },
                  { value: "6", label: "Loan Repayment", code: "6" },
                  { value: "7", label: "Reimbursement", code: "7" },
                  { value: "8", label: "Purchase of Equity", code: "8" },
                  { value: "9", label: "Sale of Equity", code: "9" },
                  { value: "10", label: "Credit Guarantee", code: "10" },
                  { value: "11", label: "Incoming Commitment", code: "11" },
                  { value: "12", label: "Outgoing Pledge", code: "12" },
                  { value: "13", label: "Incoming Pledge", code: "13" },
                ]}
                value={filters.transactionTypes}
                onChange={(value) => setFilters({...filters, transactionTypes: value})}
                placeholder="All"
                searchPlaceholder="Search types..."
                emptyText="No types found."
                icon={<Receipt className="h-4 w-4 text-muted-foreground shrink-0" />}
                className="w-[200px] h-9"
                dropdownClassName="w-[320px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <MultiSelectFilter
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "submitted", label: "Submitted" },
                  { value: "validated", label: "Validated" },
                  { value: "rejected", label: "Rejected" },
                  { value: "actual", label: "Actual" },
                ]}
                value={filters.statuses}
                onChange={(value) => setFilters({...filters, statuses: value})}
                placeholder="All"
                searchPlaceholder="Search statuses..."
                emptyText="No statuses found."
                icon={<ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />}
                className="w-[160px] h-9"
                dropdownClassName="w-[240px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Organisation</Label>
              <MultiSelectFilter
                options={organizations.map((org) => ({
                  value: org.id,
                  label: org.name || org.acronym || '',
                  code: org.acronym || undefined,
                }))}
                value={filters.organizations}
                onChange={(value) => setFilters({...filters, organizations: value})}
                placeholder="All"
                searchPlaceholder="Search organisations..."
                emptyText="No organisations found."
                icon={<Building2 className="h-4 w-4 text-muted-foreground shrink-0" />}
                className="w-[220px] h-9"
                dropdownClassName="w-[400px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Finance Type</Label>
              <MultiSelectFilter
                options={financeTypes.map((ft) => ({
                  value: ft.code,
                  label: ft.name,
                  code: ft.code,
                }))}
                value={filters.financeTypes}
                onChange={(value) => setFilters({...filters, financeTypes: value})}
                placeholder="All"
                searchPlaceholder="Search finance types..."
                emptyText="No finance types found."
                icon={<Banknote className="h-4 w-4 text-muted-foreground shrink-0" />}
                className="w-[200px] h-9"
                dropdownClassName="w-[320px]"
              />
            </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Column Selector */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Columns</Label>
            <ColumnSelector<TransactionColumnId>
              columns={transactionColumns}
              visibleColumns={visibleColumns}
              defaultVisibleColumns={defaultVisibleTransactionColumns}
              onChange={handleColumnsChange}
              groupLabels={transactionColumnGroups}
            />
          </div>
        </div>
        
        {/* Performance Warning (if applicable) */}
        {(transactions?.total || 0) > 500 && pageLimit === 9999 && (
          <div className="text-xs text-amber-600 px-4">
            ⚠️ Showing {transactions?.total || 0} items may affect performance
          </div>
        )}

        {/* Yearly Summary Chart */}
        <YearlyTotalsBarChart
          title="Transaction Totals by Year"
          description="Yearly totals by transaction type (filtered)"
          loading={yearlySummaryLoading}
          multiSeriesData={filteredYearlySummary}
          height={280}
          selectedYear={selectedYear}
          startYear={chartStartYear}
          endYear={chartEndYear}
          onStartYearChange={setChartStartYear}
          onEndYearChange={setChartEndYear}
          dataMinYear={dataYearRange.min}
          dataMaxYear={dataYearRange.max}
          headerControls={
            <CustomYearSelector
              customYears={customYears}
              selectedId={selectedCustomYearId}
              onSelect={setSelectedCustomYearId}
              loading={customYearsLoading}
              placeholder="Year Type"
            />
          }
        />

        {/* Transactions Table */}
        {loading || (transactions?.total || 0) === 0 ? (
          <TransactionsListSkeleton />
        ) : error ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to Load Transactions</h3>
                <p className="text-slate-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : sortedTransactions.length === 0 && (searchQuery || filters.transactionTypes.length > 0 || filters.statuses.length > 0 || filters.organizations.length > 0 || filters.financeTypes.length > 0) ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-slate-500">No matching transactions found</div>
          </div>
        ) : (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <TransactionTable
                transactions={sortedTransactions}
                organizations={organizations}
                loading={false}
                error={null}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                onRowClick={handleRowClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConvertCurrency={handleConvertCurrency}
                onAcceptTransaction={handleAcceptTransaction}
                onRejectTransaction={handleRejectTransaction}
                selectedIds={selectedTransactionIds}
                onSelectAll={handleSelectAll}
                onSelectTransaction={handleSelectTransaction}
                visibleColumns={visibleColumns}
              />
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalTransactions > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {Math.min(startIndex + 1, totalTransactions)} to {Math.min(endIndex, totalTransactions)} of {totalTransactions} transactions
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
                    onClick={() => {
                      const newPage = Math.max(1, currentPage - 1);
                      setCurrentPage(newPage);
                    }}
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
                    onClick={() => {
                      const newPage = Math.min(totalPages, currentPage + 1);
                      setCurrentPage(newPage);
                    }}
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
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Items per page:</label>
                  <Select 
                    value={pageLimit.toString()} 
                    onValueChange={(value) => handlePageLimitChange(Number(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Modal */}
        <TransactionModal
          open={showTransactionModal}
          onOpenChange={(open) => {
            setShowTransactionModal(open);
            if (!open) {
              setEditingTransaction(null);
            }
          }}
          onSubmit={handleTransactionSubmit}
          transaction={editingTransaction}
          activityId={editingTransaction?.activity_id || ''}
          activityPartnerId={activityPartnerId || undefined}
        />

        {/* Bulk Action Toolbar */}
        <BulkActionToolbar
          selectedCount={selectedTransactionIds.size}
          itemType="transactions"
          onDelete={() => setShowBulkDeleteDialog(true)}
          onCancel={() => setSelectedTransactionIds(new Set())}
          isDeleting={isBulkDeleting}
          linkedTransactionCount={
            sortedTransactions.filter(t => 
              selectedTransactionIds.has(t.uuid || t.id) && 
              t.transaction_source === 'linked' && 
              t.acceptance_status === 'pending'
            ).length
          }
          onAcceptLinked={handleBulkAccept}
          onRejectLinked={handleBulkReject}
          isAccepting={isBulkAccepting}
          isRejecting={isBulkRejecting}
        />

        {/* Bulk Delete Confirmation Dialog */}
        <BulkDeleteDialog
          isOpen={showBulkDeleteDialog}
          itemCount={selectedTransactionIds.size}
          itemType="transactions"
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteDialog(false)}
          isDeleting={isBulkDeleting}
        />
      </div>
    </MainLayout>
  );
}