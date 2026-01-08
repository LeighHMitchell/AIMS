import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
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
import { Budget, BUDGET_TYPE_LABELS, BUDGET_STATUS_LABELS, BudgetType, BudgetStatus } from "@/types/budget";
import { ColumnSelector } from "@/components/ui/column-selector";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  BudgetColumnId,
  budgetColumns,
  budgetColumnGroups,
  defaultVisibleBudgetColumns,
  BUDGET_COLUMNS_LOCALSTORAGE_KEY,
} from "@/app/budgets/columns";

// Re-export column types for parent components
export type { BudgetColumnId };
export { defaultVisibleBudgetColumns, BUDGET_COLUMNS_LOCALSTORAGE_KEY, budgetColumns, budgetColumnGroups };

// Wrapper for backward compatibility
export const BudgetColumnSelector = ({
  visibleColumns,
  onColumnsChange,
}: {
  visibleColumns: BudgetColumnId[];
  onColumnsChange: (columns: BudgetColumnId[]) => void;
}) => (
  <ColumnSelector<BudgetColumnId>
    columns={budgetColumns}
    visibleColumns={visibleColumns}
    defaultVisibleColumns={defaultVisibleBudgetColumns}
    onChange={onColumnsChange}
    groupLabels={budgetColumnGroups}
  />
);

// Backward compatibility alias
export const DEFAULT_VISIBLE_BUDGET_COLUMNS = defaultVisibleBudgetColumns;

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
    return <TableSkeleton rows={5} columns={visibleColumns.length + 2} />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error loading budgets: {error}</p>
      </div>
    );
  }

  if (budgets.length === 0) {
    return <EmptyState message="No budgets found" />;
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
                      "border-b border-border/40 hover:bg-muted/50 transition-colors cursor-pointer",
                      isSelected && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => onRowClick?.(budgetId)}
                  >
                    {/* Checkbox or Expand/Collapse Button */}
                    <TableCell className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
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
                    </TableCell>

                    {/* Activity Title */}
                    {isColumnVisible('activity') && (
                      <TableCell className="py-3 px-4 max-w-[200px]">
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
                      </TableCell>
                    )}

                    {/* Start Date */}
                    {isColumnVisible('periodStart') && (
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {formatDate(budget.period_start)}
                      </TableCell>
                    )}

                    {/* End Date */}
                    {isColumnVisible('periodEnd') && (
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {formatDate(budget.period_end)}
                      </TableCell>
                    )}

                    {/* Type */}
                    {isColumnVisible('type') && (
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="bg-muted/50">
                          {getBudgetTypeLabel(budget.type)}
                        </Badge>
                      </TableCell>
                    )}

                    {/* Status */}
                    {isColumnVisible('status') && (
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="bg-muted/50">
                          {getBudgetStatusLabel(budget.status)}
                        </Badge>
                      </TableCell>
                    )}

                    {/* Currency Value */}
                    {isColumnVisible('value') && (
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        {budget.value != null ? formatCurrency(budget.value, budget.currency) : '—'}
                      </TableCell>
                    )}

                    {/* Value Date */}
                    {isColumnVisible('valueDate') && (
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {formatDate(budget.value_date)}
                      </TableCell>
                    )}

                    {/* USD Value */}
                    {isColumnVisible('valueUsd') && (
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        {budget.value_usd != null ? (
                          <span className="font-medium">
                            {formatCurrency(budget.value_usd, 'USD')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Reporting Organisation */}
                    {isColumnVisible('reportingOrganisation') && (
                      <TableCell className="py-3 px-4">
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
                      </TableCell>
                    )}

                    <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                    </TableCell>
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

