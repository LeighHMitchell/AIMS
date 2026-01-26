import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type {
  ActivityReadinessState,
  ReadinessStageWithData,
  UpdateReadinessConfigRequest,
  UpdateReadinessResponseRequest,
  SignOffStageRequest,
  ChecklistStatus,
  ReadinessFilterContext,
  ReadinessItemWithResponse,
} from '@/types/readiness';
import { isItemApplicable, calculateProgress } from '@/types/readiness';
import { apiFetch } from '@/lib/api-fetch';

interface UseReadinessChecklistOptions {
  activityId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseReadinessChecklistReturn {
  // State
  state: ActivityReadinessState | null;
  loading: boolean;
  error: string | null;
  
  // Filtered data
  filteredStages: ReadinessStageWithData[];
  filterContext: ReadinessFilterContext;
  
  // Actions
  refresh: () => Promise<void>;
  updateConfig: (config: UpdateReadinessConfigRequest) => Promise<void>;
  updateItemResponse: (itemId: string, data: UpdateReadinessResponseRequest) => Promise<void>;
  uploadDocument: (itemId: string, file: File) => Promise<void>;
  deleteDocument: (itemId: string, documentId: string) => Promise<void>;
  signOffStage: (templateId: string, data: SignOffStageRequest) => Promise<void>;
  
  // Utilities
  isUpdating: boolean;
  updatingItemId: string | null;
}

export function useReadinessChecklist({
  activityId,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseReadinessChecklistOptions): UseReadinessChecklistReturn {
  const [state, setState] = useState<ActivityReadinessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Fetch readiness state
  const fetchState = useCallback(async () => {
    if (!activityId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/activities/${activityId}/readiness`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch readiness state');
      }

      setState(data.data);
    } catch (err) {
      console.error('[useReadinessChecklist] Error fetching state:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchState, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchState]);

  // Filter context based on config
  const filterContext: ReadinessFilterContext = useMemo(() => ({
    financing_type: state?.config?.financing_type || null,
    financing_modality: state?.config?.financing_modality || null,
    is_infrastructure: state?.config?.is_infrastructure || false,
  }), [state?.config]);

  // Filter stages and items based on config
  const filteredStages = useMemo(() => {
    if (!state?.stages) return [];

    return state.stages.map(stage => {
      const filteredItems = stage.items.filter(item => 
        isItemApplicable(item, filterContext)
      );

      return {
        ...stage,
        items: filteredItems,
        progress: calculateProgress(filteredItems),
      };
    });
  }, [state?.stages, filterContext]);

  // Update config
  const updateConfig = useCallback(async (config: UpdateReadinessConfigRequest) => {
    if (!activityId) return;

    try {
      setIsUpdating(true);

      const response = await apiFetch(`/api/activities/${activityId}/readiness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update configuration');
      }

      // Update local state
      setState(prev => prev ? {
        ...prev,
        config: data.config,
      } : null);

      toast.success('Configuration saved');
    } catch (err) {
      console.error('[useReadinessChecklist] Error updating config:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [activityId]);

  // Update item response
  const updateItemResponse = useCallback(async (
    itemId: string,
    data: UpdateReadinessResponseRequest
  ) => {
    if (!activityId) return;

    try {
      setIsUpdating(true);
      setUpdatingItemId(itemId);

      const response = await apiFetch(`/api/activities/${activityId}/readiness/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update response');
      }

      // Refresh to get updated state
      await fetchState();

      toast.success('Response saved');
    } catch (err) {
      console.error('[useReadinessChecklist] Error updating response:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save response');
      throw err;
    } finally {
      setIsUpdating(false);
      setUpdatingItemId(null);
    }
  }, [activityId, fetchState]);

  // Upload document
  const uploadDocument = useCallback(async (itemId: string, file: File) => {
    if (!activityId) return;

    try {
      setIsUpdating(true);
      setUpdatingItemId(itemId);

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch(`/api/activities/${activityId}/readiness/${itemId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload document');
      }

      // Refresh to get updated state
      await fetchState();

      toast.success('Document uploaded');
    } catch (err) {
      console.error('[useReadinessChecklist] Error uploading document:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload document');
      throw err;
    } finally {
      setIsUpdating(false);
      setUpdatingItemId(null);
    }
  }, [activityId, fetchState]);

  // Delete document
  const deleteDocument = useCallback(async (itemId: string, documentId: string) => {
    if (!activityId) return;

    try {
      setIsUpdating(true);
      setUpdatingItemId(itemId);

      const response = await apiFetch(`/api/activities/${activityId}/readiness/${itemId}/upload?documentId=${documentId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete document');
      }

      // Refresh to get updated state
      await fetchState();

      toast.success('Document deleted');
    } catch (err) {
      console.error('[useReadinessChecklist] Error deleting document:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
      throw err;
    } finally {
      setIsUpdating(false);
      setUpdatingItemId(null);
    }
  }, [activityId, fetchState]);

  // Sign off stage
  const signOffStage = useCallback(async (
    templateId: string,
    data: SignOffStageRequest
  ) => {
    if (!activityId) return;

    try {
      setIsUpdating(true);

      const response = await apiFetch(`/api/activities/${activityId}/readiness/signoff/${templateId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sign off stage');
      }

      // Refresh to get updated state
      await fetchState();

      toast.success('Stage signed off successfully');
    } catch (err) {
      console.error('[useReadinessChecklist] Error signing off stage:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sign off stage');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [activityId, fetchState]);

  return {
    state,
    loading,
    error,
    filteredStages,
    filterContext,
    refresh: fetchState,
    updateConfig,
    updateItemResponse,
    uploadDocument,
    deleteDocument,
    signOffStage,
    isUpdating,
    updatingItemId,
  };
}

/**
 * Hook for fetching templates only (for admin or preview purposes)
 */
export function useReadinessTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch('/api/readiness/templates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      setTemplates(data.templates || []);
    } catch (err) {
      console.error('[useReadinessTemplates] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
  };
}
