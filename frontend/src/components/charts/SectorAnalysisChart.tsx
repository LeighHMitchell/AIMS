import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { AlertCircle, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChartViewToggle } from "@/components/ui/chart-view-toggle";
import { ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS, CHART_RANKED_PALETTE, BUDGET_COLOR, getTransactionTypeColor, OTHERS_COLOR } from '@/lib/chart-colors';
import { formatAxisCurrency, formatTooltipCurrency } from '@/lib/format';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { InlineViewToggle, InlineCsvButton, useChartCardTableMode } from "@/components/ui/inline-toolbar-buttons";
import { useChartExpansion } from "@/lib/chart-expansion-context";

interface SectorData {
  sectorCode: string;
  sectorName: string;
  activityCount: number;
  totalBudget: number;
  totalDisbursements: number;
  totalExpenditures: number;
  budgetPercentage: number;
  disbursementPercentage: number;
  expenditurePercentage: number;
}

interface SectorAnalysisChartProps {
  filters: any;
  onDataChange?: (data: any[]) => void;
}

export const SectorAnalysisChart: React.FC<SectorAnalysisChartProps> = ({
  filters,
  onDataChange,
}) => {
  const [data, setData] = useState<SectorData[]>([]);
  const tableMode = useChartCardTableMode();
  const isExpanded = useChartExpansion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('bar');
  const [metric, setMetric] = useState<'budget' | 'disbursements' | 'expenditures'>('budget');
  const [topN, setTopN] = useState<number>(10);

  useEffect(() => {
    fetchChartData();
  }, [filters, topN]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/analytics/sectors?topN=${topN}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const chartData = result.data || [];
      setData(chartData);
      onDataChange?.(chartData);
    } catch (error) {
      console.error('Error fetching sector data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load sector data');
    } finally {
      setLoading(false);
    }
  };

  // Shared monochromatic slate ramp — keeps the ranked pie breakdown
  // visually consistent with other ranked charts on the dashboard.
  const COLORS = CHART_RANKED_PALETTE;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const rows = [
        { label: 'Activities', value: String(data.activityCount), color: OTHERS_COLOR },
        { label: 'Budget', value: `${formatTooltipCurrency(data.totalBudget, isExpanded)} (${data.budgetPercentage.toFixed(1)}%)`, color: BUDGET_COLOR },
        { label: 'Disbursements', value: `${formatTooltipCurrency(data.totalDisbursements, isExpanded)} (${data.disbursementPercentage.toFixed(1)}%)`, color: getTransactionTypeColor('3') },
        { label: 'Expenditures', value: `${formatTooltipCurrency(data.totalExpenditures, isExpanded)} (${data.expenditurePercentage.toFixed(1)}%)`, color: getTransactionTypeColor('4') },
      ];
      return (
        <ChartTooltipCard
          title={
            <span className="inline-flex items-center gap-2">
              {data.sectorCode && (
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground">
                  {data.sectorCode}
                </code>
              )}
              <span>{data.sectorName}</span>
            </span>
          }
          rows={rows}
        />
      );
    }
    return null;
  };

  if (loading) {
    return <ChartLoadingPlaceholder />;
  }

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

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No sector data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => {
    let displayValue = 0;
    let displayPercentage = 0;

    switch (metric) {
      case 'budget':
        displayValue = item.totalBudget;
        displayPercentage = item.budgetPercentage;
        break;
      case 'disbursements':
        displayValue = item.totalDisbursements;
        displayPercentage = item.disbursementPercentage;
        break;
      case 'expenditures':
        displayValue = item.totalExpenditures;
        displayPercentage = item.expenditurePercentage;
        break;
    }

    return {
      ...item,
      displayValue,
      displayPercentage,
      label: item.sectorCode,
      displayName: item.sectorName // Use full sector name for X-axis
    };
  });

  // X-axis tick for the bar view — DAC code as a monospace gray badge, inline
  // before the sector name, wrapping as one centred block.
  const SectorXTick = ({ x, y, payload }: any) => {
    const item = chartData.find(d => d.displayName === payload.value);
    const code = item?.sectorCode || '';
    const name = item?.sectorName || payload.value;
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-75} y={6} width={150} height={84}>
          <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', lineHeight: 1.3, overflowWrap: 'break-word' }}>
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '9px', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: '3px', marginRight: '4px', whiteSpace: 'nowrap' }}>
              {code}
            </span>
            {name}
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <div className="w-full h-full">
      {/* Expanded controls row — one justify-between line; LEFT = Top-N + metric
          mode toggles, RIGHT = chart-type (pie/bar) + chart/table view toggle +
          Download-CSV (furthest right). Only shown when expanded. */}
      {isExpanded && (
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <ChartViewToggle
            ariaLabel="Show top N"
            variant="text"
            value={String(topN)}
            onValueChange={(v) => setTopN(Number(v))}
            options={[
              { value: '5', label: 'Top 5' },
              { value: '10', label: 'Top 10' },
              { value: '15', label: 'Top 15' },
              { value: '20', label: 'Top 20' },
            ]}
          />
          <ChartViewToggle
            ariaLabel="Metric"
            variant="text"
            value={metric}
            onValueChange={setMetric}
            options={[
              { value: 'budget', label: 'Budget' },
              { value: 'disbursements', label: 'Disbursements' },
              { value: 'expenditures', label: 'Expenditures' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <ChartViewToggle
            ariaLabel="Chart type"
            variant="icon"
            value={chartType}
            onValueChange={setChartType}
            options={[
              { value: 'pie', label: 'Pie Chart', icon: PieChartIcon },
              { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
            ]}
          />
          <InlineViewToggle />
          <InlineCsvButton />
        </div>
      </div>
      )}

      {/* Chart */}
      {!tableMode && (
      <ResponsiveContainer width="100%" height={isExpanded ? 480 : 300}>
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ sectorName, displayPercentage }) =>
                `${sectorName}: ${displayPercentage.toFixed(1)}%`
              }
              outerRadius={150}
              fill={OTHERS_COLOR}
              dataKey="displayValue"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {isExpanded && <Legend />}
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis
              dataKey="displayName"
              stroke={CHART_STRUCTURE_COLORS.axis}
              height={90}
              interval={0}
              tick={<SectorXTick />}
            />
            <YAxis
              stroke={CHART_STRUCTURE_COLORS.axis}
              fontSize={12}
              tickFormatter={formatAxisCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="displayValue" fill="#4c5568" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      )}

      {/* Explanatory paragraph — only in expanded view */}
      {isExpanded && (
      <div className="mt-6">
        <p className="text-body text-muted-foreground leading-relaxed">
          This chart shows how activity funding is distributed across DAC sectors, ranked by the selected
          metric. Use it to see which sectors absorb the most resources and where coverage is thin. The
          pie view emphasises each sector&apos;s share of the whole, while the bar view makes absolute
          values easy to compare. Switch the Top-N control to widen or narrow the field, and use the
          metric toggle to compare how budgets, disbursements and expenditures are spread across sectors.
        </p>
      </div>
      )}
    </div>
  );
};