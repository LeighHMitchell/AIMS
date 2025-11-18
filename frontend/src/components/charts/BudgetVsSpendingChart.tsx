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
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { DATA_COLORS, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";

interface AnalyticsFilters {
  donor: string;
  aidType: string;
  financeType: string;
  flowType: string;
  timePeriod: 'year' | 'quarter';
}

interface ChartDataPoint {
  period: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
}

interface BudgetVsSpendingChartProps {
  filters: AnalyticsFilters;
  onDataChange?: (data: ChartDataPoint[]) => void;
}

export const BudgetVsSpendingChart: React.FC<BudgetVsSpendingChartProps> = ({
  filters,
  onDataChange,
}) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');

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
        timePeriod: filters.timePeriod,
      });

      const response = await fetch(`/api/analytics/budget-vs-spending?${queryParams}`);
      
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
      console.error('Error fetching chart data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(2);
  };

  const formatTooltipValue = (value: number) => {
    return `${currency} ${value.toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: CHART_STRUCTURE_COLORS.tooltipBg }} className="p-4 border-0 rounded-lg shadow-lg">
          <p className="font-semibold mb-2" style={{ color: CHART_STRUCTURE_COLORS.tooltipText }}>{`Period: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: CHART_STRUCTURE_COLORS.tooltipText }}
            >
              <span style={{ color: entry.color }}>■</span> {`${entry.name}: ${formatTooltipValue(entry.value)}`}
            </p>
          ))}
          {payload.length >= 3 && (
            <div className="border-t border-slate-600 pt-2 mt-2">
              <p className="text-sm font-medium" style={{ color: CHART_STRUCTURE_COLORS.tooltipText }}>
                Execution Rate: {payload[0]?.payload?.budget > 0
                  ? ((payload[0].payload.totalSpending / payload[0].payload.budget) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading chart data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-red-600">
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
          <p className="text-sm">Try adjusting your filters to see results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 mb-6 p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: DATA_COLORS.budget }}></div>
          <span className="text-sm font-medium text-slate-700">Budget</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: DATA_COLORS.disbursements }}></div>
          <span className="text-sm font-medium text-slate-700">Disbursements</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: DATA_COLORS.expenditures }}></div>
          <span className="text-sm font-medium text-slate-700">Expenditures</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: DATA_COLORS.totalSpending }}></div>
          <span className="text-sm font-medium text-slate-700">Total Spending</span>
        </div>
      </div>

      {/* Responsive Chart Container */}
      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis
            dataKey="period"
            stroke={CHART_STRUCTURE_COLORS.axis}
            fontSize={12}
            angle={data.length > 10 ? -45 : 0}
            textAnchor={data.length > 10 ? "end" : "middle"}
            height={data.length > 10 ? 80 : 60}
          />
          <YAxis
            tickFormatter={formatYAxis}
            stroke={CHART_STRUCTURE_COLORS.axis}
            fontSize={12}
            label={{
              value: `Amount (${currency})`,
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: CHART_STRUCTURE_COLORS.axis }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Budget Bar */}
          <Bar
            dataKey="budget"
            name="Budget"
            fill={DATA_COLORS.budget}
            radius={[4, 4, 0, 0]}
          />

          {/* Disbursements Bar */}
          <Bar
            dataKey="disbursements"
            name="Disbursements"
            fill={DATA_COLORS.disbursements}
            radius={[4, 4, 0, 0]}
          />

          {/* Expenditures Bar */}
          <Bar
            dataKey="expenditures"
            name="Expenditures"
            fill={DATA_COLORS.expenditures}
            radius={[4, 4, 0, 0]}
          />

          {/* Total Spending Bar */}
          <Bar
            dataKey="totalSpending"
            name="Total Spending"
            fill={DATA_COLORS.totalSpending}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Mobile-friendly chart info */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          <strong>Period:</strong> {filters.timePeriod === 'year' ? 'Calendar Year' : 'Financial Quarter'} | 
          <strong> Currency:</strong> {currency} | 
          <strong> Data Points:</strong> {data.length}
        </p>
      </div>
    </div>
  );
};