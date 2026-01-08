import { useState, useEffect, useCallback } from 'react';
import type { DashboardHeroStats } from '@/types/dashboard';

interface UseDashboardHeroStatsReturn {
  stats: DashboardHeroStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardHeroStats(
  organizationId: string | undefined,
  userId?: string
): UseDashboardHeroStatsReturn {
  const [stats, setStats] = useState<DashboardHeroStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        organizationId,
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/dashboard/hero-stats?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard hero stats');
      }

      const data: DashboardHeroStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error('[useDashboardHeroStats] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
