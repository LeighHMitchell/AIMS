import React, { useState, useEffect, useMemo } from "react";
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
import { AlertCircle, BarChart3, PieChart as PieChartIcon, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChartSkeleton } from "@/components/ui/skeleton-loader";
import { getActivityStatusByCode } from "@/data/activity-status-types";
import Link from "next/link";

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

interface ActivityDetail {
  id: string;
  title: string;
  iati_identifier: string | null;
  activity_status: string;
  publication_status: string;
  submission_status: string;
}

interface ActivityStatusChartProps {
  filters: any;
  onDataChange?: (data: any[]) => void;
  compact?: boolean;
}

export const ActivityStatusChart: React.FC<ActivityStatusChartProps> = ({
  filters,
  onDataChange,
  compact = false,
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
  const [activityDetails, setActivityDetails] = useState<ActivityDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'table'>('pie');
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

      const chartData = result.data;
      setData(chartData);
      setActivityDetails(result.activityDetails || []);
      // Pass all status data for export
      onDataChange?.(chartData);
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

  // Get activities grouped by the current status type
  const getActivitiesGroupedByStatus = useMemo(() => {
    const statusField = statusType === 'activity' ? 'activity_status' 
      : statusType === 'publication' ? 'publication_status' 
      : 'submission_status';
    
    const grouped: Record<string, ActivityDetail[]> = {};
    
    activityDetails.forEach(activity => {
      const status = activity[statusField as keyof ActivityDetail] as string || 'Unknown';
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(activity);
    });
    
    // Sort groups by count (descending)
    const sortedEntries = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    return sortedEntries;
  }, [activityDetails, statusType]);

  // Custom color palette: Primary Scarlet, Blue Slate, Cool Steel, Pale Slate, Platinum
  const COLORS = ['#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8'];

  // Convert status code to human-readable name
  const formatStatusName = (status: string) => {
    // First, try to look up as an activity status code
    const activityStatus = getActivityStatusByCode(status);
    if (activityStatus) {
      return activityStatus.name;
    }
    
    // Fall back to title case conversion for other status types
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-[#cfd0d5] rounded-lg shadow-lg min-w-[180px]">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-[#f1f4f8]">
                <td className="py-1.5 text-[#7b95a7] font-medium">Status</td>
                <td className="py-1.5 text-[#4c5568] font-semibold text-right">{formatStatusName(data.status)}</td>
              </tr>
              <tr className="border-b border-[#f1f4f8]">
                <td className="py-1.5 text-[#7b95a7] font-medium">Count</td>
                <td className="py-1.5 text-[#dc2625] font-semibold text-right">{data.count.toLocaleString()}</td>
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

  const currentData = getCurrentData();

  // Compact mode renders just the chart without filters
  if (compact) {
    if (loading) {
      return <PieChartSkeleton height="100%" />;
    }
    if (error || !currentData || currentData.length === 0) {
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
              data={currentData}
              cx="50%"
              cy="50%"
              outerRadius={70}
              innerRadius={40}
              dataKey="count"
              nameKey="status"
              paddingAngle={2}
              label={({ status, percentage }) => `${Math.round(percentage)}%`}
              labelLine={false}
            >
              {currentData.map((_, index) => (
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
    return <PieChartSkeleton height="384px" />;
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
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
            <Button
              variant={chartType === 'table' ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setChartType('table')}
              title="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart or Table */}
      {chartType === 'table' ? (
        <div className="max-h-[500px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 bg-white z-10">
                <TableHead className="bg-white font-semibold">Status</TableHead>
                <TableHead className="bg-white font-semibold">Activity</TableHead>
                <TableHead className="bg-white font-semibold">IATI Identifier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getActivitiesGroupedByStatus.map(([status, activities], groupIndex) => (
                <React.Fragment key={status}>
                  {activities.map((activity, index) => (
                    <TableRow key={activity.id} className="hover:bg-slate-50">
                      {index === 0 && (
                        <TableCell 
                          rowSpan={activities.length} 
                          className="align-top font-medium border-r"
                          style={{ 
                            backgroundColor: `${COLORS[groupIndex % COLORS.length]}15`,
                            borderLeft: `4px solid ${COLORS[groupIndex % COLORS.length]}`
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-[#4c5568]">
                              {formatStatusName(status)}
                            </span>
                            <span className="text-xs text-[#7b95a7]">
                              {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Link 
                          href={`/activities/${activity.id}`}
                          className="text-[#4c5568] font-medium"
                        >
                          {activity.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {activity.iati_identifier ? (
                          <span className="font-mono text-sm text-[#4c5568] bg-[#f1f4f8] px-2 py-1 rounded">
                            {activity.iati_identifier}
                          </span>
                        ) : (
                          <span className="text-[#7b95a7]">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={currentData.map(item => ({ ...item, displayStatus: formatStatusName(item.status) }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ displayStatus, percentage }) => `${displayStatus}: ${percentage.toFixed(1)}%`}
                outerRadius={140}
                innerRadius={70}
                fill="#8884d8"
                dataKey="count"
                paddingAngle={2}
              >
                {currentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(value, entry: any) => formatStatusName(entry.payload.status)} />
            </PieChart>
          ) : (
            <BarChart 
              data={currentData.map(item => ({ ...item, displayStatus: formatStatusName(item.status) }))} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#cfd0d5" />
              <XAxis dataKey="displayStatus" stroke="#4c5568" fontSize={12} />
              <YAxis stroke="#4c5568" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#dc2625" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
};