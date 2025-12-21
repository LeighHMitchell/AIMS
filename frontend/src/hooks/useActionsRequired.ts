import { useState, useEffect, useCallback } from 'react';
import type { ActionItem } from '@/types/dashboard';

interface ActionsRequiredResponse {
  actions: ActionItem[];
  total: number;
  hasMore: boolean;
}

interface UseActionsRequiredReturn {
  actions: ActionItem[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useActionsRequired(
  organizationId: string | undefined,
  userId?: string,
  limit: number = 7
): UseActionsRequiredReturn {
  const [data, setData] = useState<ActionsRequiredResponse>({
    actions: [],
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        organizationId,
        limit: limit.toString(),
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/dashboard/actions-required?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch actions required');
      }

      const result: ActionsRequiredResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error('[useActionsRequired] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load actions');
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId, limit]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return {
    actions: data.actions,
    total: data.total,
    hasMore: data.hasMore,
    loading,
    error,
    refetch: fetchActions,
  };
}
