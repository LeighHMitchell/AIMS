'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import {
  AlertCircle,
  RefreshCw,
  Eye,
  Lock,
  FileCheck,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useReadinessChecklist } from './hooks/useReadinessChecklist';
import { useReadinessPermissions } from './hooks/useReadinessPermissions';
import type { FinancingType } from '@/types/readiness';
import { useGovernmentEndorsement } from '@/hooks/use-government-endorsement';
import { GovernmentEndorsementFormData, VALIDATION_STATUS_OPTIONS } from '@/types/government-endorsement';
import { ReadinessConfigSection } from './ReadinessConfigSection';
import { ReadinessProgressRail, type WizardStep } from './ReadinessProgressRail';
import { ReadinessStageContent } from './ReadinessStageContent';
import { ReadinessWizardFooter } from './ReadinessWizardFooter';
import { apiFetch } from '@/lib/api-fetch';

interface GovernmentOrganization {
  id: string;
  name: string;
  acronym?: string;
  logo?: string;
  Organisation_Type_Code?: string;
}

/**
 * Map Default Modality (from Transaction Defaults) to Readiness FinancingType.
 * Used for one-time pre-population when the readiness config has no financing_type set.
 */
function mapModalityToFinancingType(modality: string): FinancingType | null {
  switch (modality) {
    case '1': return 'grant';
    case '2': return 'loan';
    case '3': return 'technical_assistance';
    case '4': return 'reimbursable';
    case '5': return 'investment_guarantee';
    default: return null;
  }
}

interface ReadinessChecklistTabProps {
  activityId: string;
  /** Default Modality value from Transaction Defaults tab (e.g. "1"=Grant, "2"=Loan) */
  defaultModality?: string;
}

export function ReadinessChecklistTab({ activityId, defaultModality }: ReadinessChecklistTabProps) {
  const permissions = useReadinessPermissions();

  const {
    state,
    loading,
    error,
    filteredStages,
    filterContext,
    refresh,
    updateConfig,
    updateItemResponse,
    uploadDocument,
    deleteDocument,
    renameDocument,
    signOffStage,
    isUpdating,
    updatingItemId,
  } = useReadinessChecklist({ activityId });

  // Government endorsement
  const {
    endorsement,
    loading: endorsementLoading,
    saving: endorsementSaving,
    saveEndorsement
  } = useGovernmentEndorsement(activityId);

  const [endorsementForm, setEndorsementForm] = useState<GovernmentEndorsementFormData>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Government organizations for validating authority
  const [governmentOrgs, setGovernmentOrgs] = useState<GovernmentOrganization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Wizard step state
  const [activeStep, setActiveStep] = useState(0);
  const hasSetInitialStep = useRef(false);
  const wizardRef = useRef<HTMLDivElement>(null);

  // Fetch government organizations (type codes 10, 11 = Partner Government)
  useEffect(() => {
    const fetchGovernmentOrgs = async () => {
      try {
        const response = await apiFetch('/api/organizations');
        if (response.ok) {
          const allOrgs = await response.json();
          const govOrgs = allOrgs.filter((org: any) =>
            org.Organisation_Type_Code === '10' ||
            org.Organisation_Type_Code === '11' ||
            org.type === 'partner_government'
          );
          setGovernmentOrgs(govOrgs);
        }
      } catch (error) {
        console.error('Error fetching government organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };
    fetchGovernmentOrgs();
  }, []);

  // Initialize endorsement form when data loads
  useEffect(() => {
    if (endorsement) {
      const formData = {
        validation_status: endorsement.validation_status || undefined,
        validating_authority: endorsement.validating_authority || '',
        effective_date: endorsement.effective_date || '',
        validation_date: endorsement.validation_date || '',
        validation_notes: endorsement.validation_notes || '',
      };
      setEndorsementForm(formData);
      lastSavedRef.current = JSON.stringify(formData);
    }
  }, [endorsement]);

  // Auto-save endorsement with debounce
  const saveEndorsementDebounced = useCallback(async (data: GovernmentEndorsementFormData) => {
    const serialized = JSON.stringify(data);
    if (serialized !== lastSavedRef.current) {
      lastSavedRef.current = serialized;
      await saveEndorsement(data);
    }
  }, [saveEndorsement]);

  const handleEndorsementChange = (field: keyof GovernmentEndorsementFormData, value: string | undefined) => {
    const newForm = { ...endorsementForm, [field]: value };
    setEndorsementForm(newForm);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      saveEndorsementDebounced(newForm);
    }, 1000);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // One-time pre-population: if no financing_type is set in the readiness config
  // but a Default Modality exists from Transaction Defaults, use it to pre-fill.
  const hasPrePopulated = useRef(false);
  useEffect(() => {
    if (
      !loading &&
      !hasPrePopulated.current &&
      defaultModality &&
      !state?.config?.financing_type
    ) {
      hasPrePopulated.current = true;
      const mapped = mapModalityToFinancingType(defaultModality);
      if (mapped) {
        updateConfig({
          financing_type: mapped,
          financing_modality: state?.config?.financing_modality || null,
          is_infrastructure: state?.config?.is_infrastructure || false,
        });
      }
    }
  }, [loading, defaultModality, state?.config, updateConfig]);

  // Build wizard steps array
  const steps: WizardStep[] = useMemo(() => {
    const result: WizardStep[] = [
      { id: 'config', label: 'Project Configuration', type: 'config' },
    ];
    filteredStages.forEach((stage) => {
      result.push({
        id: stage.id,
        label: `Stage ${stage.stage_order}: ${stage.name}`,
        type: 'stage',
        progress: stage.progress,
      });
    });
    result.push({ id: 'endorsement', label: 'Endorsement', type: 'endorsement' });
    return result;
  }, [filteredStages]);

  // Resume at the latest step the user was working on
  useEffect(() => {
    if (loading || hasSetInitialStep.current || steps.length === 0) return;
    hasSetInitialStep.current = true;

    // Find the first incomplete step — that's where the user left off
    let resumeStep = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.type === 'config') {
        if (!state?.config?.financing_type) break;
      } else if (step.type === 'stage') {
        const stage = filteredStages.find((s) => s.id === step.id);
        if (stage && stage.progress.not_completed > 0) {
          resumeStep = i;
          break;
        }
      }
      // If this step is complete, tentatively move resumeStep forward
      resumeStep = i;
    }
    if (resumeStep > 0) {
      setActiveStep(resumeStep);
    }
  }, [loading, steps, state?.config?.financing_type, filteredStages]);

  // Step completion logic
  const isStepComplete = useCallback((index: number): boolean => {
    if (index < 0 || index >= steps.length) return false;
    const step = steps[index];
    if (step.type === 'config') {
      return !!state?.config?.financing_type;
    }
    if (step.type === 'stage') {
      const stage = filteredStages.find((s) => s.id === step.id);
      if (!stage) return true; // stage not found = skip
      // All items must have a status set (not_completed === 0)
      return stage.progress.not_completed === 0;
    }
    // Endorsement step has no completion gate
    return true;
  }, [steps, state?.config, filteredStages]);

  // Navigation guard
  const canNavigateToStep = useCallback((targetIndex: number): boolean => {
    if (targetIndex < 0 || targetIndex >= steps.length) return false;
    // Can always go back or stay on current step
    if (targetIndex <= activeStep) return true;
    // Can only advance if all prior steps are complete
    for (let i = 0; i < targetIndex; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  }, [steps.length, activeStep, isStepComplete]);

  const scrollToWizard = () => {
    // The scroll container is the <main> element, not the viewport
    const mainEl = document.querySelector('main.flex-1.overflow-y-auto');
    if (mainEl && wizardRef.current) {
      const gridTop = wizardRef.current.offsetTop;
      mainEl.scrollTo({ top: gridTop, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      scrollToWizard();
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1 && isStepComplete(activeStep)) {
      setActiveStep(activeStep + 1);
      scrollToWizard();
    }
  };

  const handleStepClick = (index: number) => {
    if (canNavigateToStep(index)) {
      setActiveStep(index);
      scrollToWizard();
    }
  };

  // Get the active stage data (for stage steps)
  const activeStage = useMemo(() => {
    const step = steps[activeStep];
    if (step?.type === 'stage') {
      return filteredStages.find((s) => s.id === step.id) || null;
    }
    return null;
  }, [steps, activeStep, filteredStages]);

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-[240px_1fr] gap-6">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load readiness checklist: {error}
          <Button
            variant="link"
            onClick={refresh}
            className="ml-2 h-auto p-0"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-end gap-2">
        {permissions.isReadOnly && (
          <Badge variant="secondary" className="gap-1">
            <Eye className="h-3 w-3" />
            Read-only
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isUpdating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Read-only notice */}
      {permissions.isReadOnly && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You are viewing this checklist in read-only mode. Only government users can make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Wizard layout */}
      <div ref={wizardRef} className="grid grid-cols-[240px_1fr] gap-8 scroll-mt-6">
        {/* Sidebar stepper */}
        <ReadinessProgressRail
          steps={steps}
          activeStep={activeStep}
          onStepClick={handleStepClick}
          canNavigateToStep={canNavigateToStep}
          isStepComplete={isStepComplete}
        />

        {/* Content area */}
        <div className="min-w-0">
          {/* Step 0: Project Configuration */}
          {steps[activeStep]?.type === 'config' && (
            <div>
              <div className="border rounded-lg">
                <div className="p-6 pb-2">
                  <h3 className="text-lg font-semibold leading-none tracking-tight">Project Configuration</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Configure the project type to see applicable checklist items
                  </p>
                </div>
                <div className="p-6 pt-4">
                  <ReadinessConfigSection
                    config={state?.config || null}
                    onUpdate={updateConfig}
                    disabled={permissions.isReadOnly || isUpdating}
                  />
                </div>
              </div>

              {!state?.config?.financing_type && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select a financing type to proceed to the checklist stages.
                  </AlertDescription>
                </Alert>
              )}

              <ReadinessWizardFooter
                activeStep={activeStep}
                totalSteps={steps.length}
                onBack={handleBack}
                onNext={handleNext}
                canGoNext={isStepComplete(activeStep)}
                isUpdating={isUpdating}
              />
            </div>
          )}

          {/* Stage steps */}
          {steps[activeStep]?.type === 'stage' && activeStage && (
            <div>
              <ReadinessStageContent
                stage={activeStage}
                onUpdateResponse={updateItemResponse}
                onUploadDocument={uploadDocument}
                onDeleteDocument={deleteDocument}
                onRenameDocument={renameDocument}
                onSignOff={signOffStage}
                isUpdating={isUpdating}
                updatingItemId={updatingItemId}
                readOnly={permissions.isReadOnly}
                canSignOff={permissions.canSignOff}
              />

              <ReadinessWizardFooter
                activeStep={activeStep}
                totalSteps={steps.length}
                onBack={handleBack}
                onNext={handleNext}
                canGoNext={isStepComplete(activeStep)}
                isUpdating={isUpdating}
              />
            </div>
          )}

          {/* Endorsement step */}
          {steps[activeStep]?.type === 'endorsement' && (
            <div>
              <div className="border rounded-lg">
                <div className="p-6 pb-2">
                  <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Endorsement Details
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Complete this section to formally validate the activity after the checklist is complete
                  </p>
                </div>
                <div className="p-6 pt-4 space-y-6">
                  {endorsementLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Save indicator */}
                      {endorsementSaving && (
                        <div className="flex items-center gap-2 text-blue-600 text-sm">
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      )}

                      {/* Validation Status */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Validation Status
                          <HelpTextTooltip content="Current status of government validation for this activity" />
                        </Label>
                        <Select
                          value={endorsementForm.validation_status || ''}
                          onValueChange={(value) => handleEndorsementChange('validation_status', value as any)}
                          disabled={permissions.isReadOnly}
                        >
                          <SelectTrigger className="text-left">
                            <SelectValue placeholder="Select validation status" />
                          </SelectTrigger>
                          <SelectContent>
                            {VALIDATION_STATUS_OPTIONS.map((option) => {
                              const IconComponent = option.value === 'validated'
                                ? CheckCircle
                                : option.value === 'rejected'
                                  ? XCircle
                                  : HelpCircle;
                              const iconColor = option.value === 'validated'
                                ? 'text-green-600'
                                : option.value === 'rejected'
                                  ? 'text-red-600'
                                  : 'text-amber-600';
                              return (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-start gap-2">
                                    <IconComponent className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                                    <div>
                                      <div className="font-medium">{option.label}</div>
                                      <div className="text-xs text-gray-500">{option.description}</div>
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Validating Authority */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Validating Authority
                          <HelpTextTooltip content="Government ministry responsible for validating the activity" />
                        </Label>
                        <Select
                          value={endorsementForm.validating_authority || ''}
                          onValueChange={(value) => handleEndorsementChange('validating_authority', value)}
                          disabled={permissions.isReadOnly || loadingOrgs}
                        >
                          <SelectTrigger className="text-left">
                            <SelectValue placeholder={loadingOrgs ? "Loading ministries..." : "Select government ministry"} />
                          </SelectTrigger>
                          <SelectContent>
                            {governmentOrgs.length === 0 && !loadingOrgs ? (
                              <div className="p-2 text-sm text-gray-500">No government organizations found</div>
                            ) : (
                              governmentOrgs.map((org) => (
                                <SelectItem key={org.id} value={org.name}>
                                  <div className="flex items-center gap-3">
                                    {org.logo ? (
                                      <img
                                        src={org.logo}
                                        alt=""
                                        className="h-5 w-5 object-contain flex-shrink-0 rounded"
                                      />
                                    ) : (
                                      <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                    )}
                                    <div className="flex items-center gap-2">
                                      {org.acronym && (
                                        <span className="font-medium text-gray-500">{org.acronym}</span>
                                      )}
                                      <span>{org.name}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            Effective Date
                            <HelpTextTooltip content="Official date when the agreement or endorsement takes effect" />
                          </Label>
                          <EnhancedDatePicker
                            value={endorsementForm.effective_date ? new Date(endorsementForm.effective_date) : undefined}
                            onChange={(date) => handleEndorsementChange('effective_date', date?.toISOString().split('T')[0])}
                            placeholder="Select effective date"
                            disabled={permissions.isReadOnly}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            Validation Date
                            <HelpTextTooltip content="Date when the government reviewed and approved the activity" />
                          </Label>
                          <EnhancedDatePicker
                            value={endorsementForm.validation_date ? new Date(endorsementForm.validation_date) : undefined}
                            onChange={(date) => handleEndorsementChange('validation_date', date?.toISOString().split('T')[0])}
                            placeholder="Select validation date"
                            disabled={permissions.isReadOnly}
                          />
                        </div>
                      </div>

                      {/* Validation Notes */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Validation Notes / Conditions
                          <HelpTextTooltip content="Any conditions, clarifications, or notes from the government" />
                        </Label>
                        <Textarea
                          value={endorsementForm.validation_notes || ''}
                          onChange={(e) => handleEndorsementChange('validation_notes', e.target.value)}
                          placeholder="Enter any conditions, clarifications, or notes..."
                          rows={4}
                          disabled={permissions.isReadOnly}
                        />
                      </div>

                      {/* Show validation status badge if validated */}
                      {endorsementForm.validation_status === 'validated' && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-700 font-medium">This activity has been validated by the government</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <ReadinessWizardFooter
                activeStep={activeStep}
                totalSteps={steps.length}
                onBack={handleBack}
                onNext={handleNext}
                canGoNext={isStepComplete(activeStep)}
                isUpdating={isUpdating}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReadinessChecklistTab;
