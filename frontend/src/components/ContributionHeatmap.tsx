"use client"

import React, { useEffect, useState } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format, subMonths, startOfDay } from 'date-fns';
import { Flame, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface ContributionData {
  date: string;
  count: number;
}

interface ContributionSummary {
  total: number;
  activeDays: number;
  maxStreak: number;
  currentStreak: number;
  startDate: string;
  endDate: string;
}

interface ContributionHeatmapProps {
  defaultFilterType?: 'all' | 'user';
  showFilterToggle?: boolean;
}

export function ContributionHeatmap({ 
  defaultFilterType = 'all',
  showFilterToggle = true 
}: ContributionHeatmapProps) {
  const { user, permissions } = useUser();
  const [filterType, setFilterType] = useState<'all' | 'user'>(defaultFilterType);
  const [contributions, setContributions] = useState<ContributionData[]>([]);
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContributions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userId: user.id,
        userRole: user.role,
        filter: filterType,
      });

      const response = await fetch(`/api/contributions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contribution data');
      }

      const data = await response.json();
      setContributions(data.contributions);
      setSummary(data.summary);
    } catch (err) {
      console.error('Error fetching contributions:', err);
      setError('Failed to load contribution data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [user, filterType]);

  const handleRefresh = () => {
    fetchContributions();
  };

  // Define color scale based on contribution count
  const getColorClass = (count: number) => {
    if (count === 0) return 'color-empty';
    if (count <= 2) return 'color-scale-1';
    if (count <= 5) return 'color-scale-2';
    if (count <= 10) return 'color-scale-3';
    return 'color-scale-4';
  };

  // Get title text for tooltip
  const getTitleForValue = (value: any) => {
    if (!value || !value.date) return '';
    return `${value.count || 0} contribution${value.count !== 1 ? 's' : ''} on ${format(new Date(value.date), 'MMM d, yyyy')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contribution Activity</CardTitle>
          <CardDescription>Your activity over the past 12 months</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-24" />
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contribution Activity</CardTitle>
          <CardDescription>Your activity over the past 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const startDate = summary ? new Date(summary.startDate) : subMonths(startOfDay(new Date()), 12);
  const endDate = summary ? new Date(summary.endDate) : new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contribution Activity</CardTitle>
            <CardDescription>
              {filterType === 'user' 
                ? 'Your personal activity over the past 12 months'
                : 'System-wide activity over the past 12 months'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {showFilterToggle && permissions?.canViewAllActivities && (
              <Select value={filterType} onValueChange={(value: 'all' | 'user') => setFilterType(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="user">My Activity</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total contributions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.activeDays}</p>
              <p className="text-xs text-muted-foreground">Active days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold flex items-center justify-center gap-1">
                {summary.currentStreak}
                {summary.currentStreak > 0 && <Flame className="h-4 w-4 text-orange-500" />}
              </p>
              <p className="text-xs text-muted-foreground">Current streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.maxStreak}</p>
              <p className="text-xs text-muted-foreground">Max streak</p>
            </div>
          </div>
        )}

        {/* Heatmap */}
        <div className="contribution-heatmap-wrapper">
          <TooltipProvider>
            <CalendarHeatmap
              startDate={startDate}
              endDate={endDate}
              values={contributions}
              classForValue={(value) => {
                if (!value) return 'color-empty';
                return getColorClass(value.count);
              }}
              titleForValue={getTitleForValue}
              showWeekdayLabels
              onClick={(value) => {
                if (value && value.date) {
                  // Optional: Navigate to activity list filtered by date
                  console.log('Clicked date:', value.date, 'Count:', value.count);
                }
              }}
            />
          </TooltipProvider>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Less</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
            <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
            <div className="w-3 h-3 rounded-sm bg-green-800 dark:bg-green-300" />
          </div>
          <span className="text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  );
}