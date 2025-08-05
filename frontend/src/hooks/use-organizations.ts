import { useState, useEffect, useCallback } from 'react';
import { Organization } from '@/components/ui/organization-searchable-select';

interface UseOrganizationsProps {
  onError?: (error: string) => void;
}

export function useOrganizations({ onError }: UseOrganizationsProps = {}) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/organizations');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch organizations';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('[AIMS] Error fetching organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Filter organizations by type (for government partners)
  const getOrganizationsByType = useCallback((type: string) => {
    return organizations.filter(org => org.organisation_type === type);
  }, [organizations]);

  // Get organization by ID
  const getOrganizationById = useCallback((id: string) => {
    return organizations.find(org => org.id === id);
  }, [organizations]);

  // Fetch on mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    organizations,
    loading,
    error,
    fetchOrganizations,
    getOrganizationsByType,
    getOrganizationById,
  };
} 