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
import { Loader2, AlertCircle, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
}

export const TransactionTypeChart: React.FC<TransactionTypeChartProps> = ({
  filters,
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

      const response = await fetch(`/api/analytics/transaction-types`);
      
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
      console.error('Error fetching transaction type data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load transaction type data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#64748b', '#475569', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

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
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.typeName}</p>
          <p className="text-xs text-gray-600 mb-2">Code: {data.transactionType}</p>
          <p className="text-sm text-blue-600">Count: {data.count}</p>
          <p className="text-sm text-green-600">Total Value: {currency} {data.totalValue.toLocaleString()}</p>
          <p className="text-sm text-purple-600">Average: {currency} {data.averageValue.toLocaleString()}</p>
          <p className="text-sm text-orange-600">Percentage: {data.percentage.toFixed(1)}%</p>
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
          <span>Loading transaction type data...</span>
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Metric:</span>
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
          <span className="text-sm font-medium">Chart Type:</span>
          <div className="flex gap-1">
            <Button
              variant={chartType === 'pie' ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType('pie')}
            >
              <PieChartIcon className="h-4 w-4 mr-1" />
              Pie
            </Button>
            <Button
              variant={chartType === 'bar' ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Bar
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
              label={({ transactionType, percentage }) => `${transactionType}: ${percentage.toFixed(1)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="displayValue"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="transactionType" stroke="#6B7280" fontSize={12} />
            <YAxis 
              stroke="#6B7280" 
              fontSize={12}
              tickFormatter={formatValue}
              label={{ 
                value: metric === 'count' ? 'Count' : `Value (${currency})`, 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="displayValue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          <strong>Total Transactions:</strong> {data.reduce((sum, item) => sum + item.count, 0)} | 
          <strong> Total Value:</strong> {currency} {data.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()} | 
          <strong> Transaction Types:</strong> {data.length}
        </p>
      </div>
    </div>
  );
};