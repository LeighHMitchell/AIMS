'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  TaskAnalyticsResponse,
  TaskAnalyticsSummary,
  TaskTypeAnalytics,
  TaskPriorityAnalytics,
  TaskTimeSeriesData,
  OverdueTaskDetail,
  TaskPerformerStats,
  OrgTaskStats,
  TaskAnalyticsFilters,
  TaskType,
} from '@/types/task';

interface UseTaskAnalyticsOptions {
  userId: string;
  autoFetch?: boolean;
  refreshInterval?: number | null;
  filters?: TaskAnalyticsFilters;
}

interface UseTaskAnalyticsReturn {
  // Data
  summary: TaskAnalyticsSummary | null;
  byType: TaskTypeAnalytics[];
  byPriority: TaskPriorityAnalytics[];
  timeSeries: TaskTimeSeriesData[];
  overdueTasks: OverdueTaskDetail[];
  topPerformers: TaskPerformerStats[];
  byOrganization: OrgTaskStats[];
  period: { start: string; end: string; days: number } | null;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  setFilters: (filters: TaskAnalyticsFilters) => void;
  setPeriod: (startDate: string, endDate: string) => void;
  setTaskType: (type: TaskType | null) => void;

  // Computed
  completionTrend: number | null; // percentage change from previous period
  overdueTrend: number | null;
}

const defaultSummary: TaskAnalyticsSummary = {
  total_tasks: 0,
  draft_tasks: 0,
  scheduled_tasks: 0,
  sent_tasks: 0,
  completed_tasks: 0,
  cancelled_tasks: 0,
  total_assignments: 0,
  pending_assignments: 0,
  in_progress_assignments: 0,
  completed_assignments: 0,
  declined_assignments: 0,
  overdue_assignments: 0,
  completion_rate: 0,
  on_time_rate: 0,
  decline_rate: 0,
  avg_response_time: null,
  median_response_time: null,
  total_emails_sent: 0,
  emails_this_period: 0,
};

export function useTaskAnalytics(options: UseTaskAnalyticsOptions): UseTaskAnalyticsReturn {
  const { userId, autoFetch = true, refreshInterval = null, filters: initialFilters = {} } = options;

  // State
  const [data, setData] = useState<TaskAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TaskAnalyticsFilters>(initialFilters);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('userId', userId);

      if (filters.start_date) {
        params.append('start_date', filters.start_date);
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date);
      }
      if (filters.task_type) {
        params.append('task_type', filters.task_type);
      }
      if (filters.organization_id) {
        params.append('organization_id', filters.organization_id);
      }
      if (filters.include_performers) {
        params.append('include_performers', 'true');
      }
      if (filters.include_org_breakdown) {
        params.append('include_org_breakdown', 'true');
      }

      const url = `/api/tasks/analytics?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const result: TaskAnalyticsResponse = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskAnalytics] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, filters]);

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    if (autoFetch) {
      fetchAnalytics();
    }
  }, [autoFetch, fetchAnalytics]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchAnalytics]);

  // Actions
  const setFilters = useCallback((newFilters: TaskAnalyticsFilters) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const setPeriod = useCallback((startDate: string, endDate: string) => {
    setFiltersState((prev) => ({
      ...prev,
      start_date: startDate,
      end_date: endDate,
    }));
  }, []);

  const setTaskType = useCallback((type: TaskType | null) => {
    setFiltersState((prev) => ({
      ...prev,
      task_type: type || undefined,
    }));
  }, []);

  // Computed values
  const completionTrend = useMemo(() => {
    // This would require comparing with previous period
    // For now, return null (would need additional API call)
    return null;
  }, [data]);

  const overdueTrend = useMemo(() => {
    return null;
  }, [data]);

  return {
    // Data
    summary: data?.summary || null,
    byType: data?.by_type || [],
    byPriority: data?.by_priority || [],
    timeSeries: data?.time_series || [],
    overdueTasks: data?.overdue_tasks || [],
    topPerformers: data?.top_performers || [],
    byOrganization: data?.by_organization || [],
    period: data?.period || null,

    // State
    isLoading,
    error,

    // Actions
    refresh: fetchAnalytics,
    setFilters,
    setPeriod,
    setTaskType,

    // Computed
    completionTrend,
    overdueTrend,
  };
}

// =====================================================
// PRESET PERIOD HELPERS
// =====================================================

export function getPresetPeriod(preset: 'today' | 'week' | 'month' | 'quarter' | 'year'): {
  start_date: string;
  end_date: string;
} {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];

  let startDate: string;

  switch (preset) {
    case 'today':
      startDate = endDate;
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
  }

  return { start_date: startDate, end_date: endDate };
}

// =====================================================
// CHART DATA FORMATTERS
// =====================================================

export function formatTimeSeriesForChart(data: TaskTimeSeriesData[]): {
  labels: string[];
  created: number[];
  completed: number[];
  overdue: number[];
} {
  return {
    labels: data.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    created: data.map((d) => d.created),
    completed: data.map((d) => d.completed),
    overdue: data.map((d) => d.overdue),
  };
}

export function formatTypeBreakdownForChart(data: TaskTypeAnalytics[]): {
  labels: string[];
  totals: number[];
  completed: number[];
  colors: string[];
} {
  const typeLabels: Record<TaskType, string> = {
    reporting: 'Reporting',
    validation: 'Validation',
    compliance: 'Compliance',
    information: 'Information',
  };

  const typeColors: Record<TaskType, string> = {
    reporting: '#3b82f6',
    validation: '#8b5cf6',
    compliance: '#f97316',
    information: '#64748b',
  };

  return {
    labels: data.map((d) => typeLabels[d.task_type]),
    totals: data.map((d) => d.total),
    completed: data.map((d) => d.completed),
    colors: data.map((d) => typeColors[d.task_type]),
  };
}

export function formatPriorityBreakdownForChart(data: TaskPriorityAnalytics[]): {
  labels: string[];
  totals: number[];
  colors: string[];
} {
  const priorityLabels: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  const priorityColors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#64748b',
  };

  return {
    labels: data.map((d) => priorityLabels[d.priority]),
    totals: data.map((d) => d.total),
    colors: data.map((d) => priorityColors[d.priority]),
  };
}

// =====================================================
// SUMMARY STAT FORMATTERS
// =====================================================

export function formatResponseTime(hours: number | null): string {
  if (hours === null) return 'N/A';

  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  } else if (hours < 24) {
    return `${Math.round(hours)}h`;
  } else {
    const days = Math.round(hours / 24);
    return `${days}d`;
  }
}

export function getCompletionRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600';
  if (rate >= 60) return 'text-amber-600';
  return 'text-red-600';
}

export function getOverdueCountColor(count: number, total: number): string {
  if (total === 0) return 'text-slate-600';
  const percentage = (count / total) * 100;
  if (percentage <= 5) return 'text-green-600';
  if (percentage <= 15) return 'text-amber-600';
  return 'text-red-600';
}
