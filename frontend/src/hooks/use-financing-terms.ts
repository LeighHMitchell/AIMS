// Custom hook for managing Financing Terms (IATI CRS-add data)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  LoanTerms,
  LoanStatus,
  CreateLoanTermsData,
  UpdateLoanTermsData,
  CreateLoanStatusData,
  UpdateLoanStatusData
} from '@/types/financing-terms';

interface UseFinancingTermsReturn {
  loanTerms: LoanTerms | null;
  loanStatuses: LoanStatus[];
  loading: boolean;
  error: string | null;
  hasCompletedData: boolean;
  fetchFinancingTerms: () => Promise<void>;
  saveLoanTerms: (data: CreateLoanTermsData | UpdateLoanTermsData) => Promise<boolean>;
  createLoanStatus: (data: CreateLoanStatusData) => Promise<boolean>;
  updateLoanStatus: (id: string, data: UpdateLoanStatusData) => Promise<boolean>;
  deleteLoanStatus: (id: string) => Promise<boolean>;
}

export function useFinancingTerms(activityId: string): UseFinancingTermsReturn {
  const [loanTerms, setLoanTerms] = useState<LoanTerms | null>(null);
  const [loanStatuses, setLoanStatuses] = useState<LoanStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if there's completed data for green tick
  const hasCompletedData = 
    (loanTerms !== null && loanTerms.rate_1 !== null && loanTerms.commitment_date !== null) ||
    loanStatuses.length > 0;

  // Fetch loan terms and loan statuses
  const fetchFinancingTerms = useCallback(async () => {
    if (!activityId || activityId === 'new') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch loan terms
      const { data: termsData, error: termsError } = await supabase
        .from('activity_financing_terms')
        .select('*')
        .eq('activity_id', activityId)
        .maybeSingle();

      if (termsError) throw termsError;

      // Fetch loan statuses
      const { data: statusesData, error: statusesError } = await supabase
        .from('activity_loan_status')
        .select('*')
        .eq('activity_id', activityId)
        .order('year', { ascending: false });

      if (statusesError) throw statusesError;

      setLoanTerms(termsData || null);
      setLoanStatuses(statusesData || []);
    } catch (err) {
      console.error('Error fetching financing terms:', err);
      const message = err instanceof Error ? err.message : 'Failed to load financing terms';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  // Initial fetch
  useEffect(() => {
    fetchFinancingTerms();
  }, [fetchFinancingTerms]);

  // Save loan terms (create or update)
  const saveLoanTerms = useCallback(
    async (data: CreateLoanTermsData | UpdateLoanTermsData): Promise<boolean> => {
      try {
        // Check if loan terms already exist
        if (loanTerms) {
          // Update existing
          const { error: updateError } = await supabase
            .from('activity_financing_terms')
            .update(data)
            .eq('id', loanTerms.id);

          if (updateError) throw updateError;

          toast.success('Loan terms updated successfully');
        } else {
          // Create new
          const createData = data as CreateLoanTermsData;
          const { data: newTerms, error: createError } = await supabase
            .from('activity_financing_terms')
            .insert({
              ...createData,
              activity_id: activityId
            })
            .select()
            .single();

          if (createError) throw createError;

          setLoanTerms(newTerms);
          toast.success('Loan terms saved successfully');
        }

        // Refresh data
        await fetchFinancingTerms();
        return true;
      } catch (err) {
        console.error('Error saving loan terms:', err);
        const message = err instanceof Error ? err.message : 'Failed to save loan terms';
        toast.error(message);
        return false;
      }
    },
    [activityId, loanTerms, fetchFinancingTerms]
  );

  // Create loan status
  const createLoanStatus = useCallback(
    async (data: CreateLoanStatusData): Promise<boolean> => {
      try {
        const { error: createError } = await supabase
          .from('activity_loan_status')
          .insert({
            ...data,
            activity_id: activityId
          });

        if (createError) throw createError;

        toast.success(`Loan status for year ${data.year} added successfully`);
        await fetchFinancingTerms();
        return true;
      } catch (err) {
        console.error('Error creating loan status:', err);
        const message = err instanceof Error ? err.message : 'Failed to add loan status';
        toast.error(message);
        return false;
      }
    },
    [activityId, fetchFinancingTerms]
  );

  // Update loan status
  const updateLoanStatus = useCallback(
    async (id: string, data: UpdateLoanStatusData): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from('activity_loan_status')
          .update(data)
          .eq('id', id);

        if (updateError) throw updateError;

        toast.success('Loan status updated successfully');
        await fetchFinancingTerms();
        return true;
      } catch (err) {
        console.error('Error updating loan status:', err);
        const message = err instanceof Error ? err.message : 'Failed to update loan status';
        toast.error(message);
        return false;
      }
    },
    [fetchFinancingTerms]
  );

  // Delete loan status
  const deleteLoanStatus = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('activity_loan_status')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast.success('Loan status deleted successfully');
        await fetchFinancingTerms();
        return true;
      } catch (err) {
        console.error('Error deleting loan status:', err);
        const message = err instanceof Error ? err.message : 'Failed to delete loan status';
        toast.error(message);
        return false;
      }
    },
    [fetchFinancingTerms]
  );

  return {
    loanTerms,
    loanStatuses,
    loading,
    error,
    hasCompletedData,
    fetchFinancingTerms,
    saveLoanTerms,
    createLoanStatus,
    updateLoanStatus,
    deleteLoanStatus
  };
}

