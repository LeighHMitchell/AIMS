import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  ArrowRight,
  Loader2,
  NotepadText,
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
import { PlannedDisbursementActionMenu } from "@/components/planned-disbursements/PlannedDisbursementActionMenu";
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
import { OrganizationLogo } from "@/components/ui/organization-logo";
import { ColumnSelector } from "@/components/ui/column-selector";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  PlannedDisbursementColumnId,
  plannedDisbursementColumns,
  plannedDisbursementColumnGroups,
  defaultVisiblePlannedDisbursementColumns,
  PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY,
} from "@/app/planned-disbursements/columns";

// Re-export column types for parent components
export type { PlannedDisbursementColumnId };
export { defaultVisiblePlannedDisbursementColumns, PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY, plannedDisbursementColumns, plannedDisbursementColumnGroups };

// Wrapper for backward compatibility
export const PlannedDisbursementColumnSelector = ({
  visibleColumns,
  onColumnsChange,
}: {
  visibleColumns: PlannedDisbursementColumnId[];
  onColumnsChange: (columns: PlannedDisbursementColumnId[]) => void;
}) => (
  <ColumnSelector<PlannedDisbursementColumnId>
    columns={plannedDisbursementColumns}
    visibleColumns={visibleColumns}
    defaultVisibleColumns={defaultVisiblePlannedDisbursementColumns}
    onChange={onColumnsChange}
    groupLabels={plannedDisbursementColumnGroups}
  />
);

// Backward compatibility alias
export const DEFAULT_VISIBLE_PLANNED_DISBURSEMENT_COLUMNS = defaultVisiblePlannedDisbursementColumns;

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
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
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
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("activity")}
                >
                  <div className="flex items-center gap-1">
                    <span>Activity</span>
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
              {isColumnVisible('providerReceiver') && (
                <TableHead>
                  Provider / Receiver
                </TableHead>
              )}
              {isColumnVisible('amount') && (
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort("value")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
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
              {isColumnVisible('notes') && (
                <TableHead className="text-center w-10">
                  Notes
                </TableHead>
              )}
              <TableHead className="text-right">
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
                            <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded inline-block mt-1">
                              {disbursement.activity.iati_identifier}
                            </span>
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
                      <PlannedDisbursementActionMenu
                        disbursementId={disbursementId}
                        onEdit={onEdit ? () => onEdit(disbursement) : undefined}
                        onDelete={onDelete ? () => onDelete(disbursementId) : undefined}
                      />
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
