"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  getTransactionTypeColor as getCentralTransactionTypeColor,
  DATA_COLORS,
  BUDGET_COLOR,
  PLANNED_DISBURSEMENT_COLOR,
  TOTAL_SPENDING_COLOR,
} from '@/lib/chart-colors';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  DollarSign,
  CalendarClock,
  BarChart3,
  Maximize2,
  HelpCircle,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Briefcase,
  X,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
  sortableHeaderClasses,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api-fetch';
import { formatCurrencyCompact, formatCurrencyPrecise, formatAxisCurrency } from '@/lib/format';
import { exportChartToCSV } from '@/lib/chart-export';
import { Download } from 'lucide-react';

interface BudgetTrendPoint {
  /** Starting calendar year of the fiscal period (sorting/keys only) */
  year: number;
  /** Display label for the fiscal period, e.g. "CY2025" or "AU FY2024-25" */
  label: string;
  amount: number;
}

interface TransactionTrendPoint {
  month: string;
  count: number;
  amount: number;
  types?: Record<string, number>;
  typeAmounts?: Record<string, number>;
}

// Transaction type labels (IATI Standard v2.03)
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge',
};

// Small grey monospace chip for an IATI code, consistent with how codes are
// presented throughout the app (e.g. the sector tooltip).
function CodeChip({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-mono rounded px-1.5 py-0.5 shrink-0">
      {code}
    </span>
  );
}

interface SectorBreakdown {
  code: string;
  name: string;
  percentage: number;
  activityCount: number;
  totalBudget: number;
  totalPlannedDisbursements: number;
  totalDisbursements: number;
}

interface HeroStatsData {
  totalActivities: number;
  unpublishedCount: number;
  pendingValidationCount: number;
  validatedCount: number;
  budgetTrend: BudgetTrendPoint[];
  plannedBudgetTrend: BudgetTrendPoint[];
  transactionTrend: TransactionTrendPoint[];
  sectorBreakdown: SectorBreakdown[];
}

interface HeroVisualizationCardsProps {
  organizationId: string;
}

// Color palette
const BAR_COLORS = ['#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8'];
const SECTOR_COLORS = ['#4c5568', '#7b95a7', '#dc2625', '#cfd0d5', '#64748b', '#94a3b8', '#334155', '#475569'];

// Explanatory text for each card — shown in the collapsed help tooltip AND
// below the chart in the expanded modal (consistent with the Analytics Dashboard).
const CARD_DESCRIPTIONS = {
  budgets:
    "Total budget amounts (converted to USD) across all your organisation's activities, grouped by your organisation's default financial year. Budgets spanning a financial-year boundary are split proportionally by the number of days in each period.",
  planned:
    "Total planned disbursement amounts (converted to USD) across all your organisation's activities, grouped by your organisation's default financial year. Disbursements spanning a financial-year boundary are split proportionally by the number of days in each period.",
  transactions:
    "Total transaction values (converted to USD) by IATI transaction type, grouped by your organisation's default financial year (each transaction falls into the financial year containing its date). Includes all transactions where your organisation is the reporter, provider, or receiver.",
  sectors:
    "Top-level sector categories (DAC 3-digit) across your organisation's ongoing activities. Use the metric toggle to size bars by budget, planned disbursements, or number of activities. All financial figures are in USD.",
} as const;

// Transaction-type color resolves through the single source of truth in
// @/lib/chart-colors. The legacy (typeCode, index) signature is preserved so
// existing call sites are untouched; the index argument is now ignored — the
// color is keyed off the transaction type itself, consistent app-wide.
const getTransactionTypeColor = (typeCode: string, _index: number): string => {
  return getCentralTransactionTypeColor(typeCode);
};

const getUniqueTransactionTypes = (transactionTrend: TransactionTrendPoint[]): string[] => {
  const typeSet = new Set<string>();
  transactionTrend.forEach(point => {
    if (point.typeAmounts) {
      Object.keys(point.typeAmounts).forEach(type => typeSet.add(type));
    } else if (point.types) {
      Object.keys(point.types).forEach(type => typeSet.add(type));
    }
  });
  return Array.from(typeSet).sort((a, b) => parseInt(a) - parseInt(b));
};

const transformDataForValueChart = (
  transactionTrend: TransactionTrendPoint[],
  uniqueTypes: string[]
): any[] => {
  return transactionTrend.map(point => {
    const transformed: any = {
      month: point.month,
      amount: point.amount,
    };
    uniqueTypes.forEach(type => {
      transformed[`type_${type}`] = point.typeAmounts?.[type] || 0;
    });
    return transformed;
  });
};

// Aggregate/headline values are USD-converted (see chart labels "(USD)").
const formatCurrency = (value: number): string => formatCurrencyCompact(value);
const formatCurrencyFull = (value: number): string => formatCurrencyPrecise(value);

type ViewMode = 'bar' | 'line' | 'table';

// Shared Period / Amount tooltip for the budget & planned-disbursement trends.
const periodAmountTooltipContent = (expanded: boolean) =>
  ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as BudgetTrendPoint;
      const textCls = expanded ? 'text-body' : 'text-helper';
      return (
        <div className={`bg-white border border-border rounded shadow-lg ${textCls} p-0 overflow-hidden`}>
          <table className="border-collapse">
            <thead className="bg-surface-muted">
              <tr className="bg-surface-muted">
                <th className="px-3 py-1.5 text-left font-medium text-foreground">Period</th>
                <th className="px-3 py-1.5 text-right font-medium text-foreground">Amount (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-1.5 text-muted-foreground">{point.label}</td>
                <td className="px-3 py-1.5 text-right font-medium">{formatCurrencyFull(point.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  };

/**
 * Budget / planned-disbursement trend renderer, shared between the collapsed
 * sparkline (expanded=false → always a compact bar chart, no axes, no toggles)
 * and the expanded modal (expanded=true → honours the bar/line/table toggle and
 * shows full axes).
 */
function TrendChart({
  data,
  mode,
  color,
  expanded,
  emptyLabel,
}: {
  data: BudgetTrendPoint[];
  mode: ViewMode;
  color: string;
  expanded: boolean;
  emptyLabel: string;
}) {
  // Sort state for the table view (chronological by default).
  const [sortField, setSortField] = useState<'label' | 'amount'>('label');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (field: 'label' | 'amount') => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-body">
        {emptyLabel}
      </div>
    );
  }

  if (mode === 'table') {
    const sorted = [...data].sort((a, b) => {
      const cmp = sortField === 'amount'
        ? (a.amount || 0) - (b.amount || 0)
        : a.year - b.year; // chronological order backs the "Period" column
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return (
      <div className="h-full overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={sortableHeaderClasses} onClick={() => toggleSort('label')}>
                <span className="flex items-center gap-1">Period {getSortIcon('label', sortField, sortDir)}</span>
              </TableHead>
              <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => toggleSort('amount')}>
                <span className="flex items-center gap-1 justify-end">Amount (USD) {getSortIcon('amount', sortField, sortDir)}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((point) => (
              <TableRow key={point.year}>
                <TableCell>{point.label}</TableCell>
                <TableCell className="text-right">{formatCurrencyFull(point.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const margin = expanded
    ? { top: 20, right: 30, left: 20, bottom: 20 }
    : { top: 4, right: 4, left: 0, bottom: 0 };
  const tooltip = <Tooltip content={periodAmountTooltipContent(expanded)} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      {mode === 'line' ? (
        <LineChart data={data} margin={margin}>
          {expanded && <XAxis dataKey="label" tick={{ fontSize: 12 }} />}
          {expanded && <YAxis tickFormatter={(v) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />}
          {tooltip}
          <Line type="monotone" dataKey="amount" stroke={color} strokeWidth={2} dot={expanded ? { r: 4 } : false} name="Amount (USD)" />
        </LineChart>
      ) : (
        <BarChart data={data} margin={margin}>
          {expanded && <XAxis dataKey="label" tick={{ fontSize: 12 }} />}
          {expanded && <YAxis tickFormatter={(v) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />}
          {tooltip}
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill={color} name="Amount (USD)" />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

function ChartHelpIcon({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-body">{text}</p>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

/** Bar / line / table toggle — lives only inside the expanded modal toolbar. */
function ChartViewToggle({ mode, setMode }: { mode: ViewMode; setMode: (m: ViewMode) => void }) {
  const active = 'bg-muted text-foreground font-semibold';
  const inactive = 'text-muted-foreground hover:bg-muted';
  return (
    <div className="flex gap-0.5">
      <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${mode === 'bar' ? active : inactive}`} title="Bar chart" onClick={() => setMode('bar')}>
        <BarChart3 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${mode === 'line' ? active : inactive}`} title="Line chart" onClick={() => setMode('line')}>
        <LineChartIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${mode === 'table' ? active : inactive}`} title="Table" onClick={() => setMode('table')}>
        <TableIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** CSV download button for the expanded modal toolbar. */
function CsvButton({ onExport }: { onExport: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted" title="Export CSV" onClick={onExport}>
      <Download className="h-4 w-4" />
    </Button>
  );
}

/**
 * Collapsed hero card chrome: title + help icon + headline value + an
 * always-visible expand button (the only control in collapsed mode). All
 * toggles / filters / CSV live in the expanded modal.
 */
function HeroCardShell({
  title,
  description,
  headline,
  onExpand,
  children,
}: {
  title: string;
  description: string;
  headline: React.ReactNode;
  onExpand: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-white relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 z-10 text-muted-foreground hover:bg-muted"
        onClick={onExpand}
        title="Expand to full screen"
        aria-label="Expand to full screen"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
      <CardHeader className="pb-2">
        <div className="text-body font-medium text-muted-foreground flex items-center gap-2 pr-8">
          {title}
          <ChartHelpIcon text={description} />
        </div>
        <div className="text-2xl font-bold text-foreground leading-tight">{headline}</div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">{children}</CardContent>
    </Card>
  );
}

/** Wide chart-expand modal — header auto-shades (bg-surface-muted) and holds the
 * toolbar; explanatory text sits below the chart. Matches the Analytics Dashboard. */
function ExpandedChartModal({
  open,
  onClose,
  title,
  description,
  toolbar,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent chart className="max-w-[1100px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{title}</DialogTitle>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted flex-shrink-0" onClick={onClose} title="Close" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        {/* Toolbar sits on its own row below the header and above the chart,
            matching the Analytical Dashboard (chart/table toggle + CSV on the right). */}
        {toolbar && (
          <div className="flex items-center justify-end gap-1 border-b border-border pb-3">
            {toolbar}
          </div>
        )}
        <div className="h-[440px]">{children}</div>
        <DialogDescription className="mt-1">{description}</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

export function HeroVisualizationCards({ organizationId }: HeroVisualizationCardsProps) {
  const [data, setData] = useState<HeroStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [budgetViewMode, setBudgetViewMode] = useState<ViewMode>('bar');
  const [plannedViewMode, setPlannedViewMode] = useState<ViewMode>('bar');
  const [transactionsViewMode, setTransactionsViewMode] = useState<ViewMode>('bar');
  // Sort state for the expanded transactions table. Field is 'month', 'total',
  // or 'type_<code>'; default chronological (month asc, mirroring the API order).
  const [txTableSortField, setTxTableSortField] = useState<string>('month');
  const [txTableSortDir, setTxTableSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleTxSort = (field: string) => {
    if (txTableSortField === field) setTxTableSortDir(txTableSortDir === 'asc' ? 'desc' : 'asc');
    else { setTxTableSortField(field); setTxTableSortDir('asc'); }
  };
  const [sectorsMetric, setSectorsMetric] = useState<'budget' | 'planned' | 'activities'>('budget');
  const transactionChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiFetch(`/api/dashboard/org-hero-stats?organizationId=${organizationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch hero stats');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('[HeroVisualizationCards] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <p className="text-body text-destructive">Failed to load visualization data: {error}</p>
      </div>
    );
  }

  const totalBudget = data?.budgetTrend?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalPlanned = data?.plannedBudgetTrend?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalTransactionValue = data?.transactionTrend?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalSectors = data?.sectorBreakdown?.length || 0;

  // Sector metric accessor (shared by the collapsed bar and the expanded view).
  const getSectorMetric = (s: SectorBreakdown) =>
    sectorsMetric === 'budget' ? s.totalBudget
    : sectorsMetric === 'planned' ? s.totalPlannedDisbursements
    : s.activityCount;
  const formatSectorMetric = (value: number) =>
    sectorsMetric === 'activities' ? `${value}` : formatCurrencyFull(value);

  // Collapsed transactions sparkline: stacked bars by type, no axes, with the
  // same cursor-anchored portal tooltip used previously.
  const renderTransactionSparkline = () => {
    if (!data?.transactionTrend || data.transactionTrend.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground text-body">
          No transaction data
        </div>
      );
    }
    const uniqueTypes = getUniqueTransactionTypes(data.transactionTrend);
    const hasTypeData = uniqueTypes.length > 0;
    const chartData = hasTypeData
      ? transformDataForValueChart(data.transactionTrend, uniqueTypes)
      : data.transactionTrend;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          {/* Hidden category axis: without a dataKey Recharts passes the row
              INDEX as the tooltip `label`, breaking the month lookup below
              (the cause of the all-$0 hover). `hide` keeps the sparkline clean. */}
          <XAxis dataKey="month" hide />
          <Tooltip
            wrapperStyle={{ visibility: 'hidden' }}
            cursor={{ fill: 'rgba(15,23,42,0.04)' }}
            content={(props) => {
              const { active, payload, label, coordinate } = props as { active?: boolean; payload?: unknown[]; label?: string | number; coordinate?: { x: number; y: number } };
              if (!active || !payload || !payload.length || typeof document === 'undefined') return null;
              const dataPoint = data.transactionTrend.find(t => t.month === label);
              const chartEl = transactionChartRef.current;
              if (!chartEl) return null;
              const rect = chartEl.getBoundingClientRect();
              const cursorX = coordinate?.x ?? 0;
              const cursorY = coordinate?.y ?? 0;
              const topPx = rect.top + Math.max(0, cursorY - 8);
              const leftPx = rect.left + cursorX + 12;
              return createPortal(
                <div style={{ position: 'fixed', top: topPx, left: leftPx, zIndex: 9999, pointerEvents: 'none' }}>
                  <div className="bg-white border border-border rounded shadow-lg text-helper p-0 overflow-hidden">
                    <table className="border-collapse">
                      <thead className="bg-surface-muted">
                        <tr className="bg-surface-muted">
                          <th className="px-3 py-1.5 text-left font-medium text-foreground whitespace-nowrap">{label}</th>
                          <th className="px-3 py-1.5 text-right font-medium text-foreground whitespace-nowrap">{formatCurrency(dataPoint?.amount || 0)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataPoint?.typeAmounts && Object.entries(dataPoint.typeAmounts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([type, amount]) => (
                            <tr key={type} className="border-t border-border">
                              <td className="px-3 py-1 whitespace-nowrap">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: getTransactionTypeColor(type, uniqueTypes.indexOf(type)) }} />
                                  {TRANSACTION_TYPE_LABELS[type] || `Type ${type}`}
                                </span>
                              </td>
                              <td className="px-3 py-1 text-right font-medium whitespace-nowrap">{formatCurrency(amount)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>,
                document.body,
              );
            }}
          />
          {hasTypeData ? (
            uniqueTypes.map((type, index) => (
              <Bar key={type} dataKey={`type_${type}`} fill={getTransactionTypeColor(type, index)} radius={[2, 2, 0, 0]} name={TRANSACTION_TYPE_LABELS[type] || `Type ${type}`} />
            ))
          ) : (
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill={BAR_COLORS[0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Expanded transactions chart (honours the bar/line/table toggle).
  const renderTransactionExpanded = () => {
    const uniqueTypes = data?.transactionTrend ? getUniqueTransactionTypes(data.transactionTrend) : [];
    const hasTypeData = uniqueTypes.length > 0;
    const chartData = hasTypeData && data?.transactionTrend
      ? transformDataForValueChart(data.transactionTrend, uniqueTypes)
      : data?.transactionTrend || [];

    const expandedTransactionTooltip = (
      <Tooltip
        content={({ active, payload, label }) => {
          if (active && payload && payload.length && data?.transactionTrend) {
            const dataPoint = data.transactionTrend.find(t => t.month === label);
            return (
              <div className="bg-white border border-border rounded shadow-lg text-body p-0 overflow-hidden">
                <table className="border-collapse w-full">
                  <thead className="bg-surface-muted">
                    <tr className="bg-surface-muted">
                      <th className="px-3 py-1.5 text-left font-medium" colSpan={2}>{label}</th>
                    </tr>
                    <tr className="bg-surface-muted border-b border-border">
                      <th className="px-3 py-1 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-3 py-1 text-right font-medium text-muted-foreground">USD Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataPoint?.typeAmounts && Object.entries(dataPoint.typeAmounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, amount]) => (
                        <tr key={type} className="border-t border-border">
                          <td className="px-3 py-1">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: getTransactionTypeColor(type, uniqueTypes.indexOf(type)) }} />
                              {TRANSACTION_TYPE_LABELS[type] || `Type ${type}`}
                            </span>
                          </td>
                          <td className="px-3 py-1 text-right font-medium">{formatCurrency(amount)}</td>
                        </tr>
                      ))}
                    <tr className="border-t-2 border-input">
                      <td className="px-3 py-1.5 font-semibold">Total</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{formatCurrency(dataPoint?.amount || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          }
          return null;
        }}
      />
    );

    if (transactionsViewMode === 'table') {
      const sortedRows = [...(data?.transactionTrend || [])].sort((a, b) => {
        let cmp = 0;
        if (txTableSortField === 'month') {
          cmp = a.month.localeCompare(b.month);
        } else if (txTableSortField === 'total') {
          cmp = (a.amount || 0) - (b.amount || 0);
        } else if (txTableSortField.startsWith('type_')) {
          const type = txTableSortField.slice(5);
          cmp = (a.typeAmounts?.[type] || 0) - (b.typeAmounts?.[type] || 0);
        }
        return txTableSortDir === 'asc' ? cmp : -cmp;
      });
      return (
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={sortableHeaderClasses} onClick={() => toggleTxSort('month')}>
                  <span className="flex items-center gap-1">Period {getSortIcon('month', txTableSortField, txTableSortDir)}</span>
                </TableHead>
                {uniqueTypes.map(type => (
                  <TableHead key={type} className={`text-right ${sortableHeaderClasses}`} onClick={() => toggleTxSort(`type_${type}`)}>
                    <span className="flex items-center gap-1.5 justify-end">
                      <CodeChip code={type} />
                      {TRANSACTION_TYPE_LABELS[type] || `Type ${type}`}
                      {getSortIcon(`type_${type}`, txTableSortField, txTableSortDir)}
                    </span>
                  </TableHead>
                ))}
                <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => toggleTxSort('total')}>
                  <span className="flex items-center gap-1 justify-end">Total {getSortIcon('total', txTableSortField, txTableSortDir)}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((point) => (
                <TableRow key={point.month}>
                  <TableCell>{point.month}</TableCell>
                  {uniqueTypes.map(type => (
                    <TableCell key={type} className="text-right">{formatCurrency(point.typeAmounts?.[type] || 0)}</TableCell>
                  ))}
                  <TableCell className="text-right font-medium">{formatCurrency(point.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        {transactionsViewMode === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
            {expandedTransactionTooltip}
            {hasTypeData ? (
              uniqueTypes.map((type, index) => (
                <Bar key={type} dataKey={`type_${type}`} fill={getTransactionTypeColor(type, index)} radius={[2, 2, 0, 0]} name={TRANSACTION_TYPE_LABELS[type] || `Type ${type}`} />
              ))
            ) : (
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill={BAR_COLORS[0]} />
            )}
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatAxisCurrency(v)} tick={{ fontSize: 12 }} />
            {expandedTransactionTooltip}
            {hasTypeData ? (
              uniqueTypes.map((type, index) => (
                <Line key={type} type="monotone" dataKey={`type_${type}`} stroke={getTransactionTypeColor(type, index)} strokeWidth={2} dot={{ r: 4 }} name={TRANSACTION_TYPE_LABELS[type] || `Type ${type}`} />
              ))
            ) : (
              <Line type="monotone" dataKey="amount" stroke={TOTAL_SPENDING_COLOR} strokeWidth={2} dot={{ r: 4 }} name="Transaction Value (USD)" />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
    );
  };

  // Collapsed sectors distribution bar (sized by the selected metric, default budget).
  const renderSectorBar = (compact: boolean) => {
    const sectors = data?.sectorBreakdown || [];
    if (sectors.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground text-body">
          No sector data
        </div>
      );
    }
    const totalMetric = sectors.reduce((sum, s) => sum + getSectorMetric(s), 0);
    const totalPlanned = sectors.reduce((sum, s) => sum + s.totalPlannedDisbursements, 0);
    return (
      <TooltipProvider>
        <div className={`flex ${compact ? 'h-8 rounded-lg' : 'h-10 rounded-lg'} overflow-hidden bg-muted`}>
          {sectors.map((sector, index) => {
            const pct = totalMetric > 0 ? (getSectorMetric(sector) / totalMetric) * 100 : 0;
            if (pct === 0) return null;
            const sharePct = totalPlanned > 0 ? (sector.totalPlannedDisbursements / totalPlanned) * 100 : 0;
            return (
              <UITooltip key={sector.code}>
                <TooltipTrigger asChild>
                  <div className="h-full cursor-default transition-opacity hover:opacity-80" style={{ width: `${pct}%`, backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }} />
                </TooltipTrigger>
                <TooltipContent side="top" className="p-0 overflow-hidden w-max max-w-[340px]">
                  <div className="bg-white text-helper">
                    <div className="px-3 py-1.5 bg-surface-muted font-semibold text-foreground border-b border-border flex items-start gap-1.5"><span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-mono rounded px-1.5 py-0.5 shrink-0">{sector.code}</span><span className="break-words">{sector.name}</span></div>
                    <div className="px-3 py-1 flex justify-between gap-4"><span className="text-muted-foreground whitespace-nowrap">Budget</span><span className="font-medium">{formatCurrency(sector.totalBudget)}</span></div>
                    <div className="px-3 py-1 flex justify-between gap-4"><span className="text-muted-foreground whitespace-nowrap">Planned Disbursements</span><span className="font-medium">{formatCurrency(sector.totalPlannedDisbursements)}</span></div>
                    <div className="px-3 py-1 flex justify-between gap-4"><span className="text-muted-foreground whitespace-nowrap">Disbursed</span><span className="font-medium">{formatCurrency(sector.totalDisbursements)}</span></div>
                    <div className="px-3 py-1 flex justify-between gap-4"><span className="text-muted-foreground whitespace-nowrap">Activities</span><span className="font-medium">{sector.activityCount}</span></div>
                    <div className="px-3 py-1 pb-1.5 flex justify-between gap-4 border-t border-border"><span className="text-muted-foreground whitespace-nowrap">Share of Planned Disbursements</span><span className="font-medium">{sharePct.toFixed(1)}%</span></div>
                  </div>
                </TooltipContent>
              </UITooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };

  const sectorMetricToggle = (
    <div className="flex gap-0.5">
      {([
        { key: 'budget', icon: DollarSign, title: 'Size by budget' },
        { key: 'planned', icon: CalendarClock, title: 'Size by planned disbursements' },
        { key: 'activities', icon: Briefcase, title: 'Size by number of activities' },
      ] as const).map(({ key, icon: Icon, title }) => (
        <Button
          key={key}
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${sectorsMetric === key ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'}`}
          title={title}
          onClick={() => setSectorsMetric(key)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Budgets */}
        <HeroCardShell
          title="Total Budgets"
          description={CARD_DESCRIPTIONS.budgets}
          headline={formatCurrency(totalBudget)}
          onExpand={() => setExpandedChart('budgets')}
        >
          <div className="h-14">
            <TrendChart data={data?.budgetTrend || []} mode="bar" color={BUDGET_COLOR} expanded={false} emptyLabel="No budget data" />
          </div>
        </HeroCardShell>

        {/* Card 2: Planned Disbursements */}
        <HeroCardShell
          title="Planned Disbursements"
          description={CARD_DESCRIPTIONS.planned}
          headline={formatCurrency(totalPlanned)}
          onExpand={() => setExpandedChart('planned')}
        >
          <div className="h-14">
            <TrendChart data={data?.plannedBudgetTrend || []} mode="bar" color={PLANNED_DISBURSEMENT_COLOR} expanded={false} emptyLabel="No planned data" />
          </div>
        </HeroCardShell>

        {/* Card 3: Transactions by Type */}
        <HeroCardShell
          title="Transactions by Type"
          description={CARD_DESCRIPTIONS.transactions}
          headline={formatCurrency(totalTransactionValue)}
          onExpand={() => setExpandedChart('transactions')}
        >
          <div className="h-14" ref={transactionChartRef}>
            {renderTransactionSparkline()}
          </div>
        </HeroCardShell>

        {/* Card 4: Sectors */}
        <HeroCardShell
          title="Sectors"
          description={CARD_DESCRIPTIONS.sectors}
          headline={
            <span className="flex items-baseline gap-1.5">
              {totalSectors}
              <span className="text-base font-normal text-muted-foreground">{totalSectors === 1 ? 'sector' : 'sectors'}</span>
            </span>
          }
          onExpand={() => setExpandedChart('sectors')}
        >
          <div className="h-14 flex items-center">
            <div className="w-full">{renderSectorBar(true)}</div>
          </div>
        </HeroCardShell>
      </div>

      {/* Expanded Chart Modals */}
      <ExpandedChartModal
        open={expandedChart === 'budgets'}
        onClose={() => setExpandedChart(null)}
        title="Total Budgets Over Time (USD)"
        description={CARD_DESCRIPTIONS.budgets}
        toolbar={
          <>
            <ChartViewToggle mode={budgetViewMode} setMode={setBudgetViewMode} />
            <CsvButton onExport={() => data?.budgetTrend && exportChartToCSV(data.budgetTrend.map(p => ({ Period: p.label, 'Amount (USD)': p.amount })), 'Total Budgets')} />
          </>
        }
      >
        <TrendChart data={data?.budgetTrend || []} mode={budgetViewMode} color={DATA_COLORS.budget} expanded emptyLabel="No budget data" />
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'planned'}
        onClose={() => setExpandedChart(null)}
        title="Planned Disbursements Over Time (USD)"
        description={CARD_DESCRIPTIONS.planned}
        toolbar={
          <>
            <ChartViewToggle mode={plannedViewMode} setMode={setPlannedViewMode} />
            <CsvButton onExport={() => data?.plannedBudgetTrend && exportChartToCSV(data.plannedBudgetTrend.map(p => ({ Period: p.label, 'Amount (USD)': p.amount })), 'Planned Disbursements')} />
          </>
        }
      >
        <TrendChart data={data?.plannedBudgetTrend || []} mode={plannedViewMode} color={PLANNED_DISBURSEMENT_COLOR} expanded emptyLabel="No planned data" />
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'transactions'}
        onClose={() => setExpandedChart(null)}
        title="Transaction Values by Type Over Time (USD)"
        description={CARD_DESCRIPTIONS.transactions}
        toolbar={
          <>
            <ChartViewToggle mode={transactionsViewMode} setMode={setTransactionsViewMode} />
            <CsvButton onExport={() => data?.transactionTrend && exportChartToCSV(data.transactionTrend.map(p => ({ Period: p.month, Count: p.count, 'Amount (USD)': p.amount })), 'Transactions by Type')} />
          </>
        }
      >
        {renderTransactionExpanded()}
      </ExpandedChartModal>

      <ExpandedChartModal
        open={expandedChart === 'sectors'}
        onClose={() => setExpandedChart(null)}
        title="Sector Distribution"
        description={CARD_DESCRIPTIONS.sectors}
        toolbar={
          <>
            {sectorMetricToggle}
            <CsvButton onExport={() => data?.sectorBreakdown && exportChartToCSV(data.sectorBreakdown.map(s => ({ Sector: s.name, Code: s.code, Activities: s.activityCount, 'Budget (USD)': s.totalBudget, 'Planned Disbursements (USD)': s.totalPlannedDisbursements, 'Disbursed (USD)': s.totalDisbursements })), 'Sectors')} />
          </>
        }
      >
        <div className="h-full overflow-y-auto pr-2">
          {(() => {
            const sectors = data?.sectorBreakdown || [];
            if (sectors.length === 0) {
              return <div className="h-full flex items-center justify-center text-muted-foreground text-body">No sector data</div>;
            }
            const totalMetric = sectors.reduce((sum, s) => sum + getSectorMetric(s), 0);
            return (
              <TooltipProvider>
                <div className="space-y-4">
                  {/* Single stacked bar sized by the selected metric */}
                  <div className="h-8 flex rounded-full overflow-hidden bg-muted">
                    {sectors.map((sector, index) => {
                      const pct = totalMetric > 0 ? (getSectorMetric(sector) / totalMetric) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <UITooltip key={sector.code}>
                          <TooltipTrigger asChild>
                            <div className="h-full cursor-default" style={{ width: `${pct}%`, backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="p-0 overflow-hidden">
                            <div className="bg-white text-body">
                              <div className="px-3 py-2 bg-surface-muted font-semibold text-foreground border-b border-border">{sector.name} ({sector.code})</div>
                              <div className="px-3 py-1.5 flex justify-between gap-6"><span className="text-muted-foreground">Budget (USD)</span><span className="font-medium">{formatCurrencyFull(sector.totalBudget)}</span></div>
                              <div className="px-3 py-1.5 flex justify-between gap-6"><span className="text-muted-foreground">Planned Disbursements (USD)</span><span className="font-medium">{formatCurrencyFull(sector.totalPlannedDisbursements)}</span></div>
                              <div className="px-3 py-1.5 flex justify-between gap-6"><span className="text-muted-foreground">Disbursements (USD)</span><span className="font-medium">{formatCurrencyFull(sector.totalDisbursements)}</span></div>
                              <div className="px-3 py-1.5 pb-2 flex justify-between gap-6"><span className="text-muted-foreground">Activities</span><span className="font-medium">{sector.activityCount}</span></div>
                            </div>
                          </TooltipContent>
                        </UITooltip>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="space-y-1.5">
                    {sectors.map((sector, index) => (
                      <div key={sector.code} className="flex items-center gap-2 text-body">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }} />
                        <span className="text-foreground font-medium flex-1">{sector.name}</span>
                        <span className="text-muted-foreground shrink-0">{formatSectorMetric(getSectorMetric(sector))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipProvider>
            );
          })()}
        </div>
      </ExpandedChartModal>
    </>
  );
}
