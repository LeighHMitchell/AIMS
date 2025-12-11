"use client"

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, ChevronUp, ChevronDown, ChevronsUpDown, Frown, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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

type FilterState = {
  transactionType: string;
  aidType: string;
  flowType: string;
  financeType: string;
  organization: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  transactionSource: string;
};

// Column configuration for the transaction list table
export type TransactionColumnId = 
  // Always visible
  | 'checkbox' | 'actions'
  // Default visible
  | 'activity' | 'transactionDate' | 'transactionType' | 'organizations' 
  | 'amount' | 'valueDate' | 'usdValue' | 'financeType'
  // Activity Context (optional)
  | 'activityId' | 'iatiIdentifier' | 'reportingOrg'
  // Transaction Details (optional)
  | 'currency' | 'transactionUuid' | 'transactionReference'
  // Status Indicators (optional)
  | 'linkedStatus' | 'acceptanceStatus' | 'validatedStatus'
  // Classification (optional, gray if inherited)
  | 'aidType' | 'flowType' | 'tiedStatus' | 'humanitarian'
  // Organization Details (optional)
  | 'providerActivity' | 'receiverActivity'
  // Additional Details (optional)
  | 'description' | 'disbursementChannel';

interface TransactionColumnConfig {
  id: TransactionColumnId;
  label: string;
  group: 'default' | 'activityContext' | 'transactionDetails' | 'statusIndicators' 
       | 'classification' | 'organizationDetails' | 'additionalDetails';
  width?: string;
  alwaysVisible?: boolean;
  defaultVisible?: boolean;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

const TRANSACTION_COLUMN_CONFIGS: TransactionColumnConfig[] = [
  // Default columns (8 default visible + 2 always visible)
  { id: 'checkbox', label: 'Select', group: 'default', alwaysVisible: true, defaultVisible: true },
  { id: 'activity', label: 'Activity', group: 'default', defaultVisible: true, sortable: true },
  { id: 'transactionDate', label: 'Date', group: 'default', defaultVisible: true, sortable: true },
  { id: 'transactionType', label: 'Type', group: 'default', defaultVisible: true, sortable: true },
  { id: 'organizations', label: 'Provider → Receiver', group: 'default', defaultVisible: true, sortable: true },
  { id: 'amount', label: 'Amount', group: 'default', defaultVisible: true, sortable: true, align: 'right' },
  { id: 'valueDate', label: 'Value Date', group: 'default', defaultVisible: true, sortable: true },
  { id: 'usdValue', label: 'USD Value', group: 'default', defaultVisible: true, sortable: true, align: 'right' },
  { id: 'financeType', label: 'Finance Type', group: 'default', defaultVisible: true },
  { id: 'actions', label: 'Actions', group: 'default', alwaysVisible: true, defaultVisible: true },
  
  // Activity Context
  { id: 'activityId', label: 'Activity ID', group: 'activityContext', defaultVisible: false },
  { id: 'iatiIdentifier', label: 'IATI Identifier', group: 'activityContext', defaultVisible: false },
  { id: 'reportingOrg', label: 'Reporting Org', group: 'activityContext', defaultVisible: false },
  
  // Transaction Details
  { id: 'currency', label: 'Currency', group: 'transactionDetails', defaultVisible: false },
  { id: 'transactionUuid', label: 'Transaction UUID', group: 'transactionDetails', defaultVisible: false },
  { id: 'transactionReference', label: 'Transaction Reference', group: 'transactionDetails', defaultVisible: false },
  
  // Status Indicators
  { id: 'linkedStatus', label: 'Linked Status', group: 'statusIndicators', defaultVisible: false },
  { id: 'acceptanceStatus', label: 'Acceptance Status', group: 'statusIndicators', defaultVisible: false },
  { id: 'validatedStatus', label: 'Validated', group: 'statusIndicators', defaultVisible: false },
  
  // Classification (gray if inherited)
  { id: 'aidType', label: 'Aid Type', group: 'classification', defaultVisible: false },
  { id: 'flowType', label: 'Flow Type', group: 'classification', defaultVisible: false },
  { id: 'tiedStatus', label: 'Tied Status', group: 'classification', defaultVisible: false },
  { id: 'humanitarian', label: 'Humanitarian', group: 'classification', defaultVisible: false },
  
  // Organization Details
  { id: 'providerActivity', label: 'Provider Activity', group: 'organizationDetails', defaultVisible: false },
  { id: 'receiverActivity', label: 'Receiver Activity', group: 'organizationDetails', defaultVisible: false },
  
  // Additional Details
  { id: 'description', label: 'Description', group: 'additionalDetails', defaultVisible: false },
  { id: 'disbursementChannel', label: 'Disbursement Channel', group: 'additionalDetails', defaultVisible: false },
];

const TRANSACTION_COLUMN_GROUPS = {
  default: 'Default Columns',
  activityContext: 'Activity Context',
  transactionDetails: 'Transaction Details',
  statusIndicators: 'Status Indicators',
  classification: 'Classification',
  organizationDetails: 'Organization Details',
  additionalDetails: 'Additional Details',
};

const DEFAULT_VISIBLE_TRANSACTION_COLUMNS: TransactionColumnId[] = 
  TRANSACTION_COLUMN_CONFIGS.filter(col => col.defaultVisible).map(col => col.id);

const TRANSACTION_COLUMNS_LOCALSTORAGE_KEY = 'aims_transaction_list_visible_columns';

// Column Selector Component
interface TransactionColumnSelectorProps {
  visibleColumns: TransactionColumnId[];
  onColumnsChange: (columns: TransactionColumnId[]) => void;
}

function TransactionColumnSelector({ visibleColumns, onColumnsChange }: TransactionColumnSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleColumn = (columnId: TransactionColumnId) => {
    const config = TRANSACTION_COLUMN_CONFIGS.find(c => c.id === columnId);
    if (config?.alwaysVisible) return; // Can't toggle always-visible columns
    
    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId));
    } else {
      onColumnsChange([...visibleColumns, columnId]);
    }
  };

  const toggleGroup = (group: keyof typeof TRANSACTION_COLUMN_GROUPS) => {
    const groupColumns = TRANSACTION_COLUMN_CONFIGS.filter(c => c.group === group && !c.alwaysVisible);
    const allVisible = groupColumns.every(c => visibleColumns.includes(c.id));
    
    if (allVisible) {
      // Hide all columns in this group
      onColumnsChange(visibleColumns.filter(id => !groupColumns.find(c => c.id === id)));
    } else {
      // Show all columns in this group
      const newColumns = [...visibleColumns];
      groupColumns.forEach(c => {
        if (!newColumns.includes(c.id)) {
          newColumns.push(c.id);
        }
      });
      onColumnsChange(newColumns);
    }
  };

  const resetToDefaults = () => {
    onColumnsChange(DEFAULT_VISIBLE_TRANSACTION_COLUMNS);
  };

  const selectAll = () => {
    const allColumnIds = TRANSACTION_COLUMN_CONFIGS.map(c => c.id);
    onColumnsChange(allColumnIds);
  };

  const visibleCount = visibleColumns.filter(id => {
    const config = TRANSACTION_COLUMN_CONFIGS.find(c => c.id === id);
    return config && !config.alwaysVisible;
  }).length;

  const totalToggleable = TRANSACTION_COLUMN_CONFIGS.filter(c => !c.alwaysVisible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
            {visibleCount}
          </Badge>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[100]" align="end" sideOffset={5}>
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Visible Columns</h4>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectAll}
                className="h-7 text-xs"
              >
                Select all
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetToDefaults}
                className="h-7 text-xs"
              >
                Reset
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {visibleCount} of {totalToggleable} columns visible
          </p>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {(Object.keys(TRANSACTION_COLUMN_GROUPS) as Array<keyof typeof TRANSACTION_COLUMN_GROUPS>).map(groupKey => {
            const groupColumns = TRANSACTION_COLUMN_CONFIGS.filter(c => c.group === groupKey && !c.alwaysVisible);
            if (groupColumns.length === 0) return null;
            
            const allVisible = groupColumns.every(c => visibleColumns.includes(c.id));
            const someVisible = groupColumns.some(c => visibleColumns.includes(c.id));
            
            return (
              <div key={groupKey} className="border-b last:border-b-0">
                <div 
                  className="flex items-center gap-2 px-3 py-2 bg-muted/50 cursor-pointer hover:bg-muted/80"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <Checkbox 
                    checked={allVisible}
                    // @ts-ignore - indeterminate is valid but not in types
                    indeterminate={someVisible && !allVisible}
                    onCheckedChange={() => toggleGroup(groupKey)}
                  />
                  <span className="text-sm font-medium">{TRANSACTION_COLUMN_GROUPS[groupKey]}</span>
                </div>
                <div className="py-1">
                  {groupColumns.map(column => (
                    <div
                      key={column.id}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleColumn(column.id)}
                    >
                      <Checkbox 
                        checked={visibleColumns.includes(column.id)}
                        onCheckedChange={() => toggleColumn(column.id)}
                      />
                      <span className="text-sm">{column.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const [visibleColumns, setVisibleColumns] = useState<TransactionColumnId[]>(DEFAULT_VISIBLE_TRANSACTION_COLUMNS);
  
  const [filters, setFilters] = useState<FilterState>({
    transactionType: "all",
    aidType: "all",
    flowType: "all",
    financeType: "all",
    organization: "all",
    dateFrom: "",
    dateTo: "",
    status: "all",
    transactionSource: "all",
  });

  // Yearly summary state for chart
  const [yearlySummary, setYearlySummary] = useState<MultiSeriesDataPoint[]>([]);
  const [yearlySummaryLoading, setYearlySummaryLoading] = useState(true);

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
        if (filters.transactionType !== 'all') params.append('transactionType', filters.transactionType);
        if (filters.status !== 'all') params.append('status', filters.status);
        if (filters.organization !== 'all') params.append('organization', filters.organization);
        if (filters.financeType !== 'all') params.append('financeType', filters.financeType);
        if (filters.flowType !== 'all') params.append('flowType', filters.flowType);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (searchQuery) params.append('search', searchQuery);

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
  }, [filters, searchQuery]);

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
          // Use title_narrative which is the actual field from the API
          aValue = (a.activity?.title_narrative || a.activity?.title || 'Untitled Activity').toLowerCase();
          bValue = (b.activity?.title_narrative || b.activity?.title || 'Untitled Activity').toLowerCase();
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
      "Activity": transaction.activity?.title || transaction.activity_id,
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
        <div className="flex items-center justify-between gap-4 py-4 bg-slate-50 rounded-lg px-4 overflow-visible relative z-[50]">
          {/* Left Side: Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px]"
            />
          </div>
          
          {/* Center: Filters */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select value={filters.transactionType} onValueChange={(value) => setFilters({...filters, transactionType: value})}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="1">Incoming Commitment</SelectItem>
                <SelectItem value="2">Outgoing Commitment</SelectItem>
                <SelectItem value="3">Disbursement</SelectItem>
                <SelectItem value="4">Expenditure</SelectItem>
                <SelectItem value="5">Interest Repayment</SelectItem>
                <SelectItem value="6">Loan Repayment</SelectItem>
                <SelectItem value="7">Reimbursement</SelectItem>
                <SelectItem value="8">Purchase of Equity</SelectItem>
                <SelectItem value="9">Sale of Equity</SelectItem>
                <SelectItem value="11">Credit Guarantee</SelectItem>
                <SelectItem value="12">Incoming Funds</SelectItem>
                <SelectItem value="13">Commitment Cancellation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="actual">Actual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.organization} onValueChange={(value) => setFilters({...filters, organization: value})}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orgs</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name && org.acronym && org.name !== org.acronym
                      ? `${org.name} (${org.acronym})`
                      : org.name || org.acronym}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.financeType} onValueChange={(value) => setFilters({...filters, financeType: value})}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Finance Type">
                  {filters.financeType === "all" ? "All Finance Types" :
                   financeTypes.find(ft => ft.code === filters.financeType) ? (
                     <span className="flex items-center gap-1">
                       <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                         {filters.financeType}
                       </code>
                       <span className="text-sm truncate">
                         {financeTypes.find(ft => ft.code === filters.financeType)?.name}
                       </span>
                     </span>
                   ) : "Finance Type"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Finance Types</SelectItem>
                {financeTypes.map((ft) => (
                  <SelectItem key={ft.code} value={ft.code}>
                    <span className="flex items-center gap-2">
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                        {ft.code}
                      </code>
                      <span className="text-sm">{ft.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.transactionSource} onValueChange={(value) => setFilters({...filters, transactionSource: value})}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="own">My Transactions</SelectItem>
                <SelectItem value="linked">Linked</SelectItem>
                <SelectItem value="pending_acceptance">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right Side: Column Selector + Results Count */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative z-[200]">
              <TransactionColumnSelector 
                visibleColumns={visibleColumns} 
                onColumnsChange={handleColumnsChange} 
              />
            </div>
            <p className="text-sm text-slate-600 whitespace-nowrap">
              {(transactions?.total || 0) === 0
                ? "No transactions"
                : `Showing ${(currentPage - 1) * pageLimit + 1}–${Math.min(currentPage * pageLimit, transactions?.total || 0)} of ${transactions?.total || 0} transactions`}
            </p>
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
          multiSeriesData={yearlySummary}
          height={280}
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
        ) : sortedTransactions.length === 0 && (searchQuery || filters.transactionType !== "all" || filters.status !== "all" || filters.organization !== "all" || filters.financeType !== "all") ? (
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