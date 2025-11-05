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
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
}

interface FinanceTypeChartProps {
  filters: AnalyticsFilters;
}

export const FinanceTypeChart: React.FC<FinanceTypeChartProps> = ({
  filters,
}) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
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

      setData(result.data || []);
      setCurrency(result.currency || 'USD');
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
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          {data?.financeTypeName && (
            <p className="font-semibold text-gray-900 mb-1">{data.financeTypeName}</p>
          )}
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {`${entry.name}: ${formatCurrencyShort(entry.value)}`}
            </p>
          ))}
          {payload.length >= 3 && (
            <div className="border-t pt-2 mt-2">
              <p className="text-sm font-medium text-gray-700">
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading finance type data...</span>
        </div>
      </div>
    );
  }

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
      <div className="flex items-center justify-center gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm font-medium">Budget</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
          <span className="text-sm font-medium">Disbursements</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
          <span className="text-sm font-medium">Expenditures</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-sm font-medium">Total Spending</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="financeType" 
            stroke="#6B7280" 
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis 
            tickFormatter={formatYAxis} 
            stroke="#6B7280" 
            fontSize={12}
            label={{ 
              value: `Amount (${currency})`, 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Bar 
            dataKey="budget" 
            name="Budget" 
            fill="#3B82F6"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="disbursements" 
            name="Disbursements" 
            fill="#10B981"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="expenditures" 
            name="Expenditures" 
            fill="#F59E0B"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="totalSpending" 
            name="Total Spending" 
            fill="#8B5CF6"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          <strong>Showing:</strong> {filters.topN === 'all' ? 'All' : `Top ${filters.topN}`} finance types by total budget | 
          <strong> Currency:</strong> {currency} | 
          <strong> Finance Types:</strong> {data.length}
        </p>
      </div>
    </div>
  );
};