"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Table as TableIcon, Clock, ExternalLink, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { differenceInDays, format, parseISO } from 'date-fns'

// Types
type FreshnessBucket = 
  | 'less_than_1_month'
  | '1_to_3_months'
  | '3_to_6_months'
  | '6_to_12_months'
  | 'over_12_months';

interface ActivityFreshnessData {
  id: string;
  title_narrative: string | null;
  iati_identifier: string | null;
  activity_status: string | null;
  publication_status: string | null;
  reporting_org_id: string | null;
  updated_at: string;
  created_at: string;
  freshness_bucket: FreshnessBucket;
  days_since_update: number;
}

interface Organization {
  id: string;
  name: string;
  acronym: string | null;
}

interface ChartDataItem {
  bucket: FreshnessBucket;
  label: string;
  count: number;
  color: string;
  order: number;
}

type ViewMode = 'chart' | 'table';
type SortField = 'title' | 'status' | 'updated_at' | 'freshness';
type SortDirection = 'asc' | 'desc';

// Configuration
const BUCKET_CONFIG: Record<FreshnessBucket, { label: string; color: string; order: number }> = {
  less_than_1_month: { label: '< 1 month', color: '#10b981', order: 1 },
  '1_to_3_months': { label: '1-3 months', color: '#84cc16', order: 2 },
  '3_to_6_months': { label: '3-6 months', color: '#f59e0b', order: 3 },
  '6_to_12_months': { label: '6-12 months', color: '#f97316', order: 4 },
  over_12_months: { label: '> 12 months', color: '#ef4444', order: 5 },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: '1', label: 'Pipeline/Identification' },
  { value: '2', label: 'Implementation' },
  { value: '3', label: 'Finalisation' },
  { value: '4', label: 'Closed' },
  { value: '5', label: 'Cancelled' },
  { value: '6', label: 'Suspended' },
];

const PUBLICATION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Not Published' },
];

// Helper Functions
const calculateFreshnessBucket = (updatedAt: string): FreshnessBucket => {
  const now = new Date();
  const updateDate = new Date(updatedAt);
  const daysDiff = differenceInDays(now, updateDate);
  
  if (daysDiff <= 30) return 'less_than_1_month';
  if (daysDiff <= 90) return '1_to_3_months';
  if (daysDiff <= 180) return '3_to_6_months';
  if (daysDiff <= 365) return '6_to_12_months';
  return 'over_12_months';
};

const getStatusLabel = (status: string | null): string => {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  return option?.label || status || 'Unknown';
};

// Freshness Badge Component
function FreshnessBadge({ bucket }: { bucket: FreshnessBucket }) {
  const badgeStyles: Record<FreshnessBucket, string> = {
    less_than_1_month: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    '1_to_3_months': 'bg-lime-100 text-lime-800 border-lime-200 hover:bg-lime-100',
    '3_to_6_months': 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
    '6_to_12_months': 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
    over_12_months: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
  };

  return (
    <Badge className={badgeStyles[bucket]}>
      {BUCKET_CONFIG[bucket].label}
    </Badge>
  );
}

// Main Component
export function ActivityFreshnessChart() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityFreshnessData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [statusFilter, setStatusFilter] = useState<string>('2'); // Default: Implementation
  const [publicationFilter, setPublicationFilter] = useState<string>('published'); // Default: Published
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const router = useRouter();

  // Fetch data on mount
  useEffect(() => {
    fetchActivityFreshness();
  }, []);

  const fetchActivityFreshness = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch organizations for dropdown
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name, acronym')
        .order('name');
      setOrganizations(orgsData || []);

      const { data: activitiesData, error: fetchError } = await supabase
        .from('activities')
        .select(`
          id,
          title_narrative,
          iati_identifier,
          activity_status,
          publication_status,
          reporting_org_id,
          updated_at,
          created_at
        `)
        .order('updated_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Process activities with freshness calculation
      const processedActivities: ActivityFreshnessData[] = (activitiesData || []).map(activity => {
        const daysSinceUpdate = differenceInDays(new Date(), new Date(activity.updated_at));
        return {
          ...activity,
          freshness_bucket: calculateFreshnessBucket(activity.updated_at),
          days_since_update: daysSinceUpdate,
        };
      });

      setActivities(processedActivities);
    } catch (err: any) {
      console.error('[ActivityFreshness] Error:', err);
      setError(err.message || 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  // Filter activities by status, publication status, and organization
  const filteredActivities = useMemo(() => {
    let filtered = activities;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.activity_status === statusFilter);
    }
    
    if (publicationFilter !== 'all') {
      filtered = filtered.filter(a => a.publication_status === publicationFilter);
    }
    
    if (orgFilter !== 'all') {
      filtered = filtered.filter(a => a.reporting_org_id === orgFilter);
    }
    
    return filtered;
  }, [activities, statusFilter, publicationFilter, orgFilter]);

  // Aggregate data for chart
  const chartData = useMemo((): ChartDataItem[] => {
    const bucketCounts = new Map<FreshnessBucket, number>();
    
    // Initialize all buckets with 0
    Object.keys(BUCKET_CONFIG).forEach(bucket => {
      bucketCounts.set(bucket as FreshnessBucket, 0);
    });

    // Count activities per bucket
    filteredActivities.forEach(activity => {
      const current = bucketCounts.get(activity.freshness_bucket) || 0;
      bucketCounts.set(activity.freshness_bucket, current + 1);
    });

    // Convert to chart format
    return Object.entries(BUCKET_CONFIG)
      .map(([bucket, config]) => ({
        bucket: bucket as FreshnessBucket,
        label: config.label,
        count: bucketCounts.get(bucket as FreshnessBucket) || 0,
        color: config.color,
        order: config.order,
      }))
      .sort((a, b) => a.order - b.order);
  }, [filteredActivities]);

  // Sort activities for table view
  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = (a.title_narrative || '').localeCompare(b.title_narrative || '');
          break;
        case 'status':
          comparison = (a.activity_status || '').localeCompare(b.activity_status || '');
          break;
        case 'updated_at':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'freshness':
          comparison = BUCKET_CONFIG[a.freshness_bucket].order - BUCKET_CONFIG[b.freshness_bucket].order;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredActivities, sortField, sortDirection]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload as ChartDataItem;
    const percentage = filteredActivities.length > 0 
      ? ((data.count / filteredActivities.length) * 100).toFixed(1)
      : '0';

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
          <p className="font-semibold text-slate-900 text-sm">
            Last updated: {data.label}
          </p>
        </div>
        <div className="p-2">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-4 text-slate-700 font-medium">Activities</td>
                <td className="py-1.5 text-right font-semibold text-slate-900">
                  {data.count}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-slate-700 font-medium">Percentage</td>
                <td className="py-1.5 text-right font-semibold text-slate-900">
                  {percentage}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Clock className="h-5 w-5" />
            Activity Data Freshness
          </CardTitle>
          <CardDescription>
            Shows how recently activities have been updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Clock className="h-5 w-5" />
            Activity Data Freshness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">Failed to load data</p>
              <p className="text-sm text-slate-500 mt-2">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Clock className="h-5 w-5" />
              Activity Data Freshness
            </CardTitle>
            <CardDescription>
              Shows how recently activities have been updated. Click on activities to view details.
            </CardDescription>
          </div>
          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className="rounded-r-none gap-1.5"
            >
              <BarChart3 className="h-4 w-4" />
              Chart
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none gap-1.5"
            >
              <TableIcon className="h-4 w-4" />
              Table
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Publication Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Publication:</span>
            <Select value={publicationFilter} onValueChange={setPublicationFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {PUBLICATION_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Organization Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Organization:</span>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.acronym ? `${org.acronym} - ${org.name}` : org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Freshness Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span className="text-xs text-slate-500">Freshness:</span>
          {Object.entries(BUCKET_CONFIG).map(([bucket, config]) => (
            <div key={bucket} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: config.color }} 
              />
              <span className="text-xs text-slate-600">{config.label}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Empty state - show when no activities match filters */}
        {filteredActivities.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <Clock className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-medium">No activities found</p>
              <p className="text-sm text-slate-500 mt-2">
                {statusFilter !== 'all' || publicationFilter !== 'all' || orgFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'No activity data available'}
              </p>
            </div>
          </div>
        ) : viewMode === 'chart' ? (
          /* Chart View */
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: '#334155', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  width={90}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

          </div>
        ) : (
          /* Table View */
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead 
                    className="min-w-[250px] cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Activity Title
                      <SortIcon field="title" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon field="status" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('updated_at')}
                  >
                    <div className="flex items-center">
                      Last Updated
                      <SortIcon field="updated_at" />
                    </div>
                  </TableHead>
                  <TableHead>Days Since Update</TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('freshness')}
                  >
                    <div className="flex items-center justify-center">
                      Freshness
                      <SortIcon field="freshness" />
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedActivities.slice(0, 100).map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/activities/${activity.id}`)}
                  >
                    <TableCell className="font-medium">
                      <span className="line-clamp-2">{activity.title_narrative || 'Untitled'}</span>
                      {activity.iati_identifier && (
                        <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded inline-block mt-1">
                          {activity.iati_identifier}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {getStatusLabel(activity.activity_status)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {format(parseISO(activity.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {activity.days_since_update} days
                    </TableCell>
                    <TableCell className="text-center">
                      <FreshnessBadge bucket={activity.freshness_bucket} />
                    </TableCell>
                    <TableCell>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sortedActivities.length > 100 && (
              <div className="p-3 text-center text-sm text-slate-500 border-t">
                Showing 100 of {sortedActivities.length} activities. Use filters to narrow results.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
