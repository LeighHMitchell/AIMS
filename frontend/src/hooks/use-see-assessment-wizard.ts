"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';
import type { SEETransfer, SEETransferDocument, SEETransferFinancial } from '@/types/project-bank';

export type SEEAssessmentStage = 'profile' | 'financials' | 'valuation' | 'restructuring' | 'transfer_mode';

export const SEE_STAGE_ORDER: SEEAssessmentStage[] = [
  'profile', 'financials', 'valuation', 'restructuring', 'transfer_mode',
];

export const SEE_STAGE_LABELS: Record<SEEAssessmentStage, string> = {
  profile: 'Enterprise Profile',
  financials: 'Financial History',
  valuation: 'Valuation',
  restructuring: 'Restructuring',
  transfer_mode: 'Transfer Mode',
};

export interface UseSEEAssessmentWizardReturn {
  transferId: string;
  currentStage: SEEAssessmentStage;
  currentStageIndex: number;
  formData: Record<string, any>;
  financials: SEETransferFinancial[];
  documents: SEETransferDocument[];
  isLoading: boolean;
  isSaving: boolean;
  errors: Record<string, string>;

  goToStage: (stage: SEEAssessmentStage) => void;
  canGoToStage: (stage: SEEAssessmentStage) => boolean;
  saveAndContinue: () => Promise<void>;
  saveAndBack: () => Promise<void>;
  saveDraft: () => Promise<void>;
  updateField: (key: string, value: any) => void;
  updateFields: (updates: Record<string, any>) => void;
  setFinancials: (financials: SEETransferFinancial[]) => void;
  isStageComplete: (stage: SEEAssessmentStage) => boolean;
  refreshDocuments: () => Promise<void>;
}

export function useSEEAssessmentWizard(transferId: string): UseSEEAssessmentWizardReturn {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState<SEEAssessmentStage>('profile');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [financials, setFinancials] = useState<SEETransferFinancial[]>([]);
  const [documents, setDocuments] = useState<SEETransferDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentStageIndex = SEE_STAGE_ORDER.indexOf(currentStage);

  // Load transfer data on mount
  useEffect(() => {
    async function loadTransfer() {
      try {
        const res = await apiFetch(`/api/see-transfers/${transferId}`);
        if (!res.ok) throw new Error('Failed to load transfer');
        const transfer: SEETransfer = await res.json();

        const data: Record<string, any> = {};
        const fields = [
          'see_name', 'see_sector', 'see_ministry', 'description', 'status', 'transfer_mode',
          'current_annual_revenue', 'current_annual_expenses', 'total_assets', 'total_liabilities',
          'employee_count', 'valuation_amount', 'valuation_date', 'valuation_method', 'valuation_firm',
          'shares_allotted_to_state', 'regulatory_separation_done', 'legislation_review_done',
          'fixed_asset_register_maintained', 'restructuring_notes',
        ];
        fields.forEach(f => {
          if ((transfer as any)[f] !== undefined) {
            data[f] = (transfer as any)[f];
          }
        });

        setFormData(data);
        setFinancials(transfer.financials || []);
        setDocuments(transfer.documents || []);
      } catch (err) {
        console.error('Failed to load transfer:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTransfer();
  }, [transferId]);

  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const updateFields = useCallback((updates: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const isStageComplete = useCallback((stage: SEEAssessmentStage): boolean => {
    const idx = SEE_STAGE_ORDER.indexOf(stage);
    return idx < currentStageIndex;
  }, [currentStageIndex]);

  const canGoToStage = useCallback((stage: SEEAssessmentStage): boolean => {
    const targetIdx = SEE_STAGE_ORDER.indexOf(stage);
    return targetIdx <= currentStageIndex;
  }, [currentStageIndex]);

  const goToStage = useCallback((stage: SEEAssessmentStage) => {
    if (canGoToStage(stage)) {
      setCurrentStage(stage);
    }
  }, [canGoToStage]);

  const saveData = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Save main transfer data
      const res = await apiFetch(`/api/see-transfers/${transferId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrors({ _form: err.error || 'Failed to save' });
        return false;
      }

      // Save financials if on financials stage
      if (currentStage === 'financials' && financials.length > 0) {
        const finRes = await apiFetch(`/api/see-transfers/${transferId}/financials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ financials }),
        });

        if (!finRes.ok) {
          const err = await finRes.json();
          setErrors({ _form: err.error || 'Failed to save financials' });
          return false;
        }
      }

      return true;
    } catch {
      setErrors({ _form: 'Network error. Please try again.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [transferId, formData, financials, currentStage]);

  const saveAndContinue = useCallback(async () => {
    const saved = await saveData();
    if (saved && currentStageIndex < SEE_STAGE_ORDER.length - 1) {
      setCurrentStage(SEE_STAGE_ORDER[currentStageIndex + 1]);
    } else if (saved && currentStageIndex === SEE_STAGE_ORDER.length - 1) {
      // Last stage — go to detail page
      router.push(`/project-bank/transfers/${transferId}`);
    }
  }, [saveData, currentStageIndex, transferId, router]);

  const saveAndBack = useCallback(async () => {
    await saveData();
    if (currentStageIndex > 0) {
      setCurrentStage(SEE_STAGE_ORDER[currentStageIndex - 1]);
    }
  }, [saveData, currentStageIndex]);

  const saveDraft = useCallback(async () => {
    await saveData();
  }, [saveData]);

  const refreshDocuments = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/see-transfers/${transferId}/documents`);
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch {}
  }, [transferId]);

  return {
    transferId,
    currentStage,
    currentStageIndex,
    formData,
    financials,
    documents,
    isLoading,
    isSaving,
    errors,
    goToStage,
    canGoToStage,
    saveAndContinue,
    saveAndBack,
    saveDraft,
    updateField,
    updateFields,
    setFinancials,
    isStageComplete,
    refreshDocuments,
  };
}
