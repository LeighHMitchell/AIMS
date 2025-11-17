import React, { useState } from "react";
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
  Calendar,
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
import { Budget, BUDGET_TYPE_LABELS, BUDGET_STATUS_LABELS, BudgetType, BudgetStatus } from "@/types/budget";

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
}: BudgetTableProps) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
          <TableHeader className="bg-muted/50 border-b border-border/70">
            <TableRow>
              <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 w-10 text-center">
                {onSelectAll && selectedIds && (
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedIds.size === budgets.length && budgets.length > 0}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < budgets.length}
                      onCheckedChange={onSelectAll}
                      aria-label="Select all budgets"
                    />
                  </div>
                )}
              </TableHead>
              {variant === "full" && (
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
              <TableHead 
                className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSort("type")}
              >
                <div className="flex items-center gap-1">
                  <span>Type</span>
                  {getSortIcon("type")}
                </div>
              </TableHead>
              <TableHead 
                className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSort("status")}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {getSortIcon("status")}
                </div>
              </TableHead>
              <TableHead 
                className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSort("period_start")}
              >
                <div className="flex items-center gap-1">
                  <span>Period Start</span>
                  {getSortIcon("period_start")}
                </div>
              </TableHead>
              <TableHead 
                className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSort("period_end")}
              >
                <div className="flex items-center gap-1">
                  <span>Period End</span>
                  {getSortIcon("period_end")}
                </div>
              </TableHead>
              <TableHead
                className="text-sm font-medium text-foreground/90 py-3 px-4 text-right cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSort("value")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Amount</span>
                  {getSortIcon("value")}
                </div>
              </TableHead>
              <TableHead
                className="text-sm font-medium text-foreground/90 py-3 px-4 text-right cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSort("value_usd")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>USD Value</span>
                  {getSortIcon("value_usd")}
                </div>
              </TableHead>
              <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right">
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

                    {variant === "full" && (
                      <td className="py-3 px-4">
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
                            <div className="text-xs text-muted-foreground font-mono">
                              {budget.activity.iati_identifier}
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-muted/50">
                        {getBudgetTypeLabel(budget.type)}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-muted/50">
                        {getBudgetStatusLabel(budget.status)}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {formatDate(budget.period_start)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {formatDate(budget.period_end)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {budget.value != null ? formatCurrency(budget.value, budget.currency) : '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {budget.value_usd != null ? (
                        <span className="font-medium">
                          {formatCurrency(budget.value_usd, 'USD')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

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
                      <td colSpan={variant === "full" ? 9 : 8} className="p-6">
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

