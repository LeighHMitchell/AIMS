'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useGovernmentEndorsement } from '@/hooks/use-government-endorsement';
import { GovernmentEndorsementFormData, VALIDATION_STATUS_OPTIONS } from '@/types/government-endorsement';
import { ReadinessConfigSection } from './ReadinessConfigSection';
import { ReadinessProgressSummary } from './ReadinessProgressSummary';
import { ReadinessStageAccordion } from './ReadinessStageAccordion';
import { apiFetch } from '@/lib/api-fetch';

interface GovernmentOrganization {
  id: string;
  name: string;
  acronym?: string;
  logo?: string;
  Organisation_Type_Code?: string;
}

interface ReadinessChecklistTabProps {
  activityId: string;
}

export function ReadinessChecklistTab({ activityId }: ReadinessChecklistTabProps) {
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

  // Fetch government organizations (type codes 10, 11 = Partner Government)
  useEffect(() => {
    const fetchGovernmentOrgs = async () => {
      try {
        const response = await apiFetch('/api/organizations');
        if (response.ok) {
          const allOrgs = await response.json();
          // Filter for government organizations (type codes 10, 11)
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

  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedStages(new Set(filteredStages.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedStages(new Set());
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
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

  // No config yet - show config section prominently
  const needsConfig = !state?.config?.financing_type && !state?.config?.financing_modality;

  return (
    <div className="space-y-6">
      {/* Action buttons */}
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

      {/* Read-only notice for development partners */}
      {permissions.isReadOnly && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You are viewing this checklist in read-only mode. Only government users can make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Configuration</CardTitle>
          <CardDescription>
            Configure the project type to see applicable checklist items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReadinessConfigSection
            config={state?.config || null}
            onUpdate={updateConfig}
            disabled={permissions.isReadOnly || isUpdating}
          />
        </CardContent>
      </Card>

      {/* Progress Summary */}
      {!needsConfig && state?.overallProgress && (
        <ReadinessProgressSummary
          progress={state.overallProgress}
          stages={filteredStages}
        />
      )}

      {/* Checklist Stages */}
      {needsConfig ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please configure the project financing type and modality above to see the applicable checklist items.
          </AlertDescription>
        </Alert>
      ) : filteredStages.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No checklist items found. Contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {/* Stage controls */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Checklist Stages
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>

          {/* Stage accordions */}
          {filteredStages.map((stage) => (
            <ReadinessStageAccordion
              key={stage.id}
              stage={stage}
              isExpanded={expandedStages.has(stage.id)}
              onToggle={() => toggleStage(stage.id)}
              onUpdateResponse={updateItemResponse}
              onUploadDocument={uploadDocument}
              onDeleteDocument={deleteDocument}
              onSignOff={signOffStage}
              isUpdating={isUpdating}
              updatingItemId={updatingItemId}
              readOnly={permissions.isReadOnly}
              canSignOff={permissions.canSignOff}
            />
          ))}
        </div>
      )}

      {/* Endorsement Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Endorsement Details
          </CardTitle>
          <CardDescription>
            Complete this section to formally validate the activity after the checklist is complete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
        </CardContent>
      </Card>
    </div>
  );
}

export default ReadinessChecklistTab;
