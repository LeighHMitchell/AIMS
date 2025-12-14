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

      const response = await fetch(`/api/analytics/sectors?topN=${topN}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching sector data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load sector data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#64748b', '#475569', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.sectorName}</p>
          <p className="text-xs text-gray-600 mb-2">Code: {data.sectorCode}</p>
          <p className="text-sm text-slate-600">Activities: {data.activityCount}</p>
          <div className="border-t mt-2 pt-2 space-y-1">
            <p className="text-sm text-blue-600">Budget: {formatCurrency(data.totalBudget)} ({data.budgetPercentage.toFixed(1)}%)</p>
            <p className="text-sm text-green-600">Disbursements: {formatCurrency(data.totalDisbursements)} ({data.disbursementPercentage.toFixed(1)}%)</p>
            <p className="text-sm text-orange-600">Expenditures: {formatCurrency(data.totalExpenditures)} ({data.expenditurePercentage.toFixed(1)}%)</p>
          </div>
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
          <span>Loading sector data...</span>
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

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Show:</span>
          <div className="flex gap-1">
            {[5, 10, 15, 20].map((n) => (
              <Button
                key={n}
                variant={topN === n ? "default" : "outline"}
                size="sm"
                onClick={() => setTopN(n)}
              >
                Top {n}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={metric === 'budget' ? "default" : "outline"}
              size="sm"
              onClick={() => setMetric('budget')}
            >
              Budget
            </Button>
            <Button
              variant={metric === 'disbursements' ? "default" : "outline"}
              size="sm"
              onClick={() => setMetric('disbursements')}
            >
              Disbursements
            </Button>
            <Button
              variant={metric === 'expenditures' ? "default" : "outline"}
              size="sm"
              onClick={() => setMetric('expenditures')}
            >
              Expenditures
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
              title="Pie Chart"
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
      <ResponsiveContainer width="100%" height={500}>
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
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="displayName"
              stroke="#6B7280"
              fontSize={11}
              angle={0}
              textAnchor="middle"
              height={90}
              interval={0}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickFormatter={formatCurrency}
              label={{
                value: `Amount (USD)`,
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
          <strong>Showing:</strong> Top {topN} sectors | 
          <strong> Total Activities:</strong> {data.reduce((sum, item) => sum + item.activityCount, 0)} | 
          <strong> Sectors:</strong> {data.length}
        </p>
      </div>
    </div>
  );
};