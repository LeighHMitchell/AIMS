"use client"

import React, { useEffect, useState, useRef } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, startOfDay } from 'date-fns';
import { useUser } from '@/hooks/useUser';
import { Activity, RefreshCw, TrendingUp, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ContributionData {
  date: string;
  count: number;
}

interface ActionTypeCount {
  type: string;
  count: number;
}

interface ContributionStats {
  total: number;
  maxDay: { date: string; count: number };
  currentStreak: number;
  longestStreak: number;
  mostActiveActionTypes: ActionTypeCount[];
}

type FilterType = 'all' | 'mine' | 'activities' | 'users' | 'transactions';

export function ContributionHeatmap() {
  const router = useRouter();
  const { user } = useUser();
  const [contributions, setContributions] = useState<ContributionData[]>([]);
  const [stats, setStats] = useState<ContributionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [hoveredValue, setHoveredValue] = useState<ContributionData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const heatmapRef = useRef<HTMLDivElement>(null);

  const endDate = new Date();
  const startDate = subMonths(endDate, 11);

  useEffect(() => {
    fetchContributions();
  }, [filter, user]);

  const fetchContributions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: startOfDay(startDate).toISOString(),
        endDate: startOfDay(endDate).toISOString(),
        filter,
        userId: user.id,
      });

      const response = await fetch(`/api/activity-logs/heatmap?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contribution data');
      }

      const data = await response.json();
      setContributions(data.contributions);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching contributions:', err);
      setError('Failed to load contribution data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchContributions();
  };

  const getClassForValue = (value: any) => {
    if (!value || !value.count) {
      return 'color-github-0';
    }
    
    const count = value.count;
    if (count >= 20) return 'color-github-4';
    if (count >= 11) return 'color-github-3';
    if (count >= 6) return 'color-github-2';
    if (count >= 1) return 'color-github-1';
    return 'color-github-0';
  };

  const handleMouseOver = (event: any, value: any) => {
    if (value && heatmapRef.current) {
      const rect = event.target.getBoundingClientRect();
      const containerRect = heatmapRef.current.getBoundingClientRect();
      
      setHoveredValue(value);
      setTooltipPosition({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredValue(null);
  };

  const handleClick = (value: any) => {
    if (value && value.count > 0) {
      // Navigate to activity logs filtered by date
      const date = typeof value.date === 'string' ? value.date : format(value.date, 'yyyy-MM-dd');
      router.push(`/activity-logs?date=${date}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contribution Activity</CardTitle>
          <CardDescription>Your activity over the past 12 months</CardDescription>
        </CardHeader>
        <CardContent>
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

  const contributionCount = contributions.reduce((sum, c) => sum + c.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Contribution Activity
            </CardTitle>
            <CardDescription>
              {contributionCount} contributions in the last 12 months
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-40">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="mine">My Activity</SelectItem>
                <SelectItem value="activities">Activities Only</SelectItem>
                <SelectItem value="users">User Actions</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Heatmap */}
          <div ref={heatmapRef} className="relative">
            <CalendarHeatmap
              startDate={startDate}
              endDate={endDate}
              values={contributions}
              classForValue={getClassForValue}
              showWeekdayLabels
              onClick={handleClick}
              onMouseOver={handleMouseOver}
              onMouseLeave={handleMouseLeave}
              titleForValue={(value) => {
                if (!value || !value.count) return 'No contributions';
                const date = typeof value.date === 'string' ? value.date : format(value.date, 'EEEE, MMMM d, yyyy');
                return `${value.count} contribution${value.count !== 1 ? 's' : ''} on ${date}`;
              }}
            />
            
            {/* Custom Tooltip */}
            {hoveredValue && (
              <div 
                className="heatmap-tooltip"
                style={{
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <strong>{hoveredValue.count} contribution{hoveredValue.count !== 1 ? 's' : ''}</strong>
                <br />
                {typeof hoveredValue.date === 'string' 
                  ? format(new Date(hoveredValue.date), 'MMM d, yyyy')
                  : format(hoveredValue.date, 'MMM d, yyyy')}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm color-github-0" />
              <div className="w-3 h-3 rounded-sm color-github-1" />
              <div className="w-3 h-3 rounded-sm color-github-2" />
              <div className="w-3 h-3 rounded-sm color-github-3" />
              <div className="w-3 h-3 rounded-sm color-github-4" />
            </div>
            <span>More</span>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium">Total Actions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Current Streak</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {stats.currentStreak}
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Longest Streak</p>
                <p className="text-2xl font-bold">{stats.longestStreak} days</p>
              </div>
              <div>
                <p className="text-sm font-medium">Most Active Day</p>
                <p className="text-sm">
                  {stats.maxDay.count} actions on{' '}
                  {format(new Date(stats.maxDay.date), 'MMM d')}
                </p>
              </div>
            </div>
          )}

          {/* Most Active Action Types */}
          {stats && stats.mostActiveActionTypes.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Most Active Actions</p>
              <div className="flex flex-wrap gap-2">
                {stats.mostActiveActionTypes.slice(0, 5).map((action) => (
                  <Badge key={action.type} variant="secondary" className="text-xs">
                    {action.type.replace(/_/g, ' ')}: {action.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}