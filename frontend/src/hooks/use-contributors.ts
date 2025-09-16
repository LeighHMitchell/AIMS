import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface ActivityContributor {
  id: string;
  activity_id: string;
  organization_id: string;
  organization_name: string;
  status: 'nominated' | 'accepted' | 'declined';
  role: string;
  nominated_by: string | null;
  nominated_by_name: string | null;
  nominated_at: string;
  responded_at: string | null;
  can_edit_own_data: boolean;
  can_view_other_drafts: boolean;
  created_at: string;
  updated_at: string;
}

export function useContributors(activityId: string | undefined) {
  const [contributors, setContributors] = useState<ActivityContributor[]>([]);
  const [loading, setLoading] = useState(false); // Start with false to prevent initial loading flicker
  const [error, setError] = useState<string | null>(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Fetch contributors
  const fetchContributors = useCallback(async (forceRefresh = false) => {
    if (!activityId) {
      setContributors([]);
      setLoading(false);
      setHasInitiallyLoaded(true);
      return;
    }

    // Prevent unnecessary re-fetching if already loaded and not forcing refresh
    if (hasInitiallyLoaded && !forceRefresh) {
      return;
    }

    try {
      // Only show loading state on initial load or forced refresh
      if (!hasInitiallyLoaded || forceRefresh) {
        setLoading(true);
      }
      setError(null);
      
      console.log('[useContributors] Fetching contributors for activity:', activityId);
      const response = await fetch(`/api/activity-contributors?activityId=${activityId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch contributors: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[useContributors] Fetched contributors:', data);
      setContributors(data || []);
      setHasInitiallyLoaded(true);
    } catch (err) {
      console.error('[useContributors] Error fetching contributors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contributors');
      // Only clear contributors on error if we haven't loaded before (prevents flicker)
      if (!hasInitiallyLoaded) {
        setContributors([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activityId, hasInitiallyLoaded]);

  // Add contributor
  const addContributor = useCallback(async (contributorData: {
    organizationId: string;
    organizationName: string;
    status?: string;
    role?: string;
    nominatedBy?: string;
    nominatedByName?: string;
    canEditOwnData?: boolean;
    canViewOtherDrafts?: boolean;
  }) => {
    if (!activityId) {
      throw new Error('Activity ID is required');
    }

    try {
      console.log('[useContributors] Adding contributor:', contributorData);
      
      const response = await fetch(`/api/activity-contributors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...contributorData,
          activityId: activityId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add contributor: ${response.status}`);
      }

      const newContributor = await response.json();
      console.log('[useContributors] Added contributor:', newContributor);
      
      // Update local state
      setContributors(prev => [...prev, newContributor]);
      toast.success(`${contributorData.organizationName} has been nominated as a contributor`);
      
      return newContributor;
    } catch (err) {
      console.error('[useContributors] Error adding contributor:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add contributor';
      toast.error(errorMessage);
      throw err;
    }
  }, [activityId]);

  // Update contributor
  const updateContributor = useCallback(async (contributorId: string, updates: Partial<ActivityContributor>) => {
    if (!activityId) {
      throw new Error('Activity ID is required');
    }

    try {
      console.log('[useContributors] Updating contributor:', contributorId, updates);
      
      const response = await fetch(`/api/activities/${activityId}/contributors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contributorId, ...updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update contributor: ${response.status}`);
      }

      const updatedContributor = await response.json();
      console.log('[useContributors] Updated contributor:', updatedContributor);
      
      // Update local state
      setContributors(prev => 
        prev.map(c => c.id === contributorId ? updatedContributor : c)
      );
      
      return updatedContributor;
    } catch (err) {
      console.error('[useContributors] Error updating contributor:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update contributor';
      toast.error(errorMessage);
      throw err;
    }
  }, [activityId]);

  // Remove contributor
  const removeContributor = useCallback(async (contributorId: string) => {
    if (!activityId) {
      throw new Error('Activity ID is required');
    }

    try {
      console.log('[useContributors] Removing contributor:', contributorId);
      
      const response = await fetch(`/api/activity-contributors?contributorId=${contributorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to remove contributor: ${response.status}`);
      }

      console.log('[useContributors] Removed contributor:', contributorId);
      
      // Update local state
      setContributors(prev => prev.filter(c => c.id !== contributorId));
      toast.success('Contributor removed');
      
    } catch (err) {
      console.error('[useContributors] Error removing contributor:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove contributor';
      toast.error(errorMessage);
      throw err;
    }
  }, [activityId]);

  // Refresh contributors data
  const refreshContributors = useCallback(() => {
    fetchContributors(true); // Force refresh when explicitly requested
  }, [fetchContributors]);

  // Fetch contributors when activityId changes (only on initial load)
  useEffect(() => {
    if (activityId && !hasInitiallyLoaded) {
      fetchContributors();
    } else if (!activityId) {
      // Reset state when activityId is cleared
      setContributors([]);
      setHasInitiallyLoaded(false);
      setLoading(false);
    }
  }, [activityId, hasInitiallyLoaded, fetchContributors]);

  return {
    contributors,
    loading,
    error,
    addContributor,
    updateContributor,
    removeContributor,
    refreshContributors,
  };
}