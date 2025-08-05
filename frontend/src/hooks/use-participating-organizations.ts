import { useState, useEffect, useCallback } from 'react';
import { Organization } from '@/components/ui/organization-searchable-select';

export interface ParticipatingOrganization {
  id: string;
  activity_id: string;
  organization_id: string;
  role_type: 'extending' | 'implementing' | 'government';
  display_order: number;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

interface UseParticipatingOrganizationsProps {
  activityId?: string;
  onError?: (error: string) => void;
}

export function useParticipatingOrganizations({ 
  activityId, 
  onError 
}: UseParticipatingOrganizationsProps) {
  const [participatingOrganizations, setParticipatingOrganizations] = useState<ParticipatingOrganization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch participating organizations
  const fetchParticipatingOrganizations = useCallback(async () => {
    if (!activityId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/activities/${activityId}/participating-organizations`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch participating organizations');
      }

      const data = await response.json();
      setParticipatingOrganizations(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch participating organizations';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('[AIMS] Error fetching participating organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [activityId, onError]);

  // Add participating organization
  const addParticipatingOrganization = useCallback(async (
    organizationId: string, 
    roleType: 'extending' | 'implementing' | 'government',
    displayOrder: number = 0
  ) => {
    if (!activityId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/activities/${activityId}/participating-organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: organizationId,
          role_type: roleType,
          display_order: displayOrder,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add participating organization');
      }

      const newParticipatingOrg = await response.json();
      setParticipatingOrganizations(prev => [...prev, newParticipatingOrg]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add participating organization';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('[AIMS] Error adding participating organization:', err);
    } finally {
      setLoading(false);
    }
  }, [activityId, onError]);

  // Remove participating organization
  const removeParticipatingOrganization = useCallback(async (
    organizationId: string, 
    roleType: 'extending' | 'implementing' | 'government'
  ) => {
    if (!activityId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/activities/${activityId}/participating-organizations?organization_id=${organizationId}&role_type=${roleType}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove participating organization');
      }

      setParticipatingOrganizations(prev => 
        prev.filter(org => !(org.organization_id === organizationId && org.role_type === roleType))
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove participating organization';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('[AIMS] Error removing participating organization:', err);
    } finally {
      setLoading(false);
    }
  }, [activityId, onError]);

  // Get organizations by role type
  const getOrganizationsByRole = useCallback((roleType: 'extending' | 'implementing' | 'government') => {
    return participatingOrganizations.filter(org => org.role_type === roleType);
  }, [participatingOrganizations]);

  // Check if organization is already participating in a role
  const isOrganizationParticipating = useCallback((organizationId: string, roleType: 'extending' | 'implementing' | 'government') => {
    return participatingOrganizations.some(org => 
      org.organization_id === organizationId && org.role_type === roleType
    );
  }, [participatingOrganizations]);

  // Fetch on mount and when activityId changes
  useEffect(() => {
    if (activityId) {
      fetchParticipatingOrganizations();
    } else {
      // Clear state if no activityId
      setParticipatingOrganizations([]);
      setLoading(false);
    }
  }, [activityId]);

  return {
    participatingOrganizations,
    loading,
    error,
    fetchParticipatingOrganizations,
    addParticipatingOrganization,
    removeParticipatingOrganization,
    getOrganizationsByRole,
    isOrganizationParticipating,
  };
} 