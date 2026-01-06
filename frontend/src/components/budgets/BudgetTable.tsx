import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
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
  getSortIcon,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Budget, BUDGET_TYPE_LABELS, BUDGET_STATUS_LABELS, BudgetType, BudgetStatus } from "@/types/budget";

// Column configuration for Budget Table
type BudgetColumnId = 
  | 'activity' | 'periodStart' | 'periodEnd' | 'type' 
  | 'status' | 'value' | 'valueDate' | 'valueUsd' | 'reportingOrganisation';

interface BudgetColumnConfig {
  id: BudgetColumnId;
  label: string;
  group: 'default' | 'details';
  defaultVisible?: boolean;
  sortable?: boolean;
  sortField?: string;
  align?: 'left' | 'center' | 'right';
}

const BUDGET_COLUMN_CONFIGS: BudgetColumnConfig[] = [
  { id: 'activity', label: 'Activity Title', group: 'default', defaultVisible: true, sortable: true, sortField: 'activity', align: 'left' },
  { id: 'periodStart', label: 'Start Date', group: 'default', defaultVisible: true, sortable: true, sortField: 'period_start', align: 'left' },
  { id: 'periodEnd', label: 'End Date', group: 'default', defaultVisible: true, sortable: true, sortField: 'period_end', align: 'left' },
  { id: 'type', label: 'Type', group: 'default', defaultVisible: true, sortable: true, sortField: 'type', align: 'left' },
  { id: 'status', label: 'Status', group: 'default', defaultVisible: true, sortable: true, sortField: 'status', align: 'left' },
  { id: 'value', label: 'Currency Value', group: 'default', defaultVisible: true, sortable: true, sortField: 'value', align: 'right' },
  { id: 'valueDate', label: 'Value Date', group: 'details', defaultVisible: false, sortable: true, sortField: 'value_date', align: 'left' },
  { id: 'valueUsd', label: 'USD Value', group: 'default', defaultVisible: true, sortable: true, sortField: 'value_usd', align: 'right' },
  { id: 'reportingOrganisation', label: 'Reporting Organisation', group: 'details', defaultVisible: false, sortable: false, align: 'left' },
];

const BUDGET_COLUMN_GROUPS = {
  default: 'Default Columns',
  details: 'Additional Details',
};

const DEFAULT_VISIBLE_BUDGET_COLUMNS: BudgetColumnId[] = 
  BUDGET_COLUMN_CONFIGS.filter(col => col.defaultVisible).map(col => col.id);

const BUDGET_COLUMNS_LOCALSTORAGE_KEY = 'aims_budget_table_visible_columns';

// Column Selector Component for Budget Table
interface BudgetColumnSelectorProps {
  visibleColumns: BudgetColumnId[];
  onColumnsChange: (columns: BudgetColumnId[]) => void;
}

function BudgetColumnSelector({ visibleColumns, onColumnsChange }: BudgetColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleColumn = (columnId: BudgetColumnId) => {
    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId));
    } else {
      onColumnsChange([...visibleColumns, columnId]);
    }
  };

  const toggleGroup = (group: keyof typeof BUDGET_COLUMN_GROUPS) => {
    const groupColumns = BUDGET_COLUMN_CONFIGS.filter(c => c.group === group);
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
    onColumnsChange(DEFAULT_VISIBLE_BUDGET_COLUMNS);
  };

  const selectAll = () => {
    const allColumnIds = BUDGET_COLUMN_CONFIGS.map(c => c.id);
    onColumnsChange(allColumnIds);
  };

  const visibleCount = visibleColumns.length;
  const totalColumns = BUDGET_COLUMN_CONFIGS.length;

  // Filter columns based on search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return null; // null means show grouped view
    const query = searchQuery.toLowerCase();
    return BUDGET_COLUMN_CONFIGS.filter(c => 
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
                      {BUDGET_COLUMN_GROUPS[column.group as keyof typeof BUDGET_COLUMN_GROUPS]}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Show grouped view when not searching
            (Object.keys(BUDGET_COLUMN_GROUPS) as Array<keyof typeof BUDGET_COLUMN_GROUPS>).map(groupKey => {
              const groupColumns = BUDGET_COLUMN_CONFIGS.filter(c => c.group === groupKey);
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
                    <span className="text-sm font-medium">{BUDGET_COLUMN_GROUPS[groupKey]}</span>
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
export type { BudgetColumnId };
export { DEFAULT_VISIBLE_BUDGET_COLUMNS, BUDGET_COLUMNS_LOCALSTORAGE_KEY, BudgetColumnSelector };

interface BudgetTableProps {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  sortField: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onRowClick?: (budgetId: string) => void;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budgetId: string) => void;
  variant?: "full" | "compact";
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectBudget?: (id: string, checked: boolean) => void;
  visibleColumns?: BudgetColumnId[];
  onColumnsChange?: (columns: BudgetColumnId[]) => void;
}

export function BudgetTable({
  budgets,
  loading,
  error,
  sortField,
  sortOrder,
  onSort,
  onRowClick,
  onEdit,
  onDelete,
  variant = "full",
  selectedIds,
  onSelectAll,
  onSelectBudget,
  visibleColumns = DEFAULT_VISIBLE_BUDGET_COLUMNS,
  onColumnsChange,
}: BudgetTableProps) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Column visibility helper
  const isColumnVisible = (columnId: BudgetColumnId) => {
    return visibleColumns.includes(columnId);
  };

  // Calculate colspan for expanded row
  const visibleColumnCount = visibleColumns.length + 2; // +2 for checkbox and actions columns

  const toggleRowExpansion = (budgetId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(budgetId)) {
        newSet.delete(budgetId);
      } else {
        newSet.add(budgetId);
      }
      return newSet;
    });
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
      console.warn(`[BudgetTable] Invalid currency "${currency}", using USD:`, error);
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

  const getBudgetTypeLabel = (type: BudgetType | number | string) => {
    const typeStr = String(type);
    return BUDGET_TYPE_LABELS[typeStr as keyof typeof BUDGET_TYPE_LABELS] || typeStr;
  };

  const getBudgetStatusLabel = (status: BudgetStatus | number | string) => {
    const statusStr = String(status);
    return BUDGET_STATUS_LABELS[statusStr as keyof typeof BUDGET_STATUS_LABELS] || statusStr;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading budgets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error loading budgets: {error}</p>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No budgets found</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                {onSelectAll && selectedIds && (
                  <div className="flex items-center justify-center" key={`select-all-wrapper-${budgets.length}`}>
                    <Checkbox
                      checked={selectedIds.size === budgets.length && budgets.length > 0}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < budgets.length}
                      onCheckedChange={(checked) => {
                        console.log('[BudgetTable] Select all clicked:', checked, 'budgets.length:', budgets.length);
                        onSelectAll(!!checked);
                      }}
                      aria-label="Select all budgets"
                    />
                  </div>
                )}
              </TableHead>
              {isColumnVisible('activity') && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/80 transition-colors max-w-[200px]"
                  onClick={() => onSort("activity")}
                >
                  <div className="flex items-center gap-1">
                    <span>Activity Title</span>
                    {getSortIcon("activity", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('periodStart') && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("period_start")}
                >
                  <div className="flex items-center gap-1">
                    <span>Start Date</span>
                    {getSortIcon("period_start", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('periodEnd') && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("period_end")}
                >
                  <div className="flex items-center gap-1">
                    <span>End Date</span>
                    {getSortIcon("period_end", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('type') && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("type")}
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    {getSortIcon("type", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('status') && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("status")}
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {getSortIcon("status", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('value') && (
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("value")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Currency Value</span>
                    {getSortIcon("value", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('valueDate') && (
                <TableHead
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("value_date")}
                >
                  <div className="flex items-center gap-1">
                    <span>Value Date</span>
                    {getSortIcon("value_date", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('valueUsd') && (
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("value_usd")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>USD Value</span>
                    {getSortIcon("value_usd", sortField, sortOrder)}
                  </div>
                </TableHead>
              )}
              {isColumnVisible('reportingOrganisation') && (
                <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors">
                  <span>Reporting Organisation</span>
                </TableHead>
              )}
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => {
              const budgetId = budget.id;
              const isExpanded = expandedRows.has(budgetId);
              const isSelected = selectedIds?.has(budgetId) || false;
              const activityTitle = budget.activity?.title_narrative || budget.activity?.title || 'Untitled Activity';

              return (
                <React.Fragment key={budget.id}>
                  <TableRow
                    className={cn(
                      "border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer",
                      isSelected && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => onRowClick?.(budgetId)}
                  >
                    {/* Checkbox or Expand/Collapse Button */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {onSelectBudget && selectedIds ? (
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onSelectBudget(budgetId, !!checked)}
                            aria-label={`Select budget ${budgetId}`}
                          />
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(budgetId);
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

                    {/* Activity Title */}
                    {isColumnVisible('activity') && (
                      <td className="py-3 px-4 max-w-[200px]">
                        <div
                          className="space-y-0.5 cursor-pointer hover:opacity-75 group"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (budget.activity_id) {
                              window.location.href = `/activities/${budget.activity_id}`;
                            }
                          }}
                        >
                          <div className="text-sm font-medium text-foreground line-clamp-2">
                            {activityTitle}
                          </div>
                          {budget.activity?.iati_identifier && (
                            <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded inline-block mt-1">
                              {budget.activity.iati_identifier}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Start Date */}
                    {isColumnVisible('periodStart') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(budget.period_start)}
                      </td>
                    )}

                    {/* End Date */}
                    {isColumnVisible('periodEnd') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(budget.period_end)}
                      </td>
                    )}

                    {/* Type */}
                    {isColumnVisible('type') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="bg-muted/50">
                          {getBudgetTypeLabel(budget.type)}
                        </Badge>
                      </td>
                    )}

                    {/* Status */}
                    {isColumnVisible('status') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="bg-muted/50">
                          {getBudgetStatusLabel(budget.status)}
                        </Badge>
                      </td>
                    )}

                    {/* Currency Value */}
                    {isColumnVisible('value') && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {budget.value != null ? formatCurrency(budget.value, budget.currency) : '—'}
                      </td>
                    )}

                    {/* Value Date */}
                    {isColumnVisible('valueDate') && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(budget.value_date)}
                      </td>
                    )}

                    {/* USD Value */}
                    {isColumnVisible('valueUsd') && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {budget.value_usd != null ? (
                          <span className="font-medium">
                            {formatCurrency(budget.value_usd, 'USD')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    {/* Reporting Organisation */}
                    {isColumnVisible('reportingOrganisation') && (
                      <td className="py-3 px-4">
                        {budget.activity?.reporting_org ? (
                          <div className="text-sm text-foreground flex flex-wrap items-center gap-1">
                            <span>
                              {budget.activity.reporting_org.name || '—'}
                              {budget.activity.reporting_org.acronym && budget.activity.reporting_org.name && budget.activity.reporting_org.acronym !== budget.activity.reporting_org.name && (
                                <span> ({budget.activity.reporting_org.acronym})</span>
                              )}
                            </span>
                            {budget.activity.reporting_org.iati_org_id && (
                              <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                {budget.activity.reporting_org.iati_org_id}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
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
                              onEdit(budget);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDelete(budgetId);
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* LEFT COLUMN */}
                          <div className="space-y-4">
                            {/* Budget Summary Header */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-5 w-5 text-slate-600" />
                                  <span className="text-lg font-semibold text-foreground">
                                    {getBudgetTypeLabel(budget.type)} Budget
                                  </span>
                                  <Badge variant="outline" className="bg-muted/50">
                                    {getBudgetStatusLabel(budget.status)}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Period */}
                              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                                <span>{formatDate(budget.period_start)}</span>
                                <span>→</span>
                                <span>{formatDate(budget.period_end)}</span>
                              </div>
                              
                              {/* Amount Display */}
                              <div className="text-2xl font-bold text-foreground mb-3">
                                {budget.value != null ? formatCurrency(budget.value, budget.currency) : '—'}
                              </div>
                              
                              {budget.value_usd != null && (
                                <div className="text-sm text-muted-foreground">
                                  USD: {formatCurrency(budget.value_usd, 'USD')}
                                </div>
                              )}
                            </div>

                            {/* Activity Info */}
                            {budget.activity && (
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Activity</h3>
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">{activityTitle}</p>
                                  {budget.activity.iati_identifier && (
                                    <p className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded inline-block">
                                      {budget.activity.iati_identifier}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* RIGHT COLUMN */}
                          <div className="space-y-4">
                            {/* Budget Metadata */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4">
                              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Budget Details</h3>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Value Date</span>
                                  <span className="text-sm font-medium">{formatDate(budget.value_date)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Currency</span>
                                  <span className="text-sm font-medium">{budget.currency || 'USD'}</span>
                                </div>
                                {budget.created_at && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Created</span>
                                    <span className="text-sm font-medium">{format(new Date(budget.created_at), 'dd MMM yyyy, HH:mm')}</span>
                                  </div>
                                )}
                                {budget.updated_at && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Last Updated</span>
                                    <span className="text-sm font-medium">{format(new Date(budget.updated_at), 'dd MMM yyyy, HH:mm')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
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

