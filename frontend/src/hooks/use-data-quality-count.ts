import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';

/**
 * Total number of open data-quality issues for an organisation — the same
 * figure shown in the Data Quality tab (ValidationRulesCard's `counts.total`).
 * Used to badge the dashboard "Data Quality" tab like Notifications.
 */
export function useDataQualityCount(organizationId?: string): number {
  const query = useQuery<number>({
    queryKey: ['data-quality-count', organizationId],
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await apiFetch(`/api/data-clinic/validation-rules?organization_id=${organizationId}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data?.counts?.total ?? 0;
    },
  });
  return query.data ?? 0;
}
