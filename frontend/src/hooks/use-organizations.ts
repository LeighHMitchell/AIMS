import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Organization } from '@/components/ui/organization-searchable-select';
import { apiFetch } from '@/lib/api-fetch';

interface UseOrganizationsProps {
  onError?: (error: string) => void;
}

const EMPTY_ORGS: Organization[] = [];

export function useOrganizations({ onError }: UseOrganizationsProps = {}) {
  const query = useQuery<Organization[]>({
    queryKey: ['organizations', 'list'],
    queryFn: async () => {
      const response = await apiFetch('/api/organizations');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch organizations');
      }
      return response.json();
    },
    staleTime: 5 * 60_000,
  });

  const organizations = useMemo(() => query.data ?? EMPTY_ORGS, [query.data]);
  const errorMessage = query.error instanceof Error ? query.error.message : null;

  useEffect(() => {
    if (errorMessage && onError) {
      onError(errorMessage);
    }
  }, [errorMessage, onError]);

  const fetchOrganizations = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const getOrganizationsByType = useCallback(
    (type: string) => organizations.filter(org => org.organisation_type === type),
    [organizations],
  );

  const getOrganizationById = useCallback(
    (id: string) => organizations.find(org => org.id === id),
    [organizations],
  );

  return {
    organizations,
    loading: query.isPending,
    error: errorMessage,
    fetchOrganizations,
    getOrganizationsByType,
    getOrganizationById,
  };
}
