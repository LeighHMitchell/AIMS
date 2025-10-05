import { useState, useEffect, useCallback } from 'react';
import { Organization } from '@/components/ui/organization-searchable-select';

export interface ParticipatingOrganization {
  id: string;
  activity_id: string;
  organization_id: string;
  role_type: 'extending' | 'implementing' | 'government' | 'funding';
  display_order: number;
  created_at: string;
  updated_at: string;
  
  // IATI Standard fields
  iati_role_code: number;
  iati_org_ref?: string;
  org_type?: string;
  activity_id_ref?: string;
  crs_channel_code?: string;
  narrative?: string;
  narrative_lang?: string;
  narratives?: Array<{ lang: string; text: string }>;
  org_activity_id?: string;
  reporting_org_ref?: string;
  secondary_reporter?: boolean;
  
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
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Fetch participating organizations
  const fetchParticipatingOrganizations = useCallback(async (forceRefresh = false) => {
    if (!activityId) {
      setParticipatingOrganizations([]);
      setLoading(false);
      setHasInitiallyLoaded(true);
      return;
    }

    // Prevent unnecessary re-fetching if already loaded and not forcing refresh
    if (hasInitiallyLoaded && !forceRefresh) {
      return;
    }

    // Only show loading state on initial load or forced refresh
    if (!hasInitiallyLoaded || forceRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/activities/${activityId}/participating-organizations`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch participating organizations');
      }

      const data = await response.json();
      setParticipatingOrganizations(data);
      setHasInitiallyLoaded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch participating organizations';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('[AIMS] Error fetching participating organizations:', err);
      // Only clear organizations on error if we haven't loaded before (prevents flicker)
      if (!hasInitiallyLoaded) {
        setParticipatingOrganizations([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activityId, onError, hasInitiallyLoaded]);

  // Add participating organization with full IATI support
  const addParticipatingOrganization = useCallback(async (
    organizationId: string, 
    roleType: 'extending' | 'implementing' | 'government' | 'funding',
    additionalData?: Partial<ParticipatingOrganization>
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
          display_order: additionalData?.display_order ?? 0,
          iati_org_ref: additionalData?.iati_org_ref,
          org_type: additionalData?.org_type,
          activity_id_ref: additionalData?.activity_id_ref,
          crs_channel_code: additionalData?.crs_channel_code,
          narrative: additionalData?.narrative,
          narrative_lang: additionalData?.narrative_lang || 'en',
          narratives: additionalData?.narratives || [],
          org_activity_id: additionalData?.org_activity_id,
          reporting_org_ref: additionalData?.reporting_org_ref,
          secondary_reporter: additionalData?.secondary_reporter || false,
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
      throw err; // Re-throw to allow caller to handle
    } finally {
      setLoading(false);
    }
  }, [activityId, onError]);

  // Remove participating organization
  const removeParticipatingOrganization = useCallback(async (
    organizationId: string, 
    roleType: 'extending' | 'implementing' | 'government' | 'funding'
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
      throw err; // Re-throw to allow caller to handle
    } finally {
      setLoading(false);
    }
  }, [activityId, onError]);

  // Get organizations by role type
  const getOrganizationsByRole = useCallback((roleType: 'extending' | 'implementing' | 'government' | 'funding') => {
    return participatingOrganizations.filter(org => org.role_type === roleType);
  }, [participatingOrganizations]);

  // Check if organization is already participating in a role
  const isOrganizationParticipating = useCallback((organizationId: string, roleType: 'extending' | 'implementing' | 'government' | 'funding') => {
    return participatingOrganizations.some(org => 
      org.organization_id === organizationId && org.role_type === roleType
    );
  }, [participatingOrganizations]);
  
  // Refetch organizations (alias for fetchParticipatingOrganizations with force refresh)
  const refetch = useCallback(() => {
    return fetchParticipatingOrganizations(true);
  }, [fetchParticipatingOrganizations]);

  // Fetch on mount and when activityId changes (only on initial load)
  useEffect(() => {
    if (activityId && !hasInitiallyLoaded) {
      fetchParticipatingOrganizations();
    } else if (!activityId) {
      // Reset state when activityId is cleared
      setParticipatingOrganizations([]);
      setHasInitiallyLoaded(false);
      setLoading(false);
    }
  }, [activityId, hasInitiallyLoaded, fetchParticipatingOrganizations]);

  return {
    participatingOrganizations,
    loading,
    error,
    fetchParticipatingOrganizations,
    addParticipatingOrganization,
    removeParticipatingOrganization,
    getOrganizationsByRole,
    isOrganizationParticipating,
    refetch, // Add refetch as a convenient alias
  };
} 