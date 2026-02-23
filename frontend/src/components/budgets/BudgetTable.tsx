import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Calendar,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { BudgetActionMenu } from "@/components/budgets/BudgetActionMenu";
import { OrganizationLogo } from "@/components/ui/organization-logo";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  getSortIcon,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Budget, BUDGET_TYPE_LABELS, BUDGET_STATUS_LABELS, BudgetType, BudgetStatus } from "@/types/budget";
import { ColumnSelector } from "@/components/ui/column-selector";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { DndColumnProvider } from "@/components/ui/dnd-column-provider";
import { useColumnOrder } from "@/hooks/use-column-order";
import {
  BudgetColumnId,
  budgetColumns,
  budgetColumnGroups,
  defaultVisibleBudgetColumns,
  BUDGET_COLUMNS_LOCALSTORAGE_KEY,
  BUDGET_COLUMN_ORDER_LOCALSTORAGE_KEY,
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { getOrderedVisibleColumns, handleReorder } = useColumnOrder<BudgetColumnId>({
    storageKey: BUDGET_COLUMN_ORDER_LOCALSTORAGE_KEY,
    columns: budgetColumns,
  });

  const orderedVisibleColumns = getOrderedVisibleColumns(visibleColumns);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
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

  // Build header map
  const headerMap: Record<BudgetColumnId, React.ReactNode> = {
    activity: (
      <SortableTableHeader
        key="activity"
        id="activity"
        className="cursor-pointer hover:bg-muted/80 transition-colors min-w-[300px] max-w-[500px]"
        onClick={() => onSort("activity")}
      >
        <div className="flex items-center gap-1">
          <span>Activity Title</span>
          {getSortIcon("activity", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    reportingOrganisation: (
      <SortableTableHeader
        key="reportingOrganisation"
        id="reportingOrganisation"
        className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
      >
        <span>Reporting Org</span>
      </SortableTableHeader>
    ),
    periodStart: (
      <SortableTableHeader
        key="periodStart"
        id="periodStart"
        className="cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => onSort("period_start")}
      >
        <div className="flex items-center gap-1">
          <span>Start Date</span>
          {getSortIcon("period_start", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    periodEnd: (
      <SortableTableHeader
        key="periodEnd"
        id="periodEnd"
        className="cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => onSort("period_end")}
      >
        <div className="flex items-center gap-1">
          <span>End Date</span>
          {getSortIcon("period_end", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    type: (
      <SortableTableHeader
        key="type"
        id="type"
        className="cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => onSort("type")}
      >
        <div className="flex items-center gap-1">
          <span>Type</span>
          {getSortIcon("type", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    status: (
      <SortableTableHeader
        key="status"
        id="status"
        className="cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => onSort("status")}
      >
        <div className="flex items-center gap-1">
          <span>Status</span>
          {getSortIcon("status", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    value: (
      <SortableTableHeader
        key="value"
        id="value"
        className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => onSort("value")}
      >
        <div className="flex items-center justify-end gap-1">
          <span>Currency Value</span>
          {getSortIcon("value", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    valueDate: (
      <SortableTableHeader
        key="valueDate"
        id="valueDate"
        className="cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => onSort("value_date")}
      >
        <div className="flex items-center gap-1">
          <span>Value Date</span>
          {getSortIcon("value_date", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    valueUsd: (
      <SortableTableHeader
        key="valueUsd"
        id="valueUsd"
        className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => onSort("value_usd")}
      >
        <div className="flex items-center justify-end gap-1">
          <span>USD Value</span>
          {getSortIcon("value_usd", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
  };

  return (
    <TooltipProvider>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <th className="h-12 px-4 text-center align-middle w-10">
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
              </th>
              <DndColumnProvider items={orderedVisibleColumns} onReorder={handleReorder}>
                {orderedVisibleColumns.map((colId) => headerMap[colId])}
              </DndColumnProvider>
              <th className="h-12 px-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => {
              const budgetId = budget.id;
              const isExpanded = expandedRows.has(budgetId);
              const isSelected = selectedIds?.has(budgetId) || false;
              const activityTitle = budget.activity?.title_narrative || budget.activity?.title || 'Untitled Activity';

              // Build cell map
              const cellMap: Record<BudgetColumnId, React.ReactNode> = {
                activity: (
                  <TableCell key="activity" className="py-3 px-4 min-w-[300px] max-w-[500px]">
                    <span
                      className="group/title cursor-pointer hover:opacity-75"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (budget.activity_id) {
                          window.location.href = `/activities/${budget.activity_id}`;
                        }
                      }}
                    >
                      <span className="text-sm font-medium text-foreground">{activityTitle}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          copyToClipboard(activityTitle, `${budgetId}-title`);
                        }}
                        className="opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 hover:text-gray-700 inline-flex align-middle ml-1"
                        title="Copy Activity Title"
                      >
                        {copiedId === `${budgetId}-title` ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </span>
                    {budget.activity?.iati_identifier && (
                      <span className="group/iati whitespace-nowrap">
                        <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-2 inline-block align-middle">
                          {budget.activity.iati_identifier}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            copyToClipboard(budget.activity!.iati_identifier!, `${budgetId}-iati`);
                          }}
                          className="opacity-0 group-hover/iati:opacity-100 transition-opacity duration-200 hover:text-gray-700 inline-flex align-middle ml-1"
                          title="Copy IATI Identifier"
                        >
                          {copiedId === `${budgetId}-iati` ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>
                    )}
                  </TableCell>
                ),
                reportingOrganisation: (
                  <TableCell key="reportingOrganisation" className="py-3 px-4">
                    {budget.activity?.reporting_org ? (
                      <div className="flex items-center gap-2">
                        <OrganizationLogo
                          logo={budget.activity.reporting_org.logo}
                          name={budget.activity.reporting_org.name}
                          size="sm"
                        />
                        <span className="text-sm text-foreground whitespace-nowrap">
                          {budget.activity.reporting_org.acronym || budget.activity.reporting_org.name || '—'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ),
                periodStart: (
                  <TableCell key="periodStart" className="py-3 px-4 whitespace-nowrap">
                    {formatDate(budget.period_start)}
                  </TableCell>
                ),
                periodEnd: (
                  <TableCell key="periodEnd" className="py-3 px-4 whitespace-nowrap">
                    {formatDate(budget.period_end)}
                  </TableCell>
                ),
                type: (
                  <TableCell key="type" className="py-3 px-4 whitespace-nowrap text-sm text-foreground">
                    {getBudgetTypeLabel(budget.type)}
                  </TableCell>
                ),
                status: (
                  <TableCell key="status" className="py-3 px-4 whitespace-nowrap text-sm text-foreground">
                    {getBudgetStatusLabel(budget.status)}
                  </TableCell>
                ),
                value: (
                  <TableCell key="value" className="py-3 px-4 text-right whitespace-nowrap">
                    {budget.value != null ? formatCurrency(budget.value, budget.currency) : '—'}
                  </TableCell>
                ),
                valueDate: (
                  <TableCell key="valueDate" className="py-3 px-4 whitespace-nowrap">
                    {formatDate(budget.value_date)}
                  </TableCell>
                ),
                valueUsd: (
                  <TableCell key="valueUsd" className="py-3 px-4 text-right whitespace-nowrap">
                    {budget.value_usd != null ? (
                      <span className="font-medium">
                        {formatCurrency(budget.value_usd, 'USD')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ),
              };

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

                    {orderedVisibleColumns.map((colId) => cellMap[colId])}

                    {/* Actions - same layout as activities list */}
                    <TableCell className="px-2 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                      <BudgetActionMenu
                        budgetId={budgetId}
                        onEdit={onEdit ? () => onEdit(budget) : undefined}
                        onDelete={onDelete ? () => onDelete(budgetId) : undefined}
                      />
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
