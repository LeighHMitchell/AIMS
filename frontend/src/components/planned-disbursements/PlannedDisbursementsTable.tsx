import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Edit,
  Trash2,
  MoreVertical,
  MessageSquare,
  ArrowRight,
  Loader2,
  NotepadText,
  Columns3,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OrganizationLogo } from "@/components/ui/organization-logo";

// Column configuration for Planned Disbursements Table
type PlannedDisbursementColumnId = 
  | 'activity' | 'periodStart' | 'periodEnd' | 'type' 
  | 'providerReceiver' | 'amount' | 'valueDate' | 'valueUsd' | 'notes';

interface PlannedDisbursementColumnConfig {
  id: PlannedDisbursementColumnId;
  label: string;
  group: 'default' | 'details';
  defaultVisible?: boolean;
  sortable?: boolean;
  sortField?: string;
  align?: 'left' | 'center' | 'right';
}

const PLANNED_DISBURSEMENT_COLUMN_CONFIGS: PlannedDisbursementColumnConfig[] = [
  { id: 'activity', label: 'Activity', group: 'default', defaultVisible: true, sortable: true, sortField: 'activity', align: 'left' },
  { id: 'periodStart', label: 'Start Date', group: 'default', defaultVisible: true, sortable: true, sortField: 'period_start', align: 'left' },
  { id: 'periodEnd', label: 'End Date', group: 'default', defaultVisible: true, sortable: true, sortField: 'period_end', align: 'left' },
  { id: 'type', label: 'Type', group: 'default', defaultVisible: true, sortable: true, sortField: 'type', align: 'left' },
  { id: 'providerReceiver', label: 'Provider / Receiver', group: 'default', defaultVisible: true, sortable: false, align: 'left' },
  { id: 'amount', label: 'Amount', group: 'default', defaultVisible: true, sortable: true, sortField: 'value', align: 'right' },
  { id: 'valueDate', label: 'Value Date', group: 'details', defaultVisible: false, sortable: true, sortField: 'value_date', align: 'left' },
  { id: 'valueUsd', label: 'USD Value', group: 'default', defaultVisible: true, sortable: true, sortField: 'value_usd', align: 'right' },
  { id: 'notes', label: 'Notes', group: 'details', defaultVisible: false, sortable: false, align: 'center' },
];

const PLANNED_DISBURSEMENT_COLUMN_GROUPS = {
  default: 'Default Columns',
  details: 'Additional Details',
};

const DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS: PlannedDisbursementColumnId[] = 
  PLANNED_DISBURSEMENT_COLUMN_CONFIGS.filter(col => col.defaultVisible).map(col => col.id);

const PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY = 'aims_planned_disbursement_table_visible_columns';

// Column Selector Component for Planned Disbursements Table
interface PlannedDisbursementColumnSelectorProps {
  visibleColumns: PlannedDisbursementColumnId[];
  onColumnsChange: (columns: PlannedDisbursementColumnId[]) => void;
}

function PlannedDisbursementColumnSelector({ visibleColumns, onColumnsChange }: PlannedDisbursementColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleColumn = (columnId: PlannedDisbursementColumnId) => {
    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId));
    } else {
      onColumnsChange([...visibleColumns, columnId]);
    }
  };

  const toggleGroup = (group: keyof typeof PLANNED_DISBURSEMENT_COLUMN_GROUPS) => {
    const groupColumns = PLANNED_DISBURSEMENT_COLUMN_CONFIGS.filter(c => c.group === group);
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
    onColumnsChange(DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS);
  };

  const selectAll = () => {
    const allColumnIds = PLANNED_DISBURSEMENT_COLUMN_CONFIGS.map(c => c.id);
    onColumnsChange(allColumnIds);
  };

  const visibleCount = visibleColumns.length;
  const totalColumns = PLANNED_DISBURSEMENT_COLUMN_CONFIGS.length;

  // Filter columns based on search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return null; // null means show grouped view
    const query = searchQuery.toLowerCase();
    return PLANNED_DISBURSEMENT_COLUMN_CONFIGS.filter(c => 
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
                      {PLANNED_DISBURSEMENT_COLUMN_GROUPS[column.group as keyof typeof PLANNED_DISBURSEMENT_COLUMN_GROUPS]}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Show grouped view when not searching
            (Object.keys(PLANNED_DISBURSEMENT_COLUMN_GROUPS) as Array<keyof typeof PLANNED_DISBURSEMENT_COLUMN_GROUPS>).map(groupKey => {
              const groupColumns = PLANNED_DISBURSEMENT_COLUMN_CONFIGS.filter(c => c.group === groupKey);
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
                    <span className="text-sm font-medium">{PLANNED_DISBURSEMENT_COLUMN_GROUPS[groupKey]}</span>
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

// Export column types for parent components
export type { PlannedDisbursementColumnId };
export { DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS, PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY, PlannedDisbursementColumnSelector };

interface PlannedDisbursement {
  id: string;
  activity_id: string;
  type?: string | number;
  period_start?: string;
  period_end?: string;
  value?: number;
  amount?: number; // Database column name
  currency?: string;
  value_date?: string;
  value_usd?: number | null;
  usd_amount?: number | null; // Database column name
  provider_org_ref?: string;
  provider_org_name?: string;
  provider_org_acronym?: string;
  provider_activity_id?: string;
  receiver_org_ref?: string;
  receiver_org_name?: string;
  receiver_org_acronym?: string;
  receiver_activity_id?: string;
  description?: string;
  notes?: string;
  activity?: {
    id: string;
    title_narrative?: string;
    title?: string;
    iati_identifier?: string;
  };
  provider_activity?: {
    title_narrative?: string;
    title?: string;
    iati_identifier?: string;
  };
  receiver_activity?: {
    title_narrative?: string;
    title?: string;
    iati_identifier?: string;
  };
}

interface PlannedDisbursementsTableProps {
  disbursements: PlannedDisbursement[];
  loading: boolean;
  error: string | null;
  sortField: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onRowClick?: (disbursementId: string) => void;
  onEdit?: (disbursement: PlannedDisbursement) => void;
  onDelete?: (disbursementId: string) => void;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectDisbursement?: (id: string, checked: boolean) => void;
  visibleColumns?: PlannedDisbursementColumnId[];
  onColumnsChange?: (columns: PlannedDisbursementColumnId[]) => void;
}

const DISBURSEMENT_TYPE_LABELS: Record<string, string> = {
  '1': 'Original',
  '2': 'Revised',
};

export function PlannedDisbursementsTable({
  disbursements,
  loading,
  error,
  sortField,
  sortOrder,
  onSort,
  onRowClick,
  onEdit,
  onDelete,
  selectedIds,
  onSelectAll,
  onSelectDisbursement,
  visibleColumns = DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS,
  onColumnsChange,
}: PlannedDisbursementsTableProps) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [usdValues, setUsdValues] = useState<Record<string, { 
    usd: number | null, 
    rate: number | null, 
    date: string, 
    loading: boolean, 
    error?: string 
  }>>({});
  
  // Column visibility helper
  const isColumnVisible = (columnId: PlannedDisbursementColumnId) => {
    return visibleColumns.includes(columnId);
  };
  
  // Calculate colspan for expanded row
  const visibleColumnCount = visibleColumns.length + 2; // +2 for checkbox and actions columns

  // Read stored USD values from database (no real-time conversion)
  useEffect(() => {
    const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
    
    for (const disbursement of disbursements) {
      const disbursementId = disbursement.id;
      
      // Use amount (database field) or value (legacy/API field) - prefer amount
      const amountValue = disbursement.amount ?? disbursement.value;
      
      // Check if disbursement already has USD value stored
      const existingUsdValue = disbursement.usd_amount ?? disbursement.value_usd;
      if (existingUsdValue != null && !isNaN(existingUsdValue)) {
        newUsdValues[disbursementId] = {
          usd: existingUsdValue,
          rate: (disbursement as any).exchange_rate_used || null,
          date: disbursement.value_date || disbursement.period_start || '',
          loading: false
        };
        continue;
      }
      
      // If currency is already USD, just use the value
      if (disbursement.currency === 'USD' && amountValue != null && !isNaN(amountValue)) {
        newUsdValues[disbursementId] = {
          usd: amountValue,
          rate: 1,
          date: disbursement.value_date || disbursement.period_start || '',
          loading: false
        };
        continue;
      }
      
      // Missing data or unconverted - show as not converted (no real-time API call)
      const isUnconvertible = (disbursement as any).usd_convertible === false;
      newUsdValues[disbursementId] = { 
        usd: null, 
        rate: null, 
        date: disbursement.value_date || disbursement.period_start || '', 
        loading: false,
        error: isUnconvertible ? 'Not converted' : undefined
      };
    }
    
    setUsdValues(newUsdValues);
  }, [disbursements]);

  const toggleRowExpansion = (disbursementId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(disbursementId)) {
        newSet.delete(disbursementId);
      } else {
        newSet.add(disbursementId);
      }
      return newSet;
    });
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-gray-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-gray-400" />
    );
  };

  const formatCurrency = (value: number, currency: string = "USD") => {
    const safeCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency.toUpperCase())
      ? currency.toUpperCase()
      : "USD";

    try {
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

      return <><span className="text-muted-foreground">{safeCurrency}</span> {formattedValue}</>;
    } catch (error) {
      console.warn(`[PlannedDisbursementsTable] Invalid currency "${currency}", using USD:`, error);
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
      return <><span className="text-muted-foreground">USD</span> {formattedValue}</>;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return format(date, "dd MMM yyyy");
    } catch (error) {
      return '—';
    }
  };

  const getDisbursementTypeLabel = (type: string | number) => {
    const typeStr = String(type);
    return DISBURSEMENT_TYPE_LABELS[typeStr] || typeStr;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading planned disbursements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error loading planned disbursements: {error}</p>
      </div>
    );
  }

  if (disbursements.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No planned disbursements found</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div>
        <Table>
          <TableHeader className="bg-muted/50 border-b border-border/70">
            <TableRow>
              <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 w-10 text-center">
                {onSelectAll && selectedIds && (
                  <div className="flex items-center justify-center" key={`select-all-wrapper-${disbursements.length}`}>
                    <Checkbox
                      checked={selectedIds.size === disbursements.length && disbursements.length > 0}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < disbursements.length}
                      onCheckedChange={(checked) => {
                        console.log('[PlannedDisbursementsTable] Select all clicked:', checked, 'disbursements.length:', disbursements.length);
                        onSelectAll(!!checked);
                      }}
                      aria-label="Select all disbursements"
                    />
                  </div>
                )}
              </TableHead>
              {isColumnVisible('activity') && (
                <TableHead
                  className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSort("activity")}
                >
                  <div className="flex items-center gap-1">
                    <span>Activity</span>
                    {getSortIcon("activity")}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('periodStart') && (
                <TableHead
                  className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSort("period_start")}
                >
                  <div className="flex items-center gap-1">
                    <span>Start Date</span>
                    {getSortIcon("period_start")}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('periodEnd') && (
                <TableHead
                  className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSort("period_end")}
                >
                  <div className="flex items-center gap-1">
                    <span>End Date</span>
                    {getSortIcon("period_end")}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('type') && (
                <TableHead
                  className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSort("type")}
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    {getSortIcon("type")}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('providerReceiver') && (
                <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4">
                  Provider / Receiver
                </TableHead>
              )}
              {isColumnVisible('amount') && (
                <TableHead
                  className="text-sm font-medium text-foreground/90 py-3 px-4 text-right cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSort("value")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    {getSortIcon("value")}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('valueDate') && (
                <TableHead
                  className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSort("value_date")}
                >
                  <div className="flex items-center gap-1">
                    <span>Value Date</span>
                    {getSortIcon("value_date")}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('valueUsd') && (
                <TableHead
                  className="text-sm font-medium text-foreground/90 py-3 px-4 text-right cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSort("value_usd")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>USD Value</span>
                    {getSortIcon("value_usd")}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('notes') && (
                <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-center w-10">
                  Notes
                </TableHead>
              )}
              <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disbursements.map((disbursement) => {
              const disbursementId = disbursement.id;
              const isExpanded = expandedRows.has(disbursementId);
              const isSelected = selectedIds?.has(disbursementId) || false;
              const activityTitle = disbursement.activity?.title_narrative || disbursement.activity?.title || 'Untitled Activity';
              const hasNotes = !!(disbursement.notes || disbursement.description);

              return (
                <React.Fragment key={disbursement.id}>
                  <TableRow
                    className={cn(
                      "border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer",
                      isSelected && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => onRowClick?.(disbursementId)}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {onSelectDisbursement && selectedIds ? (
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onSelectDisbursement(disbursementId, !!checked)}
                            aria-label={`Select disbursement ${disbursementId}`}
                          />
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(disbursementId);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </td>

                    {/* Activity */}
                    {isColumnVisible('activity') && (
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-foreground line-clamp-2">
                            {activityTitle}
                          </div>
                          {disbursement.activity?.iati_identifier && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {disbursement.activity.iati_identifier}
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Start Date */}
                    {isColumnVisible('periodStart') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(disbursement.period_start)}
                      </td>
                    )}

                    {/* End Date */}
                    {isColumnVisible('periodEnd') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(disbursement.period_end)}
                      </td>
                    )}

                    {/* Type */}
                    {isColumnVisible('type') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {disbursement.type ? (
                          <Badge variant="outline" className="bg-muted/50">
                            {getDisbursementTypeLabel(disbursement.type)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                    )}

                    {/* Provider / Receiver */}
                    {isColumnVisible('providerReceiver') && (
                      <td className="py-3 px-4">
                        {(() => {
                          const providerDisplay = disbursement.provider_org_acronym || disbursement.provider_org_name || '—';
                          const receiverDisplay = disbursement.receiver_org_acronym || disbursement.receiver_org_name || '—';

                          return (
                            <div className="text-sm font-medium text-foreground">
                              <div className="flex items-start gap-2">
                                {/* Provider */}
                                <div className="flex items-start gap-1 flex-1 min-w-0">
                                  <OrganizationLogo
                                    logo={disbursement.provider_org_logo}
                                    name={providerDisplay}
                                    size="sm"
                                    className="flex-shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-sm truncate">
                                          {providerDisplay}
                                        </div>
                                      </TooltipTrigger>
                                      {disbursement.provider_org_ref && (
                                        <TooltipContent side="top">
                                          <p className="text-xs">{disbursement.provider_org_ref}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                    {disbursement.provider_activity && (
                                      <div className="text-xs text-muted-foreground">
                                        {disbursement.provider_activity.title_narrative || disbursement.provider_activity.title}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <span className="text-muted-foreground flex-shrink-0 mt-1">→</span>

                                {/* Receiver */}
                                <div className="flex items-start gap-1 flex-1 min-w-0">
                                  <OrganizationLogo
                                    logo={disbursement.receiver_org_logo}
                                    name={receiverDisplay}
                                    size="sm"
                                    className="flex-shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-sm truncate">
                                          {receiverDisplay}
                                        </div>
                                      </TooltipTrigger>
                                      {disbursement.receiver_org_ref && (
                                        <TooltipContent side="top">
                                          <p className="text-xs">{disbursement.receiver_org_ref}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                    {disbursement.receiver_activity && (
                                      <div className="text-xs text-muted-foreground">
                                        {disbursement.receiver_activity.title_narrative || disbursement.receiver_activity.title}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {/* Amount */}
                    {isColumnVisible('amount') && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {(() => {
                          // Use amount (database field) or value (legacy/API field) - prefer amount
                          const amountValue = disbursement.amount ?? disbursement.value;
                          
                          if (amountValue != null && disbursement.currency) {
                            return (
                              <div className="font-medium">
                                <span className="text-muted-foreground text-xs">{disbursement.currency.toUpperCase()}</span>{' '}
                                {new Intl.NumberFormat("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(amountValue)}
                              </div>
                            );
                          }
                          return <span className="text-muted-foreground">—</span>;
                        })()}
                      </td>
                    )}

                    {/* Value Date */}
                    {isColumnVisible('valueDate') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(disbursement.value_date)}
                      </td>
                    )}

                    {/* USD Value */}
                    {isColumnVisible('valueUsd') && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {usdValues[disbursement.id]?.loading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          ) : usdValues[disbursement.id]?.usd != null ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium cursor-help">
                                    {formatCurrency(usdValues[disbursement.id].usd!, 'USD')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div>
                                    <div>Original: {disbursement.amount ?? disbursement.value} {disbursement.currency}</div>
                                    {usdValues[disbursement.id].rate && (
                                      <div>Rate: {usdValues[disbursement.id].rate}</div>
                                    )}
                                    {usdValues[disbursement.id].date && (
                                      <div>Date: {usdValues[disbursement.id].date}</div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Notes Icon */}
                    {isColumnVisible('notes') && (
                      <td className="py-3 px-4 text-center">
                        {hasNotes && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center justify-center">
                                  <NotepadText className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md text-left">
                              <p className="text-xs whitespace-pre-wrap break-words text-left">
                                {disbursement.notes || disbursement.description || 'Has notes'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            aria-label="Open menu"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                          {onEdit && (
                            <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onEdit(disbursement);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDelete(disbursementId);
                            }} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </TableRow>

                  {/* Expanded Row Content */}
                  {isExpanded && (
                    <TableRow className="bg-slate-50/50">
                      <td colSpan={visibleColumnCount} className="p-6">
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900">Details</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Provider Org Ref:</span>
                              <p className="font-mono text-xs mt-1">{disbursement.provider_org_ref || '—'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Receiver Org Ref:</span>
                              <p className="font-mono text-xs mt-1">{disbursement.receiver_org_ref || '—'}</p>
                            </div>
                            {disbursement.description && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Description:</span>
                                <p className="mt-1">{disbursement.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
