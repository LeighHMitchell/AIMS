import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  ActivityResult,
  ResultIndicator,
  IndicatorBaseline,
  IndicatorPeriod,
  CreateResultData,
  CreateIndicatorData,
  CreateBaselineData,
  CreatePeriodData,
  UpdateResultData,
  UpdateIndicatorData,
  UpdateBaselineData,
  UpdatePeriodData,
  StatusIndicator,
  STATUS_THRESHOLDS
} from '@/types/results';
import { apiFetch } from '@/lib/api-fetch';

// Hook for managing activity results
export function useResults(activityId: string) {
  const [results, setResults] = useState<ActivityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all results for an activity with their indicators, baselines, and periods
  const fetchResults = useCallback(async () => {
    if (!activityId) return;

    setLoading(true);
    setError(null);

    try {
      // Use the API endpoint instead of direct Supabase calls
      const response = await apiFetch(`/api/activities/${activityId}/results`);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to fetch results');
      }

      const data = responseData.results || [];

      // Calculate status for each indicator
      const resultsWithStatus = data.map((result: any) => ({
        ...result,
        indicators: result.indicators?.map((indicator: any) => ({
          ...indicator,
          status: calculateIndicatorStatus(indicator),
          latestActual: getLatestActualValue(indicator.periods || []),
          totalTarget: getTotalTargetValue(indicator.periods || [])
        }))
      }));

      setResults(resultsWithStatus);
      
      // Show helpful message if tables don't exist yet
      if (responseData.message) {
        console.log('[Results Hook]', responseData.message);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch results';
      console.error('[Results Hook] Error:', errorMessage);
      setError(errorMessage);
      
      // Don't show toast error for table doesn't exist - just log it
      if (!errorMessage.includes('tables not yet created')) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  // Create a new result
  const createResult = useCallback(async (data: CreateResultData): Promise<ActivityResult | null> => {
    try {
      const response = await apiFetch(`/api/activities/${data.activity_id}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create result');
      }

      toast.success('Result created successfully');
      await fetchResults(); // Refresh the list
      return responseData.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create result';
      console.error('[Results Hook] Create error:', errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, [fetchResults]);

  // Update a result
  const updateResult = useCallback(async (resultId: string, data: UpdateResultData): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/activities/${activityId}/results/${resultId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update result');
      }

      toast.success('Result updated successfully');
      await fetchResults(); // Refresh the list
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update result';
      console.error('[Results Hook] Update error:', errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [activityId, fetchResults]);

  // Delete a result
  const deleteResult = useCallback(async (resultId: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/activities/${activityId}/results/${resultId}`, {
        method: 'DELETE',
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to delete result');
      }

      toast.success('Result deleted successfully');
      await fetchResults(); // Refresh the list
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete result';
      console.error('[Results Hook] Delete error:', errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [activityId, fetchResults]);

  // Initialize data on mount
  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return {
    results,
    loading,
    error,
    fetchResults,
    createResult,
    updateResult,
    deleteResult
  };
}

// Hook for managing indicators within a result
export function useIndicators(resultId: string) {
  const [indicators, setIndicators] = useState<ResultIndicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create an indicator
  const createIndicator = useCallback(async (data: CreateIndicatorData): Promise<ResultIndicator | null> => {
    try {
      setLoading(true);
      const { data: indicator, error } = await supabase
        .from('result_indicators')
        .insert([{
          ...data,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select(`
          *,
          baseline:indicator_baselines(*),
          periods:indicator_periods(*)
        `)
        .single();

      if (error) throw error;

      toast.success('Indicator created successfully');
      return indicator;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create indicator';
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an indicator
  const updateIndicator = useCallback(async (indicatorId: string, data: UpdateIndicatorData): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('result_indicators')
        .update({
          ...data,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', indicatorId);

      if (error) throw error;

      toast.success('Indicator updated successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update indicator';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete an indicator
  const deleteIndicator = useCallback(async (indicatorId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('result_indicators')
        .delete()
        .eq('id', indicatorId);

      if (error) throw error;

      toast.success('Indicator deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete indicator';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    indicators,
    loading,
    error,
    createIndicator,
    updateIndicator,
    deleteIndicator
  };
}

// Hook for managing baselines
export function useBaselines() {
  const [loading, setLoading] = useState(false);

  // Create or update baseline (upsert since there's only one per indicator)
  const upsertBaseline = useCallback(async (data: CreateBaselineData): Promise<IndicatorBaseline | null> => {
    try {
      setLoading(true);
      
      console.log('[useBaselines] Saving baseline for indicator:', data.indicator_id);
      console.log('[useBaselines] Data:', data);
      
      // Use the database function for a simpler approach
      const { data: result, error } = await supabase.rpc('save_baseline', {
        p_indicator_id: data.indicator_id,
        p_year: data.baseline_year || new Date().getFullYear(),
        p_value: data.value || 0
      });

      if (error) {
        console.error('[useBaselines] RPC error:', error);
        throw error;
      }

      if (result?.error) {
        console.error('[useBaselines] Function error:', result.error);
        throw new Error(result.error);
      }

      console.log('[useBaselines] Baseline saved successfully:', result);
      toast.success('Baseline saved successfully');
      
      // Return a properly formatted baseline object
      return {
        id: result.id,
        indicator_id: result.indicator_id,
        baseline_year: result.baseline_year,
        value: result.value,
        created_at: result.created_at,
        updated_at: result.created_at,
        iso_date: undefined,
        comment: undefined,
        location_ref: undefined
      } as IndicatorBaseline;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save baseline';
      console.error('[useBaselines] Save baseline error:', err);
      console.error('[useBaselines] Error details:', {
        error: err,
        data: data
      });
      toast.error(`Failed to save baseline: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete baseline
  const deleteBaseline = useCallback(async (baselineId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('indicator_baselines')
        .delete()
        .eq('id', baselineId);

      if (error) throw error;

      toast.success('Baseline deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete baseline';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    upsertBaseline,
    deleteBaseline
  };
}

// Hook for managing periods
export function usePeriods() {
  const [loading, setLoading] = useState(false);

  // Create a period
  const createPeriod = useCallback(async (data: CreatePeriodData): Promise<IndicatorPeriod | null> => {
    try {
      setLoading(true);
      const { data: period, error } = await supabase
        .from('indicator_periods')
        .insert([{
          ...data,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Period created successfully');
      return period;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create period';
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a period
  const updatePeriod = useCallback(async (periodId: string, data: UpdatePeriodData): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('indicator_periods')
        .update({
          ...data,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (error) throw error;

      toast.success('Period updated successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update period';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a period
  const deletePeriod = useCallback(async (periodId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('indicator_periods')
        .delete()
        .eq('id', periodId);

      if (error) throw error;

      toast.success('Period deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete period';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    createPeriod,
    updatePeriod,
    deletePeriod
  };
}

// Utility functions for calculations
export function calculateIndicatorStatus(indicator: ResultIndicator): StatusIndicator {
  const periods = indicator.periods || [];
  if (periods.length === 0) {
    return { percentage: 0, color: 'gray', label: 'No data' };
  }

  // Calculate overall achievement rate
  const totalActual = periods.reduce((sum, p) => sum + (p.actual_value || 0), 0);
  const totalTarget = periods.reduce((sum, p) => sum + (p.target_value || 0), 0);

  if (totalTarget === 0) {
    return { percentage: 0, color: 'gray', label: 'No target set' };
  }

  const percentage = Math.round((totalActual / totalTarget) * 100);

  let color: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
  let label = 'No progress';

  if (percentage >= STATUS_THRESHOLDS.GREEN) {
    color = 'green';
    label = 'On track';
  } else if (percentage >= STATUS_THRESHOLDS.YELLOW) {
    color = 'yellow';
    label = 'Attention needed';
  } else if (percentage > 0) {
    color = 'red';
    label = 'Off track';
  }

  return { percentage, color, label };
}

export function getLatestActualValue(periods: IndicatorPeriod[]): number {
  if (!periods || periods.length === 0) return 0;
  
  // Sort by period end date and get the latest actual value
  const sortedPeriods = periods.sort((a, b) => 
    new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
  );
  
  return sortedPeriods[0]?.actual_value || 0;
}

export function getTotalTargetValue(periods: IndicatorPeriod[]): number {
  if (!periods || periods.length === 0) return 0;
  return periods.reduce((sum, p) => sum + (p.target_value || 0), 0);
}

// ============================================================================
// DOCUMENT LINKS MANAGEMENT
// ============================================================================

export function useDocumentLinks() {
  const [loading, setLoading] = useState(false);

  // Create document link
  const createDocumentLink = useCallback(async (
    entityType: 'result' | 'indicator' | 'baseline' | 'period',
    entityId: string,
    data: {
      url: string;
      title: string | object;
      description?: string | object;
      format?: string;
      category_code?: string;
      language_code?: string;
      document_date?: string;
      link_type?: 'target' | 'actual'; // For periods only
    }
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const endpoint = entityType === 'result' ? `/api/results/${entityId}/documents` :
                      entityType === 'indicator' ? `/api/indicators/${entityId}/documents` :
                      `/api/${entityType}s/${entityId}/documents`; // baselines, periods

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create document link');
      }

      toast.success('Document link added successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create document link';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete document link
  const deleteDocumentLink = useCallback(async (
    entityType: 'result' | 'indicator' | 'baseline' | 'period',
    entityId: string,
    documentId: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const endpoint = entityType === 'result' ? `/api/results/${entityId}/documents` :
                      entityType === 'indicator' ? `/api/indicators/${entityId}/documents` :
                      `/api/${entityType}s/${entityId}/documents`;

      const response = await fetch(`${endpoint}?documentId=${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete document link');
      }

      toast.success('Document link deleted');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document link';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    createDocumentLink,
    deleteDocumentLink
  };
}

// ============================================================================
// REFERENCES MANAGEMENT
// ============================================================================

export function useReferences() {
  const [loading, setLoading] = useState(false);

  // Create reference
  const createReference = useCallback(async (
    entityType: 'result' | 'indicator',
    entityId: string,
    data: {
      vocabulary: string;
      code: string;
      vocabulary_uri?: string;
      indicator_uri?: string; // For indicators only
    }
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const endpoint = entityType === 'result' 
        ? `/api/results/${entityId}/references`
        : `/api/indicators/${entityId}/references`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create reference');
      }

      toast.success('Reference added successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create reference';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete reference
  const deleteReference = useCallback(async (
    entityType: 'result' | 'indicator',
    entityId: string,
    referenceId: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const endpoint = entityType === 'result'
        ? `/api/results/${entityId}/references`
        : `/api/indicators/${entityId}/references`;

      const response = await fetch(`${endpoint}?referenceId=${referenceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete reference');
      }

      toast.success('Reference deleted');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete reference';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    createReference,
    deleteReference
  };
}

// ============================================================================
// DIMENSIONS MANAGEMENT
// ============================================================================

export function useDimensions() {
  const [loading, setLoading] = useState(false);

  // Create dimension
  const createDimension = useCallback(async (
    entityType: 'baseline' | 'period',
    entityId: string,
    data: {
      name: string;
      value: string;
      dimension_type?: 'target' | 'actual'; // For periods only
    }
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const endpoint = entityType === 'baseline'
        ? `/api/baselines/${entityId}/dimensions`
        : `/api/periods/${entityId}/dimensions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dimension');
      }

      toast.success('Dimension added successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create dimension';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete dimension
  const deleteDimension = useCallback(async (
    entityType: 'baseline' | 'period',
    entityId: string,
    dimensionId: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const endpoint = entityType === 'baseline'
        ? `/api/baselines/${entityId}/dimensions`
        : `/api/periods/${entityId}/dimensions`;

      const response = await fetch(`${endpoint}?dimensionId=${dimensionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete dimension');
      }

      toast.success('Dimension deleted');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete dimension';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    createDimension,
    deleteDimension
  };
}

// ============================================================================
// LOCATIONS MANAGEMENT
// ============================================================================

export function useLocations() {
  const [loading, setLoading] = useState(false);

  // Create location
  const createLocation = useCallback(async (
    entityType: 'baseline' | 'period',
    entityId: string,
    data: {
      location_ref: string;
      location_type?: 'target' | 'actual'; // For periods only
    }
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const endpoint = entityType === 'baseline'
        ? `/api/baselines/${entityId}/locations`
        : `/api/periods/${entityId}/locations`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create location');
      }

      toast.success('Location added successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create location';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete location
  const deleteLocation = useCallback(async (
    entityType: 'baseline' | 'period',
    entityId: string,
    locationId: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const endpoint = entityType === 'baseline'
        ? `/api/baselines/${entityId}/locations`
        : `/api/periods/${entityId}/locations`;

      const response = await fetch(`${endpoint}?locationId=${locationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete location');
      }

      toast.success('Location deleted');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete location';
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    createLocation,
    deleteLocation
  };
}