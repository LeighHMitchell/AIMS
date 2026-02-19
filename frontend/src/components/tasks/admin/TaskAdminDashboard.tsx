'use client';

import { useState } from 'react';
import {
  useTaskAnalytics,
  getPresetPeriod,
  formatResponseTime,
  getCompletionRateColor,
} from '@/hooks/useTaskAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Mail,
  BarChart3,
  PieChart,
  Calendar,
  Download,
} from 'lucide-react';
import { CompletionRatesChart } from './CompletionRatesChart';
import { TaskTypeBreakdown } from './TaskTypeBreakdown';
import { OverdueTrackingTable } from './OverdueTrackingTable';
import { ResponseTimeMetrics } from './ResponseTimeMetrics';
import { TopPerformersTable } from './TopPerformersTable';
import type { TaskType } from '@/types/task';

type PeriodPreset = 'week' | 'month' | 'quarter' | 'year';

interface TaskAdminDashboardProps {
  userId: string;
}

export function TaskAdminDashboard({ userId }: TaskAdminDashboardProps) {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month');
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskType | 'all'>('all');

  const period = getPresetPeriod(periodPreset);

  const {
    summary,
    byType,
    byPriority,
    timeSeries,
    overdueTasks,
    topPerformers,
    isLoading,
    error,
    refresh,
    setFilters,
  } = useTaskAnalytics({
    userId,
    autoFetch: true,
    filters: {
      ...period,
      task_type: taskTypeFilter === 'all' ? undefined : taskTypeFilter,
      include_performers: true,
    },
  });

  const handlePeriodChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const newPeriod = getPresetPeriod(preset);
    setFilters({
      start_date: newPeriod.start_date,
      end_date: newPeriod.end_date,
    });
  };

  const handleTypeChange = (type: TaskType | 'all') => {
    setTaskTypeFilter(type);
    setFilters({
      task_type: type === 'all' ? undefined : type,
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <span>Error loading analytics: {error}</span>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={refresh}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task Analytics</h2>
          <p className="text-muted-foreground">
            Monitor task completion rates, response times, and team performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodPreset} onValueChange={(v) => handlePeriodChange(v as PeriodPreset)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="quarter">Last 90 days</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={taskTypeFilter}
            onValueChange={(v) => handleTypeChange(v as TaskType | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="reporting">Reporting</SelectItem>
              <SelectItem value="validation">Validation</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="information">Information</SelectItem>
            </SelectContent>
          </Select>

        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Tasks"
          value={summary?.total_tasks ?? 0}
          description={`${summary?.sent_tasks ?? 0} sent, ${summary?.draft_tasks ?? 0} drafts`}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title="Completion Rate"
          value={`${summary?.completion_rate ?? 0}%`}
          description={`${summary?.completed_assignments ?? 0} of ${summary?.total_assignments ?? 0} assignments`}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
          valueClassName="text-slate-900"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Overdue"
          value={summary?.overdue_assignments ?? 0}
          description={`${overdueTasks.length} tasks with overdue assignments`}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          valueClassName="text-slate-900"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Avg Response Time"
          value={formatResponseTime(summary?.avg_response_time ?? null)}
          description={`Median: ${formatResponseTime(summary?.median_response_time ?? null)}`}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On-Time Rate</p>
                <p className="text-2xl font-bold">{summary?.on_time_rate ?? 0}%</p>
              </div>
              <div className="rounded-full bg-muted p-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Decline Rate</p>
                <p className="text-2xl font-bold">{summary?.decline_rate ?? 0}%</p>
              </div>
              <div className="rounded-full bg-muted p-3">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{summary?.emails_this_period ?? 0}</p>
              </div>
              <div className="rounded-full bg-muted p-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <PieChart className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="overdue">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Overdue Tracking
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Users className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Completion Trend</CardTitle>
                <CardDescription>Tasks created vs completed over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <CompletionRatesChart data={timeSeries} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Task Type</CardTitle>
                <CardDescription>Distribution and completion by type</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <TaskTypeBreakdown data={byType} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Response Time Analysis</CardTitle>
              <CardDescription>Average time to complete by priority and type</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponseTimeMetrics byType={byType} byPriority={byPriority} summary={summary} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Tasks</CardTitle>
              <CardDescription>
                Tasks past their deadline with incomplete assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <OverdueTrackingTable tasks={overdueTasks} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Users with highest task completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <TopPerformersTable performers={topPerformers} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// SUMMARY CARD COMPONENT
// =====================================================

interface SummaryCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  valueClassName?: string;
  isLoading?: boolean;
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  valueClassName,
  isLoading,
}: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-1 h-4 w-32" />
          </>
        ) : (
          <>
            <div className={`text-2xl font-bold ${valueClassName || ''}`}>{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
