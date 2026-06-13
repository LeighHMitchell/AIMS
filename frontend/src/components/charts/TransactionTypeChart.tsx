import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
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
import { InlineViewToggle, InlineCsvButton, useChartCardTableMode } from "@/components/ui/inline-toolbar-buttons";
import { ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS, getTransactionTypeColor, OTHERS_COLOR } from '@/lib/chart-colors';
import { formatAxisCurrency, formatTooltipCurrency } from '@/lib/format';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { useChartExpansion } from '@/lib/chart-expansion-context';

interface TransactionTypeData {
  transactionType: string;
  typeName: string;
  count: number;
  totalValue: number;
  percentage: number;
  averageValue: number;
}

interface TransactionTypeChartProps {
  filters: any;
  onDataChange?: (data: any[]) => void;
  compact?: boolean;
}

export const TransactionTypeChart: React.FC<TransactionTypeChartProps> = ({
  filters,
  onDataChange,
  compact = false,
}) => {
  const [data, setData] = useState<TransactionTypeData[]>([]);
  const tableMode = useChartCardTableMode();
  const isExpanded = useChartExpansion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [metric, setMetric] = useState<'count' | 'value'>('count');
  const [currency, setCurrency] = useState<string>('USD');

  useEffect(() => {
    fetchChartData();
  }, [filters]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/analytics/transaction-types`);
      
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
      console.error('Error fetching transaction type data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load transaction type data');
    } finally {
      setLoading(false);
    }
  };

  // Colours resolve by IATI transaction-type code through the single source
  // of truth (lib/chart-colors) so this chart matches every other
  // transaction-type chart in the app.

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const color = payload[0].color || payload[0].payload?.fill;
      return (
        <ChartTooltipCard
          title={data.typeName}
          rows={[
            { label: `# of ${data.typeName} Transactions`, value: data.count.toLocaleString(), color },
            { label: 'Total Value', value: formatTooltipCurrency(data.totalValue, isExpanded, currency) },
            { label: 'Average', value: formatTooltipCurrency(data.averageValue, isExpanded, currency) },
            { label: 'Percentage', value: `${data.percentage.toFixed(1)}%` },
          ]}
        />
      );
    }
    return null;
  };

  // Compact mode renders just the chart without filters
  if (compact) {
    if (loading) {
      return <ChartLoadingPlaceholder />;
    }
    if (error || !data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">{error || 'No data available'}</p>
        </div>
      );
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={52}
              dataKey="count"
              nameKey="typeName"
              paddingAngle={2}
              label={({ typeName, percentage }) => `${percentage.toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getTransactionTypeColor(entry.transactionType)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

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
          <p className="text-lg font-medium">No transaction data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    displayValue: metric === 'count' ? item.count : item.totalValue
  }));

  // Leader-line label for the expanded donut: bold the type name (e.g.
  // Disbursement) before the percentage. Replaces the plain-string label so
  // the legend is no longer needed.
  const renderTxLabel = (props: any) => {
    const { x, y, cx, textAnchor, typeName, percentage, transactionType } = props;
    const anchor = textAnchor || (x >= cx ? 'start' : 'end');
    const color = getTransactionTypeColor(transactionType);
    return (
      <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={12} fontWeight={700} fill={color}>
        {`${typeName} ${Number(percentage).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <ChartViewToggle
            ariaLabel="Metric"
            variant="text"
            value={metric}
            onValueChange={setMetric}
            options={[
              { value: 'count', label: 'Transaction Count' },
              { value: 'value', label: 'Total Value' },
            ]}
          />
          <ChartViewToggle
            ariaLabel="Chart type"
            variant="icon"
            value={chartType}
            onValueChange={setChartType}
            options={[
              { value: 'pie', label: 'Donut Chart', icon: PieChartIcon },
              { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
            ]}
          />
          <InlineViewToggle />
        </div>
        <InlineCsvButton />
      </div>

      {/* Chart */}
      {!tableMode && (
      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={{ stroke: '#cfd0d5' }}
              label={renderTxLabel}
              outerRadius={140}
              innerRadius={70}
              fill={OTHERS_COLOR}
              dataKey="displayValue"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getTransactionTypeColor(entry.transactionType)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis dataKey="typeName" stroke="#4c5568" fontSize={12} />
            <YAxis
              stroke="#4c5568"
              fontSize={12}
              tickFormatter={metric === 'value' ? (v: number) => formatAxisCurrency(v) : (v: number) => String(v)}
              label={{ 
                value: metric === 'count' ? 'Count' : `Value (${currency})`, 
                angle: -90, 
                position: 'insideLeft',
                fill: '#4c5568'
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="displayValue" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`bar-cell-${index}`} fill={getTransactionTypeColor(entry.transactionType)} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
      )}

      {/* Explanatory text — only in expanded view */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-6">
          This chart groups every reported transaction by its IATI transaction type (commitments, disbursements, expenditures and the rest) so you can see where financial activity is concentrated. Toggle between transaction count and total value to compare how often each type is reported against how much money it represents, and switch to the bar view to read the magnitudes directly. Disbursements are usually the clearest signal of money actually reaching the ground, so a healthy portfolio typically shows disbursements and expenditures making up a substantial share of total value.
        </p>
      )}
    </div>
  );
};