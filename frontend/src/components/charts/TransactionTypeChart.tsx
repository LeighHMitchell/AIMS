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
import { PieChartSkeleton, BarChartSkeleton } from "@/components/ui/skeleton-loader";
import { apiFetch } from '@/lib/api-fetch';

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

  // Custom color palette: Primary Scarlet, Blue Slate, Cool Steel, Pale Slate, Platinum
  const COLORS = ['#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8'];

  const formatValue = (value: number) => {
    if (metric === 'value') {
      if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)}B`;
      } else if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
      }
      return value.toLocaleString();
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-[#cfd0d5] rounded-lg shadow-lg min-w-[220px]">
          <div className="mb-2 pb-2 border-b border-[#f1f4f8]">
            <span className="font-semibold text-[#4c5568]">{data.typeName}</span>
            <span className="ml-2 px-1.5 py-0.5 bg-[#f1f4f8] text-[#7b95a7] text-xs font-mono rounded">{data.transactionType}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-[#f1f4f8]">
                <td className="py-1.5 text-[#7b95a7] font-medium">Count</td>
                <td className="py-1.5 text-[#dc2625] font-semibold text-right">{data.count.toLocaleString()}</td>
              </tr>
              <tr className="border-b border-[#f1f4f8]">
                <td className="py-1.5 text-[#7b95a7] font-medium">Total Value</td>
                <td className="py-1.5 text-[#4c5568] font-semibold text-right">{currency} {data.totalValue.toLocaleString()}</td>
              </tr>
              <tr className="border-b border-[#f1f4f8]">
                <td className="py-1.5 text-[#7b95a7] font-medium">Average</td>
                <td className="py-1.5 text-[#4c5568] font-semibold text-right">{currency} {data.averageValue.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-[#7b95a7] font-medium">Percentage</td>
                <td className="py-1.5 text-[#4c5568] font-semibold text-right">{data.percentage.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  };

  // Compact mode renders just the chart without filters
  if (compact) {
    if (loading) {
      return <PieChartSkeleton height="100%" />;
    }
    if (error || !data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p className="text-sm">{error || 'No data available'}</p>
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
              outerRadius={70}
              innerRadius={40}
              dataKey="count"
              nameKey="typeName"
              paddingAngle={2}
              label={({ typeName, percentage }) => `${percentage.toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (loading) {
    return <PieChartSkeleton height="400px" />;
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
          <p className="text-lg font-medium">No transaction data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    displayValue: metric === 'count' ? item.count : item.totalValue
  }));

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={metric === 'count' ? "default" : "outline"}
              size="sm"
              onClick={() => setMetric('count')}
            >
              Transaction Count
            </Button>
            <Button
              variant={metric === 'value' ? "default" : "outline"}
              size="sm"
              onClick={() => setMetric('value')}
            >
              Total Value
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={chartType === 'pie' ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setChartType('pie')}
              title="Donut Chart"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setChartType('bar')}
              title="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ typeName, percentage }) => `${typeName}: ${percentage.toFixed(1)}%`}
              outerRadius={140}
              innerRadius={70}
              fill="#8884d8"
              dataKey="displayValue"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value, entry: any) => entry.payload.typeName} />
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cfd0d5" />
            <XAxis dataKey="typeName" stroke="#4c5568" fontSize={12} />
            <YAxis 
              stroke="#4c5568" 
              fontSize={12}
              tickFormatter={formatValue}
              label={{ 
                value: metric === 'count' ? 'Count' : `Value (${currency})`, 
                angle: -90, 
                position: 'insideLeft',
                fill: '#4c5568'
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="displayValue" fill="#dc2625" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};