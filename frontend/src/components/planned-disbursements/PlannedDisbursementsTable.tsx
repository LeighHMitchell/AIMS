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
  Copy,
  Check,
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
  TableHeader,
  TableRow,
  getSortIcon,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { OrganizationLogo } from "@/components/ui/organization-logo";
import { ColumnSelector } from "@/components/ui/column-selector";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { useColumnOrder } from "@/hooks/use-column-order";
import {
  PlannedDisbursementColumnId,
  plannedDisbursementColumns,
  plannedDisbursementColumnGroups,
  defaultVisiblePlannedDisbursementColumns,
  PLANNED_DISBURSEMENT_COLUMNS_LOCALSTORAGE_KEY,
  PLANNED_DISBURSEMENT_COLUMN_ORDER_LOCALSTORAGE_KEY,
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
  showDescriptions?: boolean;
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
  showDescriptions = false,
}: PlannedDisbursementsTableProps) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyIatiId = (iatiId: string, rowId: string) => {
    navigator.clipboard.writeText(iatiId);
    setCopiedId(`${rowId}-iati`);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const [usdValues, setUsdValues] = useState<Record<string, {
    usd: number | null,
    rate: number | null,
    date: string,
    loading: boolean,
    error?: string
  }>>({});

  const { getOrderedVisibleColumns, handleReorder } = useColumnOrder<PlannedDisbursementColumnId>({
    storageKey: PLANNED_DISBURSEMENT_COLUMN_ORDER_LOCALSTORAGE_KEY,
    columns: plannedDisbursementColumns,
  });

  const orderedVisibleColumns = getOrderedVisibleColumns(visibleColumns);

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

      return <><span className="text-helper text-muted-foreground">{safeCurrency}</span> {formattedValue}</>;
    } catch (error) {
      console.warn(`[PlannedDisbursementsTable] Invalid currency "${currency}", using USD:`, error);
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
      return <><span className="text-helper text-muted-foreground font-normal">USD</span> {formattedValue}</>;
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

  const formatPeriodMonth = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, "MMM yyyy");
    } catch (error) {
      return '-';
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDisbursementTypeLabel = (type: string | number) => {
    const typeStr = String(type);
    return DISBURSEMENT_TYPE_LABELS[typeStr] || typeStr;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading planned disbursements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Error loading planned disbursements: {error}</p>
      </div>
    );
  }

  if (disbursements.length === 0) {
    return <EmptyState illustration="/images/empty-hourglass.webp" message="No planned disbursements found" />;
  }

  // Build header map
  const headerMap: Record<PlannedDisbursementColumnId, React.ReactNode> = {
    activity: (
      <SortableTableHeader
        key="activity"
        id="activity"
        className="cursor-pointer hover:bg-muted/80 transition-colors data-table-col-activity min-w-0"
        onClick={() => onSort("activity")}
      >
        <div className="flex items-center gap-1">
          <span>Activity Title</span>
          {getSortIcon("activity", sortField, sortOrder)}
        </div>
      </SortableTableHeader>
    ),
    systemId: (
      <SortableTableHeader
        key="systemId"
        id="systemId"
        className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
      >
        <span>Planned Disbursement ID</span>
      </SortableTableHeader>
    ),
    period: (
      <SortableTableHeader
        key="period"
        id="period"
        className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
        onClick={() => onSort("period_start")}
      >
        <div className="flex items-center gap-1">
          <span>Period</span>
          {getSortIcon("period_start", sortField, sortOrder)}
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
    providerReceiver: (
      <SortableTableHeader
        key="providerReceiver"
        id="providerReceiver"
      >
        Provider → Receiver
      </SortableTableHeader>
    ),
    amount: (
      <SortableTableHeader
        key="amount"
        id="amount"
        className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => onSort("value")}
      >
        <div className="flex items-center justify-end gap-1">
          <span>Original Value</span>
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
    notes: (
      <SortableTableHeader
        key="notes"
        id="notes"
        className="text-center w-10"
      >
        Notes
      </SortableTableHeader>
    ),
  };

  return (
    <TooltipProvider>
      <div>
        <Table className="min-w-full data-table-balanced">
          <TableHeader>
            <TableRow>
              <th className="h-12 px-4 text-center align-middle data-table-col-checkbox">
                {onSelectAll && selectedIds && (
                  <div className="flex items-center justify-center" key={`select-all-wrapper-${disbursements.length}`}>
                    <Checkbox
                      checked={selectedIds.size === disbursements.length && disbursements.length > 0}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < disbursements.length}
                      onCheckedChange={(checked) => {
                        onSelectAll(!!checked);
                      }}
                      aria-label="Select all disbursements"
                    />
                  </div>
                )}
              </th>
                {orderedVisibleColumns.map((colId) => headerMap[colId])}
              <th className="h-12 px-2 data-table-col-actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {disbursements.map((disbursement) => {
              const disbursementId = disbursement.id;
              const isExpanded = expandedRows.has(disbursementId);
              const isSelected = selectedIds?.has(disbursementId) || false;
              const activityTitle = disbursement.activity?.title_narrative || disbursement.activity?.title || 'Untitled Activity';
              const hasNotes = !!(disbursement.notes || disbursement.description);

              // Build cell map
              const cellMap: Record<PlannedDisbursementColumnId, React.ReactNode> = {
                activity: (
                  <td key="activity" className="py-3 px-4">
                    <div
                      className="space-y-0.5 cursor-pointer hover:opacity-75 group"
                      onClick={() => {
                        if (disbursement.activity?.id) {
                          window.location.href = `/activities/${disbursement.activity.id}`;
                        }
                      }}
                    >
                      <div className="text-body">
                        {activityTitle}
                        {disbursement.activity?.iati_identifier && (
                          <>
                            <span className="text-xs font-mono font-normal bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-2 inline-block">
                              {disbursement.activity.iati_identifier}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                copyIatiId(disbursement.activity!.iati_identifier!, disbursementId);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-foreground inline-flex align-middle ml-1"
                              title="Copy IATI Identifier"
                            >
                              {copiedId === `${disbursementId}-iati` ? (
                                <Check className="w-3 h-3 text-[hsl(var(--success-icon))]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                      {showDescriptions && (disbursement.description || disbursement.notes) && (
                        <p className="text-helper text-muted-foreground mt-1 line-clamp-5">
                          {disbursement.description || disbursement.notes}
                        </p>
                      )}
                    </div>
                  </td>
                ),
                systemId: (
                  <td key="systemId" className="py-3 px-4 whitespace-nowrap">
                    {(disbursement as any).auto_ref ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          copyToClipboard((disbursement as any).auto_ref, `${disbursement.id}-systemId`);
                        }}
                        title={copiedId === `${disbursement.id}-systemId` ? "Copied!" : "Click to copy"}
                        className="text-xs font-mono font-normal bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors px-1.5 py-0.5 rounded inline-flex items-center gap-1 align-middle cursor-pointer"
                      >
                        {copiedId === `${disbursement.id}-systemId` && (
                          <Check className="w-3 h-3 text-[hsl(var(--success-icon))]" />
                        )}
                        <span>{(disbursement as any).auto_ref}</span>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ),
                period: (
                  <td key="period" className="py-3 px-4 whitespace-nowrap">
                    <span className="text-body text-muted-foreground">
                      {formatPeriodMonth(disbursement.period_start)}
                      {' — '}
                      {formatPeriodMonth(disbursement.period_end)}
                    </span>
                  </td>
                ),
                type: (
                  <td key="type" className="py-3 px-4 whitespace-nowrap">
                    {disbursement.type ? (
                      <span className="text-body">{getDisbursementTypeLabel(disbursement.type)}</span>
                    ) : (
                      <span className="text-muted-foreground text-body">—</span>
                    )}
                  </td>
                ),
                providerReceiver: (
                  <td key="providerReceiver" className="py-3 px-4">
                    {(() => {
                      const providerDisplay = disbursement.provider_org_acronym || disbursement.provider_org_name || '—';
                      const receiverDisplay = disbursement.receiver_org_acronym || disbursement.receiver_org_name || '—';

                      return (
                        <div className="text-body">
                          <div className="flex items-start gap-2">
                            {/* Provider */}
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <OrganizationLogo
                                  logo={(disbursement as any).provider_org_logo}
                                  name={providerDisplay}
                                  size="sm"
                                />
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-body">
                                      {providerDisplay}
                                    </span>
                                  </TooltipTrigger>
                                  {disbursement.provider_org_ref && (
                                    <TooltipContent side="top">
                                      <p className="text-helper">{disbursement.provider_org_ref}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </div>
                            </div>

                            <span className="text-muted-foreground mt-1">→</span>

                            {/* Receiver */}
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <OrganizationLogo
                                  logo={(disbursement as any).receiver_org_logo}
                                  name={receiverDisplay}
                                  size="sm"
                                />
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-body">
                                      {receiverDisplay}
                                    </span>
                                  </TooltipTrigger>
                                  {disbursement.receiver_org_ref && (
                                    <TooltipContent side="top">
                                      <p className="text-helper">{disbursement.receiver_org_ref}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                ),
                amount: (
                  <td key="amount" className="py-3 px-4 text-right whitespace-nowrap">
                    {(() => {
                      // Use amount (database field) or value (legacy/API field) - prefer amount
                      const amountValue = disbursement.amount ?? disbursement.value;

                      if (amountValue != null && disbursement.currency) {
                        return (
                          <div className="text-body">
                            <span className="text-muted-foreground text-helper">{disbursement.currency.toUpperCase()}</span>{' '}
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
                ),
                valueDate: (
                  <td key="valueDate" className="py-3 px-4 whitespace-nowrap">
                    {formatDate(disbursement.value_date)}
                  </td>
                ),
                valueUsd: (
                  <td key="valueUsd" className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {usdValues[disbursement.id]?.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : usdValues[disbursement.id]?.usd != null ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-body cursor-help">
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
                ),
                notes: (
                  <td key="notes" className="py-3 px-4 text-center">
                    {hasNotes && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center justify-center">
                              <NotepadText className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md text-left">
                          <p className="text-helper whitespace-pre-wrap break-words text-left">
                            {disbursement.notes || disbursement.description || 'Has notes'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  </td>
                ),
              };

              return (
                <React.Fragment key={disbursement.id}>
                  <TableRow
                    className={cn(
                      "border-b border-border/40 hover:bg-muted/30 transition-colors",
                      isSelected && "bg-blue-50 border-blue-200"
                    )}
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

                    {orderedVisibleColumns.map((colId) => cellMap[colId])}

                    {/* Actions - same layout as activities list */}
                    <td className="px-2 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                      <PlannedDisbursementActionMenu
                        disbursementId={disbursementId}
                        onEdit={onEdit ? () => onEdit(disbursement) : undefined}
                        onDelete={onDelete ? () => onDelete(disbursementId) : undefined}
                      />
                    </td>
                  </TableRow>

                  {/* Expanded Row Content */}
                  {isExpanded && (
                    <TableRow className="bg-muted/50">
                      <td colSpan={visibleColumnCount + 1} className="p-6">
                        <div className="space-y-4">
                          <h3 className="text-body font-semibold text-foreground">Details</h3>
                          <div className="grid grid-cols-2 gap-4 text-body">
                            <div>
                              <span className="text-muted-foreground">Provider Org Ref:</span>
                              <p className="font-mono text-xs mt-1">{disbursement.provider_org_ref || '—'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Receiver Org Ref:</span>
                              <p className="font-mono text-xs mt-1">{disbursement.receiver_org_ref || '—'}</p>
                            </div>
                            {disbursement.description && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Description:</span>
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
