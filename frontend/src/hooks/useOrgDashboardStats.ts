import { useState, useEffect, useCallback } from 'react';
import type { OrgDashboardStats } from '@/types/dashboard';

interface UseOrgDashboardStatsReturn {
  stats: OrgDashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOrgDashboardStats(
  organizationId: string | undefined,
  userId?: string
): UseOrgDashboardStatsReturn {
  const [stats, setStats] = useState<OrgDashboardStats | null>(null);
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

      const response = await fetch(`/api/dashboard/org-stats?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard stats');
      }

      const data: OrgDashboardStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error('[useOrgDashboardStats] Error:', err);
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
