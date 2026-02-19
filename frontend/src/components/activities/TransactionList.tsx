"use client"

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TransactionTypeSummaryCards } from './TransactionTypeSummaryCards';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Pencil, 
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
  ArrowRightLeft,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  ExternalLink,
  Link as LinkIcon,
  Columns3,
  Heart,
  Search
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Transaction, TRANSACTION_TYPE_LABELS, TransactionFormData, FLOW_TYPE_LABELS, TIED_STATUS_LABELS } from '@/types/transaction';
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
import aidTypesData from '@/data/aid-types.json';
import { OrganizationLogo } from "@/components/ui/organization-logo";
import { DISBURSEMENT_CHANNEL_TYPES } from '@/data/disbursement-channel-types';
import { IATI_ORGANIZATION_TYPES } from '@/data/iati-organization-types';
import { exportToCSV } from '@/lib/csv-export';
import { apiFetch } from '@/lib/api-fetch';

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

// Column configuration for the activity transaction list
type ActivityTransactionColumnId =
  | 'transactionDate' | 'transactionType' | 'financeType' | 'organizations'
  | 'amount' | 'valueDate' | 'usdValue'
  | 'aidType' | 'flowType' | 'tiedStatus' | 'currency'
  | 'description' | 'disbursementChannel' | 'humanitarian'
;

interface ActivityTransactionColumnConfig {
  id: ActivityTransactionColumnId;
  label: string;
  group: 'default' | 'classification' | 'additionalDetails';
  defaultVisible?: boolean;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

const ACTIVITY_TRANSACTION_COLUMN_CONFIGS: ActivityTransactionColumnConfig[] = [
  // Default columns (visible by default)
  { id: 'transactionDate', label: 'Date', group: 'default', defaultVisible: true, sortable: true },
  { id: 'transactionType', label: 'Type', group: 'default', defaultVisible: true, sortable: true },
  { id: 'organizations', label: 'Provider → Receiver', group: 'default', defaultVisible: true, sortable: true },
  { id: 'amount', label: 'Amount', group: 'default', defaultVisible: true, sortable: true, align: 'right' },
  { id: 'valueDate', label: 'Value Date', group: 'default', defaultVisible: true, sortable: true },
  { id: 'usdValue', label: 'USD Value', group: 'default', defaultVisible: true, sortable: true, align: 'right' },
  
  // Classification columns (optional, gray if inherited)
  { id: 'financeType', label: 'Finance Type', group: 'classification', defaultVisible: false, sortable: true },
  { id: 'aidType', label: 'Aid Type', group: 'classification', defaultVisible: false },
  { id: 'flowType', label: 'Flow Type', group: 'classification', defaultVisible: false },
  { id: 'tiedStatus', label: 'Tied Status', group: 'classification', defaultVisible: false },
  { id: 'humanitarian', label: 'Humanitarian', group: 'classification', defaultVisible: false },
  
  // Additional Details (optional)
  { id: 'currency', label: 'Currency', group: 'additionalDetails', defaultVisible: false },
  { id: 'description', label: 'Description', group: 'additionalDetails', defaultVisible: false },
  { id: 'disbursementChannel', label: 'Channel', group: 'additionalDetails', defaultVisible: false },
];

const ACTIVITY_TRANSACTION_COLUMN_GROUPS = {
  default: 'Default Columns',
  classification: 'Classification',
  additionalDetails: 'Additional Details',
};

const DEFAULT_VISIBLE_ACTIVITY_COLUMNS: ActivityTransactionColumnId[] = 
  ACTIVITY_TRANSACTION_COLUMN_CONFIGS.filter(col => col.defaultVisible).map(col => col.id);

const ACTIVITY_TRANSACTION_COLUMNS_LOCALSTORAGE_KEY = 'aims_activity_transaction_list_visible_columns_v2';  // v2: Type column now shows Finance Type

// Column Selector Component for Activity Transaction List
interface ActivityTransactionColumnSelectorProps {
  visibleColumns: ActivityTransactionColumnId[];
  onColumnsChange: (columns: ActivityTransactionColumnId[]) => void;
}

function ActivityTransactionColumnSelector({ visibleColumns, onColumnsChange }: ActivityTransactionColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleColumn = (columnId: ActivityTransactionColumnId) => {
    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId));
    } else {
      onColumnsChange([...visibleColumns, columnId]);
    }
  };

  const toggleGroup = (group: keyof typeof ACTIVITY_TRANSACTION_COLUMN_GROUPS) => {
    const groupColumns = ACTIVITY_TRANSACTION_COLUMN_CONFIGS.filter(c => c.group === group);
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
    onColumnsChange(DEFAULT_VISIBLE_ACTIVITY_COLUMNS);
  };

  const selectAll = () => {
    const allColumnIds = ACTIVITY_TRANSACTION_COLUMN_CONFIGS.map(c => c.id);
    onColumnsChange(allColumnIds);
  };

  const visibleCount = visibleColumns.length;
  const totalColumns = ACTIVITY_TRANSACTION_COLUMN_CONFIGS.length;

  // Filter columns based on search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return null; // null means show grouped view
    const query = searchQuery.toLowerCase();
    return ACTIVITY_TRANSACTION_COLUMN_CONFIGS.filter(c => 
      c.label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearchQuery(''); // Clear search when closing
    }}>
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
            {visibleCount} of {totalColumns} columns visible
          </p>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {filteredColumns ? (
            // Show flat filtered list when searching
            filteredColumns.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No columns match "{searchQuery}"
              </div>
            ) : (
              <div className="py-1">
                {filteredColumns.map(column => (
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
                    <span className="text-xs text-muted-foreground ml-auto">
                      {ACTIVITY_TRANSACTION_COLUMN_GROUPS[column.group as keyof typeof ACTIVITY_TRANSACTION_COLUMN_GROUPS]}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Show grouped view when not searching
            (Object.keys(ACTIVITY_TRANSACTION_COLUMN_GROUPS) as Array<keyof typeof ACTIVITY_TRANSACTION_COLUMN_GROUPS>).map(groupKey => {
              const groupColumns = ACTIVITY_TRANSACTION_COLUMN_CONFIGS.filter(c => c.group === groupKey);
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
                    <span className="text-sm font-medium">{ACTIVITY_TRANSACTION_COLUMN_GROUPS[groupKey]}</span>
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
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  renderFilters?: (filters: React.ReactNode) => React.ReactPortal | null;
}

type SortField = 'transaction_date' | 'transaction_type' | 'value' | 'provider_org_name' | 'receiver_org_name' | 'value_date' | 'value_usd' | 'finance_type';
type SortDirection = 'asc' | 'desc';

// Create finance type labels mapping from JSON data
const FINANCE_TYPE_LABELS = financeTypesData.reduce((acc, item) => {
  acc[item.code] = item.name;
  return acc;
}, {} as Record<string, string>);

// Create aid type labels mapping from JSON data (flatten the hierarchy)
const AID_TYPE_LABELS: Record<string, string> = {};
aidTypesData.forEach((parent) => {
  AID_TYPE_LABELS[parent.code] = parent.name;
  if (parent.children) {
    parent.children.forEach((child: any) => {
      AID_TYPE_LABELS[child.code] = child.name;
    });
  }
});

// Create disbursement channel labels mapping
const DISBURSEMENT_CHANNEL_LABELS = DISBURSEMENT_CHANNEL_TYPES.reduce((acc, item) => {
  acc[item.code] = item.name;
  return acc;
}, {} as Record<string, string>);

// Create organization type labels mapping
const ORG_TYPE_LABELS = IATI_ORGANIZATION_TYPES.reduce((acc, item) => {
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
  hideSummaryCards = false,
  renderFilters
}: TransactionListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Filter state
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<string>('all');
  
  // Grouped view state
  const [groupedView, setGroupedView] = useState(true);
  
  // Track if component is mounted for portal rendering
  const [isMounted, setIsMounted] = useState(false);
  
  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<ActivityTransactionColumnId[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ACTIVITY_TRANSACTION_COLUMNS_LOCALSTORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_VISIBLE_ACTIVITY_COLUMNS;
        }
      }
    }
    return DEFAULT_VISIBLE_ACTIVITY_COLUMNS;
  });
  
  // Save column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVITY_TRANSACTION_COLUMNS_LOCALSTORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);
  
  // Column visibility helper
  const isColumnVisible = (columnId: ActivityTransactionColumnId) => {
    return visibleColumns.includes(columnId);
  };
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [transactionTypeFilter, financeTypeFilter]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Currency converter hook
  const { convertTransaction, isConverting, convertingIds, error: conversionError } = useCurrencyConverter();

  // Activity identifiers state
  const [activityIdentifiers, setActivityIdentifiers] = useState<{
    customId: string | null;
    iatiId: string | null;
  }>({
    customId: null,
    iatiId: null
  });

  // Transaction documents state
  const [transactionDocuments, setTransactionDocuments] = useState<Record<string, any[]>>({});

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

  // Get unique transaction types and finance types for filter dropdowns
  const uniqueTransactionTypes = React.useMemo(() => {
    const types = new Set(transactions.map(t => t.transaction_type).filter(Boolean));
    return Array.from(types).sort();
  }, [transactions]);

  const uniqueFinanceTypes = React.useMemo(() => {
    const types = new Set(transactions.map(t => t.finance_type).filter(Boolean));
    return Array.from(types).sort();
  }, [transactions]);

  // Client-side filtering and sorting with comprehensive field support
  const sortedTransactions = React.useMemo(() => {
    if (!transactions.length) return transactions;

    // Apply filters first
    let filtered = [...transactions];

    if (transactionTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === transactionTypeFilter);
    }

    if (financeTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.finance_type === financeTypeFilter);
    }
    
    // Then apply sorting
    return filtered.sort((a, b) => {
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
  }, [transactions, sortField, sortDirection, transactionTypeFilter, financeTypeFilter]); // usdValues removed to prevent infinite loop

  // Pagination logic
  const totalPages = React.useMemo(() => 
    Math.ceil(sortedTransactions.length / itemsPerPage)
  , [sortedTransactions.length, itemsPerPage]);
  
  // Ensure currentPage is within bounds - using callback form to avoid dependency issues
  React.useEffect(() => {
    if (totalPages > 0) {
      setCurrentPage(prev => prev > totalPages ? totalPages : prev);
    }
  }, [totalPages]);
  
  const paginatedTransactions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedTransactions.slice(startIndex, endIndex);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  // Group transactions by type for grouped view
  const groupedTransactions = React.useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    sortedTransactions.forEach(transaction => {
      const type = transaction.transaction_type || 'Unspecified';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(transaction);
    });
    return groups;
  }, [sortedTransactions]);

  // Calculate totals per group
  const groupTotals = React.useMemo(() => {
    return Object.entries(groupedTransactions).map(([type, txs]) => ({
      type,
      total: txs.reduce((sum, t) => {
        const transactionId = t.uuid || t.id;
        const usdValue = usdValues[transactionId]?.usd;
        return sum + (usdValue || 0);
      }, 0),
      count: txs.length
    }));
  }, [groupedTransactions, usdValues]);

  // Toggle row expansion
  const toggleRowExpansion = (transactionId: string, transactionUuid?: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
        // Fetch documents when expanding - use UUID if available, otherwise use ID
        const docKey = transactionUuid || transactionId;
        fetchTransactionDocuments(docKey, transactionUuid || transactionId);
      }
      return newSet;
    });
  };

  // Expand all rows
  const expandAllRows = () => {
    const allIds = new Set(paginatedTransactions.map(t => t.uuid || t.id));
    setExpandedRows(allIds);
    // Fetch documents for all transactions
    paginatedTransactions.forEach(t => {
      const docKey = t.uuid || t.id;
      fetchTransactionDocuments(docKey, t.uuid || t.id);
    });
  };

  // Collapse all rows
  const collapseAllRows = () => {
    setExpandedRows(new Set());
  };

  // Fetch transaction documents
  const fetchTransactionDocuments = async (docKey: string, transactionIdOrUuid: string) => {
    // Check if already fetched
    if (transactionDocuments[docKey]) {
      return;
    }

    try {
      const response = await apiFetch(`/api/transactions/documents?transactionId=${encodeURIComponent(transactionIdOrUuid)}`);
      if (response.ok) {
        const data = await response.json();
        setTransactionDocuments(prev => ({
          ...prev,
          [docKey]: data.documents || []
        }));
      } else if (response.status === 404) {
        // Transaction was deleted, remove from expanded rows and clear documents
        setExpandedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(docKey);
          return newSet;
        });
        // Transaction will be removed from list on next refresh
        console.warn('[TransactionList] Transaction not found (404) when fetching documents:', transactionIdOrUuid);
      }
    } catch (error) {
      console.error('Error fetching transaction documents:', error);
    }
  };

  // Fetch activity identifiers
  React.useEffect(() => {
    async function fetchActivityIdentifiers() {
      try {
        const response = await apiFetch(`/api/activities/${activityId}/basic`);
        if (response.ok) {
          const data = await response.json();
          setActivityIdentifiers({
            customId: data.other_identifier || null,
            iatiId: data.iati_identifier || null
          });
        }
      } catch (error) {
        console.error('Error fetching activity identifiers:', error);
      }
    }
    
    if (activityId) {
      fetchActivityIdentifiers();
    }
  }, [activityId]);

  // Convert only paginated transactions to USD when they change
  React.useEffect(() => {
    let cancelled = false;
    async function convertAll() {
      const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
      for (const transaction of paginatedTransactions) {
        const transactionId = transaction.uuid || transaction.id;
        
        // Check if transaction already has USD value stored
        const existingUsdValue = (transaction as any).value_usd || (transaction as any).usd_value;
        if (existingUsdValue != null && !isNaN(existingUsdValue)) {
          newUsdValues[transactionId] = {
            usd: existingUsdValue,
            rate: (transaction as any).exchange_rate_used || null,
            date: (transaction as any).usd_conversion_date || transaction.transaction_date,
            loading: false
          };
          continue;
        }
        
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
        
        // If currency is already USD, just use the value
        if (transaction.currency === 'USD') {
          newUsdValues[transactionId] = {
            usd: transaction.value,
            rate: 1,
            date: transaction.transaction_date,
            loading: false
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
    if (paginatedTransactions.length > 0) convertAll();
    return () => { cancelled = true; };
  }, [paginatedTransactions]);

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
      ? <ArrowUp className="h-4 w-4 text-gray-400" />
      : <ArrowDown className="h-4 w-4 text-gray-400" />;
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
    const dataToExport = transactions.map(t => {
      const transactionId = t.uuid || t.id;
      const usdValue = usdValues[transactionId]?.usd;
      return {
        transaction_date: t.transaction_date,
        transaction_type: TRANSACTION_TYPE_LABELS[t.transaction_type] || t.transaction_type,
        value: t.value,
        currency: t.currency,
        usd_value: usdValue != null ? usdValue : '',
        provider_org: t.provider_org_name || '',
        receiver_org: t.receiver_org_name || '',
        description: t.description || '',
        status: t.status || 'planned',
        finance_type: t.finance_type ? (FINANCE_TYPE_LABELS[t.finance_type] || t.finance_type) : '',
        aid_type: t.aid_type || '',
        tied_status: t.tied_status || '',
        flow_type: t.flow_type || ''
      };
    });

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

  const handleExportTransaction = (transaction: Transaction) => {
    const transactionId = transaction.uuid || transaction.id;
    const usdValue = usdValues[transactionId];
    
    const exportData = [];

    // Transaction Details
    exportData.push(
      { label: 'Transaction Type', value: `${transaction.transaction_type} - ${TRANSACTION_TYPE_LABELS[transaction.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || transaction.transaction_type}` },
      { label: 'Validation Status', value: transaction.status === 'actual' ? 'Validated' : 'Unvalidated' },
      { label: 'Original Value', value: transaction.value ? `${transaction.currency} ${transaction.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' },
      { label: 'USD Value', value: usdValue?.usd != null ? `USD ${usdValue.usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—' },
      { label: 'Value Date', value: transaction.value_date ? format(new Date(transaction.value_date), 'MMM d, yyyy') : transaction.transaction_date ? format(new Date(transaction.transaction_date), 'MMM d, yyyy') : '—' },
      { label: 'Transaction Date', value: format(new Date(transaction.transaction_date), 'MMM d, yyyy') },
    );

    // Description
    if (transaction.description) {
      exportData.push({ label: 'Description', value: transaction.description });
    }

    // Parties Involved
    if (transaction.provider_org_name) {
      exportData.push({ label: 'Provider Organisation', value: getOrgFullDisplay(transaction.provider_org_id, transaction.provider_org_name, transaction.provider_org_ref) });
    }
    if (transaction.provider_org_type) {
      exportData.push({ label: 'Provider Organisation Type', value: ORG_TYPE_LABELS[transaction.provider_org_type] || transaction.provider_org_type });
    }
    if (transaction.provider_org_ref) {
      exportData.push({ label: 'Provider Reference', value: transaction.provider_org_ref });
    }
    if (transaction.provider_org_activity_id) {
      exportData.push({ label: 'Provider Activity', value: transaction.provider_org_activity_id });
    }
    if (transaction.receiver_org_name) {
      exportData.push({ label: 'Receiver Organisation', value: getOrgFullDisplay(transaction.receiver_org_id, transaction.receiver_org_name, transaction.receiver_org_ref) });
    }
    if (transaction.receiver_org_type) {
      exportData.push({ label: 'Receiver Organisation Type', value: ORG_TYPE_LABELS[transaction.receiver_org_type] || transaction.receiver_org_type });
    }
    if (transaction.receiver_org_ref) {
      exportData.push({ label: 'Receiver Reference', value: transaction.receiver_org_ref });
    }
    if (transaction.receiver_org_activity_id) {
      exportData.push({ label: 'Receiver Activity', value: transaction.receiver_org_activity_id });
    }

    // System Identifiers
    exportData.push({ label: 'Activity ID', value: activityIdentifiers.customId || '—' });
    exportData.push({ label: 'IATI Identifier', value: activityIdentifiers.iatiId || '—' });
    exportData.push({ label: 'Activity UUID', value: transaction.activity_id });
    exportData.push({ label: 'Transaction ID', value: transaction.transaction_reference || '—' });
    exportData.push({ label: 'Transaction UUID', value: transactionId });
    
    if (transaction.sector_code) {
      exportData.push({ label: 'Sector', value: transaction.sector_code });
    }
    if (transaction.recipient_country_code) {
      exportData.push({ label: 'Recipient Country', value: transaction.recipient_country_code });
    }
    if (transaction.recipient_region_code) {
      exportData.push({ label: 'Recipient Region', value: transaction.recipient_region_code });
    }

    // Funding Modality & Aid Classification
    if (transaction.aid_type) {
      exportData.push({ label: 'Aid Type', value: `${transaction.aid_type} - ${AID_TYPE_LABELS[transaction.aid_type] || transaction.aid_type}` });
    }
    if (transaction.flow_type) {
      exportData.push({ label: 'Flow Type', value: `${transaction.flow_type} - ${FLOW_TYPE_LABELS[transaction.flow_type] || transaction.flow_type}` });
    }
    if (transaction.finance_type) {
      exportData.push({ label: 'Finance Type', value: `${transaction.finance_type} - ${FINANCE_TYPE_LABELS[transaction.finance_type] || transaction.finance_type}` });
    }
    if (transaction.tied_status) {
      exportData.push({ label: 'Tied Status', value: `${transaction.tied_status} - ${TIED_STATUS_LABELS[transaction.tied_status] || transaction.tied_status}` });
    }
    if (transaction.disbursement_channel) {
      exportData.push({ label: 'Disbursement Channel', value: `${transaction.disbursement_channel} - ${DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel] || transaction.disbursement_channel}` });
    }
    if (transaction.is_humanitarian) {
      exportData.push({ label: 'Humanitarian', value: 'Yes' });
    }

    // Metadata & History
    if (transaction.created_at) {
      exportData.push({ label: 'Created', value: format(new Date(transaction.created_at), 'MMM d, yyyy \'at\' h:mm a') });
    }
    if (transaction.created_by) {
      exportData.push({ label: 'Created By', value: `User ID: ${transaction.created_by}` });
    }
    if (transaction.updated_at) {
      exportData.push({ label: 'Last Modified', value: format(new Date(transaction.updated_at), 'MMM d, yyyy \'at\' h:mm a') });
    }
    if (transaction.updated_by) {
      exportData.push({ label: 'Last Modified By', value: `User ID: ${transaction.updated_by}` });
    }
    if (!transaction.created_by) {
      exportData.push({ label: 'Source', value: 'Imported from IATI' });
    }
    if (transaction.validated_at) {
      exportData.push({ label: 'Validated', value: format(new Date(transaction.validated_at), 'MMM d, yyyy \'at\' h:mm a') });
    }
    if (transaction.validated_by) {
      exportData.push({ label: 'Validated By', value: `User ID: ${transaction.validated_by}` });
    }
    if (transaction.validation_comments) {
      exportData.push({ label: 'Validation Notes', value: transaction.validation_comments });
    }

    // Documents
    const docs = transactionDocuments[transactionId];
    if (docs && docs.length > 0) {
      docs.forEach((doc: any, index: number) => {
        exportData.push({ label: `Document ${index + 1}`, value: doc.file_name || doc.external_url });
        if (doc.description) {
          exportData.push({ label: `Document ${index + 1} Description`, value: doc.description });
        }
        if (doc.external_url) {
          exportData.push({ label: `Document ${index + 1} URL`, value: doc.external_url });
        }
      });
    }

    const filename = `transaction-export-${format(new Date(), 'yyyy-MM-dd')}`;
    exportToCSV(exportData, filename);
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

  // Helper to get org acronym or name by ID or ref (with alias resolution)
  const getOrgAcronymOrName = (orgId: string | undefined, fallbackName?: string, orgRef?: string) => {
    // First try to find by UUID
    if (orgId) {
      const org = organizations.find((o: any) => o.id === orgId);
      if (org) {
        return org.acronym || org.name;
      }
    }
    
    // Then try to resolve by ref (including aliases)
    if (orgRef) {
      // Direct match by iati_org_id
      const directMatch = organizations.find((o: any) => o.iati_org_id === orgRef);
      if (directMatch) {
        return directMatch.acronym || directMatch.name;
      }
      
      // Match by alias_refs
      const aliasMatch = organizations.find((o: any) => 
        o.alias_refs && Array.isArray(o.alias_refs) && o.alias_refs.includes(orgRef)
      );
      if (aliasMatch) {
        return aliasMatch.acronym || aliasMatch.name;
      }
    }
    
    return fallbackName;
  };
  
  // Helper to get full org details (name and acronym) by ID or ref
  const getOrgFullDisplay = (orgId: string | undefined, fallbackName?: string, orgRef?: string): string => {
    // First try to find by UUID
    if (orgId) {
      const org = organizations.find((o: any) => o.id === orgId);
      if (org) {
        return org.acronym && org.name && org.acronym !== org.name
          ? `${org.name} (${org.acronym})`
          : org.name || org.acronym;
      }
    }
    
    // Then try to resolve by ref (including aliases)
    if (orgRef) {
      // Direct match by iati_org_id
      const directMatch = organizations.find((o: any) => o.iati_org_id === orgRef);
      if (directMatch) {
        return directMatch.acronym && directMatch.name && directMatch.acronym !== directMatch.name
          ? `${directMatch.name} (${directMatch.acronym})`
          : directMatch.name || directMatch.acronym;
      }
      
      // Match by alias_refs
      const aliasMatch = organizations.find((o: any) => 
        o.alias_refs && Array.isArray(o.alias_refs) && o.alias_refs.includes(orgRef)
      );
      if (aliasMatch) {
        return aliasMatch.acronym && aliasMatch.name && aliasMatch.acronym !== aliasMatch.name
          ? `${aliasMatch.name} (${aliasMatch.acronym})`
          : aliasMatch.name || aliasMatch.acronym;
      }
    }
    
    return fallbackName || 'Unknown';
  };
  
  // Helper to get org logo by ID or ref (with alias resolution)
  const getOrgLogo = (orgId: string | undefined, orgRef?: string): string | null => {
    // First try to find by UUID
    if (orgId) {
      const org = organizations.find((o: any) => o.id === orgId);
      if (org) {
        return org.logo || null;
      }
    }
    
    // Then try to resolve by ref (including aliases)
    if (orgRef) {
      // Direct match by iati_org_id
      const directMatch = organizations.find((o: any) => o.iati_org_id === orgRef);
      if (directMatch) {
        return directMatch.logo || null;
      }
      
      // Match by alias_refs
      const aliasMatch = organizations.find((o: any) => 
        o.alias_refs && Array.isArray(o.alias_refs) && o.alias_refs.includes(orgRef)
      );
      if (aliasMatch) {
        return aliasMatch.logo || null;
      }
    }
    
    return null;
  };
  
  // Helper to get org ID by ID or ref (for linking purposes)
  const getOrgId = (orgId: string | undefined, orgRef?: string): string | null => {
    // First try to find by UUID
    if (orgId) {
      const org = organizations.find((o: any) => o.id === orgId);
      if (org) {
        return org.id || null;
      }
    }
    
    // Then try to resolve by ref (including aliases)
    if (orgRef) {
      // Direct match by iati_org_id
      const directMatch = organizations.find((o: any) => o.iati_org_id === orgRef);
      if (directMatch) {
        return directMatch.id || null;
      }
      
      // Match by alias_refs
      const aliasMatch = organizations.find((o: any) => 
        o.alias_refs && Array.isArray(o.alias_refs) && o.alias_refs.includes(orgRef)
      );
      if (aliasMatch) {
        return aliasMatch.id || null;
      }
    }
    
    return null;
  };

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
      <Card className="border-0 shadow-none">
        <CardHeader className={hideSummaryCards ? "hidden" : ""}>
          <div className="flex items-center justify-between gap-4">
            {/* Left side: Title and Description */}
            <div className="flex-shrink-0">
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                Commitments, disbursements, and expenditures
              </CardDescription>
            </div>
            
            {/* Right side: Filters and Actions - All on same row (only show when hideSummaryCards is false) */}
            {!hideSummaryCards && (
            <div className="flex items-center gap-2 flex-nowrap flex-1 justify-end">
              {/* Transaction Type Filter */}
              {transactions.length > 0 && (
                <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transaction Types</SelectItem>
                    {uniqueTransactionTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{type}</span>
                          <span>{TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Finance Type Filter */}
              {transactions.length > 0 && (
                <Select value={financeTypeFilter} onValueChange={setFinanceTypeFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Finance Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Finance Types</SelectItem>
                    {uniqueFinanceTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{type}</span>
                          <span>{FINANCE_TYPE_LABELS[type] || type}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Grouped View Toggle */}
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
              
              {/* Expand/Collapse All */}
              {transactions.length > 0 && !groupedView && expandedRows.size > 0 ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={collapseAllRows}
                  title="Collapse all expanded rows"
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse All
                </Button>
              ) : transactions.length > 0 && !groupedView ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={expandAllRows}
                  title="Expand all rows"
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand All
                </Button>
              ) : null}
              
              {/* Column Selector - always visible */}
              <div className="relative z-[200]">
                <ActivityTransactionColumnSelector 
                  visibleColumns={visibleColumns} 
                  onColumnsChange={setVisibleColumns} 
                />
              </div>
              
              {/* Export Button - always visible */}
              {transactions.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport} title="Export">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              {/* Add Transaction Button */}
              {!readOnly && (
                <Button onClick={() => setShowForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              )}
            </div>
            )}
          </div>
        </CardHeader>
        
        {/* Filters for when hideSummaryCards is true - portaled to Activity Profile Page */}
        {isMounted && hideSummaryCards && renderFilters?.(
          <div className="flex items-end gap-3 flex-nowrap">
            {/* Grouped View Toggle - only show when transactions exist */}
            {transactions.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background h-9">
                <Switch
                  id="grouped-view-portal"
                  checked={groupedView}
                  onCheckedChange={setGroupedView}
                />
                <Label htmlFor="grouped-view-portal" className="text-sm cursor-pointer whitespace-nowrap">
                  Grouped View
                </Label>
              </div>
            )}
            
            {/* Column Selector - always visible */}
            <ActivityTransactionColumnSelector 
              visibleColumns={visibleColumns} 
              onColumnsChange={setVisibleColumns} 
            />
            
            {/* Transaction Type Filter - only show when transactions exist */}
            {transactions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Transaction Type</label>
                <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                  <SelectTrigger className="w-[280px] h-9">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transaction Types</SelectItem>
                    {uniqueTransactionTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{type}</span>
                          <span>{TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Finance Type Filter - only show when transactions exist */}
            {transactions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Finance Type</label>
                <Select value={financeTypeFilter} onValueChange={setFinanceTypeFilter}>
                  <SelectTrigger className="w-[280px] h-9">
                    <SelectValue placeholder="Finance Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Finance Types</SelectItem>
                    {uniqueFinanceTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{type}</span>
                          <span>{FINANCE_TYPE_LABELS[type] || type}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Expand/Collapse All - only show when transactions exist */}
            {transactions.length > 0 && (
              expandedRows.size > 0 ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={collapseAllRows}
                  title={groupedView ? "Not available in grouped view" : "Collapse all expanded rows"}
                  disabled={groupedView}
                  data-expand-all
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse All
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={expandAllRows}
                  title={groupedView ? "Not available in grouped view" : "Expand all rows"}
                  disabled={groupedView}
                  data-expand-all
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand All
                </Button>
              )
            )}
            
            {/* Export Button - always visible */}
            <Button variant="outline" size="sm" onClick={handleExport} data-export title="Export">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
        <CardContent className={hideSummaryCards ? "p-0" : ""}>
          {/* Transaction Type Summary Cards */}
          {!hideSummaryCards && transactions.length > 0 && (
            <div className="mb-6">
              <TransactionTypeSummaryCards transactions={transactions} />
            </div>
          )}

          {/* Transactions Table */}
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No transactions</h3>
              <p className="text-muted-foreground mb-4">
                Use the button above to add your first transaction.
              </p>
            </div>
          ) : (
            <>
            <div className={hideSummaryCards ? "w-full" : "rounded-md border"}>
              <div className="overflow-x-auto">
              <Table className={hideSummaryCards ? "w-full" : "table-fixed min-w-max"}>
                <TableHeader className="bg-surface-muted border-b border-border/70">
                  <TableRow>
                    {/* Expand/collapse column - always visible */}
                    <TableHead className="py-3 px-2 whitespace-nowrap" style={{ width: '40px', maxWidth: '40px' }}></TableHead>
                    
                    {/* Date column */}
                    {isColumnVisible('transactionDate') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap" style={{ width: '110px', maxWidth: '110px' }} onClick={() => handleSort('transaction_date')}>
                        <div className="flex items-center gap-1">
                          <span>Date</span>
                          {getSortIcon('transaction_date')}
                        </div>
                      </TableHead>
                    )}
                    
                    {/* Type column */}
                    {isColumnVisible('transactionType') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap" style={{ width: '160px', maxWidth: '160px' }} onClick={() => handleSort('transaction_type')}>
                        <div className="flex items-center gap-1">
                          <span>Type</span>
                          {getSortIcon('transaction_type')}
                        </div>
                      </TableHead>
                    )}
                    
                    {/* Finance Type column (inherited values shown in gray) */}
                    {isColumnVisible('financeType') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap" style={{ width: '200px', maxWidth: '200px' }} onClick={() => handleSort('finance_type')}>
                        <div className="flex items-center gap-1">
                          <span>Finance Type</span>
                          {getSortIcon('finance_type')}
                        </div>
                      </TableHead>
                    )}
                    
                    {/* Aid Type column (optional) */}
                    {isColumnVisible('aidType') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 whitespace-nowrap" style={{ width: '180px', maxWidth: '180px' }}>
                        Aid Type
                      </TableHead>
                    )}
                    
                    {/* Flow Type column (optional) */}
                    {isColumnVisible('flowType') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 whitespace-nowrap" style={{ width: '120px', maxWidth: '120px' }}>
                        Flow Type
                      </TableHead>
                    )}
                    
                    {/* Tied Status column (optional) */}
                    {isColumnVisible('tiedStatus') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 whitespace-nowrap" style={{ width: '120px', maxWidth: '120px' }}>
                        Tied Status
                      </TableHead>
                    )}
                    
                    {/* Humanitarian column (optional) */}
                    {isColumnVisible('humanitarian') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 text-center whitespace-nowrap" style={{ width: '100px', maxWidth: '100px' }}>
                        Humanitarian
                      </TableHead>
                    )}
                    
                    {/* Provider → Receiver column */}
                    {isColumnVisible('organizations') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap" style={{ width: '280px', maxWidth: '280px' }} onClick={() => handleSort('provider_org_name')}>
                        <div className="flex items-center gap-1">
                          <span>Provider → Receiver</span>
                          {getSortIcon('provider_org_name')}
                        </div>
                      </TableHead>
                    )}
                    
                    {/* Currency column (optional) */}
                    {isColumnVisible('currency') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 whitespace-nowrap" style={{ width: '80px', maxWidth: '80px' }}>
                        Currency
                      </TableHead>
                    )}
                    
                    {/* Amount column */}
                    {isColumnVisible('amount') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 text-right cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap" style={{ width: '130px', maxWidth: '130px' }} onClick={() => handleSort('value')}>
                        <div className="flex items-center justify-end gap-1">
                          <span>Amount</span>
                          {getSortIcon('value')}
                        </div>
                      </TableHead>
                    )}
                    
                    {/* Value Date column */}
                    {isColumnVisible('valueDate') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap" style={{ width: '110px', maxWidth: '110px' }} onClick={() => handleSort('value_date')}>
                        <div className="flex items-center gap-1">
                          <span>Val. Date</span>
                          {getSortIcon('value_date')}
                        </div>
                      </TableHead>
                    )}
                    
                    {/* USD Value column */}
                    {isColumnVisible('usdValue') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 text-right cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap" style={{ width: '130px', maxWidth: '130px' }} onClick={() => handleSort('value_usd')}>
                        <div className="flex items-center justify-end gap-1">
                          <span>USD Value</span>
                          {getSortIcon('value_usd')}
                        </div>
                      </TableHead>
                    )}
                    
                    {/* Description column (optional) */}
                    {isColumnVisible('description') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 whitespace-nowrap" style={{ width: '200px', maxWidth: '200px' }}>
                        Description
                      </TableHead>
                    )}
                    
                    {/* Disbursement Channel column (optional) */}
                    {isColumnVisible('disbursementChannel') && (
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 whitespace-nowrap" style={{ width: '150px', maxWidth: '150px' }}>
                        Channel
                      </TableHead>
                    )}

                  </TableRow>
              </TableHeader>
              <TableBody>
                {/* Smart approach: Use same rendering for both grouped and paginated views
                    - Grouped view: iterate over actual groups with headers
                    - Paginated view: treat as single "group" with null type (no header) */}
                {(groupedView 
                  ? Object.entries(groupedTransactions)
                  : [[null, paginatedTransactions]] as Array<[string | null, Transaction[]]>
                ).map(([type, txs]) => {
                  const groupTotal = type ? groupTotals.find(g => g.type === type) : null;
                  return (
                    <React.Fragment key={type ? `group-${type}` : 'paginated'}>
                      {/* Group Header Row - only show in grouped view */}
                      {groupedView && type && (
                        <TableRow className="bg-muted hover:bg-muted">
                          <TableCell colSpan={visibleColumns.length + 1} className="py-3 px-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {type}
                                </Badge>
                                <span className="font-semibold text-sm">
                                  {TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({groupTotal?.count || 0} {(groupTotal?.count || 0) === 1 ? 'transaction' : 'transactions'})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Total USD:</span>
                                <span className="font-semibold text-sm">
                                  {formatCurrency(groupTotal?.total || 0, 'USD')}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* Transaction rows - same rendering for both views */}
                      {txs.filter(t => {
                        const isValid = (t.uuid && t.uuid !== 'undefined') || (t.id && t.id !== 'undefined');
                        if (!isValid) {
                          console.warn('[TransactionList] Transaction without valid identifier found:', t);
                        }
                        return isValid;
                      }).map((transaction) => {
                        const transactionId = transaction.uuid || transaction.id;
                        const isExpanded = expandedRows.has(transactionId);
                        
                        return (
                          <React.Fragment key={transactionId}>
                    <TableRow 
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                      onClick={(e) => {
                        // Prevent any row click navigation
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      {/* Chevron for expand/collapse - always visible */}
                      <TableCell className="py-3 px-2 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(transactionId, transaction.uuid);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      
                      {/* Date */}
                      {isColumnVisible('transactionDate') && (
                        <TableCell className="py-3 px-4 font-medium whitespace-nowrap">
                          {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                        </TableCell>
                      )}
                      
                      {/* Transaction Type */}
                      {isColumnVisible('transactionType') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
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
                      )}
                      
                      {/* Finance Type */}
                      {isColumnVisible('financeType') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          {(() => {
                            // Get the display value (effective > raw > default)
                            const displayValue = transaction.effective_finance_type || transaction.finance_type || defaultFinanceType;
                            // Determine if inherited (no explicit transaction value, using effective or default)
                            const isInherited = transaction.finance_type_inherited || (!transaction.finance_type && displayValue);
                            
                            if (!displayValue) {
                              return <span className="text-gray-400">—</span>;
                            }
                            
                            if (isInherited) {
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 text-gray-400 opacity-70 cursor-help">
                                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                          {displayValue}
                                        </span>
                                        <span className="text-sm">
                                          {FINANCE_TYPE_LABELS[displayValue] || displayValue}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        Inherited from activity's default finance type (code {displayValue} – {FINANCE_TYPE_LABELS[displayValue] || displayValue})
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }
                            
                            // Explicit value - show in black
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {displayValue}
                                </span>
                                <span className="text-sm">
                                  {FINANCE_TYPE_LABELS[displayValue] || displayValue}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                      )}
                      
                      {/* Aid Type (optional) */}
                      {isColumnVisible('aidType') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          {(() => {
                            const displayValue = transaction.effective_aid_type || transaction.aid_type || defaultAidType;
                            const isInherited = transaction.aid_type_inherited || (!transaction.aid_type && displayValue);
                            if (!displayValue) return <span className="text-gray-400">—</span>;
                            
                            if (isInherited) {
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 text-gray-400 opacity-70 cursor-help">
                                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{displayValue}</span>
                                        <span className="text-sm truncate max-w-[140px]">{AID_TYPE_LABELS[displayValue] || displayValue}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Inherited from activity's default aid type</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{displayValue}</span>
                                <span className="text-sm truncate max-w-[140px]">{AID_TYPE_LABELS[displayValue] || displayValue}</span>
                              </div>
                            );
                          })()}
                        </TableCell>
                      )}
                      
                      {/* Flow Type (optional) */}
                      {isColumnVisible('flowType') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          {(() => {
                            const displayValue = transaction.effective_flow_type || transaction.flow_type || defaultFlowType;
                            const isInherited = transaction.flow_type_inherited || (!transaction.flow_type && displayValue);
                            if (!displayValue) return <span className="text-gray-400">—</span>;
                            
                            if (isInherited) {
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-gray-400 opacity-70 cursor-help text-sm">
                                        {FLOW_TYPE_LABELS[displayValue] || displayValue}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Inherited from activity's default flow type</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }
                            return <span className="text-sm">{FLOW_TYPE_LABELS[displayValue] || displayValue}</span>;
                          })()}
                        </TableCell>
                      )}
                      
                      {/* Tied Status (optional) */}
                      {isColumnVisible('tiedStatus') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          {(() => {
                            const displayValue = transaction.effective_tied_status || transaction.tied_status || defaultTiedStatus;
                            const isInherited = transaction.tied_status_inherited || (!transaction.tied_status && displayValue);
                            if (!displayValue) return <span className="text-gray-400">—</span>;
                            
                            if (isInherited) {
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-gray-400 opacity-70 cursor-help text-sm">
                                        {TIED_STATUS_LABELS[displayValue] || displayValue}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Inherited from activity's default tied status</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }
                            return <span className="text-sm">{TIED_STATUS_LABELS[displayValue] || displayValue}</span>;
                          })()}
                        </TableCell>
                      )}
                      
                      {/* Humanitarian (optional) */}
                      {isColumnVisible('humanitarian') && (
                        <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                          {transaction.is_humanitarian ? (
                            <Heart className="h-4 w-4 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                      )}
                      
                      {/* Provider → Receiver */}
                      {isColumnVisible('organizations') && (
                        <TableCell className="py-3 px-3" style={{ maxWidth: '280px' }}>
                          <div className="flex items-center gap-1.5 font-medium overflow-hidden">
                            {/* Provider Org - gray if inferred, black if explicit */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                              <OrganizationLogo
                                logo={getOrgLogo(transaction.provider_org_id, transaction.provider_org_ref) || (transaction as any).provider_org_logo}
                                name={getOrgAcronymOrName(transaction.provider_org_id, transaction.provider_org_name, transaction.provider_org_ref) || "Unknown"}
                                size="sm"
                              />
                              {getOrgId(transaction.provider_org_id, transaction.provider_org_ref) ? (
                                <Link
                                  href={`/organizations/${getOrgId(transaction.provider_org_id, transaction.provider_org_ref)}`}
                                  className={`truncate hover:text-gray-700 transition-colors block ${transaction.provider_org_inferred ? 'text-muted-foreground' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {getOrgAcronymOrName(transaction.provider_org_id, transaction.provider_org_name, transaction.provider_org_ref) || "Unknown"}
                                </Link>
                              ) : (
                                <span className={`truncate block ${transaction.provider_org_inferred ? 'text-muted-foreground' : ''}`}>
                                  {getOrgAcronymOrName(transaction.provider_org_id, transaction.provider_org_name, transaction.provider_org_ref) || "Unknown"}
                                </span>
                              )}
                              {transaction.provider_org_inferred && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Inferred from activity data</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <span className="text-muted-foreground flex-shrink-0">→</span>
                            {/* Receiver Org - gray if inferred, black if explicit */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                              <OrganizationLogo
                                logo={getOrgLogo(transaction.receiver_org_id, transaction.receiver_org_ref) || (transaction as any).receiver_org_logo}
                                name={getOrgAcronymOrName(transaction.receiver_org_id, transaction.receiver_org_name, transaction.receiver_org_ref) || "Unknown"}
                                size="sm"
                              />
                              {getOrgId(transaction.receiver_org_id, transaction.receiver_org_ref) ? (
                                <Link
                                  href={`/organizations/${getOrgId(transaction.receiver_org_id, transaction.receiver_org_ref)}`}
                                  className={`truncate hover:text-gray-700 transition-colors block ${transaction.receiver_org_inferred ? 'text-muted-foreground' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {getOrgAcronymOrName(transaction.receiver_org_id, transaction.receiver_org_name, transaction.receiver_org_ref) || "Unknown"}
                                </Link>
                              ) : (
                                <span className={`truncate block ${transaction.receiver_org_inferred ? 'text-muted-foreground' : ''}`}>
                                  {getOrgAcronymOrName(transaction.receiver_org_id, transaction.receiver_org_name, transaction.receiver_org_ref) || "Unknown"}
                                </span>
                              )}
                              {transaction.receiver_org_inferred && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Inferred from activity data</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      
                      {/* Currency (optional) */}
                      {isColumnVisible('currency') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <span className="text-sm font-mono">{transaction.currency || 'USD'}</span>
                        </TableCell>
                      )}
                      
                      {/* Amount */}
                      {isColumnVisible('amount') && (
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                          {transaction.value !== null && transaction.value !== undefined && !isNaN(transaction.value) ? (
                            <span className="font-medium">
                              <span className="text-muted-foreground">{transaction.currency || 'USD'}</span> {transaction.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-red-600">Invalid</span>
                          )}
                        </TableCell>
                      )}
                      
                      {/* Value Date */}
                      {isColumnVisible('valueDate') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <span className="text-sm">
                            {transaction.value_date 
                              ? format(new Date(transaction.value_date), 'MMM d, yyyy') 
                              : transaction.transaction_date 
                              ? format(new Date(transaction.transaction_date), 'MMM d, yyyy')
                              : '—'}
                          </span>
                        </TableCell>
                      )}
                      
                      {/* USD Value */}
                      {isColumnVisible('usdValue') && (
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {usdValues[transaction.uuid || transaction.id]?.loading ? (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            ) : usdValues[transaction.uuid || transaction.id]?.usd != null ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-medium cursor-help flex items-center gap-1">
                                      <span className="text-muted-foreground">USD</span> {usdValues[transaction.uuid || transaction.id].usd!.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      {(transaction as any).exchange_rate_manual && (
                                        <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200">Manual</Badge>
                                      )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div>
                                      <div>Original: <span className="text-muted-foreground">{transaction.currency}</span> {transaction.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                      <div>Rate: {usdValues[transaction.uuid || transaction.id].rate}</div>
                                      <div>Date: {usdValues[transaction.uuid || transaction.id].date}</div>
                                      {(transaction as any).exchange_rate_manual && <div className="text-orange-500 font-medium">Manually entered rate</div>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      
                      {/* Description (optional) */}
                      {isColumnVisible('description') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          <span className="text-sm truncate max-w-[180px] block">
                            {transaction.description || <span className="text-gray-400">—</span>}
                          </span>
                        </TableCell>
                      )}
                      
                      {/* Disbursement Channel (optional) */}
                      {isColumnVisible('disbursementChannel') && (
                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          {transaction.disbursement_channel ? (
                            <span className="text-sm">
                              {DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel] || transaction.disbursement_channel}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                      )}

                    </TableRow>

                    {/* Expandable Detail Row */}
                    {isExpanded && (
                      <TableRow className="bg-muted/20 animate-in fade-in-from-top-2 duration-200">
                        <TableCell colSpan={visibleColumns.length + 1} className="py-4 px-4 relative">
                          {/* CSV Export Button */}
                          <div className="absolute top-4 right-4 z-10">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleExportTransaction(transaction)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Export to CSV</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="grid gap-x-8 text-sm" style={{ gridTemplateColumns: '1fr 1.5fr 1fr' }}>
                            {/* Column 1: Transaction Details */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Transaction Details</h4>
                                <div className="space-y-3 ml-4">
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground min-w-[160px]">Transaction Type:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{transaction.transaction_type}</span>
                                    <span className="text-xs">{TRANSACTION_TYPE_LABELS[transaction.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || transaction.transaction_type}</span>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground min-w-[160px]">Validation Status:</span>
                                  <div className="flex items-center gap-2">
                                    {transaction.status === 'actual' ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-xs text-green-700 font-medium">Validated</span>
                                      </>
                                    ) : (
                                      <>
                                        <FileClock className="h-4 w-4 text-gray-400" />
                                        <span className="text-xs text-gray-600 font-medium">Unvalidated</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground min-w-[160px]">Original Value:</span>
                                  <span className="font-medium"><span className="text-muted-foreground">{transaction.currency}</span> {transaction.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground min-w-[160px]">USD Value:</span>
                                  {usdValues[transaction.uuid || transaction.id]?.usd != null ? (
                                    <span className="font-medium"><span className="text-muted-foreground">USD</span> {usdValues[transaction.uuid || transaction.id].usd!.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground min-w-[160px]">Value Date:</span>
                                  <span className="font-medium">
                                    {transaction.value_date 
                                      ? format(new Date(transaction.value_date), 'MMM d, yyyy') 
                                      : transaction.transaction_date 
                                      ? format(new Date(transaction.transaction_date), 'MMM d, yyyy')
                                      : '—'}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground min-w-[160px]">Transaction Date:</span>
                                  <span className="font-medium">{format(new Date(transaction.transaction_date), 'MMM d, yyyy')}</span>
                                </div>
                                </div>
                              </div>

                              {/* Description */}
                              {transaction.description && (
                                <div className="pt-4 border-t border-gray-200">
                                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Description</h4>
                                  <p className="ml-4 text-gray-700 text-xs leading-relaxed">{transaction.description}</p>
                                </div>
                              )}
                            </div>

                            {/* Column 2: Parties Involved & System Identifiers */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Parties Involved</h4>
                                <div className="space-y-3 ml-4">
                                {transaction.provider_org_name && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Provider Organisation:</span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {getOrgId(transaction.provider_org_id, transaction.provider_org_ref) ? (
                                        <Link 
                                          href={`/organizations/${getOrgId(transaction.provider_org_id, transaction.provider_org_ref)}`}
                                          className={`font-medium hover:text-gray-700 transition-colors ${transaction.provider_org_inferred ? 'text-muted-foreground' : ''}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {getOrgFullDisplay(transaction.provider_org_id, transaction.provider_org_name, transaction.provider_org_ref)}
                                        </Link>
                                      ) : (
                                        <span className={`font-medium ${transaction.provider_org_inferred ? 'text-muted-foreground' : ''}`}>{getOrgFullDisplay(transaction.provider_org_id, transaction.provider_org_name, transaction.provider_org_ref)}</span>
                                      )}
                                      {transaction.provider_org_inferred && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                                Inferred
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Inferred from activity data</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                      {transaction.provider_org_type && (
                                        <Badge variant="secondary" className="text-xs">
                                          {ORG_TYPE_LABELS[transaction.provider_org_type] || transaction.provider_org_type}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {transaction.provider_org_ref && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground min-w-[160px]">Provider Reference:</span>
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{transaction.provider_org_ref}</span>
                                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(transaction.provider_org_ref!)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {transaction.receiver_org_name && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Receiver Organisation:</span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {getOrgId(transaction.receiver_org_id, transaction.receiver_org_ref) ? (
                                        <Link 
                                          href={`/organizations/${getOrgId(transaction.receiver_org_id, transaction.receiver_org_ref)}`}
                                          className={`font-medium hover:text-gray-700 transition-colors ${transaction.receiver_org_inferred ? 'text-muted-foreground' : ''}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {getOrgFullDisplay(transaction.receiver_org_id, transaction.receiver_org_name, transaction.receiver_org_ref)}
                                        </Link>
                                      ) : (
                                        <span className={`font-medium ${transaction.receiver_org_inferred ? 'text-muted-foreground' : ''}`}>{getOrgFullDisplay(transaction.receiver_org_id, transaction.receiver_org_name, transaction.receiver_org_ref)}</span>
                                      )}
                                      {transaction.receiver_org_inferred && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                                Inferred
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Inferred from activity data</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                      {transaction.receiver_org_type && (
                                        <Badge variant="secondary" className="text-xs">
                                          {ORG_TYPE_LABELS[transaction.receiver_org_type] || transaction.receiver_org_type}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {transaction.receiver_org_ref && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground min-w-[160px]">Receiver Reference:</span>
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{transaction.receiver_org_ref}</span>
                                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(transaction.receiver_org_ref!)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-gray-200">
                                <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">System Identifiers</h4>
                                <div className="space-y-3 ml-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground min-w-[160px]">Activity ID:</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{activityIdentifiers.customId || '—'}</span>
                                  {activityIdentifiers.customId && (
                                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(activityIdentifiers.customId!)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground min-w-[160px]">IATI Identifier:</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{activityIdentifiers.iatiId || '—'}</span>
                                  {activityIdentifiers.iatiId && (
                                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(activityIdentifiers.iatiId!)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground min-w-[160px]">Activity UUID:</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{transaction.activity_id}</span>
                                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(transaction.activity_id)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground min-w-[160px]">Transaction ID:</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{transaction.transaction_reference || '—'}</span>
                                  {transaction.transaction_reference && (
                                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(transaction.transaction_reference!)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground min-w-[160px]">Transaction UUID:</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{transaction.uuid || transaction.id}</span>
                                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(transaction.uuid || transaction.id)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                {transaction.sector_code && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground min-w-[160px]">Sector:</span>
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{transaction.sector_code}</span>
                                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(transaction.sector_code!)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {transaction.recipient_country_code && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Recipient Country:</span>
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{transaction.recipient_country_code}</span>
                                  </div>
                                )}
                                {transaction.recipient_region_code && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Recipient Region:</span>
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{transaction.recipient_region_code}</span>
                                  </div>
                                )}
                                </div>
                              </div>
                            </div>

                            {/* Column 3: Funding Modality & Metadata */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Funding Modality & Aid Classification</h4>
                                <div className="space-y-3 ml-4">
                                {/* Aid Type - with inheritance support */}
                                {(transaction.aid_type || defaultAidType) && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Aid Type:</span>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`flex items-center gap-2 ${(transaction as any).aid_type_inherited || (!transaction.aid_type && defaultAidType) || (transaction.aid_type === defaultAidType && defaultAidType) ? 'text-gray-400 opacity-70 cursor-help' : ''}`}>
                                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                              {transaction.aid_type || defaultAidType}
                                            </span>
                                            <span className="text-xs">
                                              {AID_TYPE_LABELS[transaction.aid_type || defaultAidType || ''] || (transaction.aid_type || defaultAidType)}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        {((transaction as any).aid_type_inherited || (!transaction.aid_type && defaultAidType) || (transaction.aid_type === defaultAidType && defaultAidType)) && (
                                          <TooltipContent>
                                            <p className="text-xs">
                                              This aid type has been inherited from the activity's default aid type (code {defaultAidType || transaction.aid_type} – {AID_TYPE_LABELS[defaultAidType || transaction.aid_type || ''] || defaultAidType || transaction.aid_type})
                                            </p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                )}
                                {/* Flow Type - with inheritance support */}
                                {(transaction.flow_type || defaultFlowType) && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Flow Type:</span>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`flex items-center gap-2 ${(transaction as any).flow_type_inherited || (!transaction.flow_type && defaultFlowType) || (transaction.flow_type === defaultFlowType && defaultFlowType) ? 'text-gray-400 opacity-70 cursor-help' : ''}`}>
                                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                              {transaction.flow_type || defaultFlowType}
                                            </span>
                                            <span className="text-xs">
                                              {FLOW_TYPE_LABELS[transaction.flow_type || defaultFlowType || ''] || (transaction.flow_type || defaultFlowType)}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        {((transaction as any).flow_type_inherited || (!transaction.flow_type && defaultFlowType) || (transaction.flow_type === defaultFlowType && defaultFlowType)) && (
                                          <TooltipContent>
                                            <p className="text-xs">
                                              This flow type has been inherited from the activity's default flow type (code {defaultFlowType || transaction.flow_type} – {FLOW_TYPE_LABELS[defaultFlowType || transaction.flow_type || ''] || defaultFlowType || transaction.flow_type})
                                            </p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                )}
                                {/* Finance Type - with inheritance support */}
                                {(() => {
                                  const displayValue = transaction.effective_finance_type || transaction.finance_type || defaultFinanceType;
                                  const isInherited = transaction.finance_type_inherited || (!transaction.finance_type && displayValue);
                                  if (!displayValue) return null;
                                  
                                  return (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground min-w-[160px]">Finance Type:</span>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className={`flex items-center gap-2 ${isInherited ? 'text-gray-400 opacity-70 cursor-help' : ''}`}>
                                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                {displayValue}
                                              </span>
                                              <span className="text-xs">
                                                {FINANCE_TYPE_LABELS[displayValue] || displayValue}
                                              </span>
                                            </div>
                                          </TooltipTrigger>
                                          {isInherited && (
                                            <TooltipContent>
                                              <p className="text-xs">
                                                Inherited from activity's default finance type (code {displayValue} – {FINANCE_TYPE_LABELS[displayValue] || displayValue})
                                              </p>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  );
                                })()}
                                {/* Tied Status - with inheritance support */}
                                {(() => {
                                  const displayValue = transaction.effective_tied_status || transaction.tied_status || defaultTiedStatus;
                                  const isInherited = transaction.tied_status_inherited || (!transaction.tied_status && displayValue);
                                  if (!displayValue) return null;
                                  
                                  return (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground min-w-[160px]">Tied Status:</span>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className={`flex items-center gap-2 ${isInherited ? 'text-gray-400 opacity-70 cursor-help' : ''}`}>
                                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                {displayValue}
                                              </span>
                                              <span className="text-xs">
                                                {TIED_STATUS_LABELS[displayValue] || displayValue}
                                              </span>
                                            </div>
                                          </TooltipTrigger>
                                          {isInherited && (
                                            <TooltipContent>
                                              <p className="text-xs">
                                                Inherited from activity's default tied status (code {displayValue} – {TIED_STATUS_LABELS[displayValue] || displayValue})
                                              </p>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  );
                                })()}
                                {transaction.disbursement_channel && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Disbursement Channel:</span>
                                    <div className="text-xs">
                                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded mr-2">{transaction.disbursement_channel}</span>
                                      <span>{DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel] || transaction.disbursement_channel}</span>
                                    </div>
                                  </div>
                                )}
                                {transaction.is_humanitarian && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Humanitarian:</span>
                                    <Badge variant="destructive" className="text-xs">
                                      Yes
                                    </Badge>
                                  </div>
                                )}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-gray-200">
                                <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Metadata & History</h4>
                                <div className="space-y-3 ml-4">
                                {transaction.created_at && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Created:</span>
                                    <span className="font-medium">{format(new Date(transaction.created_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                                  </div>
                                )}
                                {transaction.created_by && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Created By:</span>
                                    <span className="font-medium">User ID: {transaction.created_by}</span>
                                  </div>
                                )}
                                {transaction.updated_at && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Last Modified:</span>
                                    <span className="font-medium">{format(new Date(transaction.updated_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                                  </div>
                                )}
                                {transaction.updated_by && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Last Modified By:</span>
                                    <span className="font-medium">User ID: {transaction.updated_by}</span>
                                  </div>
                                )}
                                {!transaction.created_by && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Source:</span>
                                    <Badge className="w-fit text-xs bg-[#124e5f] text-white">
                                      Imported from IATI
                                    </Badge>
                                  </div>
                                )}
                                {transaction.validated_at && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Validated:</span>
                                    <span className="font-medium text-green-700">{format(new Date(transaction.validated_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                                  </div>
                                )}
                                {transaction.validated_by && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Validated By:</span>
                                    <span className="font-medium text-green-700">User ID: {transaction.validated_by}</span>
                                  </div>
                                )}
                                {transaction.validation_comments && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[160px]">Validation Notes:</span>
                                    <span className="text-xs text-gray-700 italic">{transaction.validation_comments}</span>
                                  </div>
                                )}
                                </div>
                              </div>

                              {/* Documents */}
                              {transactionDocuments[transaction.uuid || transaction.id] && 
                               transactionDocuments[transaction.uuid || transaction.id].length > 0 && (
                                <div className="pt-4 border-t border-gray-200">
                                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Documents</h4>
                                  <div className="space-y-2 ml-4">
                                    {transactionDocuments[transaction.uuid || transaction.id].map((doc: any) => (
                                      <div key={doc.id} className="flex items-start gap-2">
                                        {doc.external_url ? (
                                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        ) : (
                                          <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <a
                                            href={doc.external_url || doc.file_url}
                                            target={doc.external_url ? "_blank" : undefined}
                                            rel={doc.external_url ? "noopener noreferrer" : undefined}
                                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                          >
                                            {doc.file_name || doc.external_url}
                                          </a>
                                          {doc.description && (
                                            <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
              </TableBody>
              </Table>
              </div>
            </div>

            {/* Pagination Controls - Hide in grouped view */}
            {!groupedView && transactions.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedTransactions.length)} of {sortedTransactions.length} transactions
                  </div>
                  {sortedTransactions.length > 20 && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="items-per-page" className="text-sm text-muted-foreground">
                        Rows per page:
                      </Label>
                      <Select
                        value={itemsPerPage === sortedTransactions.length ? "all" : String(itemsPerPage)}
                        onValueChange={(value) => {
                          if (value === "all") {
                            setItemsPerPage(sortedTransactions.length);
                          } else {
                            setItemsPerPage(Number(value));
                          }
                          setCurrentPage(1); // Reset to first page when changing page size
                        }}
                      >
                        <SelectTrigger id="items-per-page" className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {sortedTransactions.length > itemsPerPage && (
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
                )}
              </div>
            )}
            </>
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