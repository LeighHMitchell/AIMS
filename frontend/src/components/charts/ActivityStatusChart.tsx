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

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

interface ActivityStatusChartProps {
  filters: any;
}

export const ActivityStatusChart: React.FC<ActivityStatusChartProps> = ({
  filters,
}) => {
  const [data, setData] = useState<{
    activityStatus: StatusData[];
    publicationStatus: StatusData[];
    submissionStatus: StatusData[];
  }>({
    activityStatus: [],
    publicationStatus: [],
    submissionStatus: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [statusType, setStatusType] = useState<'activity' | 'publication' | 'submission'>('activity');

  useEffect(() => {
    fetchChartData();
  }, [filters]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/activity-status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result.data);
    } catch (error) {
      console.error('Error fetching activity status data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load activity status data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentData = () => {
    return data[`${statusType}Status` as keyof typeof data] || [];
  };

  const COLORS = ['#3B82F6', '#64748b', '#475569', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{`Status: ${data.status}`}</p>
          <p className="text-sm text-blue-600">{`Count: ${data.count}`}</p>
          <p className="text-sm text-green-600">{`Percentage: ${data.percentage.toFixed(1)}%`}</p>
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
          <span>Loading activity status data...</span>
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

  const currentData = getCurrentData();

  if (!currentData || currentData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No status data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status Type:</span>
          <div className="flex gap-1">
            {[
              { key: 'activity', label: 'Activity Status' },
              { key: 'publication', label: 'Publication Status' },
              { key: 'submission', label: 'Submission Status' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={statusType === key ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusType(key as any)}
              >
                {label}
              </Button>
            ))}
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
              data={currentData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="count"
            >
              {currentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        ) : (
          <BarChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="status" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          <strong>Total Activities:</strong> {currentData.reduce((sum, item) => sum + item.count, 0)} | 
          <strong> Status Types:</strong> {currentData.length} | 
          <strong> Most Common:</strong> {currentData.length > 0 ? currentData[0].status : 'N/A'}
        </p>
      </div>
    </div>
  );
};