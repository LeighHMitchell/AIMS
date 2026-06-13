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
import { apiFetch } from '@/lib/api-fetch';
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
  aidType: string;
  aidTypeName: string;
  aidTypeDisplay: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
}

interface AidTypeChartProps {
  filters: AnalyticsFilters;
  onDataChange?: (data: any[]) => void;
}

export const AidTypeChart: React.FC<AidTypeChartProps> = ({
  filters,
  onDataChange,
}) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const tableMode = useChartCardTableMode();
  const isExpanded = useChartExpansion();

  useEffect(() => {
    fetchChartData();
  }, [filters]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        donor: filters.donor,
        financeType: filters.financeType,
        flowType: filters.flowType,
        topN: filters.topN,
      });

      const response = await apiFetch(`/api/analytics/aid-type?${queryParams}`);
      
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
        aidTypeDisplay: `${item.aidType} - ${item.aidTypeName}`
      }));
      setData(dataWithDisplay);
      setCurrency(result.currency || 'USD');
      onDataChange?.(dataWithDisplay);
    } catch (error) {
      console.error('Error fetching aid type chart data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load aid type data');
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

  const formatTooltipValue = (value: number) => {
    return `${currency} ${value.toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const rows: any[] = payload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipValue(entry.value),
        color: entry.color || entry.fill,
      }));
      if (payload.length >= 3) {
        const rate = data?.budget > 0
          ? ((data.totalSpending / data.budget) * 100).toFixed(1)
          : '0';
        rows[rows.length - 1].bordered = true;
        rows.push({ label: 'Execution Rate', value: `${rate}%` });
      }
      return (
        <ChartTooltipCard
          title={data?.aidTypeName || label}
          subtitle={data?.aidType ? `Code: ${data.aidType}` : undefined}
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

  // X-axis tick — aid-type code as a monospace gray badge, inline before the
  // name, wrapping as one centred block (avoids overlap).
  const AidXTick = ({ x, y, payload }: any) => {
    const item = data.find((d: any) => d.aidTypeDisplay === payload.value)
    const code = item?.aidType || ''
    const name = item?.aidTypeName || String(payload.value)
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
      <>
      <ResponsiveContainer width="100%" height={isExpanded ? 480 : 300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
            dataKey="aidTypeDisplay"
            stroke={CHART_STRUCTURE_COLORS.axis}
            height={76}
            interval={0}
            tick={<AidXTick />}
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

      {isExpanded && (
      <div className="mt-6">
        <p className="text-body text-muted-foreground leading-relaxed">
          This chart compares planned budgets against actual spending (disbursements and expenditures)
          broken down by IATI aid type: budget support, project aid, technical assistance and so on.
          Use it to see which delivery modalities dominate the portfolio and where commitments are or
          aren&apos;t translating into spend: a tall budget bar with little disbursement signals aid that
          is pledged but not yet flowing through that modality. All amounts are USD.
        </p>
      </div>
      )}
      </>
      )}
    </div>
  );
};