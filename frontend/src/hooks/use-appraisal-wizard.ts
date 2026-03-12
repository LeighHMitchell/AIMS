"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';
import { calculateFIRR } from '@/lib/eirr-calculator';
import {
  isFormLocked,
  isFormEditable,
  getLockMessage,
  getReturnMessage,
  getPhase,
  APPRAISAL_STAGE_LABELS,
  APPRAISAL_STAGE_ORDER,
  getVisibleStages,
} from '@/lib/project-bank-utils';
import type {
  ProjectStage,
  ProjectPhase,
  FS1Tab,
  FS2Tab,
  AppraisalStage,
  RoutingOutcome,
  ProjectBankProject,
  ProjectDocument,
  DocumentType,
  FIRRResult,
  CostTableRow,
} from '@/types/project-bank';

export interface PendingFile {
  file: File;
  type: DocumentType;
  stage: string;
}

export interface UseAppraisalWizardReturn {
  projectId: string | null;
  // Unified stage
  projectStage: ProjectStage;
  currentPhase: ProjectPhase;
  // Legacy — kept for backward compat with stage components
  currentStage: AppraisalStage;
  currentStageIndex: number;
  visibleStages: AppraisalStage[];
  // FS-1 internal tab
  fs1ActiveTab: FS1Tab;
  setFs1ActiveTab: (tab: FS1Tab) => void;
  // FS-2 internal tab
  fs2ActiveTab: FS2Tab;
  setFs2ActiveTab: (tab: FS2Tab) => void;
  updateFS2Field: (subKey: string, value: any) => void;
  // Form data
  formData: Record<string, any>;
  documents: ProjectDocument[];
  isLoading: boolean;
  isSaving: boolean;
  errors: Record<string, string>;
  // Locking
  isLocked: boolean;
  lockMessage: string | null;
  returnMessage: string | null;
  reviewComments: string | null;
  // Navigation
  goToStage: (stage: AppraisalStage) => void;
  canGoToStage: (stage: AppraisalStage) => boolean;
  saveAndContinue: () => Promise<void>;
  saveAndBack: () => Promise<void>;
  saveDraft: () => Promise<boolean>;
  submitForReview: () => Promise<boolean>;
  updateField: (key: string, value: any) => void;
  updateFields: (updates: Record<string, any>) => void;
  validateCurrentStage: () => Record<string, string>;
  isStageComplete: (stage: AppraisalStage) => boolean;
  // Calculations
  firrResult: FIRRResult | null;
  routingOutcome: RoutingOutcome | null;
  refreshDocuments: () => Promise<void>;
  // Files
  pendingFiles: PendingFile[];
  setPendingFiles: (files: PendingFile[]) => void;
}

/** Map unified project_stage to legacy AppraisalStage for backward compat */
function projectStageToAppraisalStage(stage: ProjectStage): AppraisalStage {
  const phase = getPhase(stage);
  if (phase === 'intake') return 'intake';
  if (phase === 'fs1') return 'preliminary_fs';
  if (phase === 'fs2') return 'dp_consultation';
  return 'dp_consultation';
}

export function useAppraisalWizard(initialProjectId?: string): UseAppraisalWizardReturn {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  // Ref keeps the ID in sync for use within async callbacks where state is stale
  const projectIdRef = useRef<string | null>(initialProjectId || null);
  const [projectStage, setProjectStage] = useState<ProjectStage>('intake_draft');
  const [currentStage, setCurrentStage] = useState<AppraisalStage>('intake');
  const [fs1ActiveTab, setFs1ActiveTab] = useState<FS1Tab>('technical');
  const [fs2ActiveTab, setFs2ActiveTab] = useState<FS2Tab>('overview');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(!!initialProjectId);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [reviewComments, setReviewComments] = useState<string | null>(null);

  // Computed: current phase from unified stage
  const currentPhase = useMemo(() => getPhase(projectStage), [projectStage]);

  // Computed: form locking
  const isLocked = useMemo(() => isFormLocked(projectStage), [projectStage]);
  const lockMessage = useMemo(() => getLockMessage(projectStage), [projectStage]);
  const returnMessage = useMemo(() => getReturnMessage(projectStage), [projectStage]);

  // Compute FIRR from cost table data
  const firrResult = useMemo(() => {
    const costTable = formData.cost_table_data as CostTableRow[] | undefined;
    if (!costTable || costTable.length === 0) return null;
    return calculateFIRR(costTable);
  }, [formData.cost_table_data]);

  const ndpAligned = !!formData.ndp_aligned;
  const firrPercent = firrResult?.firr ?? formData.firr ?? null;

  // Compute visible stages (legacy)
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
          'name', 'project_code', 'nominating_ministry', 'sector', 'region', 'estimated_cost', 'currency',
          'description', 'contact_officer', 'contact_officer_first_name', 'contact_officer_last_name',
          'contact_email', 'contact_phone',
          'contact_position', 'contact_ministry', 'contact_department',
          'project_type', 'sub_sector', 'townships', 'estimated_start_date',
          'estimated_duration_months', 'objectives', 'target_beneficiaries',
          'sdg_goals', 'ndp_goal_id', 'ndp_aligned', 'origin',
          'implementing_agency', 'proponent_name', 'proponent_first_name', 'proponent_last_name',
          'proponent_company', 'proponent_contact',
          'construction_period_years', 'operational_period_years', 'project_life_years',
          'construction_period_months_remainder', 'operational_period_months_remainder',
          'preliminary_fs_summary', 'preliminary_fs_date', 'preliminary_fs_conducted_by',
          'fs_conductor_type', 'fs_conductor_company_name', 'fs_conductor_company_address',
          'fs_conductor_company_phone', 'fs_conductor_company_email', 'fs_conductor_company_website',
          'fs_conductor_contact_person', 'fs_conductor_contact_person_first_name',
          'fs_conductor_contact_person_last_name', 'fs_conductor_contact_person_title',
          'fs_conductor_individual_name', 'fs_conductor_individual_first_name',
          'fs_conductor_individual_last_name', 'fs_conductor_individual_email',
          'fs_conductor_individual_phone', 'fs_conductor_individual_job_title',
          'fs_conductor_individual_company', 'fs_conductor_individual_address',
          'cost_table_data', 'technical_approach', 'technology_methodology',
          'technical_risks', 'has_technical_design', 'technical_design_maturity',
          'environmental_impact_level', 'environmental_impact_description',
          'social_impact_level', 'social_impact_description',
          'land_acquisition_required', 'land_acquisition_hectares', 'land_acquisition_details',
          'resettlement_required', 'estimated_affected_households', 'resettlement_details',
          'has_revenue_component', 'revenue_sources', 'revenue_source_other_description',
          'market_assessment_summary',
          'projected_annual_users', 'projected_annual_revenue', 'revenue_ramp_up_years',
          'msdp_strategy_area', 'msdp_strategies', 'secondary_ndp_goals', 'alignment_justification',
          'sector_strategy_reference', 'in_sector_investment_plan',
          'firr', 'firr_date', 'firr_calculation_data',
          'firr_cost_table_data',
          'eirr', 'eirr_date', 'eirr_calculation_data', 'eirr_shadow_prices',
          'vgf_amount', 'vgf_calculated', 'vgf_calculation_data', 'vgf_status',
          'dap_compliant', 'dap_notes', 'budget_allocation_status', 'budget_amount',
          'land_parcel_id', 'routing_outcome', 'status', 'pathway', 'feasibility_stage',
          'ppp_contract_type', 'ppp_contract_details', 'equity_ratio',
          'ppp_support_mechanism',
          'mrg_guaranteed_minimum', 'mrg_trigger_conditions', 'mrg_government_liability_cap', 'mrg_duration_years',
          'availability_payment_amount', 'availability_payment_duration_years', 'availability_payment_conditions',
          'banner', 'banner_position',
          'fs2_study_data',
          'category_decision', 'category_recommendation', 'category_rationale',
          'aims_activity_id',
          // Category A (Private Investment)
          'private_partner_name', 'private_partner_experience', 'investor_commitments',
          'procurement_method', 'procurement_timeline', 'concession_period_years',
          'security_arrangements', 'financial_closure_target', 'private_structuring_data',
          // Category B (Government Budget)
          'budget_source', 'budget_fiscal_year', 'annual_operating_cost',
          'maintenance_responsibility', 'procurement_method_gov',
          'implementation_agency_confirmed', 'cost_recovery_mechanism', 'handover_timeline', 'gov_structuring_data',
          // Category D (ODA)
          'oda_donor_type', 'oda_donor_name', 'oda_financing_type',
          'oda_grant_amount', 'oda_loan_amount', 'oda_counterpart_funding',
          'oda_conditions', 'oda_iati_sector_code', 'oda_activity_description', 'oda_structuring_data',
        ];
        fields.forEach(f => {
          if ((project as any)[f] !== undefined) {
            data[f] = (project as any)[f];
          }
        });

        setFormData(data);
        setDocuments(project.documents || []);
        projectIdRef.current = initialProjectId ?? null;
        setProjectId(initialProjectId ?? null);
        setReviewComments(project.review_comments || null);

        // Set unified stage
        const stage = (project.project_stage || 'intake_draft') as ProjectStage;
        setProjectStage(stage);

        // Set legacy current stage based on unified stage
        const legacyStage = projectStageToAppraisalStage(stage);
        setCurrentStage(legacyStage);

        // If in FS-1, also check if legacy appraisal_stage gives us a more specific tab
        if (getPhase(stage) === 'fs1' && project.appraisal_stage) {
          const tabMap: Record<string, FS1Tab> = {
            preliminary_fs: 'technical',
            msdp_screening: 'msdp',
            firr_assessment: 'firr',
          };
          if (tabMap[project.appraisal_stage]) {
            setFs1ActiveTab(tabMap[project.appraisal_stage]);
          }
        }
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
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const updateFields = useCallback((updates: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  /** Shallow-merge a key/value into fs2_study_data */
  const updateFS2Field = useCallback((subKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      fs2_study_data: { ...(prev.fs2_study_data || {}), [subKey]: value },
    }));
  }, []);

  const validateCurrentStage = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (currentStage === 'intake') {
      if (!formData.name?.trim()) errs.name = 'Project name is required';
      if (!formData.nominating_ministry?.trim()) errs.nominating_ministry = 'Nominating ministry is required';
      if (!formData.sector) errs.sector = 'Sector is required';
    }

    if (currentStage === 'preliminary_fs') {
      if (!formData.fs_conductor_type) errs.fs_conductor_type = 'Please select who conducted the feasibility study';
      if (formData.fs_conductor_type === 'individual' && !formData.fs_conductor_individual_first_name?.trim()) {
        errs.fs_conductor_individual_first_name = 'First name is required';
      }
      if (formData.fs_conductor_type === 'company' && !formData.fs_conductor_company_name?.trim()) {
        errs.fs_conductor_company_name = 'Company name is required';
      }
      const costTable = formData.firr_cost_table_data as any[] | undefined;
      if (!costTable || costTable.length === 0) {
        errs.cost_table_data = 'At least one cost table row is required';
      }
      if (!formData.environmental_impact_level) errs.environmental_impact_level = 'Environmental impact level is required';
      if (!formData.social_impact_level) errs.social_impact_level = 'Social impact level is required';
    }

    // FS-2 validation
    if (currentPhase === 'fs2') {
      const sd = formData.fs2_study_data || {};
      if (!sd.study_date) errs.study_date = 'Study date is required';
      if (!sd.conductor_type) errs.conductor_type = 'Please select who conducted the study';
      if (!sd.demand_methodology) errs.demand_methodology = 'Demand methodology is required';
      const costTable = formData.firr_cost_table_data as any[] | undefined;
      if (!costTable || costTable.length === 0) {
        errs.firr_cost_table_data = 'Financial analysis cost table is required';
      }
    }

    setErrors(errs);
    return errs;
  }, [currentStage, currentPhase, formData]);

  const isStageComplete = useCallback((stage: AppraisalStage): boolean => {
    const idx = APPRAISAL_STAGE_ORDER.indexOf(stage);
    const currentIdx = APPRAISAL_STAGE_ORDER.indexOf(currentStage);
    return idx < currentIdx;
  }, [currentStage]);

  const canGoToStage = useCallback((stage: AppraisalStage): boolean => {
    if (!visibleStages.includes(stage)) return false;

    // Within intake phase, can navigate intake stages freely
    if (currentPhase === 'intake' && stage === 'intake') return true;

    // Within FS-1 phase, can navigate FS-1 legacy stages
    if (currentPhase === 'fs1') {
      // Can navigate within FS-1 tabs (all mapped to preliminary_fs or later)
      const fs1Stages: AppraisalStage[] = ['preliminary_fs', 'msdp_screening', 'firr_assessment'];
      if (fs1Stages.includes(stage)) return true;
    }

    // Can go to any completed or current stage
    const targetIdx = APPRAISAL_STAGE_ORDER.indexOf(stage);
    const currentIdx = APPRAISAL_STAGE_ORDER.indexOf(currentStage);
    return targetIdx <= currentIdx;
  }, [visibleStages, currentStage, currentPhase]);

  const goToStage = useCallback((stage: AppraisalStage) => {
    if (canGoToStage(stage)) {
      setCurrentStage(stage);
    }
  }, [canGoToStage]);

  const saveStageData = useCallback(async (nextStage?: AppraisalStage): Promise<boolean> => {
    setIsSaving(true);
    try {
      if (!projectId) {
        // Create new project
        const res = await apiFetch('/api/project-bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            appraisal_stage: nextStage || 'intake',
            project_stage: 'intake_draft',
            status: 'nominated',
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setErrors({ _form: err.error || 'Failed to create project' });
          return false;
        }

        const project = await res.json();
        projectIdRef.current = project.id;
        setProjectId(project.id);
        window.history.replaceState(null, '', `/project-bank/${project.id}/appraisal`);

        // Upload any pending files
        if (pendingFiles.length > 0) {
          for (const pf of pendingFiles) {
            try {
              const fd = new FormData();
              fd.append('file', pf.file);
              fd.append('document_type', pf.type);
              fd.append('upload_stage', pf.stage);
              await apiFetch(`/api/project-bank/${project.id}/documents`, {
                method: 'POST',
                body: fd,
              });
            } catch (err) {
              console.error('Failed to upload pending file:', pf.file.name, err);
            }
          }
          setPendingFiles([]);
        }

        return true;
      }

      // Update existing project
      // Transition project_stage on first save in a new phase
      const effectiveProjectStage =
        currentPhase === 'fs1' && projectStage === 'intake_approved'
          ? 'fs1_draft'
          : currentPhase === 'fs2' && projectStage === 'fs2_assigned'
            ? 'fs2_in_progress'
            : currentPhase === 'fs3' && projectStage === 'fs2_categorized'
              ? 'fs3_in_progress'
              : undefined;

      const res = await apiFetch(`/api/project-bank/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          appraisal_stage: nextStage || currentStage,
          ...(effectiveProjectStage && { project_stage: effectiveProjectStage }),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrors({ _form: err.error || 'Failed to save' });
        return false;
      }

      // Update local state to reflect the stage transition
      if (effectiveProjectStage) {
        setProjectStage(effectiveProjectStage as ProjectStage);
      }

      return true;
    } catch (err) {
      setErrors({ _form: 'Network error. Please try again.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, currentStage, currentPhase, projectStage, formData, pendingFiles]);

  const saveAndContinue = useCallback(async () => {
    const validationErrors = validateCurrentStage();
    if (Object.keys(validationErrors).length > 0) return;

    const stageIdx = visibleStages.indexOf(currentStage);
    const nextStage = stageIdx < visibleStages.length - 1
      ? visibleStages[stageIdx + 1]
      : 'routing_complete';

    // When advancing from intake to FS-1 in the legacy model,
    // also update unified project_stage
    const saved = await saveStageData(nextStage as AppraisalStage);
    if (saved && stageIdx < visibleStages.length - 1) {
      const next = visibleStages[stageIdx + 1];
      setCurrentStage(next);

      // Update project_stage when entering FS-1
      if (currentStage === 'intake' && projectId && currentPhase === 'fs1') {
        // Already in fs1 phase — no stage transition needed
      }
    }
  }, [validateCurrentStage, visibleStages, currentStage, saveStageData, projectId, currentPhase]);

  const saveAndBack = useCallback(async () => {
    await saveStageData();
    const stageIdx = visibleStages.indexOf(currentStage);
    if (stageIdx > 0) {
      setCurrentStage(visibleStages[stageIdx - 1]);
    }
  }, [visibleStages, currentStage, saveStageData]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    return saveStageData();
  }, [saveStageData]);

  // Submit for review (intake, FS-1, or FS-2). Returns true on success.
  const submitForReview = useCallback(async (): Promise<boolean> => {
    // Validate before submission
    const validationErrors = validateCurrentStage();
    if (Object.keys(validationErrors).length > 0) return false;

    // Save (or create) the project first — this also sets projectIdRef.current for new projects
    const saved = await saveStageData();
    if (!saved) return false;

    const idToSubmit = projectIdRef.current;
    if (!idToSubmit) {
      setErrors({ _form: 'Unable to determine project ID after save. Please try again.' });
      return false;
    }

    setIsSaving(true);
    try {
      const phase = currentPhase === 'intake' ? 'intake' : currentPhase === 'fs2' ? 'fs2' : currentPhase === 'fs3' ? 'fs3' : 'fs1';
      const res = await apiFetch(`/api/project-bank/${idToSubmit}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrors({ _form: err.error || 'Failed to submit for review' });
        return false;
      }

      const newStage = phase === 'intake' ? 'intake_submitted'
        : phase === 'fs2' ? 'fs2_completed'
        : phase === 'fs3' ? 'fs3_completed'
        : 'fs1_submitted';
      setProjectStage(newStage as ProjectStage);
      return true;
    } catch {
      setErrors({ _form: 'Network error. Please try again.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [currentPhase, validateCurrentStage, saveStageData]);

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
    projectStage,
    currentPhase,
    currentStage,
    currentStageIndex,
    visibleStages,
    fs1ActiveTab,
    setFs1ActiveTab,
    fs2ActiveTab,
    setFs2ActiveTab,
    updateFS2Field,
    formData,
    documents,
    isLoading,
    isSaving,
    errors,
    isLocked,
    lockMessage,
    returnMessage,
    reviewComments,
    goToStage,
    canGoToStage,
    saveAndContinue,
    saveAndBack,
    saveDraft,
    submitForReview,
    updateField,
    updateFields,
    validateCurrentStage,
    isStageComplete,
    firrResult,
    routingOutcome,
    refreshDocuments,
    pendingFiles,
    setPendingFiles,
  };
}
