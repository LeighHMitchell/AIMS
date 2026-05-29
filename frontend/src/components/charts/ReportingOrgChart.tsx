import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DATA_COLORS, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { AlertCircle, BarChart3, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import { ChartToolbarRow } from "@/components/ui/chart-toolbar-row";
import { ChartDataTable } from "@/components/ui/chart-data-table";
import { ChartTooltipCard } from "@/components/ui/chart-tooltip";
import { formatAxisCurrency, formatTooltipCurrency } from "@/lib/format";
import { useChartExpansion } from "@/lib/chart-expansion-context";

interface AnalyticsFilters {
  donor: string;
  aidType: string;
  financeType: string;
  flowType: string;
  timePeriod: 'year' | 'quarter';
  topN: string;
}

interface ChartDataPoint {
  organization: string;
  acronym: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
  iati_id?: string;
  org_type?: string;
}

interface ReportingOrgChartProps {
  filters: AnalyticsFilters;
  onDataChange?: (data: any[]) => void;
}

export const ReportingOrgChart: React.FC<ReportingOrgChartProps> = ({
  filters,
  onDataChange,
}) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const isExpanded = useChartExpansion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Fetch chart data whenever filters change
  useEffect(() => {
    fetchChartData();
  }, [filters]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        donor: filters.donor,
        aidType: filters.aidType,
        financeType: filters.financeType,
        flowType: filters.flowType,
        topN: filters.topN,
      });

      const response = await fetch(`/api/analytics/reporting-org?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const chartData = result.data || [];
      setData(chartData);
      setCurrency(result.currency || 'USD');
      onDataChange?.(chartData);
    } catch (error) {
      console.error('Error fetching reporting org chart data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load reporting organisation data');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return <ChartLoadingPlaceholder />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No data available</p>
          <p className="text-body">Try adjusting your filters to see results.</p>
        </div>
      </div>
    );
  }

  // Ranked largest → smallest by budget; Y-axis label prefers the acronym
  // (compact) and falls back to the full organisation name.
  const chartData = data
    .slice()
    .sort((a, b) => b.budget - a.budget)
    .map((d) => ({
      ...d,
      label: d.acronym && d.acronym !== d.organization ? d.acronym : d.organization,
    }));

  // Horizontal grouped bars — one bar per financial series, per organisation.
  // Height grows with the org count so labels never overlap when expanded.
  const barHeight = Math.max(320, chartData.length * 56);

  const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload as ChartDataPoint;
    return (
      <ChartTooltipCard
        title={row.acronym && row.acronym !== row.organization ? `${row.organization} (${row.acronym})` : row.organization}
        subtitle={row.iati_id ? (
          <code className="font-mono bg-muted px-1.5 py-0.5 rounded inline-block">{row.iati_id}</code>
        ) : undefined}
        rows={payload.map((e: any) => ({
          label: e.name,
          value: formatTooltipCurrency(Number(e.value) || 0, isExpanded),
          color: e.color || e.fill,
        }))}
      />
    );
  };

  const renderChart = () => (
    <ResponsiveContainer width="100%" height={isExpanded ? barHeight : "100%"}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
        <XAxis type="number" tickFormatter={formatAxisCurrency} tick={{ fill: CHART_STRUCTURE_COLORS.axis, fontSize: 12 }} />
        <YAxis type="category" dataKey="label" width={isExpanded ? 180 : 110} tick={{ fill: CHART_STRUCTURE_COLORS.axis, fontSize: 11 }} interval={0} />
        <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
        {isExpanded && <Legend />}
        <Bar dataKey="budget" name="Budget" fill={DATA_COLORS.budget} radius={[0, 3, 3, 0]} />
        <Bar dataKey="disbursements" name="Disbursements" fill={DATA_COLORS.disbursements} radius={[0, 3, 3, 0]} />
        <Bar dataKey="expenditures" name="Expenditures" fill={DATA_COLORS.expenditures} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="w-full h-full">
      <ChartToolbarRow csv={{ rows: chartData, title: 'Budget vs Spending by Reporting Organisation' }}>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", viewMode === 'chart' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setViewMode('chart')}
            title="Chart View"
            aria-label="Chart View"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setViewMode('table')}
            title="Table View"
            aria-label="Table View"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </ChartToolbarRow>

      {/* Collapsed always shows the chart; expanded honours the view toggle. */}
      {!isExpanded || viewMode === 'chart' ? (
        renderChart()
      ) : (
        <ChartDataTable
          rows={chartData}
          currency={currency}
          columns={[
            {
              key: 'organization',
              label: 'Organisation',
              numeric: false,
              format: (_v, row) => (
                <div className="flex flex-col">
                  <div className="font-medium text-foreground">
                    {row.organization}{(row as any).acronym && (row as any).acronym !== row.organization ? ` (${(row as any).acronym})` : ''}
                  </div>
                  {(row as any).iati_id && (
                    <div className="text-xs font-normal text-muted-foreground font-mono mt-1">
                      {(row as any).iati_id}
                    </div>
                  )}
                </div>
              ),
            },
            { key: 'org_type', label: 'Organisation Type', numeric: false, format: (v) => (v ? String(v) : '—') },
            { key: 'budget', label: 'Budget', numeric: true, currency, color: DATA_COLORS.budget },
            { key: 'disbursements', label: 'Disbursements', numeric: true, currency, color: DATA_COLORS.disbursements },
            { key: 'expenditures', label: 'Expenditures', numeric: true, currency, color: DATA_COLORS.expenditures },
            { key: 'totalSpending', label: 'Total Spending', numeric: true, currency, color: DATA_COLORS.totalSpending },
          ]}
        />
      )}

      {/* Explanatory paragraph — only in expanded view */}
      {isExpanded && (
      <div className="mt-6">
        <p className="text-body text-muted-foreground leading-relaxed">
          This chart compares each reporting organisation&apos;s planned budget against its actual spending
          (disbursements and expenditures). Use it to see which organisations report the largest portfolios
          and how fully they are executing them — a large budget with low disbursement points to commitments
          that haven&apos;t yet been delivered. Switch to table view to read the exact figures. All amounts are USD.
        </p>
      </div>
      )}
    </div>
  );
};
