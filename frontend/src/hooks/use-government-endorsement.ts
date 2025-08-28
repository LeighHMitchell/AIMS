import { useState, useEffect, useCallback } from 'react';
import { GovernmentEndorsement, GovernmentEndorsementFormData } from '@/types/government-endorsement';
import { toast } from 'sonner';

interface UseGovernmentEndorsementReturn {
  endorsement: GovernmentEndorsement | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveEndorsement: (data: GovernmentEndorsementFormData) => Promise<boolean>;
  deleteEndorsement: () => Promise<boolean>;
  refreshEndorsement: () => Promise<void>;
}

export function useGovernmentEndorsement(activityId: string): UseGovernmentEndorsementReturn {
  const [endorsement, setEndorsement] = useState<GovernmentEndorsement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEndorsement = useCallback(async () => {
    if (!activityId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/activities/${activityId}/government-endorsement`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setEndorsement(data.endorsement);
    } catch (err) {
      console.error('Error fetching government endorsement:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch endorsement data');
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  const saveEndorsement = useCallback(async (data: GovernmentEndorsementFormData): Promise<boolean> => {
    if (!activityId) return false;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/activities/${activityId}/government-endorsement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setEndorsement(result.endorsement);
      
      toast.success('Government endorsement saved successfully');
      return true;
    } catch (err) {
      console.error('Error saving government endorsement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save endorsement data';
      setError(errorMessage);
      toast.error(`Failed to save: ${errorMessage}`);
      return false;
    } finally {
      setSaving(false);
    }
  }, [activityId]);

  const deleteEndorsement = useCallback(async (): Promise<boolean> => {
    if (!activityId) return false;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/activities/${activityId}/government-endorsement`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      setEndorsement(null);
      toast.success('Government endorsement deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting government endorsement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete endorsement data';
      setError(errorMessage);
      toast.error(`Failed to delete: ${errorMessage}`);
      return false;
    } finally {
      setSaving(false);
    }
  }, [activityId]);

  const refreshEndorsement = useCallback(async () => {
    await fetchEndorsement();
  }, [fetchEndorsement]);

  useEffect(() => {
    fetchEndorsement();
  }, [fetchEndorsement]);

  return {
    endorsement,
    loading,
    saving,
    error,
    saveEndorsement,
    deleteEndorsement,
    refreshEndorsement,
  };
}
