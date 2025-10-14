/**
 * Custom hook for managing activity conditions
 * Provides CRUD operations for conditions with proper error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ActivityCondition, CreateConditionData, UpdateConditionData } from '@/types/conditions';

export function useConditions(activityId: string) {
  const [conditions, setConditions] = useState<ActivityCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conditions for the activity
  const fetchConditions = useCallback(async () => {
    if (!activityId || activityId === 'new') {
      setLoading(false);
      setConditions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('activity_conditions')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setConditions(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conditions';
      setError(errorMessage);
      console.error('Error fetching conditions:', err);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  // Create a new condition
  const createCondition = async (data: CreateConditionData): Promise<boolean> => {
    try {
      // Note: created_by is nullable since app uses custom auth (not Supabase Auth)
      const { data: newCondition, error: insertError } = await supabase
        .from('activity_conditions')
        .insert([data])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setConditions(prev => [...prev, newCondition]);
      toast.success('Condition added successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create condition';
      toast.error(errorMessage);
      console.error('Error creating condition:', err);
      return false;
    }
  };

  // Update an existing condition
  const updateCondition = async (id: string, data: UpdateConditionData): Promise<boolean> => {
    try {
      const { data: updatedCondition, error: updateError } = await supabase
        .from('activity_conditions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setConditions(prev =>
        prev.map(condition => (condition.id === id ? updatedCondition : condition))
      );
      toast.success('Condition updated successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update condition';
      toast.error(errorMessage);
      console.error('Error updating condition:', err);
      return false;
    }
  };

  // Delete a condition
  const deleteCondition = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('activity_conditions')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setConditions(prev => prev.filter(condition => condition.id !== id));
      toast.success('Condition deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete condition';
      toast.error(errorMessage);
      console.error('Error deleting condition:', err);
      return false;
    }
  };

  // Bulk update attached status for all conditions
  const updateAttachedStatus = async (attached: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('activity_conditions')
        .update({ attached })
        .eq('activity_id', activityId);

      if (updateError) {
        throw updateError;
      }

      setConditions(prev =>
        prev.map(condition => ({ ...condition, attached }))
      );
      toast.success(`Conditions ${attached ? 'attached' : 'detached'} successfully`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update attached status';
      toast.error(errorMessage);
      console.error('Error updating attached status:', err);
      return false;
    }
  };

  // Fetch conditions on mount and when activityId changes
  useEffect(() => {
    fetchConditions();
  }, [fetchConditions]);

  return {
    conditions,
    loading,
    error,
    fetchConditions,
    createCondition,
    updateCondition,
    deleteCondition,
    updateAttachedStatus
  };
}

