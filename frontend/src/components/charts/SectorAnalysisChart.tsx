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
  totalPercentage: number;
  averagePercentage: number;
}

interface SectorAnalysisChartProps {
  filters: any;
}

export const SectorAnalysisChart: React.FC<SectorAnalysisChartProps> = ({
  filters,
}) => {
  const [data, setData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('bar');
  const [metric, setMetric] = useState<'count' | 'percentage'>('count');
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

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.sectorName}</p>
          <p className="text-xs text-gray-600 mb-2">Code: {data.sectorCode}</p>
          <p className="text-sm text-blue-600">Activities: {data.activityCount}</p>
          <p className="text-sm text-green-600">Total Percentage: {data.totalPercentage.toFixed(1)}%</p>
          <p className="text-sm text-purple-600">Average Percentage: {data.averagePercentage.toFixed(1)}%</p>
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

  const chartData = data.map(item => ({
    ...item,
    displayValue: metric === 'count' ? item.activityCount : item.totalPercentage,
    label: item.sectorCode
  }));

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
          <span className="text-sm font-medium">Metric:</span>
          <div className="flex gap-1">
            <Button
              variant={metric === 'count' ? "default" : "outline"}
              size="sm"
              onClick={() => setMetric('count')}
            >
              Activity Count
            </Button>
            <Button
              variant={metric === 'percentage' ? "default" : "outline"}
              size="sm"
              onClick={() => setMetric('percentage')}
            >
              Total Percentage
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
      <ResponsiveContainer width="100%" height={500}>
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ sectorCode, displayValue, totalPercentage }) => 
                `${sectorCode}: ${metric === 'count' ? displayValue : totalPercentage.toFixed(1) + '%'}`
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
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="sectorCode" 
              stroke="#6B7280" 
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              stroke="#6B7280" 
              fontSize={12}
              label={{ 
                value: metric === 'count' ? 'Activity Count' : 'Total Percentage (%)', 
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