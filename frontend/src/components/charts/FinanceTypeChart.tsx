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
import { formatAxisCurrency } from "@/lib/format";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ChartLoadingPlaceholder } from "@/components/ui/loading-text";
import { ChartTooltipCard } from "@/components/ui/chart-tooltip";
import { ChartCardToolbarRow, useChartCardTableMode } from "@/components/ui/inline-toolbar-buttons";
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
  financeType: string;
  financeTypeName: string;
  financeTypeDisplay: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
}

interface FinanceTypeChartProps {
  filters: AnalyticsFilters;
  onDataChange?: (data: any[]) => void;
}

export const FinanceTypeChart: React.FC<FinanceTypeChartProps> = ({
  filters,
  onDataChange,
}) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const tableMode = useChartCardTableMode();
  const isExpanded = useChartExpansion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');

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
        flowType: filters.flowType,
        topN: filters.topN,
      });

      const response = await fetch(`/api/analytics/finance-type?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Add display field combining code and name
      const dataWithDisplay = (result.data || []).map((item: ChartDataPoint) => ({
        ...item,
        financeTypeDisplay: `${item.financeType} - ${item.financeTypeName}`
      }));
      setData(dataWithDisplay);
      setCurrency(result.currency || 'USD');
      onDataChange?.(dataWithDisplay);
    } catch (error) {
      console.error('Error fetching finance type chart data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load finance type data');
    } finally {
      setLoading(false);
    }
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Format currency in short form with one decimal: 10308 -> $10.3k, 10308000 -> $10.3M
  const formatCurrencyShort = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) return '$0.0';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(value / 1_000).toFixed(1)}k`;
    return `${sign}$${value.toFixed(1)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const rows = payload.map((entry: any) => ({
        label: entry.name,
        value: formatCurrencyShort(entry.value),
        color: entry.color,
      }));
      if (payload.length >= 3 && data?.budget > 0) {
        rows.push({
          label: 'Execution Rate',
          value: `${((data.totalSpending / data.budget) * 100).toFixed(1)}%`,
        });
      }
      return (
        <ChartTooltipCard
          title={data?.financeTypeName || data?.financeTypeDisplay || ''}
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
          <p className="text-lg font-medium">No data available</p>
          <p className="text-body">Try adjusting your filters to see results.</p>
        </div>
      </div>
    );
  }

  // X-axis tick — finance-type code as a monospace gray badge, inline before
  // the name, wrapping as one centred block.
  const FinanceXTick = ({ x, y, payload }: any) => {
    const item = data.find((d: any) => d.financeTypeDisplay === payload.value)
    const code = item?.financeType || ''
    const name = item?.financeTypeName || String(payload.value)
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-70} y={6} width={140} height={72}>
          <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', lineHeight: 1.3, overflowWrap: 'break-word' }}>
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '9px', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: '3px', marginRight: '4px', whiteSpace: 'nowrap' }}>
              {code}
            </span>
            {name}
          </div>
        </foreignObject>
      </g>
    )
  }

  return (
    <div className="w-full h-full">
      <ChartCardToolbarRow />

      {!tableMode && (
      <ResponsiveContainer width="100%" height={isExpanded ? 480 : 300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
            dataKey="financeTypeDisplay"
            stroke={CHART_STRUCTURE_COLORS.axis}
            height={76}
            interval={0}
            tick={<FinanceXTick />}
          />
          <YAxis
            tickFormatter={formatAxisCurrency}
            stroke={CHART_STRUCTURE_COLORS.axis}
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          {isExpanded && <Legend />}

          <Bar 
            dataKey="budget" 
            name="Budget" 
            fill={DATA_COLORS.budget}
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="disbursements" 
            name="Disbursements" 
            fill={DATA_COLORS.disbursements}
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="expenditures" 
            name="Expenditures" 
            fill={DATA_COLORS.expenditures}
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="totalSpending" 
            name="Total Spending" 
            fill={DATA_COLORS.totalSpending}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      )}

      {isExpanded && (
      <div className="mt-6">
        <p className="text-body text-muted-foreground leading-relaxed">
          This chart compares planned budgets with actual spending (disbursements and expenditures)
          across IATI finance types such as grants, loans, equity and other instruments. Use it to understand
          the financial structure of the portfolio: how much aid is grant-based versus repayable, and
          whether spending is keeping pace with what was budgeted under each instrument. All amounts are USD.
        </p>
      </div>
      )}
    </div>
  );
};