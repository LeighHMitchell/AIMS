"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';
import { calculateFIRR } from '@/lib/eirr-calculator';
import { getVisibleStages, APPRAISAL_STAGE_ORDER } from '@/lib/project-bank-utils';
import type {
  AppraisalStage,
  RoutingOutcome,
  ProjectBankProject,
  ProjectDocument,
  FIRRResult,
  CostTableRow,
} from '@/types/project-bank';

export interface UseAppraisalWizardReturn {
  projectId: string | null;
  currentStage: AppraisalStage;
  currentStageIndex: number;
  visibleStages: AppraisalStage[];
  formData: Record<string, any>;
  documents: ProjectDocument[];
  isLoading: boolean;
  isSaving: boolean;
  errors: Record<string, string>;

  goToStage: (stage: AppraisalStage) => void;
  canGoToStage: (stage: AppraisalStage) => boolean;
  saveAndContinue: () => Promise<void>;
  saveAndBack: () => Promise<void>;
  saveDraft: () => Promise<void>;
  updateField: (key: string, value: any) => void;
  updateFields: (updates: Record<string, any>) => void;
  validateCurrentStage: () => Record<string, string>;
  isStageComplete: (stage: AppraisalStage) => boolean;

  firrResult: FIRRResult | null;
  routingOutcome: RoutingOutcome | null;
  refreshDocuments: () => Promise<void>;
}

export function useAppraisalWizard(initialProjectId?: string): UseAppraisalWizardReturn {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [currentStage, setCurrentStage] = useState<AppraisalStage>('intake');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(!!initialProjectId);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Compute FIRR from cost table data
  const firrResult = useMemo(() => {
    const costTable = formData.cost_table_data as CostTableRow[] | undefined;
    if (!costTable || costTable.length === 0) return null;
    return calculateFIRR(costTable);
  }, [formData.cost_table_data]);

  const ndpAligned = !!formData.ndp_aligned;
  const firrPercent = firrResult?.firr ?? formData.firr ?? null;

  // Compute visible stages
  const visibleStages = useMemo(
    () => getVisibleStages(firrPercent, ndpAligned),
    [firrPercent, ndpAligned]
  );

  const currentStageIndex = visibleStages.indexOf(currentStage);

  // Routing outcome
  const routingOutcome = useMemo((): RoutingOutcome | null => {
    return formData.routing_outcome || null;
  }, [formData.routing_outcome]);

  // Load project data on mount
  useEffect(() => {
    if (!initialProjectId) {
      setIsLoading(false);
      return;
    }

    async function loadProject() {
      try {
        const res = await apiFetch(`/api/project-bank/${initialProjectId}`);
        if (!res.ok) throw new Error('Failed to load project');
        const project: ProjectBankProject & { documents?: ProjectDocument[] } = await res.json();

        // Populate form data from project
        const data: Record<string, any> = {};
        const fields = [
          'name', 'nominating_ministry', 'sector', 'region', 'estimated_cost', 'currency',
          'description', 'contact_officer', 'contact_email', 'contact_phone',
          'project_type', 'sub_sector', 'townships', 'estimated_start_date',
          'estimated_duration_months', 'objectives', 'target_beneficiaries',
          'sdg_goals', 'ndp_goal_id', 'ndp_aligned',
          'construction_period_years', 'operational_period_years', 'project_life_years',
          'preliminary_fs_summary', 'preliminary_fs_date', 'preliminary_fs_conducted_by',
          'cost_table_data', 'technical_approach', 'technology_methodology',
          'technical_risks', 'has_technical_design', 'technical_design_maturity',
          'environmental_impact_level', 'social_impact_level',
          'land_acquisition_required', 'resettlement_required', 'estimated_affected_households',
          'has_revenue_component', 'revenue_sources', 'market_assessment_summary',
          'projected_annual_users', 'projected_annual_revenue', 'revenue_ramp_up_years',
          'msdp_strategy_area', 'secondary_ndp_goals', 'alignment_justification',
          'sector_strategy_reference', 'in_sector_investment_plan',
          'firr', 'firr_date', 'firr_calculation_data',
          'eirr', 'eirr_date', 'eirr_calculation_data', 'eirr_shadow_prices',
          'vgf_amount', 'vgf_calculated', 'vgf_calculation_data', 'vgf_status',
          'dap_compliant', 'dap_notes', 'budget_allocation_status', 'budget_amount',
          'land_parcel_id', 'routing_outcome', 'status', 'pathway',
        ];
        fields.forEach(f => {
          if ((project as any)[f] !== undefined) {
            data[f] = (project as any)[f];
          }
        });

        setFormData(data);
        setDocuments(project.documents || []);
        setProjectId(initialProjectId);

        // Set current stage from project
        const stage = (project.appraisal_stage || 'intake') as AppraisalStage;
        setCurrentStage(stage);
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProject();
  }, [initialProjectId]);

  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error for this field
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const updateFields = useCallback((updates: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const validateCurrentStage = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (currentStage === 'intake') {
      if (!formData.name?.trim()) errs.name = 'Project name is required';
      if (!formData.nominating_ministry?.trim()) errs.nominating_ministry = 'Nominating ministry is required';
      if (!formData.sector) errs.sector = 'Sector is required';
    }

    if (currentStage === 'preliminary_fs') {
      if (!formData.construction_period_years) errs.construction_period_years = 'Construction period is required';
      if (!formData.operational_period_years) errs.operational_period_years = 'Operational period is required';
    }

    if (currentStage === 'msdp_screening') {
      // No hard requirements — user can explicitly say "not aligned"
    }

    setErrors(errs);
    return errs;
  }, [currentStage, formData]);

  const isStageComplete = useCallback((stage: AppraisalStage): boolean => {
    const idx = APPRAISAL_STAGE_ORDER.indexOf(stage);
    const currentIdx = APPRAISAL_STAGE_ORDER.indexOf(currentStage);
    return idx < currentIdx;
  }, [currentStage]);

  const canGoToStage = useCallback((stage: AppraisalStage): boolean => {
    if (!visibleStages.includes(stage)) return false;
    // Can go to any completed or current stage
    const targetIdx = APPRAISAL_STAGE_ORDER.indexOf(stage);
    const currentIdx = APPRAISAL_STAGE_ORDER.indexOf(currentStage);
    return targetIdx <= currentIdx;
  }, [visibleStages, currentStage]);

  const goToStage = useCallback((stage: AppraisalStage) => {
    if (canGoToStage(stage)) {
      setCurrentStage(stage);
    }
  }, [canGoToStage]);

  const saveStageData = useCallback(async (nextStage?: AppraisalStage): Promise<boolean> => {
    setIsSaving(true);
    try {
      if (!projectId) {
        // Create new project (Stage 1)
        const res = await apiFetch('/api/project-bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            appraisal_stage: nextStage || 'intake',
            status: 'nominated',
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setErrors({ _form: err.error || 'Failed to create project' });
          return false;
        }

        const project = await res.json();
        setProjectId(project.id);
        // Navigate to the appraisal URL so resuming works
        window.history.replaceState(null, '', `/project-bank/${project.id}/appraisal`);
        return true;
      }

      // Update existing project via appraisal-stage endpoint
      const res = await apiFetch(`/api/project-bank/${projectId}/appraisal-stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: currentStage,
          data: formData,
          advance: nextStage || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrors({ _form: err.error || 'Failed to save' });
        return false;
      }

      return true;
    } catch (err) {
      setErrors({ _form: 'Network error. Please try again.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, currentStage, formData]);

  const saveAndContinue = useCallback(async () => {
    const validationErrors = validateCurrentStage();
    if (Object.keys(validationErrors).length > 0) return;

    const stageIdx = visibleStages.indexOf(currentStage);
    const nextStage = stageIdx < visibleStages.length - 1
      ? visibleStages[stageIdx + 1]
      : 'routing_complete';

    const saved = await saveStageData(nextStage as AppraisalStage);
    if (saved && stageIdx < visibleStages.length - 1) {
      setCurrentStage(visibleStages[stageIdx + 1]);
    }
  }, [validateCurrentStage, visibleStages, currentStage, saveStageData]);

  const saveAndBack = useCallback(async () => {
    await saveStageData();
    const stageIdx = visibleStages.indexOf(currentStage);
    if (stageIdx > 0) {
      setCurrentStage(visibleStages[stageIdx - 1]);
    }
  }, [visibleStages, currentStage, saveStageData]);

  const saveDraft = useCallback(async () => {
    await saveStageData();
  }, [saveStageData]);

  const refreshDocuments = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/documents`);
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch {}
  }, [projectId]);

  return {
    projectId,
    currentStage,
    currentStageIndex,
    visibleStages,
    formData,
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
    validateCurrentStage,
    isStageComplete,
    firrResult,
    routingOutcome,
    refreshDocuments,
  };
}
