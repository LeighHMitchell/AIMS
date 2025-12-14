"use client"
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, Download, DollarSign, AlertCircle, FileText, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CheckCircle, Loader2, Columns3, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";

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

// Column configuration for the activity editor transaction manager
// This is a subset of TransactionTable columns relevant to the activity context
type ActivityEditorColumnId = 
  | 'checkbox' | 'actions'
  | 'transactionDate' | 'transactionType' | 'organizations' 
  | 'amount' | 'valueDate' | 'usdValue' | 'financeType'
  | 'activityId' | 'iatiIdentifier' | 'reportingOrg'
  | 'currency' | 'linkedStatus' | 'acceptanceStatus'
  | 'aidType' | 'flowType' | 'tiedStatus' | 'humanitarian';

interface ActivityEditorColumnConfig {
  id: ActivityEditorColumnId;
  label: string;
  group: 'default' | 'activityContext' | 'classification';
  defaultVisible?: boolean;
  alwaysVisible?: boolean;
}

const ACTIVITY_EDITOR_COLUMN_CONFIGS: ActivityEditorColumnConfig[] = [
  // Always visible
  { id: 'checkbox', label: 'Select', group: 'default', alwaysVisible: true, defaultVisible: true },
  
  // Default columns (visible by default for activity editor)
  { id: 'transactionDate', label: 'Date', group: 'default', defaultVisible: true },
  { id: 'transactionType', label: 'Type', group: 'default', defaultVisible: true },
  { id: 'organizations', label: 'Provider → Receiver', group: 'default', defaultVisible: true },
  { id: 'amount', label: 'Amount', group: 'default', defaultVisible: true },
  { id: 'valueDate', label: 'Value Date', group: 'default', defaultVisible: true },
  { id: 'usdValue', label: 'USD Value', group: 'default', defaultVisible: true },
  { id: 'financeType', label: 'Finance Type', group: 'default', defaultVisible: true },
  { id: 'linkedStatus', label: 'Linked', group: 'default', defaultVisible: false },
  { id: 'acceptanceStatus', label: 'Acceptance', group: 'default', defaultVisible: false },
  
  // Activity context columns (optional)
  { id: 'activityId', label: 'Activity ID', group: 'activityContext', defaultVisible: false },
  { id: 'iatiIdentifier', label: 'IATI Identifier', group: 'activityContext', defaultVisible: false },
  { id: 'reportingOrg', label: 'Reporting Org', group: 'activityContext', defaultVisible: false },
  
  // Classification columns (optional)
  { id: 'currency', label: 'Currency', group: 'classification', defaultVisible: false },
  { id: 'aidType', label: 'Aid Type', group: 'classification', defaultVisible: false },
  { id: 'flowType', label: 'Flow Type', group: 'classification', defaultVisible: false },
  { id: 'tiedStatus', label: 'Tied Status', group: 'classification', defaultVisible: false },
  { id: 'humanitarian', label: 'Humanitarian', group: 'classification', defaultVisible: false },
  
  // Actions always visible
  { id: 'actions', label: 'Actions', group: 'default', alwaysVisible: true, defaultVisible: true },
];

const ACTIVITY_EDITOR_COLUMN_GROUPS = {
  default: 'Default Columns',
  activityContext: 'Activity Context',
  classification: 'Classification',
};

const DEFAULT_VISIBLE_ACTIVITY_EDITOR_COLUMNS: ActivityEditorColumnId[] = 
  ACTIVITY_EDITOR_COLUMN_CONFIGS.filter(col => col.defaultVisible || col.alwaysVisible).map(col => col.id);

const ACTIVITY_EDITOR_COLUMNS_LOCALSTORAGE_KEY = 'aims_activity_editor_transaction_visible_columns_v2';  // v2: Finance Type column now visible

// Column Selector Component for Activity Editor
interface ActivityEditorColumnSelectorProps {
  visibleColumns: ActivityEditorColumnId[];
  onColumnsChange: (columns: ActivityEditorColumnId[]) => void;
}

function ActivityEditorColumnSelector({ visibleColumns, onColumnsChange }: ActivityEditorColumnSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleColumn = (columnId: ActivityEditorColumnId) => {
    const config = ACTIVITY_EDITOR_COLUMN_CONFIGS.find(c => c.id === columnId);
    if (config?.alwaysVisible) return;
    
    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId));
    } else {
      onColumnsChange([...visibleColumns, columnId]);
    }
  };

  const toggleGroup = (group: keyof typeof ACTIVITY_EDITOR_COLUMN_GROUPS) => {
    const groupColumns = ACTIVITY_EDITOR_COLUMN_CONFIGS.filter(c => c.group === group && !c.alwaysVisible);
    const allVisible = groupColumns.every(c => visibleColumns.includes(c.id));
    
    if (allVisible) {
      onColumnsChange(visibleColumns.filter(id => !groupColumns.find(c => c.id === id)));
    } else {
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
    onColumnsChange(DEFAULT_VISIBLE_ACTIVITY_EDITOR_COLUMNS);
  };

  const selectAll = () => {
    const allColumnIds = ACTIVITY_EDITOR_COLUMN_CONFIGS.map(c => c.id);
    onColumnsChange(allColumnIds);
  };

  const selectableColumns = ACTIVITY_EDITOR_COLUMN_CONFIGS.filter(c => !c.alwaysVisible);
  const visibleCount = visibleColumns.filter(id => !ACTIVITY_EDITOR_COLUMN_CONFIGS.find(c => c.id === id)?.alwaysVisible).length;
  const totalColumns = selectableColumns.length;

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
      <PopoverContent className="w-72 p-0 z-[200]" align="end" sideOffset={5}>
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
            {visibleCount} of {totalColumns} columns visible
          </p>
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {(Object.keys(ACTIVITY_EDITOR_COLUMN_GROUPS) as Array<keyof typeof ACTIVITY_EDITOR_COLUMN_GROUPS>).map(groupKey => {
            const groupColumns = ACTIVITY_EDITOR_COLUMN_CONFIGS.filter(c => c.group === groupKey && !c.alwaysVisible);
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
                  <span className="text-sm font-medium">{ACTIVITY_EDITOR_COLUMN_GROUPS[groupKey]}</span>
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
  initialTransactionId?: string;
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
  defaultDisbursementChannel,
  initialTransactionId
}: TransactionsManagerProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
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
    dateTo: "",
    transactionSource: "all"
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [hasFetchedTransactions, setHasFetchedTransactions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [groupedView, setGroupedView] = useState(false);
  
  // Bulk selection state
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<ActivityEditorColumnId[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ACTIVITY_EDITOR_COLUMNS_LOCALSTORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_VISIBLE_ACTIVITY_EDITOR_COLUMNS;
        }
      }
    }
    return DEFAULT_VISIBLE_ACTIVITY_EDITOR_COLUMNS;
  });
  
  // Save column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVITY_EDITOR_COLUMNS_LOCALSTORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);
  
  // Track last notified transaction count to prevent infinite loops
  const lastNotifiedCountRef = React.useRef<number>(-1);

  // Fetch organizations for alias resolution
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data);
        }
      } catch (error) {
        console.error('Error fetching organizations for alias resolution:', error);
      }
    };
    fetchOrganizations();
  }, []);

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

  // Auto-open transaction modal when initialTransactionId is provided
  useEffect(() => {
    if (initialTransactionId && transactions.length > 0) {
      console.log('[TransactionsManager] Auto-opening modal for transaction:', initialTransactionId);
      
      // Find the transaction by ID (check both uuid and id fields)
      const transaction = transactions.find(
        t => t.uuid === initialTransactionId || t.id === initialTransactionId
      );
      
      if (transaction) {
        console.log('[TransactionsManager] Found transaction to edit:', transaction);
        setEditingTransaction(transaction);
        setShowAddDialog(true);
        
        // Remove the transactionId from URL to prevent re-opening on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('transactionId');
        router.replace(url.pathname + url.search, { scroll: false });
      } else {
        console.warn('[TransactionsManager] Transaction not found with ID:', initialTransactionId);
      }
    }
  }, [initialTransactionId, transactions, router]);

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

    // Optimistically remove transaction from UI immediately
    const deletedTransaction = transactions.find(t => (t.uuid || t.id) === id);
    const updatedTransactions = transactions.filter(t => (t.uuid || t.id) !== id);
    setTransactions(updatedTransactions);
    
    // Also notify parent immediately for consistency
    if (onTransactionsChange) {
      onTransactionsChange(updatedTransactions);
    }

    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Restore the transaction on error
        if (deletedTransaction) {
          setTransactions(prev => [...prev, deletedTransaction]);
          if (onTransactionsChange) {
            onTransactionsChange([...updatedTransactions, deletedTransaction]);
          }
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      // Optionally still refresh from server to ensure full consistency
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

  const confirmBulkDelete = async () => {
    const selectedArray = Array.from(selectedTransactionIds);
    if (selectedArray.length === 0) return;

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

      // Refresh data first
      if (onRefreshNeeded) {
        await onRefreshNeeded();
      }

      // Clear selection AFTER refresh completes to ensure proper state sync
      setSelectedTransactionIds(new Set());

      toast.success(`Successfully deleted ${selectedArray.length} transaction(s)`);
    } catch (error: any) {
      console.error('[TransactionsManager] Error deleting transactions:', error);
      toast.error('Failed to delete some transactions');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleAcceptTransaction = async (transactionId: string, acceptingActivityId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acceptingActivityId,
          acceptingUserId: undefined // Could be passed as prop if needed
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept transaction');
      }

      const result = await response.json();
      
      // Update local state - mark transaction as accepted
      const updatedTransactions = transactions.map(t => 
        t.id === transactionId 
          ? { ...t, acceptance_status: 'accepted' }
          : t
      );
      setTransactions(updatedTransactions);
      onTransactionsChange?.(updatedTransactions);

      toast.success('Transaction accepted successfully');
      
      // Refresh transactions to get the latest state
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept transaction';
      console.error('Failed to accept transaction:', error);
      toast.error(errorMessage);
    }
  };

  const handleRejectTransaction = async (transactionId: string, rejectionReason?: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectingUserId: undefined, // Could be passed as prop if needed
          rejectionReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject transaction');
      }

      const result = await response.json();
      
      // Update local state - mark transaction as rejected
      const updatedTransactions = transactions.map(t => 
        t.id === transactionId 
          ? { ...t, acceptance_status: 'rejected' }
          : t
      );
      setTransactions(updatedTransactions);
      onTransactionsChange?.(updatedTransactions);

      toast.success('Transaction rejected successfully');
      
      // Refresh transactions to get the latest state
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject transaction';
      console.error('Failed to reject transaction:', error);
      toast.error(errorMessage);
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

  // Calculate dynamic summary statistics by transaction type
  // Group transactions by type and calculate totals
  const transactionTypeSummaries = React.useMemo(() => {
    const summaryMap = new Map<string, { type: string; typeName: string; count: number; totalUsd: number }>();

    transactions.forEach(transaction => {
      const type = transaction.transaction_type || '';
      const baseTypeName = TRANSACTION_TYPES[type as keyof typeof TRANSACTION_TYPES] || 'Unknown';
      const typeName = `Total ${baseTypeName}${baseTypeName.endsWith('s') ? '' : 's'}`;
      const usdValue = transaction.value_usd || 0;

      if (!summaryMap.has(type)) {
        summaryMap.set(type, {
          type,
          typeName,
          count: 0,
          totalUsd: 0
        });
      }

      const summary = summaryMap.get(type)!;
      summary.count++;
      summary.totalUsd += usdValue;
    });

    // Convert to array and sort by total USD value descending
    return Array.from(summaryMap.values()).sort((a, b) => b.totalUsd - a.totalUsd);
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    // Regular filters
    if (filters.type !== "all" && t.transaction_type !== filters.type) return false;
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.financeType !== "all" && t.finance_type !== filters.financeType) return false;
    if (filters.dateFrom && t.transaction_date && t.transaction_date < filters.dateFrom) return false;
    if (filters.dateTo && t.transaction_date && t.transaction_date > filters.dateTo) return false;
    
    // Transaction source filter
    if (filters.transactionSource !== "all") {
      if (filters.transactionSource === "pending_acceptance" && t.acceptance_status !== "pending") return false;
      else if (filters.transactionSource !== "pending_acceptance" && t.transaction_source !== filters.transactionSource) return false;
    }
    
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

  // Format currency with abbreviations (K, M, B)
  const formatCurrencyAbbreviated = (value: number) => {
    const absValue = Math.abs(value);
    let formattedValue: string;

    if (absValue >= 1_000_000_000) {
      formattedValue = (value / 1_000_000_000).toFixed(1) + 'B';
    } else if (absValue >= 1_000_000) {
      formattedValue = (value / 1_000_000).toFixed(1) + 'M';
    } else if (absValue >= 1_000) {
      formattedValue = (value / 1_000).toFixed(1) + 'K';
    } else {
      formattedValue = value.toFixed(0);
    }

    return '$' + formattedValue;
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
    <TooltipProvider>
    <div className="space-y-4">
      {/* Transaction Type Summary Cards */}
      {transactionTypeSummaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {transactionTypeSummaries.map((summary) => (
            <HeroCard
              key={summary.type}
              title={summary.typeName}
              value={formatCurrencyAbbreviated(summary.totalUsd)}
              subtitle={`${summary.count} transaction${summary.count !== 1 ? 's' : ''}`}
              icon={<DollarSign className="h-5 w-5" />}
            />
          ))}
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
              {transactions.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background">
                  <Switch
                    id="grouped-view"
                    checked={groupedView}
                    onCheckedChange={setGroupedView}
                  />
                  <Label htmlFor="grouped-view" className="text-sm cursor-pointer whitespace-nowrap">
                    Grouped View
                  </Label>
                </div>
              )}
              
              {/* Column Selector */}
              <ActivityEditorColumnSelector 
                visibleColumns={visibleColumns} 
                onColumnsChange={setVisibleColumns} 
              />
              
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Transaction
              </Button>
              {transactions.length > 0 && (
                <>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                key={`transaction-table-${transactions.length}-${selectedTransactionIds.size}`}
                transactions={paginatedTransactions}
                organizations={organizations}
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
                onAcceptTransaction={handleAcceptTransaction}
                onRejectTransaction={handleRejectTransaction}
                currentActivityId={activityId}
                variant="compact"
                selectedIds={selectedTransactionIds}
                onSelectAll={handleSelectAll}
                onSelectTransaction={handleSelectTransaction}
                groupedView={groupedView}
                onGroupedViewChange={setGroupedView}
                visibleColumns={visibleColumns as any}
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
        defaultDisbursementChannel={defaultDisbursementChannel}
        isSubmitting={submitting}
      />

      {/* Bulk Action Toolbar - appears from bottom when items selected */}
      <BulkActionToolbar
        selectedCount={selectedTransactionIds.size}
        itemType="transactions"
        onDelete={confirmBulkDelete}
        onCancel={() => setSelectedTransactionIds(new Set())}
        isDeleting={isBulkDeleting}
      />
    </div>
    </TooltipProvider>
  );
} 